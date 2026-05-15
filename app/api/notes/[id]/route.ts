import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, bearerToken, convexFor } from "../../_lib";
import { Id } from "@/convex/_generated/dataModel";

/**
 * GET /api/notes/:id
 * Fetch a single note by ID (must have access).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);
  const convex = convexFor(token);

  const { id } = await params;

  try {
    const note = await convex.query(api.notes.get, {
      id: id as Id<"notes">,
    });
    if (!note) return error("Note not found", 404);
    return json(note);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to fetch note", 500);
  }
}

/**
 * PATCH /api/notes/:id
 * Update a note's title, content, tags, or titleIsUserSet.
 * Body: { title?, content?, tags?, titleIsUserSet? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);
  const convex = convexFor(token);

  const { id } = await params;
  const body = await req.json();

  try {
    await convex.mutation(api.notes.update, {
      id: id as Id<"notes">,
      title: body.title,
      content: body.content,
      tags: body.tags,
      titleIsUserSet: body.titleIsUserSet,
    });
    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to update note", 500);
  }
}

/**
 * DELETE /api/notes/:id
 * Permanently delete a note (owner only).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);
  const convex = convexFor(token);

  const { id } = await params;

  try {
    await convex.mutation(api.notes.remove, {
      id: id as Id<"notes">,
    });
    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to delete note", 500);
  }
}
