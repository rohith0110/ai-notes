import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, bearerToken, convexFor, convexErrStatus } from "../../../_lib";

/**
 * POST /api/shared/:shareId/request
 * Request edit access to a shared note. Requires authentication.
 * Body: { message?: string }
 *
 * HTTP responses:
 *   201 { success: true, status: "requested" }         — new request created
 *   200 { success: true, status: "already_collaborator" | "approved" }
 *   409 { success: true, status: "already_pending" }   — duplicate request
 *   401 { error: "..." }                               — not authenticated
 *   403 { error: "..." }                               — caller is the owner
 *   404 { error: "..." }                               — note not found / not public
 *   500 { error: "..." }                               — unexpected server error
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

  console.log(`[share/request] shareId=${shareId}`);

  try {
    const result = await convex.mutation(api.share.requestAccess, {
      shareId,
      message: body.message,
    });

    console.log(`[share/request] outcome=${result.status} shareId=${shareId}`);

    const httpStatus: Record<string, number> = {
      requested: 201,
      already_pending: 409,
      already_collaborator: 200,
      approved: 200,
    };
    return json(
      { success: true, status: result.status },
      httpStatus[result.status] ?? 200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to request access";
    const status = convexErrStatus(msg);
    if (status >= 500) console.error(`[share/request] unexpected error shareId=${shareId}:`, msg);
    else console.log(`[share/request] business error ${status} shareId=${shareId}: ${msg}`);
    return error(msg, status);
  }
}
