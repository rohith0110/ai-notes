import { query } from "./_generated/server";
import { getCurrentUser } from "./lib";

export const pendingShareRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const reqs = await ctx.db
      .query("shareRequests")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerId", user._id).eq("status", "pending"),
      )
      .order("desc")
      .collect();
    const result = await Promise.all(
      reqs.map(async (r) => {
        const requester = await ctx.db.get(r.requesterId);
        const note = await ctx.db.get(r.noteId);
        return {
          _id: r._id,
          createdAt: r.createdAt,
          message: r.message,
          requester: requester
            ? {
                name: requester.name,
                email: requester.email,
                imageUrl: requester.imageUrl,
              }
            : null,
          note: note
            ? { _id: note._id, title: note.title }
            : null,
        };
      }),
    );
    return result.filter((r) => r.requester && r.note);
  },
});
