import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { json, error, bearerToken, convexFor } from "../../../_lib";
import { Id } from "@/convex/_generated/dataModel";

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
  const token = bearerToken(req);
  if (!token) return error("Not authenticated", 401);
  const convex = convexFor(token);

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
  } catch (e) {
    return error(e instanceof Error ? e.message : "AI generation failed", 500);
  }
}
