import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, bearerToken, convexFor } from "../../../_lib";

/**
 * POST /api/shared/:shareId/request
 * Request edit access to a shared note. Requires authentication.
 * Body: { message?: string }
 *
 * The note owner will receive a real-time notification and can approve/deny.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);
  const convex = convexFor(token);

  const { shareId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    await convex.mutation(api.share.requestAccess, {
      shareId,
      message: body.message,
    });
    return json({ success: true, status: "pending" }, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to request access", 500);
  }
}
