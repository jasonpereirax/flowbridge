// ─────────────────────────────────────────────────────────────────────────────
// FLOWBRIDGE — Domain Types
// Single source of truth for the entire data model.
// Used by: Zustand store, Supabase queries, Route Handlers, prompt builder.
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectId = string
export type NodeId    = string
export type ConnId    = string
export type FlowId    = string
export type ScreenId  = string
export type UserId    = string

// ── PROJECT ───────────────────────────────────────────────────────────────────

export interface Project {
  id:          ProjectId
  ownerId:     UserId
  name:        string
  description: string
  color:       string       // hex, e.g. "#2563EB"
  settings:    ProjectSettings
  createdAt:   string       // ISO 8601
  updatedAt:   string
}

export interface ProjectSettings {
  framework:        Framework
  componentLibrary: ComponentLibrary
  cssFramework:     CSSFramework
  iconSet:          string
  aiModel:          string
  outputDir:        string  // e.g. "src/app"
}

export type Framework        = 'nextjs' | 'react-vite' | 'remix' | 'astro'
export type ComponentLibrary = 'shadcn-ui' | 'radix-ui' | 'chakra-ui' | 'mantine' | 'none'
export type CSSFramework     = 'tailwind' | 'css-modules' | 'styled-components' | 'none'

// ── MACRO NODES ───────────────────────────────────────────────────────────────

export type MacroNodeType = 'ds' | 'journey'

// ── JOURNEY CONTEXT ───────────────────────────────────────────────────────────
// Nível 1 — contexto global da jornada. Herdado por todos os flows e screens.

export interface JourneyContext {
  goal:         string   // "Allow users to complete onboarding and verify their identity"
  targetUser:   string   // "New user who just created an account"
  platform:     string   // "Web (desktop-first), PWA"
  techNotes:    string   // "Uses server actions throughout. Auth via Supabase."
  designTokens: string   // "Colors, spacing from design system v2"
  globalRules:  string   // "All forms use react-hook-form. Zod for validation."
}

export const EMPTY_JOURNEY_CONTEXT: JourneyContext = {
  goal:         '',
  targetUser:   '',
  platform:     '',
  techNotes:    '',
  designTokens: '',
  globalRules:  '',
}

export interface MacroNode {
  id:          NodeId
  projectId:   ProjectId
  type:        MacroNodeType
  name:        string
  description: string
  tags:        string[]
  position:    XY
  createdAt:   string
  // DS-specific
  figmaFileKey?: string
  figmaFileUrl?: string
  // Journey-specific
  status?:       JourneyStatus
  journeyCtx?:   JourneyContext   // contexto semântico da journey (nível 1)
}

export type JourneyStatus = 'draft' | 'in-progress' | 'ready' | 'generated'

// ── CONNECTIONS ───────────────────────────────────────────────────────────────
// Only DS → Journey. Validated on creation.

export interface Connection {
  id:        ConnId
  projectId: ProjectId
  fromId:    NodeId   // DS node
  toId:      NodeId   // Journey node
}

// ── FLOWS ─────────────────────────────────────────────────────────────────────

// ── FLOW CONTEXT ──────────────────────────────────────────────────────────────
// Nível 2 — contexto do flow. Herdado por todos os screens do flow.
// flowCtx.general: texto livre descrevendo o flow como um todo.
// flowCtx.specific: notas específicas deste flow (estado compartilhado, condições, etc.)

export interface FlowContext {
  general:    string   // "Happy path for the sign-up funnel"
  specific:   string   // "Shares auth state with /login via cookie. Redirects to /dashboard on success."
  entryPoint: string   // "User arrives from marketing landing page via CTA button"
  exitPoints: string   // "Success → /dashboard, Error → stays on screen with error message"
  stateNotes: string   // "Form state managed locally. No global state needed."
}

export const EMPTY_FLOW_CONTEXT: FlowContext = {
  general:    '',
  specific:   '',
  entryPoint: '',
  exitPoints: '',
  stateNotes: '',
}

export interface Flow {
  id:        FlowId
  journeyId: NodeId
  projectId: ProjectId
  name:      string
  order:     number
  screens:   Screen[]
  createdAt: string
  flowCtx?:  FlowContext   // contexto semântico do flow (nível 2)
}

// ── SCREENS ───────────────────────────────────────────────────────────────────

export interface Screen {
  id:        ScreenId
  flowId:    FlowId
  projectId: ProjectId
  name:      string
  position:  XY
  order:     number
  isEntry?:  boolean
  isError?:  boolean
  context:   ScreenContext
  figma?:    ScreenFigma
  status:    ScreenStatus
  createdAt: string
}

// Structured context — the quality of this determines generation output quality
export interface ScreenContext {
  purpose:      string       // "Allow user to sign in with email + password"
  userIntent:   string       // "User wants to access their account"
  route:        string       // "/auth/login"
  requiresAuth: boolean
  apiEndpoints: ApiEndpoint[]
  components:   string[]     // ["Button", "Input", "Label"]
  notes:        string       // architecture notes
  genRules:     string       // "Use server action for form submission"
}

export const EMPTY_CONTEXT: ScreenContext = {
  purpose:      '',
  userIntent:   '',
  route:        '',
  requiresAuth: false,
  apiEndpoints: [],
  components:   [],
  notes:        '',
  genRules:     '',
}

export interface ApiEndpoint {
  method:      'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path:        string
  description: string
}

export interface ScreenFigma {
  url:           string
  nodeId:        string
  fileKey:       string
  thumbnailUrl?: string
  componentMap:  FigmaComponentMap[]
  fetchedAt:     string
}

export interface FigmaComponentMap {
  figmaName:     string   // "Button/Primary" in Figma
  codeComponent: string   // "Button" from shadcn/ui
  props?:        Record<string, unknown>
}

export type ScreenStatus = 'empty' | 'partial' | 'ready' | 'generated'

// ── CANVAS ────────────────────────────────────────────────────────────────────

export interface XY { x: number; y: number }

export interface CanvasTransform {
  x:     number
  y:     number
  scale: number
}

export type CanvasView = 'macro' | 'micro'

// ── CODE GENERATION ───────────────────────────────────────────────────────────

export interface GenerationRun {
  id:           string
  projectId:    ProjectId
  journeyId?:   NodeId
  flowId?:      FlowId
  screenIds?:   ScreenId[]
  status:       GenerationStatus
  model:        string
  files:        GeneratedFile[]
  promptTokens?: number
  outputTokens?: number
  error?:       string
  createdAt:    string
  completedAt?: string
}

export interface GeneratedFile {
  path:    string   // "src/app/(auth)/login/page.tsx"
  content: string
  lang:    'tsx' | 'ts' | 'css' | 'json' | 'md'
}

export type GenerationStatus = 'pending' | 'running' | 'done' | 'error'

// ── GENERATION REQUEST (sent to Route Handler) ────────────────────────────────

export interface GenerateRequest {
  projectId: ProjectId
  settings:  ProjectSettings
  dsNodes:   Pick<MacroNode, 'id' | 'name' | 'description' | 'tags' | 'figmaFileKey'>[]
  screens:   Screen[]
}

// ── USER ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:        UserId
  email:     string
  name:      string
  avatarUrl?: string
  plan:      'free' | 'pro' | 'team'
  createdAt: string
}

// ── UI STATE (Zustand only — never persisted) ─────────────────────────────────

export type EbarSection = 'macro' | 'comp'
export type RpanelTab   = 'properties' | 'context' | 'components' | 'info'
