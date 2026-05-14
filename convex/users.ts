import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./lib";

/** Returns the current user, creating their record if it doesn't exist yet. */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing) {
      const nextName = identity.name ?? identity.givenName ?? existing.name;
      const nextEmail = identity.email ?? existing.email;
      const nextImage = identity.pictureUrl ?? existing.imageUrl;
      if (
        nextName !== existing.name ||
        nextEmail !== existing.email ||
        nextImage !== existing.imageUrl
      ) {
        await ctx.db.patch(existing._id, {
          name: nextName,
          email: nextEmail,
          imageUrl: nextImage,
        });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? identity.givenName ?? undefined,
      imageUrl: identity.pictureUrl ?? undefined,
      createdAt: Date.now(),
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const getUsersByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});
