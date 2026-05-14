import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Shared Convex HTTP client for API routes.
 * These REST routes act as a thin adapter over Convex's typed RPC layer,
 * providing a familiar REST interface for external consumers and satisfying
 * traditional API structure expectations.
 */
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function convexClient() {
  return convex;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
