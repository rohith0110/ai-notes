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

/**
 * Map a Convex mutation/query error message to the appropriate HTTP status.
 * Convex surfaces thrown Error messages verbatim on the client, so we match
 * against the message text set in the mutation handlers.
 */
export function convexErrStatus(msg: string): number {
  if (/not found/i.test(msg)) return 404;
  if (/already own/i.test(msg)) return 403;
  if (/not allowed|forbidden/i.test(msg)) return 403;
  if (/access denied/i.test(msg)) return 403;
  if (/not authenticated|unauthenticated|invalid.*auth/i.test(msg)) return 401;
  return 500;
}
