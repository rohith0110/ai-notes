# Inkwell — AI Notes Workspace

A collaborative, AI-powered notes app built for the Peblo full-stack take-home challenge. Capture thoughts in markdown. Let AI distill them into summaries, action items, and titles. Share a single link and have collaborators request edit access in real time.

**Stack:** Next.js 16 (App Router, Turbopack) · Convex (database + realtime + actions) · Clerk (auth, modal flow) · Google Gemini 2.5 Flash Lite · Tailwind 4

---

## Highlights

- **Black-and-white editorial UI** — Vercel-grade hairline borders, restrained motion, monochrome with white-on-black accents
- **Markdown editor with live preview toggle** — toolbar, keyboard shortcuts, auto-indenting lists
- **AI insights, conservative on tokens**
  - Title regenerates on document blur **only if** the user hasn't manually set the title **and** content has drifted >30% since last generation (FNV-style hash on length-normalized text)
  - Summary + action items are explicit ("Generate insights" button), with a `stale` badge once content drifts >35%
  - One Gemini call returns all three artifacts as strict JSON
- **Forgiving, ranked search** — Convex full-text search across title + body, re-ranked client-side: title-prefix > title-substring > tag > body, with a recency boost
- **Public sharing + request-access flow** — toggle a note public to mint a `/share/[shareId]` URL. Visitors can read; signed-in visitors can request edit access; the owner approves/denies in a real-time notifications bell
- **Productivity dashboard** — total notes, AI calls, public count, top tags, weekly sparkline (edits + AI)
- **Combined sign-in / sign-up modal** — Clerk's hosted UI inside our own modal shell, dark-themed
- **Keyboard shortcuts** — `⌘N` new note · `⌘K` focus search · `⌘/` toggle preview · `⌘.` toggle AI panel · `⌘B` bold · `⌘I` italic · `⌘K` insert link

---

## Architecture at a glance

```
Next.js (App Router)              Convex (serverless functions)
─────────────────────             ───────────────────────────────
app/                              convex/
  page.tsx          (public)        schema.ts        (5 tables)
  share/[shareId]/  (public)        users.ts         (auth-aware upsert)
  notes/            (protected)     notes.ts         (CRUD, archive, AI patch)
  dashboard/        (protected)     share.ts         (public toggle, request flow)
proxy.ts            (Clerk gate)    search.ts        (text + filter re-rank)
                                    ai.ts            (Gemini action, drift gating)
                                    notifications.ts (owner's pending requests)
                                    insights.ts      (dashboard aggregate)
```

### Data model

- **`users`** — Clerk → Convex shadow record, upserted by `users.ensureCurrentUser` on first authed call (no webhook needed; works for both Clerk Frontend and JWT-via-Convex flows)
- **`notes`** — single source of truth: markdown `content`, derived `contentText` for search, tags, `isPublic` + `shareId`, AI artifacts + hash fingerprints to decide when to regenerate
- **`collaborators`** — `(noteId, userId, role)` — created when an owner approves a share request
- **`shareRequests`** — `(noteId, requesterId, ownerId, status, message)` — drives the notifications bell
- **`activityLog`** — `(userId, noteId, action, createdAt)` — feeds the weekly activity sparkline

### Why Convex?
- Queries are reactive by default → the notifications bell, sidebar list, and editor all live-update without any client polling or websocket plumbing
- Built-in full-text search means we get forgiving keyword search out of the box, and we re-rank for relevance client-side
- Actions can call out to Gemini securely from the server side without exposing the key to the browser

### AI generation strategy

The challenge asked for AI summaries, action items, and suggested titles. We wanted them to feel helpful **without burning budget**.

| Artifact | Trigger | Gating |
|---------|---------|--------|
| Title | On note blur / unmount | Only if user hasn't manually edited the title **and** content hash drift > 30% **and** word count > ~10 |
| Summary | "Generate insights" button | Manual primary path. Skips if drift < 35% unless `force` is passed |
| Action items | "Generate insights" button | Same drift gate as summary; returned in the same Gemini call |

Implementation:
- `lib/utils.ts` exports `contentHash` (FNV-1a + length suffix) and `contentDrift`. Cheap, stable enough to gate regeneration.
- `convex/ai.ts` mirrors the same logic on the server (`force: true` from the UI bypasses the gate when the user explicitly clicks Regenerate).
- One `generate` action handles all three kinds in a single Gemini call using `responseSchema` for strict JSON output.
- `aiUsageCount` and `activityLog` entries are written on every successful generation, surfaced in the dashboard.

### Search

- `search.searchNotes` queries both `search_title` and `search_content` Convex indexes, merges hits, and includes notes shared with the user.
- The sidebar then re-ranks via `lib/fuzzy.ts` so:
  - exact title match → 1000
  - title prefix → 600
  - title substring → 350
  - subsequence-style fuzzy title (typos / partials) → up to 180
  - tag match → 80–220
  - body match → 70 (+40 if early in the document)
  - recency boost up to 40 points
- Search is debounced 200ms so typing feels instant.

### Sharing & request-access flow

1. Owner opens the share dialog, toggles **Public**. Server mints a 14-char `shareId`.
2. Visitor opens `/share/{shareId}` — a public Convex query returns title, content, tags, AI summary (if any). No auth required.
3. Visitor clicks **Request edit access**:
   - If anonymous → opens the combined sign-in/sign-up modal with `redirectTo` back to the share page
   - If signed in → `share.requestAccess` mutation creates a `shareRequests` row
4. Owner's notifications bell (header) updates in real-time via Convex reactivity. They Approve → collaborator inserted with `editor` role → requester sees the note in their sidebar.
5. Convex's live queries propagate the approval back to the requester's open share page within ~100ms.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- A Clerk application (free tier)
- A Convex project (free tier)
- A Google AI Studio API key for Gemini ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### 1. Install

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Clerk + Convex values:

```bash
cp .env.example .env.local
```

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
| `CONVEX_DEPLOYMENT` | Convex dashboard or written by `npx convex dev` first run |
| `NEXT_PUBLIC_CONVEX_URL` | Convex dashboard or written by `npx convex dev` first run |
| `NEXT_PUBLIC_APP_URL` | The URL your dev server runs on (default `http://localhost:3000`) |

### 3. Wire Clerk → Convex auth

Convex authenticates users using a JWT minted by Clerk. Two values need to be set on **the Convex deployment** (not in `.env.local`):

```bash
# Get this from your Clerk publishable key — it's the issuer URL of your Clerk instance
# e.g. https://joint-malamute-12.clerk.accounts.dev
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://YOUR-CLERK-FRONTEND-API"
```

Then in the Clerk dashboard:
1. Open **JWT Templates → New template → Convex**
2. Set the application name to `convex` (matches `convex/auth.config.ts`)
3. Save

### 4. Add the Gemini key to Convex

The AI action runs on Convex servers, so the Gemini key must live there:

```bash
npx convex env set GEMINI_API_KEY "your-google-ai-studio-key"
```

### 5. Push the schema + functions and start dev

```bash
# Convex schema + functions live-reload in one terminal:
npx convex dev

# Next.js dev server in another:
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Next.js 16 note:** the middleware file is `proxy.ts` at the repo root (Next 16 renamed `middleware.ts` → `proxy.ts`). If you fork this repo onto Next 15 or earlier, rename `proxy.ts` to `middleware.ts` — the code itself doesn't change.

### Testing the app

1. Click **Start writing** on the landing → Clerk modal opens (combined sign-in / sign-up).
2. After auth you land on `/notes` — workspace is empty.
3. Create a note (`⌘N` or the **New note** button). Type some content.
4. Title and tags autosave. Add `#tags` via the tag input.
5. Press `⌘/` to toggle Markdown preview.
6. Open the AI panel (or `⌘.`) and click **Generate insights** → summary, action items, suggested title appear.
7. Click **Share** → toggle public → copy the link.
8. Open the share link in an incognito window → see the read-only public view.
9. Click **Request edit access** → log in as a different Clerk account → request submitted.
10. Switch back to the owner's tab → the notifications bell shows a badge → **Approve** → collaborator added.

---

## Project structure

```
.
├── app/                         # Next.js App Router
│   ├── page.tsx                 # Landing
│   ├── layout.tsx               # Root layout (dark theme)
│   ├── providers.tsx            # Clerk + Convex + AuthModal + Toaster
│   ├── notes/                   # Protected: workspace
│   ├── dashboard/               # Protected: insights
│   └── share/[shareId]/         # Public: shared notes
├── proxy.ts                     # Clerk auth gate (Next 16 convention)
├── components/
│   ├── auth/                    # AuthModalProvider, UserSync
│   ├── landing/                 # Hero, Features, Workflow, CTA
│   ├── layout/                  # AppHeader, NotificationsBell
│   ├── notes/                   # NotesSidebar (search, tags, list)
│   ├── editor/                  # NoteEditor, AIPanel, ShareDialog, TagsInput, Markdown
│   ├── dashboard/               # StatCard, Sparkline
│   └── ui/                      # Button, Input, Dialog, Dropdown, Badge, Skeleton
├── convex/
│   ├── schema.ts                # 5 tables + 2 search indexes
│   ├── auth.config.ts           # Clerk JWT provider
│   ├── lib.ts                   # Server helpers (current user, access checks, activity log)
│   ├── users.ts                 # ensureCurrentUser (upsert)
│   ├── notes.ts                 # CRUD + archive + AI patch
│   ├── search.ts                # Full-text search
│   ├── share.ts                 # Public toggle, request, respond, collaborators
│   ├── ai.ts                    # Gemini action (drift-gated, JSON schema response)
│   ├── notifications.ts         # Pending share requests for owner
│   └── insights.ts              # Dashboard aggregate
├── lib/
│   ├── utils.ts                 # cn, time formatters, contentHash, contentDrift, countWords
│   └── fuzzy.ts                 # Search relevance ranker
└── sample-outputs/              # Example AI responses + API shapes
```

---

## Endpoint reference

Convex functions are typed RPC, but they map cleanly to the suggested REST shape:

| Suggested REST | Convex equivalent | Notes |
|---|---|---|
| `POST /auth/signup`, `POST /auth/login` | Handled by Clerk | Modal sign-in/up combined |
| `GET /notes` | `query notes.list` | Owned + shared with user, optional `tag` filter, `archived` flag |
| `POST /notes` | `mutation notes.create` | Returns new `Id<"notes">` |
| `PATCH /notes/:id` | `mutation notes.update` | Title, content, tags, `titleIsUserSet` |
| `POST /notes/:id/generate-summary` | `action ai.generate` | `kinds: ["summary"\|"title"\|"actions"]`, `force?` |
| `GET /shared/:shareId` | `query notes.getByShareId` | Public, no auth |
| `POST /shared/:shareId/request` | `mutation share.requestAccess` | Auth required |
| `POST /shareRequests/:id/respond` | `mutation share.respondToRequest` | Approve/deny |

Sample request/response shapes are in [`sample-outputs/`](./sample-outputs).

---

## Trade-offs and intentional cuts

- **No CRDT real-time co-editing.** Convex auto-reactivity covers the "everyone sees updates" requirement, but two simultaneous editors on the same paragraph get last-write-wins on debounced save. A production app would layer Yjs over the document; the schema supports it but the editor doesn't.
- **No Clerk webhook for user sync.** `ensureCurrentUser` runs from the client on first authed render, which is sufficient for this scope. A production app would add a Clerk → Convex HTTP webhook (svix is already installed) for canonical sync.
- **Markdown editor is textarea + react-markdown.** Picked over Tiptap to keep dependencies small and styling fully ours. Toolbar inserts syntax around selection; preview toggle re-renders the full document.
- **Search index is on `title` and `contentText` separately.** Convex search indexes have one search field each, so we issue two queries and merge.

---

## Sample outputs

See [`sample-outputs/`](./sample-outputs):
- `api-responses.json` — example responses from each major Convex function
- `ai-summaries.json` — three real Gemini outputs (short, medium, long source content)
