import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

/**
 * Returns the note if the caller is the owner or a collaborator.
 * For public reads, use `getPublicNote` instead.
 */
export async function getAccessibleNote(
  ctx: QueryCtx | MutationCtx,
  noteId: Id<"notes">,
  userId: Id<"users">,
): Promise<{ note: Doc<"notes">; role: "owner" | "editor" | "viewer" } | null> {
  const note = await ctx.db.get(noteId);
  if (!note) return null;
  if (note.ownerId === userId) return { note, role: "owner" };
  const collab = await ctx.db
    .query("collaborators")
    .withIndex("by_note_user", (q) =>
      q.eq("noteId", noteId).eq("userId", userId),
    )
    .unique();
  if (!collab) return null;
  return { note, role: collab.role };
}

export async function requireWriteAccess(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  userId: Id<"users">,
): Promise<Doc<"notes">> {
  const access = await getAccessibleNote(ctx, noteId, userId);
  if (!access) throw new Error("Note not found or access denied");
  if (access.role === "viewer") throw new Error("Read-only access");
  return access.note;
}

export async function logActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: Doc<"activityLog">["action"],
  noteId?: Id<"notes">,
): Promise<void> {
  await ctx.db.insert("activityLog", {
    userId,
    noteId,
    action,
    createdAt: Date.now(),
  });
}
