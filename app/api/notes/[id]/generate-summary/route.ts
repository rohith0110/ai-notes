import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { json, error } from "../../../_lib";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/notes/:id/generate-summary
 * Trigger AI generation for a note.
 * Body: { kinds?: ("summary"|"title"|"actions"|"tags")[], force?: boolean }
 *
 * Example:
 *   POST /api/notes/abc123/generate-summary
 *   { "kinds": ["summary", "title", "actions", "tags"], "force": true }
 *
 * Response:
 *   { "title": "Sprint Planning Notes", "summary": "...", "actionItems": [...] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);
  convex.setAuth(token);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const result = await convex.action(api.ai.generate, {
      noteId: id as Id<"notes">,
      kinds: body.kinds ?? ["summary", "title", "actions", "tags"],
      force: body.force ?? true,
      applyTitle: body.applyTitle,
    });
    return json(result);
  } catch (e: any) {
    return error(e.message || "AI generation failed", 500);
  }
}
