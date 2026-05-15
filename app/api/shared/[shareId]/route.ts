import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, convexFor } from "../../_lib";

/**
 * GET /api/shared/:shareId
 * Fetch a publicly shared note. No authentication required.
 *
 * Response:
 *   { "title": "...", "content": "...", "tags": [...], "aiSummary": "..." }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const convex = convexFor();

  try {
    const note = await convex.query(api.notes.getByShareId, { shareId });
    if (!note) return error("Shared note not found", 404);
    return json(note);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to fetch shared note", 500);
  }
}
