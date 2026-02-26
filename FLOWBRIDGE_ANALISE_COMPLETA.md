# Análise Completa do Flowbridge Studio

**Data da Análise:** 25 de fevereiro de 2026  
**Versão Analisada:** v6 FINAL (Next.js 15 + Supabase)  
**Status do Projeto:** 48% completo · Fases 1-2 entregues + Infra migrada

---

## 1. O QUE É FLOWBRIDGE

Flowbridge é uma **plataforma web de design-to-code** que funciona como um orquestrador de intenção semântica entre o Figma (como fonte de verdade do design) e geradores de código LLM (Claude API).

### Problema Resolvido
As ferramentas atuais de geração de código falham porque:
- Enxergam pixels e frames, mas não entendem a estrutura semântica
- Recriamcomponentes que já existem no Design System (duplicação)
- Perdem a lógica de navegação entre telas
- Não sincronizam mudanças de componentes com o código gerado

### Solução
Flowbridge adiciona uma **camada de contexto semântico** entre o design e o código. Não substitui o Figma — enriquece semanticamente o que já existe nele.

---

## 2. ARQUITETURA ATUAL

### 2.1 Stack Técnica

| Tecnologia | Uso | Versão |
|---|---|---|
| **Next.js** | Frontend + API Routes | 15 (App Router) |
| **TypeScript** | Type safety | 5.7.2 |
| **Zustand** | State management (canvas) | 5.0.3 |
| **Supabase** | Database + Auth | 2.49.0 |
| **Tailwind CSS** | Styling | 3.4.17 |
| **Claude API** | Code generation | claude-sonnet-4-6 |
| **Figma API** | Design integration | REST API + MCP |
| **Lucide React** | Icons | 0.474.0 |

### 2.2 Estrutura de Diretórios

```
flowbridge-v6-final/
├── app/                           # Next.js App Router
│   ├── (auth)/login/             # GitHub/Google OAuth
│   ├── (dashboard)/              # Project grid (Server Component)
│   ├── projects/[id]/canvas/     # Canvas page (Client Component)
│   ├── api/                      # Route Handlers
│   │   ├── generate/             # Claude API proxy (SSE streaming)
│   │   └── figma/                # Figma API proxy
│   ├── auth/callback/            # OAuth callback handler
│   └── layout.tsx + providers.tsx
├── components/
│   ├── canvas/                   # Main canvas + connector layer
│   │   └── CanvasWorkspace.tsx   # Root component
│   ├── nodes/                    # MacroNode, ScreenNode
│   ├── sidebar/                  # Ibar (icons) + Ebar (tree)
│   ├── panels/                   # RightPanel, FlowPanel
│   ├── dashboard/                # DashboardClient, LoginClient
│   └── ui/                       # FAB, Badge, primitives
├── hooks/
│   ├── useGenerate.ts            # Code generation (SSE reader)
│   ├── useCanvasInteraction.ts   # Pan, zoom, keyboard shortcuts
│   └── useAuth.ts                # Supabase auth state
├── lib/
│   ├── store/index.ts            # Zustand store (complete)
│   ├── claude/prompt-builder.ts  # Assembles context → prompt
│   └── supabase/
│       ├── client.ts             # Browser client (@supabase/ssr)
│       └── server.ts             # Server-side client
├── types/index.ts                # ALL domain types (single source of truth)
├── styles/
│   ├── globals.css               # Tailwind + design tokens
│   └── flowbridge-v6.css         # (legacy, gradually removing)
├── utils/index.ts                # Utilities + factories
├── middleware.ts                 # Session refresh + auth guard
├── flowbridge-v6.html            # Single-file prototype (1500 lines)
└── supabase/migrations/
    └── 001_initial_schema.sql    # Full DB schema + RLS
```

---

## 3. MODELO DE DADOS

### 3.1 Tipos Principais (types/index.ts)

```typescript
// Identificadores
type ProjectId = string
type NodeId = string
type FlowId = string
type ScreenId = string

// Entidades
interface Project {
  id, ownerId, name, description, color
  settings: ProjectSettings
  createdAt, updatedAt
}

interface MacroNode {
  id, projectId, type: 'ds' | 'journey'
  name, description, tags
  position: XY
  figmaFileKey?, figmaFileUrl?  // DS-specific
  status?: JourneyStatus         // Journey-specific
}

interface Connection {
  id, projectId
  fromId, toId  // Only DS → Journey allowed
}

interface Flow {
  id, journeyId, projectId
  name, order, screens[]
}

interface Screen {
  id, flowId, projectId
  name, position, order
  isEntry?, isError?
  context: ScreenContext    // ← Estrutura crítica
  figma?: ScreenFigma       // Metadados do Figma
  status: 'empty' | 'partial' | 'ready' | 'generated'
}

// A qualidade dos contextos = qualidade do código gerado
interface ScreenContext {
  purpose: string           // "Allow user to sign in with email + password"
  userIntent: string        // "User wants to access their account"
  route: string             // "/auth/login"
  requiresAuth: boolean
  apiEndpoints: ApiEndpoint[]
  components: string[]      // ["Button", "Input", "Label"]
  notes: string             // Architecture notes
  genRules: string          // "Use server action for form submission"
}

interface ScreenFigma {
  url, nodeId, fileKey
  thumbnailUrl?
  componentMap: FigmaComponentMap[]
  fetchedAt
}

interface GenerateRequest {
  projectId, settings, dsNodes[], screens[]
}

interface GeneratedFile {
  path: string              // "src/app/(auth)/login/page.tsx"
  content: string           // Código completo gerado
  lang: 'tsx' | 'ts' | 'css' | 'json' | 'md'
}
```

**Princípio:** Tipos são a **única fonte de verdade**. Usados por:
- Zustand store (read/write)
- Route Handlers (request/response)
- Prompt builder (context assembly)
- Supabase queries

### 3.2 Banco de Dados (Supabase + PostgreSQL)

Tabelas principais (RLS ativado):
- **profiles** — usuários, plano, criação
- **projects** — projetos por owner
- **macro_nodes** — DS/Lib e Journey nodes
- **connections** — relações DS → Journey
- **flows** — jornadas dentro de projects
- **screens** — telas dentro de flows
- **generation_runs** — histórico de gerações

---

## 4. ESTADO (ZUSTAND STORE)

### 4.1 Estrutura do Store (lib/store/index.ts)

```typescript
interface Store {
  // Auth
  userId: string | null
  
  // Projects
  projects: Project[]
  curProjectId: ProjectId | null
  
  // Canvas data (isolado por projeto)
  canvasData: Record<ProjectId, {
    nodes: MacroNode[]
    conns: Connection[]
    flows: Record<NodeId, Flow[]>    // journeyId → flows[]
    curFlow: Record<NodeId, FlowId>  // journeyId → flowId ativo
  }>
  
  // View state
  view: 'macro' | 'micro'
  curJourneyId: NodeId | null
  transform: CanvasTransform         // x, y, scale
  
  // Selection
  selNodeId: NodeId | null
  selConnId: ConnId | null
  selScreenId: ScreenId | null
  
  // Panels
  ibarOpen, ebarOpen, ebarSection
  rpanelOpen, rpanelTab: 'properties' | 'context' | 'info'
  fabOpen
  
  // Ações (20+ funções)
  createProject, updateProject, deleteProject, openProject
  addNode, updateNode, moveNode, deleteNode
  addConn, deleteConn, connExists
  addFlow, updateFlow, deleteFlow, setActiveFlow
  addScreen, updateScreen, updateScreenContext, moveScreen, deleteScreen
  goMacro, openJourney, setTransform, fitView
  selectNode, selectConn, selectScreen, clearSel
  togglePanels, toggleSections
}
```

### 4.2 Persistência

**Middleware Zustand:**
- `persist`: localStorage com `partialize` — apenas dados, não UI state
- `immer`: mutable updates transformados em immutable updates
- `devtools`: Redux DevTools em desenvolvimento

**Estratégia:** localStorage = primário (interação rápida), Supabase = backup para multi-device (Fase 5)

---

## 5. FLUXO DE GERAÇÃO DE CÓDIGO

### 5.1 Arquitetura de Geração

```
USER INTERACTION (Canvas)
  ↓
useGenerate hook → Coleta contextos
  ↓
POST /api/generate (GenerateRequest)
  ↓
buildPrompt() → system + user prompt
  ↓
Claude API (SSE streaming)
  ↓
SSE reader → Acumula resposta
  ↓
JSON parsing → GeneratedFile[]
  ↓
Code modal → Sintaxe + copy/export
  ↓
GitHub API (opcional) → Commit em branch
```

### 5.2 Prompt Builder (lib/claude/prompt-builder.ts)

**System Prompt:**
```
You are an expert {framework} developer generating production-ready UI code.

## Stack
- Framework: {nextjs|react-vite|remix|astro}
- Components: {shadcn-ui|chakra|mantine|none}
- CSS: {tailwind|css-modules|styled-components}
- Output root: {outputDir}

## Hard rules
- Generate COMPLETE files — no placeholders, no "// TODO"
- Import ONLY from the specified component library
- Follow {framework} conventions
- Every file must be immediately usable with zero edits

## Output format
Return a single JSON array of file objects. Nothing else — no prose.
```

**User Prompt (Dynamic):**
```
## Design System / Component Libraries
### {DS Name}
- Available components: Button, Input, Select, ...
- Figma file key: xxxx

## Screens to generate ({N})
### Login Screen [entry]
- Route: `/auth/login`
- Purpose: Allow user to sign in with email + password
- User intent: User wants to access their account
- Auth required: yes
- Use these components: Button, Input, Label
- API endpoints:
  `POST /api/auth/login` — Authenticate user
- Figma → code mapping:
  "Button/Primary" → <Button />
- Rules: Use Server Action for form submission

[repeat para cada screen]

Generate all screens now. Return ONLY the JSON array.
```

### 5.3 Route Handler (app/api/generate/route.ts)

```typescript
export async function POST(req: NextRequest) {
  // 1. Parse GenerateRequest
  // 2. Build prompts
  // 3. Stream Claude API via SSE
  // 4. Emit events: start, delta (text chunks), done, error
  
  const stream = new ReadableStream({
    async start(controller) {
      const claudeStream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8096,
        system, user,
        messages: [{ role: 'user', content: user }]
      })
      
      claudeStream.on('text', (text) => 
        controller.enqueue(enc.encode(`event: delta\ndata: ${JSON.stringify({text})}\n\n`))
      )
      
      const message = await claudeStream.finalMessage()
      controller.enqueue(enc.encode(`event: done\ndata: {...}\n\n`))
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

- **Runtime:** nodejs (necessário para streaming)
- **Duration:** 60s timeout
- **Segurança:** ANTHROPIC_API_KEY server-side only

### 5.4 Hook useGenerate (hooks/useGenerate.ts)

```typescript
export function useGenerate(): UseGenerateReturn {
  // state: status, files, progress, error
  
  const generate = async (screenIds?: string[]) => {
    // 1. Coleta projeto, journey, flow, screens
    // 2. Identifica DS nodes conectados
    // 3. Monta GenerateRequest
    // 4. POST /api/generate
    // 5. SSE reader:
    //    - Accumula text chunks (SSE delta events)
    //    - Extrai JSON via regex: /\[\s*\{[\s\S]*\}\s*\]/
    //    - Parse e set GeneratedFile[]
    // 6. Retorna files ao componente
  }
  
  return { status, files, progress, error, generate, reset }
}
```

**Key Details:**
- Lê SSE stream manualmente com `reader.read()`
- Acumula chunks em buffer (pode vir em múltiplas linhas)
- Detecta JSON quando stopReason é recebido
- Progress = último linha significativa do raw text (max 80 chars)

---

## 6. COMPONENTES PRINCIPAIS

### 6.1 CanvasWorkspace (components/canvas/CanvasWorkspace.tsx)

**Root component do canvas:**
- Render condicional: macro view vs micro view
- Event handlers: pointer events (pan/zoom), connector drag
- Refs: canvasRef para cálculos de screen-to-canvas
- Store integration: tudo lido/escrito via Zustand

**Features:**
- ✅ Free canvas pan (pointer drag no background)
- ✅ Zoom com mouse wheel (toward cursor)
- ✅ F key para fit view
- ✅ Seleção: click no node/connector
- ✅ Delete key para remover
- ✅ Escape para clear selection
- ✅ Right-click context menu
- ✅ Breadcrumb navigation (Home > Workspace > Journey)
- ✅ Generate button (⚡) — **ainda é mock**
- ✅ Keyboard shortcuts completos

### 6.2 MacroNode (components/nodes/MacroNode.tsx)

Card visual de node macro (DS ou Journey):
- Drag to move
- Double-click to enter micro view (if Journey)
- Drag handle (saída) para criar conexões
- Status badge (sync status, generation status)
- Selection highlight

### 6.3 ScreenNode (components/nodes/ScreenNode.tsx)

Card visual de tela no micro view:
- Posição no canvas micro
- Entry/Error badge visual
- Thumbnail Figma (quando bindado)
- Completeness score ring (0-100)
- Selection highlight

### 6.4 ConnectorLayer (components/canvas/ConnectorLayer.tsx)

SVG bezier paths entre nodes:
- Curvas suaves (quadratic Bézier)
- Arrowheads nas extremidades
- Selection highlight (stroke mais grossa)
- Hover effects

### 6.5 Ibar + Ebar (sidebar/Ibar.tsx, sidebar/Ebar.tsx)

**Ibar:** Icon strip esquerda
- Icons: Macro nodes, Components (collapsible)
- Click icon = toggle seção correspondente

**Ebar:** Tree expandível
- Hierarchical view:
  - Macro nodes (DS/Journey)
  - Flows dentro de Journey
  - Screens dentro de Flow
- Expand/collapse por nível
- Delete por item

### 6.6 RightPanel (components/panels/RightPanel.tsx)

Painel direito com abas:
- **Properties tab:** name, description, tags, Figma URL
- **Context tab:** ScreenContext fields (ainda texto livre — Fase 3 => form estruturada)
- **Info tab:** metadata, timestamps, status

### 6.7 FlowPanel (components/panels/FlowPanel.tsx)

Lista de flows para journey ativa:
- Add flow button
- Flow item: nome, order
- Add screen button por flow

### 6.8 FAB (components/ui/FAB.tsx)

Floating Action Button:
- Menu: + DS Node, + Journey, + Screen
- Modal seleção de tipo + input nome

---

## 7. AUTENTICAÇÃO E SEGURANÇA

### 7.1 Auth Flow

```
GitHub/Google OAuth
  ↓
app/auth/callback/route.ts (Supabase exchange)
  ↓
Middleware (session refresh a cada request)
  ↓
Protected routes: /projects/* (redirect to /login if no session)
  ↓
Dashboard: Server Component (fetches projects server-side)
  ↓
Canvas: Client Component (works with Zustand store)
```

### 7.2 Segurança

- ✅ API keys (ANTHROPIC_API_KEY, FIGMA_ACCESS_TOKEN) — **server-side only**
- ✅ RLS (Row Level Security) no Supabase — projects só visíveis para owner
- ✅ Middleware refresh de session em cada request
- ✅ Cookies HTTP-only via @supabase/ssr
- ✅ OAuth via Supabase (GitHub + Google)

---

## 8. STATUS ATUAL (48% COMPLETE)

### ✅ ENTREGUES (Fases 1-2 + Infra)

**Fase 1 — Foundation & Canvas**
- ✅ Free canvas com pan/zoom/fit
- ✅ Macro nodes (DS e Journey)
- ✅ Micro view com telas
- ✅ Connectors entre nodes
- ✅ Right panel com contextos
- ✅ Context menu (right-click)
- ✅ Keyboard shortcuts
- ✅ Canvas data isolation por projeto

**Fase 2 — Projects & Sidebar**
- ✅ Dashboard com grid de projetos
- ✅ Multi-project isolation
- ✅ Auth (GitHub + Google OAuth)
- ✅ Sidebar hierarchical (Ibar + Ebar)
- ✅ FAB com opções
- ✅ Flow panel
- ✅ localStorage persistence (Zustand)

**Infra — Next.js Migration**
- ✅ Next.js 15 App Router scaffold (36 files)
- ✅ Route Handlers (generate, figma proxies)
- ✅ Supabase SSR auth + middleware
- ✅ TypeScript domain types (complete)
- ✅ Zustand store (typed, immer, persist)
- ✅ Prompt builder (dynamic context assembly)
- ✅ DB schema (PostgreSQL via migrations)
- ✅ CSS tokens + Tailwind design system

### 🔵 EM PROGRESSO (Fase 3 — 10%)

**Context Engine & Figma Integration**
- ✅ ScreenContext type defined
- ✅ Prompt builder consumes all fields
- 🔴 UI form para contexto (não built yet)
- 🔴 Figma URL binding + thumbnail (Route Handler pronto, UI not)
- 🔴 Component map editor (não started)
- 🔴 Completeness ring scoring UI (lógica pronta em utils, UI não)

### 🟡 PARCIAL (Fase 4 — 15%)

**Code Generation**
- ✅ Route Handler `/api/generate` (complete)
- ✅ useGenerate hook (complete)
- ✅ Prompt builder (complete)
- 🔴 Generate button not wired to hook
- 🔴 Code output modal not built
- 🔴 Generation overlay with streaming progress (design exists, UI not)

### ⏳ BACKLOG (Fase 5 — 0%)

**Sync & Collaboration**
- Supabase sync (write mutations to DB in background)
- Real-time collaboration (Supabase Realtime + live cursors)
- Generation history + branching
- Multi-user workspaces

---

## 9. ARQUIVOS-CHAVE E RESPONSABILIDADES

| Arquivo | Linhas | Responsabilidade |
|---|---|---|
| `types/index.ts` | 209 | **Domain model** — tudo vem daqui |
| `lib/store/index.ts` | 418 | **Canvas state machine** — todas as ações |
| `lib/claude/prompt-builder.ts` | 108 | **Context → Prompt** — qualidade = geração |
| `app/api/generate/route.ts` | 67 | **LLM orchestration** — SSE streaming |
| `hooks/useGenerate.ts` | 133 | **SSE reader** — acumula + parse JSON |
| `components/canvas/CanvasWorkspace.tsx` | 208 | **Root canvas** — layout + event hub |
| `components/nodes/MacroNode.tsx` | ~80 | **Node visual** — DS/Journey card |
| `components/nodes/ScreenNode.tsx` | ~80 | **Screen visual** — tela card em micro |
| `components/canvas/ConnectorLayer.tsx` | ~100 | **Bezier connectors** — SVG paths |
| `lib/supabase/client.ts` | ~30 | **Browser auth** — @supabase/ssr |
| `lib/supabase/server.ts` | ~40 | **Server auth** — Server Components |
| `middleware.ts` | ~30 | **Session refresh** — auth guard |
| `utils/index.ts` | ~150 | **Factories + helpers** — cn, uid, completeness |

---

## 10. REGRAS ARQUITETURAIS (CRÍTICAS)

Conforme documentado em flowbridge-context.docx:

### 10.1 Conexões de Nodes
- ✅ DS/Lib → Journey: **obrigatório** para gerar código
- ✅ Journey → Journey: permitido com contexto
- ❌ Journey → DS/Lib: **bloqueado** (validação visual)
- ✅ DS/Lib → DS/Lib: permitido (dependência de libs)

### 10.2 Canvas State
- Store via **Zustand** (não useState local)
- Persist via **localStorage** (Fase 5: Supabase sync)
- Immer para mutable updates
- Devtools para debug

### 10.3 API Keys
- ANTHROPIC_API_KEY: `/api/generate` only
- FIGMA_ACCESS_TOKEN: `/api/figma` only
- Nunca expor ao bundle cliente

### 10.4 Contextos
- Estruturado (ScreenContext fields)
- Hierárquico (macro ← micro)
- Versioned (histórico em Supabase — Fase 5)

### 10.5 Tipo Safety
- ALL types em `types/index.ts`
- Nunca usar `any`
- Strict mode no tsconfig.json

### 10.6 Persistência
- Canvas state: localStorage (Zustand)
- Projects: Supabase (read via Server Components)
- Generation runs: Supabase (Fase 4)
- Sync: Background (Fase 5)

---

## 11. PRÓXIMOS PASSOS (BACKLOG PRIORIZADO)

### Priority 1: Port Canvas Components
```
MacroNode, ScreenNode, SVG connectors, Sidebar, RightPanel, FlowPanel
← v6 prototype é a reference
← Store actions já prontas
← Apenas precisa JSX
```
**Esforço:** ~1 dia

### Priority 2: Context Form UI
```
route input, purpose/userIntent textarea
component multi-select (de DS tags)
API endpoint builder (add rows)
auth toggle, notes, gen rules
```
**Esforço:** 3-4h  
**Impacto:** Qualidade de geração depende disso

### Priority 3: Figma URL Binding
```
Parse Figma URL → fileKey + nodeId
Call GET /api/figma (Route Handler pronto)
Fetch thumbnail + component list
Display in screen card
```
**Esforço:** 3-4h  
**Bloqueador:** Priority 1 (componentes port)

### Priority 4: Wire Generate Button
```
CanvasWorkspace ⚡ button → useGenerate.generate()
Build generation overlay (animated steps)
Build code modal (file tree + syntax highlight)
Copy/export buttons
Store generation_run em Supabase
```
**Esforço:** 4-6h  
**Core value prop:** Generation end-to-end

### Priority 5: Supabase Sync
```
Background sync canvas mutations
Load from Supabase on new device
Multi-device enabler
```
**Esforço:** 1 day  
**Bloqueador:** Priority 4 (precisa generation working first)

---

## 12. DECISÕES ARQUITETURAIS-CHAVE

### Por que Zustand + localStorage antes de Supabase?
Canvas mutations (pan, zoom, drag) disparam centenas de updates/segundo. Network writes seriam impossíveis. localStorage é instant. Supabase sync vem Fase 5.

### Por que Server Components para dashboard?
Project list é server data. Server Component fetches diretamente — sem loading spinner, sem client fetch. Canvas fica 100% Client Component.

### Por que single-file prototype (v6) como reference?
v6.html valida UX decisions through v1→v6 iterations. Não é codebase — é specification. Todos componentes React devem match v6 visually.

### Por que claude-sonnet-4-6?
Best balance de speed + qualidade para code generation. Config via ANTHROPIC_MODEL env var.

### Por que @supabase/ssr não supabase-js?
supabase-js usa localStorage (não existe server). @supabase/ssr usa cookies HTTP-only, funciona em Server Components, Route Handlers, middleware.

---

## 13. FLUXO DE UMA SESSÃO TÍPICA

```
1. User abre Flowbridge → Route guards to /login (middleware)
2. OAuth (GitHub/Google) → Session via cookies
3. Dashboard (Server Component) → Fetch projects
4. Click project → openProject(id)
5. Canvas loads → Zustand hydra from localStorage
6. User cria nodes (macro), connectors, flows, screens
7. User adiciona contextos (form — ainda texto livre)
8. User aciona Generate ← useGenerate.generate()
9. SSE streaming → Progress + JSON parsing
10. Code modal → Syntax highlight + copy
11. (Fase 5) Supabase sync em background
12. (Fase 5) GitHub commit optional
```

---

## 14. LIMITES E CONHECIDOS TÉCNICOS

### Figma MCP Rate Limits
- Pro/Organization + seat Full: Tier 1 rate limits (OK)
- Starter: 6 chamadas/mês (inviável)
- Enterprise: 600 chamadas/dia

**Implicação:** Documentar no onboarding que plano Starter não suporta.

### Canvas Complexity
Muito além de 500 nodes em um projeto = performance pode degradar (não testado em scale).
**Mitigation:** Por enquanto, single project context.

### Figma Webhook Latency
Webhooks são acionados mas não garantem imediatez. Event-driven sync pode ter delay.
**Mitigation:** User pode always trigger manual "Sync" button.

---

## 15. COMPARAÇÃO: v6.html vs Next.js Scaffold

| Aspecto | v6.html | Next.js Scaffold |
|---|---|---|
| Linhas | ~1500 | ~4000 (36 files) |
| Backend | Nenhum | Route Handlers |
| Auth | Nenhuma | GitHub + Google OAuth |
| DB | localStorage | PostgreSQL + Supabase |
| Persistência | Manual | Zustand + localStorage |
| Deployment | Vercel static | Vercel (server) |
| Escalabilidade | Solo dev only | Multi-user ready |
| Type safety | Parcial (JSDoc) | TypeScript strict |
| Code generation | Prompt stub | Full Claude integration |
| Figma integration | None | REST API + MCP ready |

---

## CONCLUSÃO

Flowbridge é um **framework design-to-code semanticamente rico** que combina:

1. **Canvas visual** (Zustand + React) — construção de jornadas
2. **Context engine** (Prompt builder) — semântica + intenção
3. **LLM orchestration** (Claude API) — geração fiel
4. **Figma integration** (REST API + MCP) — componentes reais
5. **Production-grade infra** (Next.js, Supabase, TypeScript)

**Status:** Fundação e infra prontas. Contextos + geração precisam de UI forms + wiring.

**Próxima milestone:** Fase 3 completa (context form + Figma binding + generate button wired) = **core value prop funcional end-to-end**.
