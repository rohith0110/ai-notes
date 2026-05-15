import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, bearerToken, convexFor } from "../_lib";

/**
 * GET /api/notes
 * Returns the authenticated user's notes (owned + shared).
 * Query params: ?tag=work&archived=true
 */
export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);

  const convex = convexFor(token);

  const url = new URL(req.url);
  const tag = url.searchParams.get("tag") || undefined;
  const archived = url.searchParams.get("archived") === "true";

  try {
    const notes = await convex.query(api.notes.list, {
      tag,
      archived,
    });
    return json(notes);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to fetch notes", 500);
  }
}

/**
 * POST /api/notes
 * Create a new note. Returns the new note ID.
 */
export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);

  const convex = convexFor(token);

  const body = await req.json().catch(() => ({}));
  const { title, content, tags } = body as {
    title?: string;
    content?: string;
    tags?: string[];
  };

  try {
    const id = await convex.mutation(api.notes.create, {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && { tags }),
    });
    return json({ id }, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to create note", 500);
  }
}
