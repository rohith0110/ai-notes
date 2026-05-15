# Setup Instructions

## Prerequisites

- **Node.js** 20+ ([nodejs.org](https://nodejs.org))
- **pnpm** (`npm install -g pnpm`)
- **Clerk** account — free tier ([clerk.com](https://clerk.com))
- **Convex** account — free tier ([convex.dev](https://convex.dev))
- **Google AI Studio** API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

---

## 1. Install dependencies

```bash
pnpm install
```

## 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
| `CONVEX_DEPLOYMENT` | Written by `npx convex dev` on first run |
| `NEXT_PUBLIC_CONVEX_URL` | Written by `npx convex dev` on first run |
| `NEXT_PUBLIC_APP_URL` | Your dev server URL (default `http://localhost:3000`) |

## 3. Configure Clerk → Convex auth

Convex authenticates users with a JWT minted by Clerk.

1. In the Clerk dashboard, go to **JWT Templates → New template → Convex**
2. Set the template name to `convex`
3. Save the template
4. Set the issuer domain on your Convex deployment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://YOUR-CLERK-FRONTEND-API"
```

> The issuer URL looks like `https://joint-malamute-12.clerk.accounts.dev` — find it in your Clerk publishable key or dashboard.

## 4. Add the Gemini API key to Convex

The AI action runs server-side on Convex, so the key must be set there (not in `.env.local`):

```bash
npx convex env set GEMINI_API_KEY "your-google-ai-studio-key"
```

## 5. Start the dev servers

Run Convex and Next.js in two terminals:

```bash
# Terminal 1 — Convex (schema + functions, live-reload)
npx convex dev

# Terminal 2 — Next.js
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing the app

1. Click **Start writing** → Clerk sign-in modal opens
2. After auth you land on `/notes` — workspace is empty
3. Create a note with the **New note** button (or `Ctrl+N` / `⌘N`)
4. Type some content → note auto-saves after 700ms
5. Press `Ctrl+/` (or `⌘/`) to toggle markdown preview
6. Open the AI panel (`Ctrl+.` / `⌘.`) → click **Generate insights**
7. Click **Share** → toggle public → copy the share link
8. Open the link in an incognito window → see the public read-only view
9. Click **Request edit access** → sign in as a different account → request sent
10. Switch to the owner's tab → notification bell shows badge → **Approve**
11. Visit `/dashboard` to see productivity insights

## Notes

- **Next.js 16**: The middleware file is `proxy.ts` at the repo root (Next 16 renamed `middleware.ts` → `proxy.ts`). On Next 15 or earlier, rename it to `middleware.ts`.
- **API routes**: REST endpoints are available at `/api/notes`, `/api/notes/:id`, `/api/notes/:id/generate-summary`, and `/api/shared/:shareId`. They proxy to Convex functions with Clerk JWT auth.

claude --resume 7b0c81c7-f1ac-40d7-890e-8905fcc33bc3
