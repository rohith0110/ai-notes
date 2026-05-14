import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib";

/**
 * Wide candidate fetch — Convex full-text gives us forgiving keyword matches
 * across title + body. The client re-ranks for relevance (title > tag > body).
 */
export const searchNotes = query({
  args: {
    query: v.string(),
    archived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const q = args.query.trim();
    const archived = args.archived ?? false;
    const limit = args.limit ?? 30;

    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_user", (qx) => qx.eq("userId", user._id))
      .collect();
    const sharedIds = new Set(collab.map((c) => c.noteId));

    if (!q) {
      const owned = await ctx.db
        .query("notes")
        .withIndex("by_owner_archived_updated", (qx) =>
          qx.eq("ownerId", user._id).eq("isArchived", archived),
        )
        .order("desc")
        .take(limit);
      return owned;
    }

    const titleHits = await ctx.db
      .query("notes")
      .withSearchIndex("search_title", (qx) =>
        qx
          .search("title", q)
          .eq("ownerId", user._id)
          .eq("isArchived", archived),
      )
      .take(limit);

    const bodyHits = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (qx) =>
        qx
          .search("contentText", q)
          .eq("ownerId", user._id)
          .eq("isArchived", archived),
      )
      .take(limit);

    const seen = new Map<Id<"notes">, Doc<"notes">>();
    for (const n of titleHits) seen.set(n._id, n);
    for (const n of bodyHits) if (!seen.has(n._id)) seen.set(n._id, n);

    for (const id of sharedIds) {
      const n = await ctx.db.get(id);
      if (!n || n.isArchived !== archived) continue;
      const blob = (n.title + " " + n.contentText).toLowerCase();
      if (blob.includes(q.toLowerCase()) && !seen.has(n._id)) {
        seen.set(n._id, n);
      }
    }

    return [...seen.values()];
  },
});
