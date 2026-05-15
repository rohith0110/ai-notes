import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

/**
 * Helpers for the REST API routes.
 *
 * These routes are a thin adapter over Convex's typed RPC layer. They are
 * intentionally NOT covered by Clerk middleware (see `proxy.ts`): the caller
 * passes a Clerk JWT as a Bearer token, and we forward that exact token to
 * Convex, which validates it against `convex/auth.config.ts`. This guarantees
 * the token minted in the browser is the same token Convex authenticates.
 */

/** Extract the raw JWT from an `Authorization: Bearer <token>` header. */
export function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Create a fresh Convex client for this request. Passing the caller's token
 * makes Convex enforce auth (via the "convex" JWT template). A new client per
 * request avoids cross-request auth bleed from a shared mutable client.
 */
export function convexFor(token?: string | null) {
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) client.setAuth(token);
  return client;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
