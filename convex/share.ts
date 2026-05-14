import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getCurrentUser, logActivity, requireCurrentUser } from "./lib";

function generateShareId(): string {
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  for (let i = 0; i < 14; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export const setPublic = mutation({
  args: { id: v.id("notes"), isPublic: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const note = await ctx.db.get(args.id);
    if (!note || note.ownerId !== user._id) throw new Error("Not allowed");
    const patch: Partial<Doc<"notes">> = {
      isPublic: args.isPublic,
      updatedAt: Date.now(),
    };
    if (args.isPublic && !note.shareId) patch.shareId = generateShareId();
    await ctx.db.patch(args.id, patch);
    await logActivity(
      ctx,
      user._id,
      args.isPublic ? "shared" : "unshared",
      args.id,
    );
    const refreshed = await ctx.db.get(args.id);
    return refreshed?.shareId;
  },
});

/**
 * Anonymous-visitor flow: request access to a public note.
 * If user is not authed, the client opens the auth modal first; on completion,
 * this mutation creates the request the owner will see in notifications.
 */
export const requestAccess = mutation({
  args: { shareId: v.string(), message: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const note = await ctx.db
      .query("notes")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();
    if (!note || !note.isPublic) throw new Error("Note not found");
    if (note.ownerId === user._id) {
      throw new Error("You already own this note");
    }
    const existingCollab = await ctx.db
      .query("collaborators")
      .withIndex("by_note_user", (q) =>
        q.eq("noteId", note._id).eq("userId", user._id),
      )
      .unique();
    if (existingCollab) {
      return { status: "already_collaborator" as const };
    }
    const existingReq = await ctx.db
      .query("shareRequests")
      .withIndex("by_requester_note", (q) =>
        q.eq("requesterId", user._id).eq("noteId", note._id),
      )
      .unique();
    if (existingReq) {
      if (existingReq.status === "pending")
        return { status: "already_pending" as const };
      if (existingReq.status === "approved")
        return { status: "approved" as const };
      // denied → allow re-request by reopening
      await ctx.db.patch(existingReq._id, {
        status: "pending",
        message: args.message,
        respondedAt: undefined,
        createdAt: Date.now(),
      });
      return { status: "requested" as const };
    }
    await ctx.db.insert("shareRequests", {
      noteId: note._id,
      ownerId: note.ownerId,
      requesterId: user._id,
      status: "pending",
      message: args.message,
      createdAt: Date.now(),
    });
    return { status: "requested" as const };
  },
});

/** Owner-side: approve or deny a pending request. */
export const respondToRequest = mutation({
  args: {
    requestId: v.id("shareRequests"),
    approve: v.boolean(),
    role: v.optional(v.union(v.literal("viewer"), v.literal("editor"))),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req || req.ownerId !== user._id) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Already responded");
    await ctx.db.patch(req._id, {
      status: args.approve ? "approved" : "denied",
      respondedAt: Date.now(),
    });
    if (args.approve) {
      await ctx.db.insert("collaborators", {
        noteId: req.noteId,
        userId: req.requesterId,
        role: args.role ?? "editor",
        addedAt: Date.now(),
      });
      await logActivity(ctx, user._id, "collaborator_added", req.noteId);
    }
  },
});

/** Public visitor / candidate-requester: check their relationship to a note. */
export const accessState = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const note = await ctx.db
      .query("notes")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();
    if (!note || !note.isPublic) {
      return { exists: false as const };
    }
    if (!identity) {
      return { exists: true as const, role: "anon" as const };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { exists: true as const, role: "anon" as const };
    if (user._id === note.ownerId)
      return { exists: true as const, role: "owner" as const, noteId: note._id };
    const collab = await ctx.db
      .query("collaborators")
      .withIndex("by_note_user", (q) =>
        q.eq("noteId", note._id).eq("userId", user._id),
      )
      .unique();
    if (collab)
      return {
        exists: true as const,
        role: collab.role,
        noteId: note._id,
      };
    const req = await ctx.db
      .query("shareRequests")
      .withIndex("by_requester_note", (q) =>
        q.eq("requesterId", user._id).eq("noteId", note._id),
      )
      .unique();
    if (req)
      return {
        exists: true as const,
        role: "requester" as const,
        requestStatus: req.status,
      };
    return { exists: true as const, role: "visitor" as const };
  },
});

export const collaboratorsForNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const note = await ctx.db.get(args.noteId);
    if (!note || note.ownerId !== user._id) return [];
    const collabs = await ctx.db
      .query("collaborators")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();
    const users = await Promise.all(collabs.map((c) => ctx.db.get(c.userId)));
    return collabs.map((c, i) => ({
      _id: c._id,
      role: c.role,
      addedAt: c.addedAt,
      user: users[i],
    }));
  },
});

export const removeCollaborator = mutation({
  args: { collaboratorId: v.id("collaborators") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const collab = await ctx.db.get(args.collaboratorId);
    if (!collab) return;
    const note = await ctx.db.get(collab.noteId);
    if (!note || note.ownerId !== user._id) throw new Error("Not allowed");
    await ctx.db.delete(args.collaboratorId);
  },
});
