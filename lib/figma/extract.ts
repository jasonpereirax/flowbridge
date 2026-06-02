// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Figma design extractor.
//
// Walks a raw Figma node tree and serializes a DENSE, LLM-readable design spec
// capturing everything that drives fidelity: auto-layout (→ flexbox), full
// typography, fills (solid/gradient/image), strokes, effects, radii, opacity,
// component props/variants, and bound design-variable (token) references.
//
// The Figma /files/:key/nodes response already includes all of this — the old
// distiller simply discarded most of it.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LINES = 420
const MAX_TEXT  = 160

interface RGBA { r?: number; g?: number; b?: number; a?: number }
interface ColorStop { position?: number; color?: RGBA }
interface Paint {
  type?: string
  visible?: boolean
  opacity?: number
  color?: RGBA
  gradientStops?: ColorStop[]
  scaleMode?: string
}
interface Effect { type?: string; visible?: boolean; radius?: number; offset?: { x?: number; y?: number }; color?: RGBA; spread?: number }
interface VarAlias { type?: string; id?: string }
interface FigmaNode {
  type?: string
  name?: string
  visible?: boolean
  opacity?: number
  characters?: string
  children?: FigmaNode[]
  document?: FigmaNode
  absoluteBoundingBox?: { width?: number; height?: number }
  // auto-layout
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
  itemSpacing?: number
  paddingLeft?: number; paddingRight?: number; paddingTop?: number; paddingBottom?: number
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  layoutSizingHorizontal?: string
  layoutSizingVertical?: string
  // type
  style?: {
    fontFamily?: string; fontWeight?: number; fontSize?: number
    lineHeightPx?: number; letterSpacing?: number
    textAlignHorizontal?: string; textCase?: string; textDecoration?: string
  }
  // paint / stroke / effect
  fills?: Paint[]
  strokes?: Paint[]
  strokeWeight?: number
  effects?: Effect[]
  cornerRadius?: number
  rectangleCornerRadii?: number[]
  // component
  componentProperties?: Record<string, { value?: unknown }>
  variantProperties?: Record<string, string>
  // token bindings
  boundVariables?: Record<string, VarAlias | VarAlias[]>
}

export type VarMap = Record<string, string>  // variableId -> human name

// ── formatters ───────────────────────────────────────────────────────────────

function hex(c: RGBA): string {
  const to = (v: number) => Math.round((v ?? 0) * 255).toString(16).padStart(2, '0')
  return `#${to(c.r ?? 0)}${to(c.g ?? 0)}${to(c.b ?? 0)}`.toUpperCase()
}

function paint(p: Paint): string {
  if (p.visible === false) return ''
  if (p.type === 'SOLID' && p.color) return hex(p.color)
  if (p.type?.startsWith('GRADIENT')) {
    const stops = (p.gradientStops ?? []).map(s => s.color ? hex(s.color) : '').filter(Boolean)
    return `gradient(${stops.join('→')})`
  }
  if (p.type === 'IMAGE') return `image(${p.scaleMode ?? 'FILL'})`
  return ''
}

function firstFill(n: FigmaNode): string {
  for (const p of n.fills ?? []) { const s = paint(p); if (s) return s }
  return ''
}

function stroke(n: FigmaNode): string {
  const s = (n.strokes ?? []).map(paint).filter(Boolean)[0]
  return s ? `stroke:${s}${n.strokeWeight ? `/${Math.round(n.strokeWeight)}` : ''}` : ''
}

function radius(n: FigmaNode): string {
  if (Array.isArray(n.rectangleCornerRadii) && n.rectangleCornerRadii.some(r => r > 0)) {
    return `r:${n.rectangleCornerRadii.map(r => Math.round(r)).join('/')}`
  }
  if (n.cornerRadius) return `r:${Math.round(n.cornerRadius)}`
  return ''
}

function effects(n: FigmaNode): string {
  const fx = (n.effects ?? [])
    .filter(e => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW' || e.type?.includes('BLUR')))
    .map(e => {
      if (e.type?.includes('BLUR')) return `blur:${Math.round(e.radius ?? 0)}`
      const off = e.offset ? `${Math.round(e.offset.x ?? 0)},${Math.round(e.offset.y ?? 0)}` : '0,0'
      return `shadow:${off}/${Math.round(e.radius ?? 0)}${e.color ? ' ' + hex(e.color) : ''}`
    })
  return fx.join(' ')
}

const ALIGN: Record<string, string> = { MIN: 'start', CENTER: 'center', MAX: 'end', SPACE_BETWEEN: 'between', BASELINE: 'baseline' }

function layout(n: FigmaNode): string {
  if (!n.layoutMode || n.layoutMode === 'NONE') return ''
  const dir = n.layoutMode === 'HORIZONTAL' ? 'row' : 'col'
  const parts = [dir]
  // gap only matters with 2+ children (Figma keeps a stale itemSpacing otherwise).
  if (n.itemSpacing && (n.children?.length ?? 0) > 1) parts.push(`gap:${Math.round(n.itemSpacing)}`)
  const p = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(v => Math.round(v ?? 0))
  if (p.some(v => v > 0)) parts.push(`pad:${p.join('/')}`)
  if (n.primaryAxisAlignItems && n.primaryAxisAlignItems !== 'MIN') parts.push(`justify:${ALIGN[n.primaryAxisAlignItems] ?? n.primaryAxisAlignItems.toLowerCase()}`)
  if (n.counterAxisAlignItems && n.counterAxisAlignItems !== 'MIN') parts.push(`align:${ALIGN[n.counterAxisAlignItems] ?? n.counterAxisAlignItems.toLowerCase()}`)
  return parts.join(' ')
}

function dims(n: FigmaNode): string {
  const b = n.absoluteBoundingBox
  return b?.width && b?.height ? `${Math.round(b.width)}×${Math.round(b.height)}` : ''
}

function boundTokens(n: FigmaNode, varMap?: VarMap): string {
  if (!n.boundVariables || !varMap) return ''
  const out: string[] = []
  for (const [prop, ref] of Object.entries(n.boundVariables)) {
    const alias = Array.isArray(ref) ? ref[0] : ref
    const name  = alias?.id ? varMap[alias.id] : undefined
    if (name) out.push(`${prop}={${name}}`)
  }
  return out.length ? `token(${out.join(' ')})` : ''
}

function typography(n: FigmaNode): string {
  const s = n.style; if (!s) return ''
  const parts: string[] = []
  if (s.fontFamily) parts.push(s.fontFamily)
  if (s.fontSize)   parts.push(`${Math.round(s.fontSize)}${s.fontWeight ? '/' + s.fontWeight : ''}`)
  if (s.lineHeightPx) parts.push(`lh:${Math.round(s.lineHeightPx)}`)
  if (s.letterSpacing) parts.push(`ls:${s.letterSpacing.toFixed(1)}`)
  if (s.textAlignHorizontal && s.textAlignHorizontal !== 'LEFT') parts.push(s.textAlignHorizontal.toLowerCase())
  if (s.textCase && s.textCase !== 'ORIGINAL') parts.push(s.textCase.toLowerCase())
  return parts.join(' ')
}

// ── walker ───────────────────────────────────────────────────────────────────

export function extractDesignSpec(entry: unknown, varMap?: VarMap): string {
  const root = ((entry as FigmaNode)?.document ?? entry) as FigmaNode | undefined
  if (!root || typeof root !== 'object') return ''

  const lines: string[] = []
  const fonts = new Set<string>()

  // A subtree is worth emitting only if it carries text or a component — this
  // prunes icon/vector wrappers (a single logo can be 30+ VECTOR paths).
  function meaningful(n: FigmaNode, depth = 0): boolean {
    if (!n || depth > 14) return false
    if (n.type === 'TEXT' && n.characters?.trim()) return true
    if (n.type === 'INSTANCE' || n.type === 'COMPONENT') return true
    return (n.children ?? []).some(c => meaningful(c, depth + 1))
  }

  function walk(n: FigmaNode, depth: number) {
    if (!n || n.visible === false || lines.length >= MAX_LINES || depth > 14) return
    const type = n.type
    const ind  = '  '.repeat(Math.min(depth, 10))
    const fill = firstFill(n)
    const op   = n.opacity != null && n.opacity < 1 ? `op:${n.opacity.toFixed(2)}` : ''

    if (type === 'TEXT') {
      const t = n.characters?.replace(/\s+/g, ' ').trim()
      if (t) {
        if (n.style?.fontFamily) fonts.add(n.style.fontFamily)
        const typo = typography(n)
        const col  = fill && fill !== '#000000' ? ` ${fill}` : (fill === '#000000' ? ' #000000' : '')
        lines.push(`${ind}TEXT "${t.slice(0, MAX_TEXT)}"${typo ? ` [${typo}]` : ''}${col}`)
      }
    } else if (type === 'INSTANCE' || type === 'COMPONENT') {
      const variants = n.variantProperties ? ' ' + Object.entries(n.variantProperties).map(([k, v]) => `${k}=${v}`).join(',') : ''
      lines.push(`${ind}COMPONENT ${n.name ?? ''}${variants} ${dims(n)}`.trimEnd())
    } else if (type === 'FRAME' || type === 'GROUP' || type === 'SECTION' || type === 'COMPONENT_SET') {
      if (meaningful(n)) {
        const segs = [
          `${type} "${n.name ?? ''}"`, dims(n), layout(n),
          fill ? `fill:${fill}` : '', stroke(n), radius(n), effects(n), op,
          boundTokens(n, varMap),
        ].filter(Boolean)
        lines.push(ind + segs.join(' '))
      }
    } else if (type === 'RECTANGLE' || type === 'ELLIPSE') {
      // Emit only filled/stroked shapes (avatars, dividers, image holders).
      // VECTOR/LINE are skipped — they're almost always icon-path noise.
      if (fill || stroke(n)) {
        const segs = [`${type} "${n.name ?? ''}"`, dims(n), fill ? `fill:${fill}` : '', stroke(n), radius(n), boundTokens(n, varMap)].filter(Boolean)
        lines.push(ind + segs.join(' '))
      }
    }
    // VECTOR / LINE intentionally not emitted.

    // Don't descend into vector/icon internals.
    if (type !== 'VECTOR') {
      for (const c of n.children ?? []) walk(c, depth + 1)
    }
  }

  walk(root, 0)

  const header = fonts.size
    ? `FONTS (load these exactly, e.g. via Google Fonts): ${[...fonts].join(', ')}\n\n`
    : ''
  return header + lines.slice(0, MAX_LINES).join('\n')
}
