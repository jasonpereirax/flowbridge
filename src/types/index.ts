// ─────────────────────────────────────────────────────────────────────────────
// FLOWBRIDGE — Core Domain Types
// Every entity in the system is defined here.
// ─────────────────────────────────────────────────────────────────────────────

// ── IDs ──────────────────────────────────────────────────────────────────────
export type ProjectId = string
export type NodeId    = string
export type ConnId    = string
export type FlowId    = string
export type ScreenId  = string
export type UserId    = string

// ── PROJECT ──────────────────────────────────────────────────────────────────
export interface Project {
  id:          ProjectId
  name:        string
  description: string
  color:       string          // hex
  ownerId:     UserId
  createdAt:   string          // ISO
  updatedAt:   string          // ISO
  settings:    ProjectSettings
}

export interface ProjectSettings {
  framework:        Framework
  componentLibrary: ComponentLibrary
  cssFramework:     CSSFramework
  iconSet:          string
  aiModel:          string
  outputDir:        string     // e.g. "src/app"
}

export type Framework        = 'nextjs' | 'react-vite' | 'remix' | 'astro'
export type ComponentLibrary = 'shadcn-ui' | 'radix-ui' | 'chakra-ui' | 'mantine' | 'none'
export type CSSFramework     = 'tailwind' | 'css-modules' | 'styled-components' | 'none'

// ── MACRO NODES ──────────────────────────────────────────────────────────────

export type MacroNodeType = 'ds' | 'journey'

export interface MacroNode {
  id:          NodeId
  projectId:   ProjectId
  type:        MacroNodeType
  name:        string
  description: string
  tags:        string[]
  position:    Position
  createdAt:   string
  // DS-specific
  figmaFileKey?: string
  figmaFileUrl?: string
  // Journey-specific
  status?:     JourneyStatus
}

export type JourneyStatus = 'draft' | 'in-progress' | 'ready' | 'generated'

// ── CONNECTIONS ───────────────────────────────────────────────────────────────
// Only DS → Journey connections exist at macro level.
export interface Connection {
  id:        ConnId
  projectId: ProjectId
  fromId:    NodeId           // must be DS node
  toId:      NodeId           // must be Journey node
}

// ── FLOWS ─────────────────────────────────────────────────────────────────────
export interface Flow {
  id:          FlowId
  journeyId:   NodeId
  projectId:   ProjectId
  name:        string
  order:       number
  screens:     Screen[]
  createdAt:   string
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
export interface Screen {
  id:          ScreenId
  flowId:      FlowId
  projectId:   ProjectId
  name:        string
  position:    Position
  order:       number
  context:     ScreenContext
  figma?:      ScreenFigma
  status:      ScreenStatus
  createdAt:   string
}

// Structured context — this is what drives code generation quality
export interface ScreenContext {
  purpose:       string    // "Allow user to sign in with email + password"
  userIntent:    string    // "User wants to access their account"
  route:         string    // "/auth/login"
  requiresAuth:  boolean
  apiEndpoints:  ApiEndpoint[]
  components:    string[]  // ["Button", "Input", "Label", "Card"]
  notes:         string    // free-form architecture notes
  genRules:      string    // "Use server action, no client components"
}

export interface ApiEndpoint {
  method:      'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path:        string    // "/api/auth/login"
  description: string
}

// Figma binding
export interface ScreenFigma {
  url:         string
  nodeId:      string
  fileKey:     string
  thumbnailUrl?: string
  componentMap: FigmaComponentMap[]
  fetchedAt:   string
}

export interface FigmaComponentMap {
  figmaName:   string    // "Button/Primary" in Figma
  codeComponent: string  // "Button" from shadcn/ui
  props?:      Record<string, unknown>
}

export type ScreenStatus = 'empty' | 'partial' | 'ready' | 'generated'

// ── CANVAS ────────────────────────────────────────────────────────────────────
export interface Position {
  x: number
  y: number
}

export interface CanvasTransform {
  x:     number   // pan X
  y:     number   // pan Y
  scale: number   // zoom
}

export type CanvasView = 'macro' | 'micro'

// ── GENERATION ────────────────────────────────────────────────────────────────
export interface GenerationRun {
  id:          string
  projectId:   ProjectId
  journeyId?:  NodeId
  flowId?:     FlowId
  screenId?:   ScreenId
  status:      GenerationStatus
  model:       string
  files:       GeneratedFile[]
  prompt?:     string          // stored for debugging
  tokensUsed?: number
  createdAt:   string
  completedAt?: string
}

export interface GeneratedFile {
  path:    string             // "src/app/(auth)/login/page.tsx"
  content: string
  lang:    'tsx' | 'ts' | 'css' | 'json'
}

export type GenerationStatus = 'pending' | 'running' | 'done' | 'error'

// ── AUTH / USER ───────────────────────────────────────────────────────────────
export interface UserProfile {
  id:        UserId
  email:     string
  name:      string
  avatarUrl?: string
  plan:      'free' | 'pro' | 'team'
  createdAt: string
}

// ── UI STATE ──────────────────────────────────────────────────────────────────
// Not persisted — lives in Zustand only
export interface UIState {
  selNodeId:   NodeId   | null
  selConnId:   ConnId   | null
  selScreenId: ScreenId | null
  fabOpen:     boolean
  ibarOpen:    boolean
  ebarOpen:    boolean
  ebarSection: EbarSection
  rpanelOpen:  boolean
  rpanelTab:   RpanelTab
  genRunning:  boolean
}

export type EbarSection = 'macro' | 'comp'
export type RpanelTab   = 'properties' | 'context' | 'info'

// ── UTILS ─────────────────────────────────────────────────────────────────────
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type WithoutDates<T> = Omit<T, 'createdAt' | 'updatedAt' | 'completedAt'>
