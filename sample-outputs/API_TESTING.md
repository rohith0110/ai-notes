# API Testing Guide

## Getting Your Auth Token

The API forwards your token straight to Convex, so you must mint the
**`convex` JWT template** token — _not_ the default session token. The default
token has the wrong audience and Convex will reject it.

**In your browser (any OS):**

1. Go to the app and sign in (`https://notes.itsrohith.dev`, or
   `http://localhost:3000` if running locally)
2. Open DevTools → Console tab
3. Paste and run — note the `{ template: "convex" }` argument:

```js
const token = await window.Clerk.session.getToken({ template: "convex" });
console.log(token);
```

4. Copy the printed token — it's valid for ~1 hour

> If you omit `{ template: "convex" }` you'll get a different token and every
> authenticated call will fail with a Convex auth error.

> **Testing locally?** Replace `https://notes.itsrohith.dev` with
> `http://localhost:3000` in every command below.

---

## Sharing Flow (end-to-end)

Sharing has three steps you can fully exercise via the API:

| Step | Who | Endpoint |
| ---- | --- | -------- |
| 1 | Owner — enable sharing | `POST /api/notes/:id/share` → returns `shareId` + `shareUrl` |
| 2 | Anyone — read the note | `GET /api/shared/:shareId` (no auth) |
| 3 | Another user — request edit access | `POST /api/shared/:shareId/request` |
| — | Owner — disable sharing | `DELETE /api/notes/:id/share` |

---

## Windows (PowerShell)

> ⚠️ `curl` in PowerShell is an alias for `Invoke-WebRequest` — it does **not** accept `-H` flags. Use the full `Invoke-WebRequest` syntax or use `curl.exe` instead.

**Option A — Use `curl.exe` (recommended, ships with Windows 10+):**

```powershell
# Store token in a variable first
$TOKEN = "paste_your_token_here"

# GET /api/notes
curl.exe -s https://notes.itsrohith.dev/api/notes -H "Authorization: Bearer $TOKEN"

# POST /api/notes — empty note (title defaults to "Untitled")
curl.exe -s -X POST https://notes.itsrohith.dev/api/notes -H "Authorization: Bearer $TOKEN"

# POST /api/notes — with content only
curl.exe -s -X POST https://notes.itsrohith.dev/api/notes `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"content\": \"# My note\n\nSome content here.\"}"

# POST /api/notes — with title, content, and tags
curl.exe -s -X POST https://notes.itsrohith.dev/api/notes `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"title\": \"Sprint Planning\", \"content\": \"## Goals\n\n- Ship feature X\", \"tags\": [\"work\", \"planning\"]}"

# GET /api/notes/:id
curl.exe -s https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE -H "Authorization: Bearer $TOKEN"

# PATCH /api/notes/:id
curl.exe -s -X PATCH https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"title\": \"Updated Title\", \"content\": \"New content here\"}"

# DELETE /api/notes/:id
curl.exe -s -X DELETE https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE `
  -H "Authorization: Bearer $TOKEN"

# POST /api/notes/:id/generate-summary
curl.exe -s -X POST https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/generate-summary `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"kinds\": [\"summary\", \"title\", \"actions\", \"tags\"], \"force\": true}"

# ── Sharing ──────────────────────────────────────────────────────────────────

# POST /api/notes/:id/share — enable sharing, returns shareId + shareUrl
curl.exe -s -X POST https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/share `
  -H "Authorization: Bearer $TOKEN"
# Response: { "shareId": "abc123", "shareUrl": "https://notes.itsrohith.dev/share/abc123" }

# GET /api/shared/:shareId — verify the note is publicly readable (no auth)
curl.exe -s https://notes.itsrohith.dev/api/shared/SHARE_ID_HERE

# POST /api/shared/:shareId/request — request edit access (different user's token)
curl.exe -s -X POST https://notes.itsrohith.dev/api/shared/SHARE_ID_HERE/request `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"message\": \"Can I help edit this?\"}"

# DELETE /api/notes/:id/share — disable sharing
curl.exe -s -X DELETE https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/share `
  -H "Authorization: Bearer $TOKEN"
```

**Option B — Native PowerShell `Invoke-WebRequest`:**

```powershell
$TOKEN = "paste_your_token_here"
$HEADERS = @{ "Authorization" = "Bearer $TOKEN" }
$JSON_HEADERS = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

# GET /api/notes
(Invoke-WebRequest -Uri "https://notes.itsrohith.dev/api/notes" -Headers $HEADERS).Content

# POST /api/notes — empty note
(Invoke-WebRequest -Uri "https://notes.itsrohith.dev/api/notes" -Method POST -Headers $HEADERS).Content

# POST /api/notes — with content only
(Invoke-WebRequest `
  -Uri "https://notes.itsrohith.dev/api/notes" `
  -Method POST -Headers $JSON_HEADERS `
  -Body '{"content": "# My note\n\nSome content here."}').Content

# POST /api/notes — with title, content, and tags
(Invoke-WebRequest `
  -Uri "https://notes.itsrohith.dev/api/notes" `
  -Method POST -Headers $JSON_HEADERS `
  -Body '{"title": "Sprint Planning", "content": "## Goals\n\n- Ship feature X", "tags": ["work", "planning"]}').Content

# GET /api/notes/:id
(Invoke-WebRequest -Uri "https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE" -Headers $HEADERS).Content

# POST /api/notes/:id/generate-summary
(Invoke-WebRequest `
  -Uri "https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/generate-summary" `
  -Method POST `
  -Headers $JSON_HEADERS `
  -Body '{"kinds": ["summary", "title", "actions", "tags"], "force": true}').Content

# ── Sharing ──────────────────────────────────────────────────────────────────

# POST /api/notes/:id/share — enable sharing
(Invoke-WebRequest `
  -Uri "https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/share" `
  -Method POST -Headers $HEADERS).Content
# Response: { "shareId": "abc123", "shareUrl": "https://notes.itsrohith.dev/share/abc123" }

# GET /api/shared/:shareId — verify publicly readable (no auth)
(Invoke-WebRequest -Uri "https://notes.itsrohith.dev/api/shared/SHARE_ID_HERE").Content

# POST /api/shared/:shareId/request — request edit access
(Invoke-WebRequest `
  -Uri "https://notes.itsrohith.dev/api/shared/SHARE_ID_HERE/request" `
  -Method POST -Headers $JSON_HEADERS `
  -Body '{"message": "Can I help edit this?"}').Content

# DELETE /api/notes/:id/share — disable sharing
(Invoke-WebRequest `
  -Uri "https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/share" `
  -Method DELETE -Headers $HEADERS).Content
```

---

## macOS / Linux (curl)

```bash
# Store token in a variable
TOKEN="paste_your_token_here"

# GET /api/notes
curl -s https://notes.itsrohith.dev/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq

# POST /api/notes — empty note (title defaults to "Untitled")
curl -s -X POST https://notes.itsrohith.dev/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq

# POST /api/notes — with content only
curl -s -X POST https://notes.itsrohith.dev/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "# My note\n\nSome content here."}' | jq

# POST /api/notes — with title, content, and tags
curl -s -X POST https://notes.itsrohith.dev/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Sprint Planning", "content": "## Goals\n\n- Ship feature X", "tags": ["work", "planning"]}' | jq

# GET /api/notes/:id
curl -s https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE \
  -H "Authorization: Bearer $TOKEN" | jq

# PATCH /api/notes/:id
curl -s -X PATCH https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "content": "# Hello\n\nNew content."}' | jq

# DELETE /api/notes/:id
curl -s -X DELETE https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE \
  -H "Authorization: Bearer $TOKEN" | jq

# POST /api/notes/:id/generate-summary
curl -s -X POST https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/generate-summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kinds": ["summary", "title", "actions", "tags"], "force": true}' | jq

# ── Sharing ──────────────────────────────────────────────────────────────────

# POST /api/notes/:id/share — enable sharing, returns shareId + shareUrl
curl -s -X POST https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/share \
  -H "Authorization: Bearer $TOKEN" | jq
# Response: { "shareId": "abc123", "shareUrl": "https://notes.itsrohith.dev/share/abc123" }

# GET /api/shared/:shareId — verify the note is publicly readable (no auth)
curl -s https://notes.itsrohith.dev/api/shared/SHARE_ID_HERE | jq

# POST /api/shared/:shareId/request — request edit access (different user's token)
curl -s -X POST https://notes.itsrohith.dev/api/shared/SHARE_ID_HERE/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Can I help edit this?"}' | jq

# DELETE /api/notes/:id/share — disable sharing
curl -s -X DELETE https://notes.itsrohith.dev/api/notes/NOTE_ID_HERE/share \
  -H "Authorization: Bearer $TOKEN" | jq
```

> Install `jq` for pretty JSON output: `brew install jq` (macOS) or `sudo apt install jq` (Ubuntu)

---

## GUI Tools (easier for exploration)

If you prefer a visual interface:

| Tool                                        | Platform | Notes                                   |
| ------------------------------------------- | -------- | --------------------------------------- |
| [Bruno](https://www.usebruno.com/)          | All      | Free, open-source, files stored locally |
| [Postman](https://www.postman.com/)         | All      | Free tier, popular                      |
| [HTTPie Desktop](https://httpie.io/desktop) | All      | Clean UI, free                          |
| [Insomnia](https://insomnia.rest/)          | All      | Free tier                               |

For any of these, set up a collection with:

- Base URL: `https://notes.itsrohith.dev`
- Auth type: **Bearer Token** → paste your Clerk token

---

## Finding Real IDs to Test With

Get note IDs from the `/api/notes` list:

```bash
# Windows
curl.exe -s https://notes.itsrohith.dev/api/notes -H "Authorization: Bearer $TOKEN"

# macOS/Linux — just the first ID
curl -s https://notes.itsrohith.dev/api/notes -H "Authorization: Bearer $TOKEN" | jq '.[0]._id'
```

Get a `shareId` by sharing a note via `POST /api/notes/:id/share` — the response
includes both `shareId` and the ready-to-use `shareUrl`:

```json
{ "shareId": "abc123xyz", "shareUrl": "https://notes.itsrohith.dev/share/abc123xyz" }
```

You can paste `shareUrl` directly into a browser to confirm the note is publicly
visible, or hit `GET /api/shared/:shareId` with no auth header to verify it
programmatically.
