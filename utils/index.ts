import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {
  Screen, ScreenStatus, MacroNode, Project,
  ProjectSettings, Flow, Connection, XY,
  EMPTY_CONTEXT,
} from '@/types'
import { EMPTY_CONTEXT as EC } from '@/types'

// ── Class merging ──────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── ID ─────────────────────────────────────────────────────────────────────────
export const uid = (): string => crypto.randomUUID()

// ── Timestamps ─────────────────────────────────────────────────────────────────
export const now = (): string => new Date().toISOString()

// ── Relative time ──────────────────────────────────────────────────────────────
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

// ── Screen completeness ────────────────────────────────────────────────────────
// Weighted score: Figma(30) + purpose(20) + route(15) + components(15) + api(10) + notes(10)
export function screenCompleteness(sc: Screen): number {
  const c = sc.context
  let score = 0
  if (sc.figma?.nodeId)         score += 30
  if (c.purpose.length   > 10)  score += 20
  if (c.route.length     > 1)   score += 15
  if (c.components.length > 0)  score += 15
  if (c.apiEndpoints.length > 0) score += 10
  if (c.notes.length     > 10)  score += 10
  return Math.min(100, score)
}

export function deriveScreenStatus(sc: Screen): ScreenStatus {
  if (sc.status === 'generated') return 'generated'
  const pct = screenCompleteness(sc)
  if (pct >= 80) return 'ready'
  if (pct >= 20) return 'partial'
  return 'empty'
}

export function flowCompleteness(screens: Screen[]): number {
  if (!screens.length) return 0
  return Math.round(screens.reduce((sum, sc) => sum + screenCompleteness(sc), 0) / screens.length)
}

// ── Figma URL parser ───────────────────────────────────────────────────────────
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const u = new URL(url)
    const parts  = u.pathname.split('/')
    const keyIdx = parts.indexOf('design') + 1
    if (keyIdx < 1) return null
    const fileKey = parts[keyIdx]
    const nodeId  = u.searchParams.get('node-id')?.replace('-', ':') ?? ''
    return fileKey ? { fileKey, nodeId } : null
  } catch {
    return null
  }
}

// ── Object factories ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ProjectSettings = {
  framework:        'nextjs',
  componentLibrary: 'shadcn-ui',
  cssFramework:     'tailwind',
  iconSet:          'lucide',
  aiModel:          'claude-sonnet-4-6',
  outputDir:        'src/app',
}

export function makeProject(
  data: Pick<Project, 'name' | 'description' | 'color'>,
  ownerId: string,
): Project {
  return {
    ...data,
    id:       uid(),
    ownerId,
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now(),
    updatedAt: now(),
  }
}

export function makeNode(
  data: Pick<MacroNode, 'type' | 'name' | 'projectId'> & Partial<MacroNode>,
): MacroNode {
  return {
    description: '',
    tags:        [],
    position:    { x: 200, y: 200 },
    createdAt:   now(),
    ...data,
    id: uid(),
  }
}

export function makeFlow(
  data: Pick<Flow, 'journeyId' | 'projectId' | 'name' | 'order'>,
): Flow {
  return {
    ...data,
    id:        uid(),
    screens:   [],
    createdAt: now(),
  }
}

export function makeScreen(
  data: Pick<Screen, 'flowId' | 'projectId' | 'name' | 'position' | 'order'> & Partial<Screen>,
): Screen {
  return {
    context:   { ...EC },
    status:    'empty',
    createdAt: now(),
    ...data,
    id: uid(),
  }
}

export function makeConn(fromId: string, toId: string, projectId: string): Connection {
  return { id: uid(), projectId, fromId, toId }
}
