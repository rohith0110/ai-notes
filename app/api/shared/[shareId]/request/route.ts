import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { json, error } from "../../../_lib";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);
  convex.setAuth(token);

  const { shareId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    await convex.mutation(api.share.requestAccess, {
      shareId,
      message: body.message,
    });
    return json({ success: true, status: "pending" }, 201);
  } catch (e: any) {
    return error(e.message || "Failed to request access", 500);
  }
}
