import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { json, error } from "../_lib";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/notes
 * Returns the authenticated user's notes (owned + shared).
 * Query params: ?tag=work&archived=true
 */
export async function GET(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);

  convex.setAuth(token);

  const url = new URL(req.url);
  const tag = url.searchParams.get("tag") || undefined;
  const archived = url.searchParams.get("archived") === "true";

  try {
    const notes = await convex.query(api.notes.list, {
      tag,
      archived,
    });
    return json(notes);
  } catch (e: any) {
    return error(e.message || "Failed to fetch notes", 500);
  }
}

/**
 * POST /api/notes
 * Create a new note. Returns the new note ID.
 */
export async function POST(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return error("Not authenticated", 401);

  convex.setAuth(token);

  try {
    const id = await convex.mutation(api.notes.create, {});
    return json({ id }, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create note", 500);
  }
}
