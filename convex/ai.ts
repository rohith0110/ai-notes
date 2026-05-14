"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-2.5-flash-lite";

function plainTextFromMarkdown(md: string): string {
  return (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentHash(text: string): string {
  const normalized = (text || "").trim().toLowerCase().replace(/\s+/g, " ");
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + ":" + normalized.length;
}

function hashDrift(prev: string | undefined, nextText: string): number {
  if (!prev) return 1;
  const [, prevLenStr] = prev.split(":");
  const prevLen = parseInt(prevLenStr ?? "0", 10);
  const nextLen = nextText.trim().length;
  if (prevLen === 0) return 1;
  if (contentHash(nextText) === prev) return 0;
  return Math.min(1, Math.abs(nextLen - prevLen) / Math.max(prevLen, nextLen, 1) + 0.15);
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    actionItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["title", "summary", "actionItems", "tags"],
};

type Kind = "summary" | "title" | "actions" | "tags";

async function callGemini(opts: {
  title: string;
  content: string;
  existingTags: string[];
  want: Set<Kind>;
}): Promise<{ title: string; summary: string; actionItems: string[]; tags: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const wantList = [...opts.want].join(", ");
  const ai = new GoogleGenAI({ apiKey });
  const sys = `You analyze a user's note and return strict JSON. Generate ${wantList}.
Rules:
- title: 3-8 words, no quotes, no trailing punctuation, descriptive
- summary: 1-3 sentences, neutral tone, max ~60 words
- actionItems: 0-6 concrete tasks extracted from the note (verbs first). Skip if none clearly present.
- tags: 1-5 short, lowercase, single-word or hyphenated tags that categorize the note topic (e.g. "planning", "research", "meeting-notes"). Do NOT include generic tags like "note" or "document".
- If the note is essentially empty, return empty strings/arrays.`;

  const userMsg = `Existing title: ${opts.title || "(none)"}\nExisting tags: ${opts.existingTags.length > 0 ? opts.existingTags.join(", ") : "(none)"}\n\nNote content (markdown):\n"""\n${opts.content}\n"""`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMsg,
    config: {
      systemInstruction: sys,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 600,
    },
  });

  const text = response.text ?? "";
  try {
    const parsed = JSON.parse(text);
    return {
      title:
        typeof parsed.title === "string" ? parsed.title.trim().slice(0, 80) : "",
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.trim().slice(0, 800)
          : "",
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter((x: unknown): x is string => typeof x === "string")
            .slice(0, 8)
            .map((x: string) => x.trim())
            .filter(Boolean)
        : [],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((x: unknown): x is string => typeof x === "string")
            .slice(0, 5)
            .map((x: string) => x.trim().toLowerCase().replace(/\s+/g, "-"))
            .filter(Boolean)
        : [],
    };
  } catch {
    return { title: "", summary: "", actionItems: [], tags: [] };
  }
}

/**
 * Generate AI artifacts for a note. Conservative defaults:
 * - title: regenerated only when content has drifted >30% since last gen
 *   AND the user hasn't manually edited the title.
 * - summary/actionItems: regenerated when explicitly requested or when
 *   content has drifted >35% since last summary.
 * Pass `force: true` to override drift gating (e.g. user pressed Regenerate).
 */
export const generate = action({
  args: {
    noteId: v.id("notes"),
    kinds: v.array(
      v.union(
        v.literal("summary"),
        v.literal("title"),
        v.literal("actions"),
        v.literal("tags"),
      ),
    ),
    force: v.optional(v.boolean()),
    applyTitle: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser, {});
    if (!user) throw new Error("Not authenticated");
    const note = await ctx.runQuery(api.notes.get, { id: args.noteId });
    if (!note) throw new Error("Note not found or no access");
    if (note.viewerRole === "viewer") throw new Error("Read-only access");

    const plain = note.contentText || plainTextFromMarkdown(note.content);
    if (plain.length < 20 && !args.force) {
      return { skipped: true, reason: "content_too_short" } as const;
    }

    const wantSet = new Set<Kind>(args.kinds);
    const force = !!args.force;
    const titleDrift = hashDrift(note.lastTitleHash, plain);
    const summaryDrift = hashDrift(note.lastSummaryHash, plain);

    // Skip title regen if user owns the title or drift is small
    if (wantSet.has("title") && !force) {
      if (note.titleIsUserSet || titleDrift < 0.3) wantSet.delete("title");
    }
    if (wantSet.has("summary") && !force) {
      if (note.aiSummary && summaryDrift < 0.35) wantSet.delete("summary");
    }
    if (wantSet.has("actions") && !force) {
      if ((note.aiActionItems?.length ?? 0) > 0 && summaryDrift < 0.35) {
        wantSet.delete("actions");
      }
    }

    if (wantSet.size === 0) {
      return { skipped: true, reason: "no_drift" } as const;
    }

    const result = await callGemini({
      title: note.title,
      content: note.content.slice(0, 12000),
      existingTags: note.tags ?? [],
      want: wantSet,
    });

    const patch: {
      id: typeof args.noteId;
      userId: typeof user._id;
      aiSummary?: string;
      aiActionItems?: string[];
      aiSuggestedTitle?: string;
      aiTags?: string[];
      lastTitleHash?: string;
      lastSummaryHash?: string;
      applyTitle?: boolean;
      actionKind: "ai_summary" | "ai_title" | "ai_actions";
    } = {
      id: args.noteId,
      userId: user._id,
      actionKind: wantSet.has("summary")
        ? "ai_summary"
        : wantSet.has("title")
          ? "ai_title"
          : "ai_actions",
    };

    if (wantSet.has("title") && result.title) {
      patch.aiSuggestedTitle = result.title;
      patch.lastTitleHash = contentHash(plain);
      patch.applyTitle = args.applyTitle ?? true;
    }
    if (wantSet.has("summary")) {
      patch.aiSummary = result.summary;
      patch.lastSummaryHash = contentHash(plain);
    }
    if (wantSet.has("actions")) {
      patch.aiActionItems = result.actionItems;
      if (!patch.lastSummaryHash) patch.lastSummaryHash = contentHash(plain);
    }
    // Auto-apply generated tags (merge with existing, no duplicates)
    if (wantSet.has("tags") && result.tags.length > 0) {
      const existing = new Set(note.tags ?? []);
      for (const t of result.tags) existing.add(t);
      patch.aiTags = [...existing];
    }

    await ctx.runMutation(internal.notes.patchAi, patch);
    return {
      skipped: false,
      title: patch.aiSuggestedTitle,
      summary: patch.aiSummary,
      actionItems: patch.aiActionItems,
    } as const;
  },
});
