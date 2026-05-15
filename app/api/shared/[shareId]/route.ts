import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { json, error } from "../../_lib";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

  try {
    const note = await convex.query(api.notes.getByShareId, { shareId });
    if (!note) return error("Shared note not found", 404);
    return json(note);
  } catch (e: any) {
    return error(e.message || "Failed to fetch shared note", 500);
  }
}
