# Project Deep-Dive: `ai-notes` ("Inkwell")

> Audience: an AI agent that needs a complete mental model of this codebase without reading it. Every feature, screen, component, button, backend function, and design trade-off is described below.

---

## 1. One-paragraph summary

**Inkwell** is a collaborative, AI-powered markdown notes workspace. A signed-in user writes notes in a markdown textarea with live preview, and the app auto-generates a title, summary, action items, and topic tags from the content using Google Gemini. Notes can be made public via a share link; anonymous visitors read them, signed-in visitors can *request edit access*, and the owner approves/denies requests from a real-time notifications bell. Approved collaborators edit the same note with changes propagating instantly between browsers (no manual refresh). A dashboard surfaces productivity stats. It was built as a full-stack take-home challenge (`Submissions/fullstack_challenge_Rohith-Rathod.zip`).

- **Live demo:** `notes.itsrohith.dev`
- **Repo root:** `D:\Coding\Randoms\ai-notes`

## 2. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16.2.6** (App Router, React 19.2) | Middleware file is `proxy.ts` at repo root (Next 16 renamed `middleware.ts`→`proxy.ts`) |
| Backend / DB | **Convex 1.38** (serverless functions + reactive document DB) | Schema, queries, mutations, actions all in `convex/` |
| Auth | **Clerk** (`@clerk/nextjs` 7.x, `@clerk/themes`) | Modal sign-in, JWT session; Convex validates Clerk JWT via "convex" JWT template |
| AI | **Google Gemini** via `@google/genai` 2.2 | Model `gemini-2.5-flash-lite`, structured JSON output |
| Styling | **Tailwind CSS 4** (`@tailwindcss/postcss`) | Dark theme, zinc/black palette, custom animations |
| Markdown | `react-markdown` 10 + `remark-gfm` + `rehype-highlight` | GitHub-flavored markdown, syntax highlighting |
| Icons | `lucide-react` | |
| Toasts | `sonner` | All success/error feedback |
| Misc | `nanoid`, `clsx`, `tailwind-merge`, `svix` (Clerk webhook signature lib, present but webhook not wired) |
| Package manager | **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) |
| Language | **TypeScript 6** |

**Scripts:** `pnpm dev` (Next), `npx convex dev` (Convex live-reload), `pnpm build`, `pnpm lint`, `pnpm test:api` (runs `scripts/test-share-api.mjs`).

**Required env vars** (`.env.local`): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_APP_URL`. Server-side Convex env (set via `npx convex env set`): `CLERK_JWT_ISSUER_DOMAIN`, `GEMINI_API_KEY` (the Gemini key lives on Convex, **never** in the Next bundle).

## 3. Repository layout

```
ai-notes/
├─ app/                      Next.js App Router
│  ├─ page.tsx               Landing page (composes landing/* components)
│  ├─ layout.tsx             Root layout
│  ├─ providers.tsx          Clerk + Convex providers, user sync
│  ├─ globals.css            Tailwind + custom keyframes
│  ├─ dashboard/             Productivity dashboard (layout + page)
│  ├─ notes/                 Workspace: layout (sidebar shell) + index + [id]/page
│  ├─ share/[shareId]/       Public read-only note view
│  └─ api/                   REST adapter routes over Convex (Bearer-token auth)
│     ├─ _lib.ts             Shared helpers (token extraction, Convex client, error mapping)
│     ├─ auth/route.ts
│     ├─ notes/route.ts                       GET list / POST create
│     ├─ notes/[id]/route.ts                  GET / PATCH / DELETE one note
│     ├─ notes/[id]/generate-summary/route.ts POST → ai.generate
│     ├─ notes/[id]/share/route.ts            share toggle
│     ├─ shared/[shareId]/route.ts            public read
│     └─ shared/[shareId]/request/route.ts    request access
├─ components/
│  ├─ auth/        convex-auth-banner, user-sync
│  ├─ dashboard/   sparkline, stat-card
│  ├─ editor/      note-editor, ai-panel, markdown-preview, markdown-toolbar, share-dialog, tags-input
│  ├─ landing/     nav, hero, features, workflow, cta, footer
│  ├─ layout/      app-header, notifications-bell
│  ├─ notes/       notes-layout-shell, notes-sidebar
│  └─ ui/          badge, button, dialog, dropdown, input, skeleton (design-system primitives)
├─ convex/
│  ├─ schema.ts        5 tables (see Data Model)
│  ├─ notes.ts         CRUD, archive, search-text mirror, internal AI patch
│  ├─ ai.ts            "use node" Gemini action with drift gating
│  ├─ share.ts         public toggle, access requests, collaborator mgmt
│  ├─ search.ts        full-text candidate fetch
│  ├─ insights.ts      dashboard aggregation
│  ├─ notifications.ts pending share requests for owner
│  ├─ users.ts         Clerk→Convex user shadow records
│  ├─ lib.ts           auth/access helpers, activity logging
│  └─ auth.config.ts   Clerk JWT issuer config
├─ lib/                fuzzy.ts (ranking), platform.ts + use-platform.ts (OS shortcuts), utils.ts
├─ proxy.ts            Clerk middleware (route protection)
├─ scripts/test-share-api.mjs   API integration test
└─ Submissions/        Challenge deliverables (zip, APIs, video walkthrough)
```

## 4. Data model (Convex — `convex/schema.ts`)

Five tables. All timestamps are `number` (epoch ms).

### `users`
Shadow record of a Clerk identity. Fields: `clerkId`, `email`, `name?`, `imageUrl?`, `createdAt`. Indexes: `by_clerk_id`, `by_email`. Created/updated lazily by `users.ensureCurrentUser` (no Clerk webhook — see trade-offs).

### `notes`
The core entity.
- `ownerId` → users
- `title`, `content` (markdown source), `contentText` (plain-text mirror, used for search & word count), `tags[]`, `category?`
- `isArchived`, `isPublic`, `shareId?` (14-char random alnum id)
- `wordCount`, `titleIsUserSet` (true once the user manually edits the title — locks out AI title overwrite)
- AI artifacts: `aiSummary?`, `aiActionItems?[]`, `aiSuggestedTitle?`
- Drift trackers: `lastTitleHash?`, `lastSummaryHash?` (FNV-1a hash + length, used to decide whether AI regen is warranted)
- `aiUsageCount`, `createdAt`, `updatedAt`
- Indexes: `by_owner`, `by_owner_archived_updated`, `by_share_id`
- **Search indexes:** `search_content` (on `contentText`, filter by owner+archived), `search_title` (on `title`, same filters)

### `collaborators`
`(noteId, userId, role)` where role ∈ `viewer | editor`, plus `addedAt`. Indexes `by_note`, `by_user`, `by_note_user`. Created when an owner approves an access request.

### `shareRequests`
Pending/approved/denied access requests. `noteId`, `ownerId`, `requesterId`, `status`, `message?`, `createdAt`, `respondedAt?`. Indexes `by_owner_status`, `by_note`, `by_requester_note`. Denied requests can be re-opened (status patched back to `pending`).

### `activityLog`
Append-only event stream feeding the dashboard sparkline. `userId`, `noteId?`, `action` (one of: created, edited, archived, unarchived, deleted, shared, unshared, ai_summary, ai_title, ai_actions, collaborator_added), `createdAt`. Index `by_user_date`.

## 5. Backend functions (Convex)

### `convex/lib.ts` — shared helpers
- `getCurrentUser` / `requireCurrentUser` — resolve the Convex user from the Clerk identity (`ctx.auth.getUserIdentity()` → lookup by `clerkId`).
- `getAccessibleNote(noteId, userId)` → `{note, role}` where role is `owner | editor | viewer`, or null if no access.
- `requireWriteAccess` — throws "Read-only access" for viewers, "access denied" otherwise.
- `logActivity` — inserts an `activityLog` row.

### `convex/users.ts`
- `ensureCurrentUser` (mutation) — upsert the user shadow record; refreshes name/email/image if Clerk identity changed. Called client-side on first render (via `components/auth/user-sync.tsx`).
- `currentUser` (query), `getUsersByIds` (query).

### `convex/notes.ts`
- `list({archived?, tag?})` — owned notes (indexed) **plus** notes the user collaborates on, merged and sorted by `updatedAt` desc, optional tag filter.
- `allTags()` — tag → count map over the user's active notes, sorted by count.
- `get({id})` — returns the note **with `viewerRole`** appended (owner/editor/viewer); null if no access.
- `getByShareId({shareId})` — public projection (title, content, tags, updatedAt, aiSummary, aiActionItems, ownerName). Returns null if not public.
- `create({title?, content?, tags?})` — inserts note, derives `contentText` + `wordCount`, sets `titleIsUserSet` if a title was passed, logs `created`.
- `update({id, title?, content?, tags?, titleIsUserSet?})` — partial patch; recomputes `contentText`/`wordCount` when content changes; **per-field** so a collaborator editing content does not clobber another user's title/tag edits; logs `edited`.
- `archive({id, archived})` — owner-only; logs archived/unarchived.
- `remove({id})` — owner-only; cascade-deletes collaborators + shareRequests, then the note; logs `deleted`.
- `patchAi` (**internalMutation**) — called by the AI action to write back generated artifacts, bump `aiUsageCount`, optionally apply the suggested title (only if `!titleIsUserSet`), merge AI tags, store drift hashes, log the `ai_*` action.

Helper functions in this file: `plainTextFromMarkdown` (strips code fences, inline code, images, link syntax, md punctuation), `countWords`, `listAccessibleNoteIds`.

### `convex/ai.ts` — the AI engine (`"use node"` action)
- Model: `gemini-2.5-flash-lite`, `temperature 0.4`, `maxOutputTokens 600`, **structured output** via `responseSchema` (object: `title`, `summary`, `actionItems[]`, `tags[]`, all required), `responseMimeType: application/json`.
- System prompt rules: title 3–8 words no punctuation; summary 1–3 sentences ≤~60 words; 0–6 action items (verb-first); 1–5 lowercase hyphenated topic tags (no generic tags like "note"); empty output for empty notes.
- **Drift gating** is the key intelligence:
  - `contentHash` = FNV-1a hash + `:length` of normalized plain text.
  - `hashDrift(prev, next)` returns 0 if identical, 1 if no prior hash, else a length-delta ratio + 0.15 floor (capped at 1).
  - On `generate({noteId, kinds[], force?, applyTitle?})`: skips title regen if `titleIsUserSet` or title drift < 0.30; skips summary if a summary exists and drift < 0.35; skips actions under the same summary-drift gate. `force: true` (user pressed Regenerate) bypasses all gating. Notes under 20 chars are skipped unless forced.
  - Output is sanitized/clamped (title ≤80 chars, summary ≤800, ≤8 action items, ≤5 tags lowercased+hyphenated) then written via `internal.notes.patchAi`. AI tags are **merged** with existing tags (deduped), never replaced.
- Content is truncated to 12,000 chars before sending to Gemini.

### `convex/share.ts`
- `setPublic({id, isPublic})` — owner-only; mints a 14-char `shareId` on first enable; logs shared/unshared; returns the shareId.
- `requestAccess({shareId, message?})` — signed-in visitor requests edit access. Handles: already owner (throws), already collaborator (`already_collaborator`), existing pending (`already_pending`), existing approved (`approved`), previously denied (re-opens to pending), otherwise inserts a new pending `shareRequest`.
- `respondToRequest({requestId, approve, role?})` — owner-only; sets status approved/denied + `respondedAt`; on approve inserts a `collaborators` row (default role `editor`) and logs `collaborator_added`.
- `accessState({shareId})` — returns the caller's relationship to a shared note: `anon | owner | editor | viewer | requester(+requestStatus) | visitor`, plus `noteId` when they already have workspace access. Drives the share-page UI.
- `collaboratorsForNote({noteId})` — owner-only list of collaborators with user info.
- `removeCollaborator({collaboratorId})` — owner-only revoke.

### `convex/search.ts`
- `searchNotes({query, archived?, limit?})` — empty query returns latest owned notes; otherwise runs **two** Convex full-text searches (`search_title` + `search_content`), merges (title hits first, dedup), then also scans collaborator notes with a substring check. Returns a wide candidate set; **the client re-ranks** (see `lib/fuzzy.ts`).

### `convex/insights.ts`
- `dashboard()` — aggregates: total active notes, archived count, total words, public count, top 8 tags, 5 most-recent notes, total AI usage, last-7-days activity bucketed by day into `{day, edits, ai}`, and an AI-by-kind breakdown (summary/title/actions) for the week.

### `convex/notifications.ts`
- `pendingShareRequests()` — owner's pending requests joined with requester + note info; powers the bell badge.

## 6. Auth & routing model

- `proxy.ts` runs `clerkMiddleware`. Public routes: `/`, `/share/(.*)`, `/sign-in*`, `/sign-up*`. Everything else calls `auth.protect()` (redirects to Clerk sign-in).
- The matcher **intentionally excludes `/api/*`** and static assets. Reason (documented in code): API routes authenticate themselves via a Bearer token they forward to Convex; letting Clerk's dev-browser handshake run on them would rewrite non-browser requests (curl/Postman) into a 404 HTML page.
- `app/providers.tsx` wires `ClerkProvider` + `ConvexProviderWithClerk`; `components/auth/user-sync.tsx` calls `ensureCurrentUser` on first authenticated render (this is the "no webhook" user-provisioning path).

### REST API adapter (`app/api/**`)
A thin, optional REST surface over Convex RPC for external/automation use. `_lib.ts`:
- `bearerToken(req)` — parses `Authorization: Bearer <jwt>`.
- `convexFor(token)` — a **fresh** `ConvexHttpClient` per request with `setAuth(token)` (avoids cross-request auth bleed). The exact Clerk JWT is forwarded to Convex which validates it.
- `convexErrStatus(msg)` — maps Convex error message text to HTTP status (404 "not found", 403 "not allowed/own/access denied", 401 "not authenticated", else 500).

| Method | Endpoint | Convex mapping |
|---|---|---|
| GET | `/api/notes?tag=&archived=` | `notes.list` |
| POST | `/api/notes` | `notes.create` (201 + `{id}`) |
| GET | `/api/notes/:id` | `notes.get` |
| PATCH | `/api/notes/:id` | `notes.update` |
| DELETE | `/api/notes/:id` | `notes.remove` |
| POST | `/api/notes/:id/generate-summary` | `ai.generate` |
| GET | `/api/shared/:shareId` | `notes.getByShareId` |
| POST | `/api/shared/:shareId/request` | `share.requestAccess` |

`scripts/test-share-api.mjs` exercises these (logs saved in `Submissions`/sample-outputs).

## 7. Screens & UI walkthrough (every page, every button)

### 7.1 Landing page — `/` (`app/page.tsx`)
Composes `landing/` components in order: `LandingNav` → `Hero` → `Features` (id `#features`) → `Workflow` (id `#workflow`) → `CTA` → `LandingFooter`. Black background, marketing copy. Primary CTA "Start writing" opens the Clerk sign-in modal; on success the user lands on `/notes`. The brand icon is `Brandmark` (exported from `components/landing/nav`).

### 7.2 Notes workspace — `/notes` and `/notes/[id]`
Shell = `notes-layout-shell` + `notes-sidebar` (left) + `app-header` (top, contains `notifications-bell`) + editor (right).

**Sidebar (`components/notes/notes-sidebar.tsx`)** — the command center:
- **New note** button (top, full width, `Plus` icon) — creates an empty note and navigates to it. Shortcut: `Ctrl/⌘+N`.
- **Search input** (`id="sidebar-search"`, `Search` icon, `X` clear button) — 200ms-debounced; Convex full-text candidates re-ranked client-side. Shortcut to focus: `Ctrl/⌘+K`.
- **Two view tabs:** "All notes" (`Inbox` icon) / "Archived" (`Archive` icon).
- **Tags row** (when not multi-selecting): up to 12 tag chips with counts; clicking filters to that tag (toggle), plus a "clear" button.
- **Note list:** each `NoteItem` shows title, relative time, a 70-char content preview, and up to 3 `#tags` (+N overflow). A status dot (emerald = public, zinc = private) sits left; on hover/selection it morphs into a checkbox.
- **Multi-select / bulk bar:** selecting ≥1 note swaps the tags row for a bulk action bar: select-all toggle, "N selected" label, **Archive/Restore** (`Archive`/`ArchiveRestore`), **Generate AI** (`Sparkles`, runs all 4 kinds forced on each), **Delete** (`Trash2`, opens a portaled confirm dialog), and **Clear selection** (`X`, also `Esc`).
- **Per-note "⋯" context menu** (hover-revealed, portaled to body): **Archive/Restore**, **Generate AI**, **Delete** (with confirm dialog).
- **Footer:** "N active/archived notes" count, and a **Keyboard shortcuts** button (`Keyboard` icon) opening the shortcuts dialog.
- Mobile: sidebar is an off-canvas drawer with a backdrop; closes on navigation.

**Empty states:** distinct messaging for "no search matches" (shows the query), "nothing archived", and "no notes yet" (with a Create button).

**Note page (`app/notes/[id]/page.tsx`)** — loads `notes.get`; shows "loading note…", a "Note not found" panel (with **Back to notes**), or the `NoteEditor`.

**`components/editor/note-editor.tsx`** — the most complex component:
- **Top action bar:**
  - Save status pill: amber pulsing dot "Saving…" / emerald dot "Saved {relative time}".
  - Badges (xl screens): green **Public**, sky **Collaborator/View only**, amber **Read-only**.
  - **Write / Preview** segmented toggle (`Pencil`/`Eye`). Shortcut `Ctrl/⌘+/`.
  - **Share** button (owner only, `Share2`) → opens `ShareDialog`.
  - **AI panel toggle:** desktop is an inline toggle (`PanelRight`/`PanelRightClose`), mobile is a separate `Sparkles` button opening a slide-in sheet. Shortcut `Ctrl/⌘+.` toggles the desktop panel.
  - **"⋯" dropdown** (owner only): **Archive/Restore**, separator, **Delete note** (destructive → confirm dialog "Delete this note?" with Cancel / "Delete permanently").
- **Title input** — large; typing sets `titleIsUserSet=true` and marks title locally edited (this permanently stops AI from overwriting the title).
- **`TagsInput`** — chip editor for tags.
- **Markdown toolbar** (write mode, not read-only) + live word count ("N words · markdown").
- **Editor textarea** vs **`MarkdownPreview`** depending on view. Read-only notes show a "This note is read-only." placeholder.
- **Autosave:** 700ms debounce, only sends fields the user actually edited (`titleLocallyEdited`/`contentLocallyEdited`/`tagsLocallyEdited` refs). On failure: toast "Could not save".
- **Real-time collaboration sync:** a `useEffect` accepts server pushes for any field the user has *not* locally edited; locally-edited flags are cleared only when local === server (i.e. the save round-tripped) to avoid a race that would overwrite fresh keystrokes. This is the mechanism that makes two browsers stay in sync without polling (Convex query reactivity).
- **Undo/redo:** custom history stack (snapshots 800ms after typing stops, max 100 entries). `Ctrl/⌘+Z` undo, `Ctrl/⌘+Y` or `Ctrl/⌘+Shift+Z` redo.
- **Auto title/tags:** while typing, debounced 8s, and again on note exit — if not user-set, content ≥40 chars, and drift >30%, it calls `ai.generate(["title","tags"], applyTitle:true)`.
- **Mobile AI sheet:** slide-in overlay from the right with backdrop; body scroll locked while open; `X` to close.
- Delete confirmation dialog and `ShareDialog` are mounted here for owners.

**`components/editor/markdown-toolbar.tsx`** — buttons: **Bold** (`**`, `Ctrl/⌘+B`), **Italic** (`_`, `Ctrl/⌘+I`), **H1** (`# `), **H2** (`## `), **Bullet list** (`- `), **Numbered list** (`1. `), **Task** (`- [ ] `), **Quote** (`> `), **Inline code** (`` ` ``), **Link** (`[`…`](url)`). Exposes `applyShortcut` (Bold/Italic from keyboard) and `autoIndent` (Enter continues a list/task marker; empty marker line clears the bullet).

**`components/editor/ai-panel.tsx`** — "AI insights":
- Header with a **Generate / Regenerate** button (`Wand2`) that runs all four kinds forced.
- States: "Add more content" (note < 20 chars), `EmptyAi` (no artifacts yet, big **Generate insights** button), or sections.
- **Summary**, **Action items**, **Suggested title** sections — each has a `RefreshCw` per-section regenerate. A **"stale"** amber badge appears when content drifted past the threshold (summary 0.35 / title 0.30) since last generation. Suggested-title section notes "Your title overrides this suggestion." when `titleIsUserSet`.
- Footer: "{n} AI calls".

**`components/editor/share-dialog.tsx`** — owner share modal:
- Public toggle row (`Globe`/`Lock` icon), **Enable/Disable** button → `share.setPublic`.
- When public: a read-only **Public link** field with **Copy** (`Copy`→`Check` "Copied") and **open-in-new-tab** (`ExternalLink`) buttons. URL is `${origin}/share/${shareId}`.
- **Collaborators** list: avatar/initial, name/email, "Can edit"/"Can view", and a `UserMinus` remove button per collaborator. Empty-state explains the request flow.
- Footer **Done** button.

### 7.3 Public share page — `/share/[shareId]` (`app/share/[shareId]/page.tsx`)
- No login required to read. Header: Inkwell brandmark, "Public share" badge, and a context-aware action: **Open in workspace** (if the viewer is owner/collaborator), "request pending" text, or **Request edit access** (signed-out → Clerk `SignInButton` with redirect back to the share URL; signed-in → calls `share.requestAccess`).
- Body: "shared by {owner} · updated {time}", title, tag chips, an **AI summary** card (summary + action items) if present, then the rendered markdown.
- Footer repeats the request-access affordance with contextual copy ("Your access request is pending owner approval." etc.).
- "This note isn't available" fallback when the note is private/deleted.

### 7.4 Dashboard — `/dashboard` (`app/dashboard/page.tsx`)
- Heading "Your week, at a glance."
- **4 stat cards** (`StatCard`): Total notes (+ total words hint), AI calls (+ this-week hint), Public notes, Archived.
- **Weekly activity** panel — `Sparkline` of edits vs AI calls (7-day buckets), with a legend.
- **AI breakdown (7d)** — three `AiBar` progress bars: Summaries / Titles / Actions.
- **Recent notes** list (5, links to each, with "View all" → `/notes`) and an empty-state "Create your first note".
- **Most-used tags** list (top 8 with counts).

### 7.5 Global chrome
- `components/layout/app-header.tsx` — top bar across workspace/dashboard; hosts the **notifications bell**.
- `components/layout/notifications-bell.tsx` — `Bell` icon with a count badge. Dropdown lists pending access requests: requester avatar/name/email, the requested note (links to it), optional message, **Approve** (`Check`, grants editor role) / **Deny** (`X`) buttons, relative time. "All caught up." empty state. Updates in real time via the Convex query.

## 8. Client utilities

- `lib/fuzzy.ts` — `scoreItem`/`rankItems`: title-exact (1000) > title-prefix (600) > title-substring (350) > title subsequence; tag exact/prefix/substring (220/140/80); body substring (70, +40 if early) or subsequence; plus a recency boost (`max(0, 40 - ageDays)`). Empty query → sort by `updatedAt`.
- `lib/platform.ts` + `lib/use-platform.ts` — OS detection so shortcut hints render `⌘` on macOS vs `Ctrl` elsewhere; `matchesNewNoteShortcut`, `modKey`.
- `lib/utils.ts` — `cn` (clsx+tailwind-merge), `contentDrift` (client mirror of the server drift calc), `countWords`, `formatRelativeTime`.
- `components/ui/*` — design-system primitives: `button` (variants primary/secondary/ghost/danger, sizes, loading spinner), `dialog`, `dropdown`, `input`, `badge`, `skeleton`.

## 9. Keyboard shortcuts (full list)

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + N` | New note |
| `Ctrl/⌘ + K` | Focus sidebar search |
| `Ctrl/⌘ + /` | Toggle Write / Preview |
| `Ctrl/⌘ + .` | Toggle AI panel (desktop) |
| `Ctrl/⌘ + B` | Bold |
| `Ctrl/⌘ + I` | Italic |
| `Ctrl/⌘ + Z` | Undo (editor) |
| `Ctrl/⌘ + Y` or `Ctrl/⌘ + Shift + Z` | Redo (editor) |
| `Esc` | Clear multi-select |

## 10. Notable engineering decisions & trade-offs (from README + code)

- **No CRDT co-editing.** Convex reactivity gives "everyone sees updates", but two people editing the same paragraph is last-write-wins. Per-field updates reduce clobbering (content edit doesn't overwrite title). Production would layer Yjs.
- **No Clerk webhook.** User shadow records are provisioned client-side via `ensureCurrentUser` on first render. `svix` is installed (webhook-signature lib) but the HTTP webhook is intentionally not wired for the challenge scope.
- **Textarea editor, not Tiptap/ProseMirror.** Keeps the dependency tree small; markdown is authored as raw text with a syntax-inserting toolbar and rendered with `react-markdown`.
- **AI cost control via drift gating.** Hash+length drift thresholds prevent redundant Gemini calls; a single Gemini call returns all artifacts (title/summary/actions/tags) as strict JSON.
- **Gemini key isolation.** The AI action runs server-side on Convex (`"use node"`); the key is a Convex env var, never shipped to the browser.
- **API routes deliberately outside Clerk middleware** so non-browser clients work with raw Bearer tokens.
- **Race-safe autosave/sync.** Locally-edited flags are cleared only after a save round-trips (local === server), preventing the reactive subscription from overwriting in-flight keystrokes.

## 11. Submissions / artifacts

`Submissions/` contains the challenge deliverables: `fullstack_challenge_Rohith-Rathod.zip`, an `APIs` folder, and a `Video Walkthrough` folder. The repo README also references a `sample-outputs/` folder with `api-responses.json`, `ai-summaries.json`, `database-schema.json`, screenshots, and an API testing log/PowerShell script.
