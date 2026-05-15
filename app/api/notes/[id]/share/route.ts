import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, bearerToken, convexFor } from "../../../_lib";
import { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/notes/:id/share
 * Enable public sharing for a note. Generates a shareId if one doesn't exist.
 * Returns the shareId and a ready-to-use share URL.
 *
 * Response: { shareId: string, shareUrl: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);
  const convex = convexFor(token);

  const { id } = await params;

  try {
    const shareId = await convex.mutation(api.share.setPublic, {
      id: id as Id<"notes">,
      isPublic: true,
    });
    if (!shareId) return error("Failed to generate share link", 500);

    const origin = new URL(req.url).origin;
    return json({ shareId, shareUrl: `${origin}/share/${shareId}` });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to share note", 500);
  }
}

/**
 * DELETE /api/notes/:id/share
 * Disable public sharing for a note. The shareId is preserved so re-enabling
 * reuses the same link.
 *
 * Response: { success: true }
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
    await convex.mutation(api.share.setPublic, {
      id: id as Id<"notes">,
      isPublic: false,
    });
    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to unshare note", 500);
  }
}
