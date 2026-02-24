# Flowbridge Studio

Design-to-code pipeline. Map Figma designs into a semantic context graph — journeys, flows, screens, components — and generate production-ready code via Claude API.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| State | Zustand (persisted to localStorage) |
| Routing | React Router v7 |
| Styling | Tailwind CSS v3 + Geist font |
| Backend | Express (API proxy — Claude + Figma) |
| Database | Supabase (Postgres + Auth + Realtime) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Deploy | Vercel (frontend) + Railway/Render (API server) |

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/flowbridge.git
cd flowbridge
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `FIGMA_ACCESS_TOKEN` | figma.com/developers → Personal tokens |

### 3. Supabase setup

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push the schema
supabase db push

# Generate TypeScript types
npm run db:types
```

### 4. Run (two terminals)

```bash
# Terminal 1 — Vite dev server (port 3000)
npm run dev

# Terminal 2 — API server (port 3001)
npx tsx watch server/index.ts
```

Open http://localhost:3000

---

## Project Structure

```
flowbridge/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Project grid + nav
│   │   ├── CanvasPage.tsx        # Main canvas workspace
│   │   └── AuthPage.tsx          # GitHub / Google OAuth
│   ├── components/
│   │   ├── canvas/               # Canvas, scene, SVG connectors
│   │   ├── nodes/                # MacroNode, ScreenNode components
│   │   ├── sidebar/              # Ibar, Ebar, tree components
│   │   ├── panels/               # RightPanel, FlowPanel
│   │   ├── dashboard/            # ProjectCard, NewProjectModal
│   │   └── ui/                   # Button, Badge, Modal (shared)
│   ├── lib/
│   │   ├── store/index.ts        # Zustand store (all state + actions)
│   │   └── supabase/client.ts    # Supabase client + auth helpers
│   ├── hooks/
│   │   ├── useAuth.ts            # Supabase auth state
│   │   ├── useCanvasInteraction.ts # Pan, zoom, keyboard
│   │   └── useGenerate.ts        # Claude API streaming
│   ├── types/
│   │   └── index.ts              # All domain types
│   ├── utils/
│   │   └── index.ts              # uid, cn, screenCompleteness, etc.
│   └── styles/
│       └── globals.css
├── server/
│   ├── index.ts                  # Express entry
│   ├── routes/
│   │   ├── generate.ts           # POST /api/generate → Claude SSE
│   │   └── figma.ts              # GET /api/figma/* → Figma proxy
│   └── lib/
│       └── prompt-builder.ts     # Context graph → Claude prompt
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── .env.example
```

---

## Architecture decisions

**Why Zustand + localStorage instead of just Supabase?**
Canvas interactions (pan, zoom, node drag) fire dozens of state updates per second. Writing every change to the network would be unusable. Zustand keeps canvas state in memory, localStorage handles persistence between sessions, and Supabase will sync in the background for multi-device / collaboration (Phase 5).

**Why a separate Express server and not just Vite proxy?**
`ANTHROPIC_API_KEY` and `FIGMA_ACCESS_TOKEN` must never be exposed to the browser. Vite proxy only works in dev — in production, you need a real server. Express gives you that same server in both environments. In production, deploy it to Railway or Render alongside the Vercel frontend.

**Why SSE for generation instead of a regular POST?**
Code generation can take 10–30 seconds. SSE lets the UI show a streaming response as it arrives, which is dramatically better UX than a loading spinner. The `useGenerate` hook reads the event stream and appends text deltas in real time.

---

## Roadmap

See the [project status doc](./docs/status.md) for the full phase breakdown.

| Phase | Status | Focus |
|---|---|---|
| 1 — Foundation | ✅ Done | Canvas, nodes, connectors, properties |
| 2 — Projects | ✅ Done | Dashboard, sidebar, multi-project |
| 3 — Context Engine | 🔵 Active | Figma binding, structured context fields |
| 4 — Generation | ⏳ Queued | Claude API wired, real code output |
| 5 — Scale | 📋 Backlog | Auth, Supabase sync, collaboration |

---

## Contributing

```bash
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run build       # Production build
```
