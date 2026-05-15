/**
 * Integration tests for the sharing API endpoints.
 *
 * Usage:
 *   node scripts/test-share-api.mjs
 *
 * Environment variables:
 *   BASE_URL    — base URL of the running dev/prod server
 *                 (default: http://localhost:3000)
 *   TEST_TOKEN  — Clerk JWT minted with { template: "convex" }
 *                 Get one from the browser console:
 *                 await window.Clerk.session.getToken({ template: "convex" })
 *
 * Tests that require a token are automatically skipped when TEST_TOKEN is
 * not set. Unauthenticated error-path tests always run.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.TEST_TOKEN ?? null;

if (!TOKEN) {
  console.log(
    "\nℹ️  TEST_TOKEN not set — authenticated tests will be skipped.\n" +
      "   Get a token from the browser console:\n" +
      "   await window.Clerk.session.getToken({ template: \"convex\" })\n" +
      "   Then run: TEST_TOKEN=<token> node scripts/test-share-api.mjs\n",
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

// ---------------------------------------------------------------------------
// Unauthenticated guard — always runs, no token needed
// ---------------------------------------------------------------------------

describe("Unauthenticated guard", () => {
  test("POST /api/notes/:id/share returns 401", async () => {
    const r = await req("POST", "/api/notes/fakeid/share");
    assert.equal(r.status, 401, `Expected 401, got ${r.status}`);
    assert.equal(typeof r.body?.error, "string", "Response must have error field");
  });

  test("DELETE /api/notes/:id/share returns 401", async () => {
    const r = await req("DELETE", "/api/notes/fakeid/share");
    assert.equal(r.status, 401, `Expected 401, got ${r.status}`);
    assert.equal(typeof r.body?.error, "string");
  });

  test("POST /api/shared/:shareId/request returns 401", async () => {
    const r = await req("POST", "/api/shared/fakeid/request", {
      message: "test",
    });
    assert.equal(r.status, 401, `Expected 401, got ${r.status}`);
    assert.equal(typeof r.body?.error, "string");
  });

  test("GET /api/notes (no token) returns 401", async () => {
    const r = await req("GET", "/api/notes");
    assert.equal(r.status, 401);
  });
});

// ---------------------------------------------------------------------------
// Invalid resource — runs without a token for the public endpoint,
// and with a token (if available) for the authenticated one
// ---------------------------------------------------------------------------

describe("Invalid resource handling", () => {
  test("GET /api/shared/nonexistent returns 404 with error field", async () => {
    const r = await req("GET", "/api/shared/thisiddoesnotexist99999");
    assert.equal(r.status, 404, `Expected 404, got ${r.status}`);
    assert.equal(typeof r.body?.error, "string");
  });

  test(
    "POST /api/shared/nonexistent/request returns 404",
    { skip: !TOKEN ? "TEST_TOKEN not set" : false },
    async () => {
      const r = await req(
        "POST",
        "/api/shared/thisiddoesnotexist99999/request",
        { message: "test" },
        TOKEN,
      );
      assert.equal(r.status, 404, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`);
      assert.equal(typeof r.body?.error, "string");
    },
  );
});

// ---------------------------------------------------------------------------
// Full sharing flow — requires TEST_TOKEN
// ---------------------------------------------------------------------------

describe(
  "Share flow (enable → read → request → disable)",
  { skip: !TOKEN ? "TEST_TOKEN not set" : false },
  () => {
    const state = { noteId: null, shareId: null, shareUrl: null };

    before(async () => {
      // Create a throw-away note for the tests
      const r = await req(
        "POST",
        "/api/notes",
        { title: "Integration Test — Share", content: "## Test note" },
        TOKEN,
      );
      assert.equal(r.status, 201, `Setup failed (create note): ${JSON.stringify(r.body)}`);
      assert.ok(r.body?.id, "Response must include id");
      state.noteId = r.body.id;
    });

    after(async () => {
      // Best-effort cleanup
      if (state.noteId) {
        await req("DELETE", `/api/notes/${state.noteId}`, undefined, TOKEN);
      }
    });

    // 1. Enable sharing
    test("POST /api/notes/:id/share returns 200 with shareId and shareUrl", async () => {
      const r = await req("POST", `/api/notes/${state.noteId}/share`, undefined, TOKEN);
      assert.equal(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      assert.equal(typeof r.body?.shareId, "string", "Response must include shareId");
      assert.equal(typeof r.body?.shareUrl, "string", "Response must include shareUrl");
      assert.ok(
        r.body.shareUrl.includes(r.body.shareId),
        "shareUrl must contain the shareId",
      );
      state.shareId = r.body.shareId;
      state.shareUrl = r.body.shareUrl;
    });

    // 2. Fetch the shared note publicly (no auth)
    test("GET /api/shared/:shareId returns 200 with note content (no auth)", async () => {
      const r = await req("GET", `/api/shared/${state.shareId}`);
      assert.equal(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      assert.equal(typeof r.body?.title, "string", "Response must include title");
      assert.equal(typeof r.body?.content, "string", "Response must include content");
    });

    // 3. Owner tries to request access to their own note — must be 403, not 500
    test(
      "POST /api/shared/:shareId/request by owner → 403 with structured error (not 500)",
      async () => {
        const r = await req(
          "POST",
          `/api/shared/${state.shareId}/request`,
          { message: "Automated API access request test" },
          TOKEN,
        );
        // This is correct rejection, not a server crash — the test PASSES on 403
        assert.equal(
          r.status,
          403,
          `Expected 403 (business rule), got ${r.status}: ${JSON.stringify(r.body)}`,
        );
        assert.equal(
          typeof r.body?.error,
          "string",
          "Must return structured { error: string }",
        );
        assert.match(r.body.error, /own/i, 'Error message should mention "own"');
      },
    );

    // 4. Disable sharing
    test("DELETE /api/notes/:id/share returns 200", async () => {
      const r = await req("DELETE", `/api/notes/${state.noteId}/share`, undefined, TOKEN);
      assert.equal(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body?.success, true);
    });

    // 5. Shared note is gone after unshare
    test("GET /api/shared/:shareId after unshare → 404", async () => {
      const r = await req("GET", `/api/shared/${state.shareId}`);
      assert.equal(
        r.status,
        404,
        `Expected 404 after unshare, got ${r.status}: ${JSON.stringify(r.body)}`,
      );
    });

    // 6. Re-enabling should reuse the same shareId
    test("POST /api/notes/:id/share again reuses existing shareId", async () => {
      const r = await req("POST", `/api/notes/${state.noteId}/share`, undefined, TOKEN);
      assert.equal(r.status, 200);
      assert.equal(
        r.body?.shareId,
        state.shareId,
        "Re-sharing the same note must return the same shareId",
      );
      // Clean up: unshare again
      await req("DELETE", `/api/notes/${state.noteId}/share`, undefined, TOKEN);
    });
  },
);
