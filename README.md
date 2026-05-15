# Inkwell

A collaborative, AI-powered notes workspace. Write in markdown, generate summaries and action items with AI, share notes with a single link, and track productivity — all in real time.

**Stack:** Next.js 16 · Convex · Clerk · Google Gemini · Tailwind 4

> **Setup instructions** → [`SETUP.md`](./SETUP.md)

---

## Features

### Notes Workspace
- Markdown editor with live preview toggle (`Ctrl+/`)
- Auto-save on 700ms debounce
- Tags and categories for organization
- Archive and soft-delete
- Full-text search with fuzzy ranking (title → tag → body, recency boost)

### AI Integration
- **Summaries** — 1-3 sentence distillation of note content
- **Action items** — concrete tasks extracted from the note
- **Suggested titles** — 3-8 word titles generated from content
- **Auto-tags** — topic-based tags generated alongside titles
- Drift-gated: title regenerates only when content changes >30%, summary >35%
- Single Gemini call returns all artifacts as strict JSON

### Real-Time Collaboration
- Toggle a note **public** to mint a `/share/:id` URL
- Visitors read without login; signed-in users can **request edit access**
- Owner approves/denies via a real-time notifications bell
- Collaborator edits propagate instantly across browsers (Convex reactivity)
- Per-field sync: editing content doesn't block title/tag updates from other users

### Productivity Dashboard
- Total notes, word count, AI usage stats
- Most-used tags breakdown
- Weekly activity sparkline (edits + AI calls)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `⌘N` | New note |
| `Ctrl+K` / `⌘K` | Focus search |
| `Ctrl+/` / `⌘/` | Toggle write/preview |
| `Ctrl+.` / `⌘.` | Toggle AI panel |
| `Ctrl+B` / `⌘B` | Bold |
| `Ctrl+I` / `⌘I` | Italic |

---

## Architecture

```
Next.js (App Router)              Convex (serverless)
─────────────────────             ─────────────────────
app/                              convex/
  page.tsx        (landing)         schema.ts      (5 tables)
  notes/          (workspace)       notes.ts       (CRUD, archive)
  dashboard/      (insights)        ai.ts          (Gemini action)
  share/[id]/     (public view)     share.ts       (access flow)
  api/            (REST adapter)    search.ts      (full-text)
proxy.ts          (Clerk gate)      insights.ts    (dashboard)
```

### Data Model

| Table | Purpose |
|-------|---------|
| `users` | Clerk → Convex shadow records |
| `notes` | Markdown content, AI artifacts, share state |
| `collaborators` | `(noteId, userId, role)` — editor/viewer |
| `shareRequests` | Pending access requests, drives notifications |
| `activityLog` | Edit/AI events, feeds weekly sparkline |

### API Endpoints

The app uses Convex's typed RPC internally. REST adapters are available at:

| Method | Endpoint | Maps to |
|--------|----------|---------|
| `GET` | `/api/notes` | `notes.list` |
| `POST` | `/api/notes` | `notes.create` |
| `GET` | `/api/notes/:id` | `notes.get` |
| `PATCH` | `/api/notes/:id` | `notes.update` |
| `DELETE` | `/api/notes/:id` | `notes.remove` |
| `POST` | `/api/notes/:id/generate-summary` | `ai.generate` |
| `GET` | `/api/shared/:shareId` | `notes.getByShareId` |
| `POST` | `/api/shared/:shareId/request` | `share.requestAccess` |

Authentication is handled by Clerk (modal flow, JWT sessions).

### Why Convex?
- **Reactive queries** — editor, sidebar, notifications all live-update without polling
- **Built-in full-text search** — keyword search with re-ranking client-side
- **Server actions** — Gemini calls run securely without exposing API keys

---

## Sample Outputs

See [`sample-outputs/`](./sample-outputs):
- `api-responses.json` — example responses from each endpoint
- `ai-summaries.json` — three Gemini outputs (short, medium, long content)
- `database-schema.json` — full schema with field types and indexes

---

## Trade-offs

- **No CRDT co-editing** — Convex reactivity provides "everyone sees updates" but simultaneous edits on the same paragraph use last-write-wins. A production app would layer Yjs.
- **No Clerk webhook** — User sync runs client-side via `ensureCurrentUser` on first render. Production would add a Clerk → Convex HTTP webhook.
- **Textarea editor** — Chosen over Tiptap/ProseMirror to keep dependencies small. Toolbar inserts markdown syntax; preview renders with react-markdown.
