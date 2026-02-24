import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Screen, ScreenStatus, MacroNode, Project, ProjectSettings } from '@/types'

// ── Class merging ─────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── ID generation ─────────────────────────────────────────────────────────────
// Uses crypto.randomUUID() when available (all modern browsers + Node 19+)
export const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11)

// ── Timestamps ────────────────────────────────────────────────────────────────
export const now = (): string => new Date().toISOString()

// ── Screen context completeness ───────────────────────────────────────────────
// Weights: Figma binding (30%), purpose (20%), route (15%),
//          components (15%), API endpoints (10%), notes (10%)
export function screenCompleteness(screen: Screen): number {
  const ctx = screen.context
  let score = 0

  if (screen.figma?.nodeId)         score += 30
  if (ctx.purpose?.length > 10)     score += 20
  if (ctx.route?.length > 1)        score += 15
  if (ctx.components?.length > 0)   score += 15
  if (ctx.apiEndpoints?.length > 0) score += 10
  if (ctx.notes?.length > 10)       score += 10

  return Math.min(100, score)
}

export function screenStatus(screen: Screen): ScreenStatus {
  const pct = screenCompleteness(screen)
  if (screen.status === 'generated') return 'generated'
  if (pct >= 80)  return 'ready'
  if (pct >= 20)  return 'partial'
  return 'empty'
}

// ── Journey completeness ──────────────────────────────────────────────────────
export function journeyCompleteness(screens: Screen[]): number {
  if (!screens.length) return 0
  const total = screens.reduce((sum, sc) => sum + screenCompleteness(sc), 0)
  return Math.round(total / screens.length)
}

// ── Project factory ───────────────────────────────────────────────────────────
export function createProject(
  partial: Pick<Project, 'name' | 'description' | 'color'>,
  ownerId: string,
): Project {
  const defaultSettings: ProjectSettings = {
    framework:        'nextjs',
    componentLibrary: 'shadcn-ui',
    cssFramework:     'tailwind',
    iconSet:          'lucide',
    aiModel:          'claude-sonnet-4-6',
    outputDir:        'src/app',
  }
  return {
    ...partial,
    id:        uid(),
    ownerId,
    settings:  defaultSettings,
    createdAt: now(),
    updatedAt: now(),
  }
}

// ── Node factory ──────────────────────────────────────────────────────────────
export function createMacroNode(
  partial: Pick<MacroNode, 'type' | 'name' | 'projectId'> & Partial<MacroNode>,
): MacroNode {
  return {
    description: '',
    tags:        [],
    position:    { x: 200, y: 200 },
    createdAt:   now(),
    ...partial,
    id: uid(),
  }
}

// ── Relative time ─────────────────────────────────────────────────────────────
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

// ── Parse Figma URL ───────────────────────────────────────────────────────────
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const u     = new URL(url)
    const parts = u.pathname.split('/')
    const keyIdx = parts.indexOf('design') + 1
    if (keyIdx < 1) return null
    const fileKey = parts[keyIdx]
    const nodeId  = u.searchParams.get('node-id')?.replace('-', ':') ?? ''
    return fileKey ? { fileKey, nodeId } : null
  } catch {
    return null
  }
}
