# Flowbridge Studio

Design-to-code pipeline. Map Figma designs into a semantic context graph — journeys, flows, screens, components — and generate production-ready code via Claude API.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| State | Zustand + localStorage (canvas) |
| Styling | Tailwind CSS v3 + Geist font |
| Auth + DB | Supabase (Postgres, Auth, Realtime) |
| AI | Anthropic Claude API — streaming SSE |
| Deploy | Vercel |

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/flowbridge.git
cd flowbridge
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `FIGMA_ACCESS_TOKEN` | figma.com/developers → Personal tokens |

### 3. Supabase setup

```bash
# Install CLI
npm i -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push schema
supabase db push

# Generate TypeScript types (optional — placeholder already included)
npm run db:types
```

### 4. Run

```bash
npm run dev   # http://localhost:3000
```

One command. No separate API server — Route Handlers run inside Next.js.

---

## Project structure

```
flowbridge/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, providers
│   ├── providers.tsx               # React Query provider
│   ├── middleware.ts               # Supabase session refresh + auth guard
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Auth check — redirects to /login if needed
│   │   └── page.tsx                # Server Component — fetches projects
│   ├── (auth)/login/
│   │   └── page.tsx                # Login page
│   ├── projects/[id]/canvas/
│   │   └── page.tsx                # Canvas page — passes projectId to client
│   ├── auth/callback/
│   │   └── route.ts                # OAuth callback — exchanges code for session
│   ├── api/generate/
│   │   └── route.ts                # POST → Claude API, streams SSE
│   └── api/figma/
│       └── route.ts                # GET → Figma API proxy
│
├── components/
│   ├── canvas/
│   │   └── CanvasWorkspace.tsx     # Main canvas client component
│   ├── dashboard/
│   │   ├── DashboardClient.tsx     # Project grid + nav
│   │   └── LoginClient.tsx         # GitHub / Google auth buttons
│   ├── nodes/                      # MacroNode, ScreenNode (TODO)
│   ├── sidebar/                    # Ibar, Ebar, tree (TODO)
│   ├── panels/                     # RightPanel, FlowPanel (TODO)
│   └── ui/                         # Button, Badge, Modal, Toast (TODO)
│
├── lib/
│   ├── store/index.ts              # Zustand — all state + actions + selectors
│   ├── supabase/
│   │   ├── client.ts               # Browser client (@supabase/ssr)
│   │   └── server.ts               # Server client — for Server Components
│   └── claude/
│       └── prompt-builder.ts       # Context graph → Claude prompt
│
├── hooks/
│   ├── useAuth.ts                  # Supabase auth state
│   ├── useCanvasInteraction.ts     # Pan, zoom, keyboard
│   └── useGenerate.ts              # Calls /api/generate, reads SSE stream
│
├── types/
│   ├── index.ts                    # All domain types
│   └── supabase.ts                 # Auto-generated DB types (npm run db:types)
│
├── utils/
│   └── index.ts                    # cn, uid, makeProject, makeNode, etc.
│
├── styles/
│   └── globals.css
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Architecture decisions

**Why Server Components for the dashboard but Client Component for canvas?**
The dashboard renders static data (project list) that benefits from server-side fetching — no loading spinner, no client-side fetch, better SEO if needed. The canvas is 100% interactive — pan, zoom, drag — so it must be a Client Component. Next.js lets you mix both in the same app.

**Why Zustand + localStorage instead of always hitting Supabase?**
Canvas interactions fire dozens of state mutations per second (panning, dragging nodes). Writing every change to the network is unusable. Zustand keeps canvas state in memory with instant updates; localStorage persists it between sessions. Supabase sync comes in Phase 5 for multi-device and collaboration.

**Why no separate Express server?**
`ANTHROPIC_API_KEY` and `FIGMA_ACCESS_TOKEN` live in Route Handlers (`app/api/`), which run on the server. The browser never sees them. In the React+Vite version, you needed a separate Express process to do the same thing — with Next.js it's built in, and the same Vercel deployment handles both frontend and API.

**Why `@supabase/ssr` instead of `@supabase/supabase-js` directly?**
The SSR package handles cookie-based session management correctly across Server Components, Route Handlers, and middleware. Direct supabase-js uses localStorage for sessions, which doesn't work in Server Components (no browser).

---

## Roadmap

| Phase | Status | Focus |
|---|---|---|
| 1 — Foundation | ✅ Done | Canvas, nodes, connectors, properties |
| 2 — Projects | ✅ Done | Dashboard, sidebar, multi-project |
| 3 — Context Engine | 🔵 Active | Figma binding, structured screen context |
| 4 — Generation | ⏳ Queued | Claude API real output, file export |
| 5 — Scale | 📋 Backlog | Supabase sync, auth, collaboration |

---

## Deploy to Vercel

```bash
npx vercel
```

Set all env vars from `.env.example` in the Vercel dashboard. No additional server needed.
