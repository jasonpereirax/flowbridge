// types/index.ts — cole este conteúdo exato no arquivo types/index.ts do seu repo

export type ProjectId = string
export type NodeId    = string
export type ConnId    = string
export type FlowId    = string
export type ScreenId  = string
export type UserId    = string

export type Framework        = 'nextjs' | 'react-vite' | 'remix' | 'astro'
export type ComponentLibrary = 'shadcn-ui' | 'radix-ui' | 'chakra-ui' | 'mantine' | 'none'
export type CSSFramework     = 'tailwind' | 'css-modules' | 'styled-components' | 'none'

export interface ProjectSettings {
  framework:        Framework
  componentLibrary: ComponentLibrary
  cssFramework:     CSSFramework
  iconSet:          string
  aiModel:          string
  outputDir:        string
}

export interface Project {
  id:          ProjectId
  ownerId:     UserId
  name:        string
  description: string
  color:       string
  settings:    ProjectSettings
  createdAt:   string
  updatedAt:   string
}

export type MacroNodeType = 'ds' | 'journey'
export type JourneyStatus = 'draft' | 'in-progress' | 'ready' | 'generated'

export interface JourneyContext {
  goal:         string
  targetUser:   string
  platform:     string
  techNotes:    string
  designTokens: string
  globalRules:  string
}

export const EMPTY_JOURNEY_CONTEXT: JourneyContext = {
  goal: '', targetUser: '', platform: '',
  techNotes: '', designTokens: '', globalRules: '',
}

export interface MacroNode {
  id:            NodeId
  projectId:     ProjectId
  type:          MacroNodeType
  name:          string
  description:   string
  tags:          string[]
  position:      XY
  createdAt:     string
  figmaFileKey?: string
  figmaFileUrl?: string
  status?:       JourneyStatus
  journeyCtx?:   JourneyContext
}

export interface Connection {
  id:        ConnId
  projectId: ProjectId
  fromId:    NodeId
  toId:      NodeId
}

export interface FlowContext {
  general:    string
  specific:   string
  entryPoint: string
  exitPoints: string
  stateNotes: string
}

export const EMPTY_FLOW_CONTEXT: FlowContext = {
  general: '', specific: '', entryPoint: '', exitPoints: '', stateNotes: '',
}

export interface Flow {
  id:        FlowId
  journeyId: NodeId
  projectId: ProjectId
  name:      string
  order:     number
  screens:   Screen[]
  createdAt: string
  flowCtx?:  FlowContext
}

// 'draft' = screen excluída de análise e geração
export type ScreenStatus = 'empty' | 'partial' | 'ready' | 'generated' | 'draft'

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

export interface ScreenContext {
  purpose:      string
  userIntent:   string
  route:        string
  requiresAuth: boolean
  apiEndpoints: ApiEndpoint[]
  components:   string[]
  notes:        string
  genRules:     string
}

export interface ApiEndpoint {
  method:      'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path:        string
  description: string
}

export const EMPTY_CONTEXT: ScreenContext = {
  purpose: '', userIntent: '', route: '', requiresAuth: false,
  apiEndpoints: [], components: [], notes: '', genRules: '',
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
  figmaName:     string
  codeComponent: string
  props?:        Record<string, unknown>
}

export interface GeneratedFile {
  path:    string
  content: string
  lang:    'tsx' | 'ts' | 'css' | 'json' | 'md'
}

export interface GenerateRequest {
  projectId: ProjectId
  settings:  ProjectSettings
  dsNodes:   Pick<MacroNode, 'id' | 'name' | 'description' | 'tags' | 'figmaFileKey'>[]
  screens:   Screen[]
}

export interface XY {
  x: number
  y: number
}

export interface CanvasTransform {
  x:     number
  y:     number
  scale: number
}

export type CanvasView  = 'macro' | 'micro'
export type EbarSection = 'macro' | 'comp'
export type RpanelTab   = 'properties' | 'context' | 'info' | 'components'

export interface CanvasData {
  nodes:   MacroNode[]
  conns:   Connection[]
  flows:   Record<NodeId, Flow[]>
  curFlow: Record<NodeId, FlowId>
}
