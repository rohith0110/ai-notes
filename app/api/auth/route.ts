import { json } from "../_lib";

/**
 * POST /api/auth/signup
 * POST /api/auth/login
 *
 * Authentication is handled entirely by Clerk's hosted modal flow.
 * These endpoints exist as documentation stubs to map to the suggested
 * REST shape. In practice, Clerk manages signup/login/session via its
 * own API and JS SDK — no custom auth endpoints are needed.
 */
export async function POST() {
  return json({
    message:
      "Authentication is managed by Clerk. Use the Clerk SDK or the sign-in modal to authenticate. Sessions are persisted via secure cookies.",
    docs: "https://clerk.com/docs",
  });
}
