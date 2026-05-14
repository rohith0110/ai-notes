import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { json, error } from "../../_lib";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/notes/:id
 * Fetch a single note by ID (must have access).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);
  convex.setAuth(token);

  const { id } = await params;

  try {
    const note = await convex.query(api.notes.get, {
      id: id as Id<"notes">,
    });
    if (!note) return error("Note not found", 404);
    return json(note);
  } catch (e: any) {
    return error(e.message || "Failed to fetch note", 500);
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
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);
  convex.setAuth(token);

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
  } catch (e: any) {
    return error(e.message || "Failed to update note", 500);
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
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);
  convex.setAuth(token);

  const { id } = await params;

  try {
    await convex.mutation(api.notes.remove, {
      id: id as Id<"notes">,
    });
    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete note", 500);
  }
}
