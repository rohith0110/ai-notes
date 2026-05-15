import { v } from "convex/values";
import { mutation, query, internalMutation, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  getAccessibleNote,
  getCurrentUser,
  logActivity,
  requireCurrentUser,
  requireWriteAccess,
} from "./lib";

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

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function listAccessibleNoteIds(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Set<Id<"notes">>> {
  const collab: Doc<"collaborators">[] = await ctx.db
    .query("collaborators")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return new Set(collab.map((c) => c.noteId));
}

export const list = query({
  args: {
    archived: v.optional(v.boolean()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const archived = args.archived ?? false;
    const owned = await ctx.db
      .query("notes")
      .withIndex("by_owner_archived_updated", (q) =>
        q.eq("ownerId", user._id).eq("isArchived", archived),
      )
      .order("desc")
      .collect();
    const sharedIds = await listAccessibleNoteIds(ctx, user._id);
    const shared: Doc<"notes">[] = [];
    for (const id of sharedIds) {
      const n = await ctx.db.get(id);
      if (n && n.isArchived === archived) shared.push(n);
    }
    const all = [...owned, ...shared].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    if (args.tag) {
      return all.filter((n) => n.tags.includes(args.tag!));
    }
    return all;
  },
});

export const allTags = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const owned = await ctx.db
      .query("notes")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const counts = new Map<string, number>();
    for (const n of owned) {
      if (n.isArchived) continue;
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const get = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const access = await getAccessibleNote(ctx, args.id, user._id);
    if (!access) return null;
    return { ...access.note, viewerRole: access.role } as Doc<"notes"> & {
      viewerRole: "owner" | "editor" | "viewer";
    };
  },
});

export const getByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db
      .query("notes")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();
    if (!note || !note.isPublic) return null;
    const owner = await ctx.db.get(note.ownerId);
    return {
      _id: note._id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      updatedAt: note.updatedAt,
      aiSummary: note.aiSummary,
      aiActionItems: note.aiActionItems,
      ownerName: owner?.name ?? "Anonymous",
    };
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const content = args.content ?? "";
    const title = args.title ?? "Untitled";
    const id = await ctx.db.insert("notes", {
      ownerId: user._id,
      title,
      content,
      contentText: plainTextFromMarkdown(content),
      tags: args.tags ?? [],
      isArchived: false,
      isPublic: false,
      wordCount: countWords(plainTextFromMarkdown(content)),
      titleIsUserSet: !!args.title,
      aiUsageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, user._id, "created", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    titleIsUserSet: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const note = await requireWriteAccess(ctx, args.id, user._id);
    const patch: Partial<Doc<"notes">> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      patch.title = args.title;
      if (args.titleIsUserSet ?? true) patch.titleIsUserSet = true;
    }
    if (args.content !== undefined) {
      patch.content = args.content;
      patch.contentText = plainTextFromMarkdown(args.content);
      patch.wordCount = countWords(patch.contentText);
    }
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.titleIsUserSet !== undefined && args.title === undefined) {
      patch.titleIsUserSet = args.titleIsUserSet;
    }
    await ctx.db.patch(args.id, patch);
    await logActivity(ctx, user._id, "edited", args.id);
    void note;
  },
});

export const archive = mutation({
  args: { id: v.id("notes"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const note = await ctx.db.get(args.id);
    if (!note || note.ownerId !== user._id) throw new Error("Not allowed");
    await ctx.db.patch(args.id, {
      isArchived: args.archived,
      updatedAt: Date.now(),
    });
    await logActivity(
      ctx,
      user._id,
      args.archived ? "archived" : "unarchived",
      args.id,
    );
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const note = await ctx.db.get(args.id);
    if (!note || note.ownerId !== user._id) throw new Error("Not allowed");
    const collabs = await ctx.db
      .query("collaborators")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const c of collabs) await ctx.db.delete(c._id);
    const reqs = await ctx.db
      .query("shareRequests")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const r of reqs) await ctx.db.delete(r._id);
    await ctx.db.delete(args.id);
    await logActivity(ctx, user._id, "deleted");
  },
});

/** Internal: patch AI fields after Gemini call completes. */
export const patchAi = internalMutation({
  args: {
    id: v.id("notes"),
    userId: v.id("users"),
    aiSummary: v.optional(v.string()),
    aiActionItems: v.optional(v.array(v.string())),
    aiSuggestedTitle: v.optional(v.string()),
    aiTags: v.optional(v.array(v.string())),
    lastTitleHash: v.optional(v.string()),
    lastSummaryHash: v.optional(v.string()),
    applyTitle: v.optional(v.boolean()),
    actionKind: v.union(
      v.literal("ai_summary"),
      v.literal("ai_title"),
      v.literal("ai_actions"),
    ),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) return;
    const patch: Partial<Doc<"notes">> = {
      aiUsageCount: (note.aiUsageCount ?? 0) + 1,
    };
    if (args.aiSummary !== undefined) patch.aiSummary = args.aiSummary;
    if (args.aiActionItems !== undefined)
      patch.aiActionItems = args.aiActionItems;
    if (args.aiSuggestedTitle !== undefined) {
      patch.aiSuggestedTitle = args.aiSuggestedTitle;
      if (args.applyTitle && !note.titleIsUserSet) {
        patch.title = args.aiSuggestedTitle;
      }
    }
    if (args.aiTags !== undefined) {
      patch.tags = args.aiTags;
    }
    if (args.lastTitleHash !== undefined)
      patch.lastTitleHash = args.lastTitleHash;
    if (args.lastSummaryHash !== undefined)
      patch.lastSummaryHash = args.lastSummaryHash;
    await ctx.db.patch(args.id, patch);
    await logActivity(ctx, args.userId, args.actionKind, args.id);
  },
});
