import { NextRequest, NextResponse } from 'next/server'
import { extractDesignSpec, type VarMap } from '@/lib/figma/extract'

/**
 * POST /api/figma-mcp
 *
 * Extração máxima de contexto do Figma combinando:
 * - MCP (via SSE): get_design_context — props, variantes, Code Connect, snippet de código
 * - REST API: nós completos, estilos, variáveis locais, thumbnail
 *
 * Retorna tudo consolidado para o prompt builder.
 */

// Figma Dev Mode MCP server. Defaults to the local desktop server (Streamable
// HTTP). Override with FIGMA_DEVMODE_MCP_URL if needed.
const MCP_URL          = process.env.FIGMA_DEVMODE_MCP_URL ?? 'http://127.0.0.1:3845/mcp'
const FIGMA_TOKEN      = process.env.FIGMA_ACCESS_TOKEN ?? ''
const FIGMA_API        = 'https://api.figma.com/v1'
const MCP_MAX_CODE     = 120_000  // keep the full Figma reference (no truncation)

// ── REST helpers ──────────────────────────────────────────────────────────────

async function figmaGet(path: string): Promise<unknown> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  })
  if (!res.ok) throw new Error(`Figma REST ${path} → ${res.status}`)
  return res.json()
}

// Extrai recursivamente todos os nós INSTANCE e COMPONENT com props
function extractComponents(node: unknown, depth = 0): ComponentEntry[] {
  if (!node || typeof node !== 'object' || depth > 12) return []
  const n = node as Record<string, unknown>
  const results: ComponentEntry[] = []

  if (n.type === 'INSTANCE' || n.type === 'COMPONENT') {
    const entry: ComponentEntry = {
      figmaName:     String(n.name ?? ''),
      codeComponent: String(n.name ?? '').split('/')[0].trim(),
      type:          String(n.type),
      nodeId:        String(n.id ?? ''),
    }
    if (n.componentId)          entry.componentId    = String(n.componentId)
    if (n.componentProperties)  entry.props          = n.componentProperties as Record<string, unknown>
    if (n.variantProperties)    entry.variants       = n.variantProperties as Record<string, string>
    results.push(entry)
  }

  const doc = (n.document ?? n) as Record<string, unknown>
  const children = doc.children ?? n.children
  if (Array.isArray(children)) {
    for (const child of children) {
      results.push(...extractComponents(child, depth + 1))
    }
  }
  return results
}

// Extrai fills/strokes/effects como tokens de cor
function extractColorTokens(node: unknown, tokens: Record<string, string> = {}, depth = 0): Record<string, string> {
  if (!node || typeof node !== 'object' || depth > 8) return tokens
  const n = node as Record<string, unknown>

  function paintToHex(paint: Record<string, unknown>): string | null {
    if (paint.type !== 'SOLID') return null
    const c = paint.color as Record<string, number> | undefined
    if (!c) return null
    const r = Math.round((c.r ?? 0) * 255)
    const g = Math.round((c.g ?? 0) * 255)
    const b = Math.round((c.b ?? 0) * 255)
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }

  for (const field of ['fills', 'strokes'] as const) {
    const paints = n[field]
    if (Array.isArray(paints)) {
      for (const p of paints) {
        const hex = paintToHex(p as Record<string, unknown>)
        if (hex && n.name) tokens[String(n.name)] = hex
      }
    }
  }

  const doc = (n.document ?? n) as Record<string, unknown>
  const children = doc.children ?? n.children
  if (Array.isArray(children)) {
    for (const child of children) extractColorTokens(child, tokens, depth + 1)
  }
  return tokens
}

interface ComponentEntry {
  figmaName:     string
  codeComponent: string
  type:          string
  nodeId:        string
  componentId?:  string
  props?:        Record<string, unknown>
  variants?:     Record<string, string>
}

// ── Figma Dev Mode MCP (Streamable HTTP) ──────────────────────────────────────
// Talks to the local Figma desktop Dev Mode MCP server. get_design_context with
// forceCode returns Figma's OWN React+Tailwind translation of the node — the
// highest-fidelity source there is (exact layout/measurements + real assets).

const MCP_HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }

function parseSSEResult(text: string): Record<string, unknown> | null {
  let result: Record<string, unknown> | null = null
  for (const line of text.split('\n')) {
    const l = line.trim()
    if (!l.startsWith('data:')) continue
    try {
      const o = JSON.parse(l.slice(5).trim()) as Record<string, unknown>
      if ('result' in o || 'error' in o) result = o
    } catch { /* skip non-JSON SSE frames */ }
  }
  return result
}

async function callFigmaDevModeMCP(nodeId: string): Promise<{ code?: string } | null> {
  if (!MCP_URL) return null
  try {
    // 1. initialize → session id (in response header)
    const initRes = await fetch(MCP_URL, {
      method: 'POST', headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'flowbridge', version: '1' } } }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!initRes.ok) return null
    const sid = initRes.headers.get('mcp-session-id')
    await initRes.text().catch(() => {})
    if (!sid) return null

    const sessionHeaders = { ...MCP_HEADERS, 'mcp-session-id': sid }

    // 2. notifications/initialized
    await fetch(MCP_URL, { method: 'POST', headers: sessionHeaders, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(8_000) }).then(r => r.text()).catch(() => {})

    // 3. tools/call get_design_context (force the code, skip Code Connect gate)
    const callRes = await fetch(MCP_URL, {
      method: 'POST', headers: sessionHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: { name: 'get_design_context', arguments: {
          nodeId, clientLanguages: 'typescript', clientFrameworks: 'react',
          disableCodeConnect: true, forceCode: true,
        } },
      }),
      signal: AbortSignal.timeout(40_000),
    })
    if (!callRes.ok) return null

    const result = parseSSEResult(await callRes.text())
    if (!result || 'error' in result) return null

    const content = (result.result as { content?: { type: string; text?: string }[] })?.content ?? []
    const texts   = content.filter(b => b.type === 'text' && b.text).map(b => b.text as string)
    // The big block (contains JSX / const declarations) is Figma's reference code.
    const codeBlock = texts.find(t => t.length > 400 && (/const |function |=>|<[A-Za-z]/.test(t))) ?? texts[0]
    if (!codeBlock) return null

    return { code: codeBlock.slice(0, MCP_MAX_CODE) }
  } catch {
    return null
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { fileKey?: string; nodeId?: string }
    const { fileKey, nodeId } = body

    if (!fileKey || !nodeId) {
      return NextResponse.json({ error: 'fileKey e nodeId são obrigatórios' }, { status: 400 })
    }
    if (!FIGMA_TOKEN) {
      return NextResponse.json({ error: 'FIGMA_ACCESS_TOKEN não configurado' }, { status: 500 })
    }

    // ── Dispara tudo em paralelo ──────────────────────────────────────────────
    const [
      nodesData,
      stylesData,
      variablesData,
      imagesData,
      mcpResult,
    ] = await Promise.allSettled([
      figmaGet(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=10`),
      figmaGet(`/files/${fileKey}/styles`),
      figmaGet(`/files/${fileKey}/variables/local`),
      figmaGet(`/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`),
      callFigmaDevModeMCP(nodeId),
    ])

    // ── Processar nós REST ────────────────────────────────────────────────────
    const nodes = nodesData.status === 'fulfilled' ? nodesData.value as Record<string, unknown> : {}
    const nodeKey = nodeId.replace(':', '-')
    const nodeEntry = (nodes?.nodes as Record<string, unknown>)?.[nodeKey]
      ?? (nodes?.nodes as Record<string, unknown>)?.[nodeId]
      ?? Object.values((nodes?.nodes as Record<string, unknown>) ?? {})[0]

    const components = extractComponents(nodeEntry)
    const colorTokensFromNodes = extractColorTokens(nodeEntry)

    // Deduplicar por nome
    const uniqueComponents = Array.from(
      new Map(components.map(c => [c.figmaName, c])).values()
    )

    // ── Processar estilos REST ────────────────────────────────────────────────
    const styles = stylesData.status === 'fulfilled'
      ? (stylesData.value as Record<string, unknown>)?.meta as Record<string, unknown>
      : {}
    const stylesList = (styles?.styles as Array<Record<string, unknown>> ?? []).map(s => ({
      key:         String(s.key ?? ''),
      name:        String(s.name ?? ''),
      styleType:   String(s.style_type ?? ''),
      description: String(s.description ?? ''),
    }))

    // ── Processar variáveis REST ──────────────────────────────────────────────
    interface FigmaVariable { name: string; resolvedType: string; valuesByMode: Record<string, unknown> }
    const vars = variablesData.status === 'fulfilled'
      ? (variablesData.value as Record<string, unknown>)?.meta as Record<string, unknown>
      : {}
    const variableEntries = Object.entries((vars?.variables as Record<string, FigmaVariable>) ?? {})
    const variablesList = variableEntries.map(([, v]) => ({
      name:         v.name,
      type:         v.resolvedType,
      value:        Object.values(v.valuesByMode ?? {})[0],
    }))

    // id → human name, so the extractor can resolve boundVariables to token names.
    const varMap: VarMap = {}
    for (const [id, v] of variableEntries) varMap[id] = v.name

    // ── Thumbnail ─────────────────────────────────────────────────────────────
    const imgData = imagesData.status === 'fulfilled' ? imagesData.value as Record<string, unknown> : {}
    const thumbnailUrl = (imgData?.images as Record<string, string>)?.[nodeId]
      ?? (imgData?.images as Record<string, string>)?.[nodeKey]
      ?? Object.values((imgData?.images as Record<string, string>) ?? {})[0]

    // ── MCP: design context rico ──────────────────────────────────────────────
    const mcp = mcpResult.status === 'fulfilled' ? mcpResult.value : null

    // ── Consolidar tokens ─────────────────────────────────────────────────────
    const allTokens: Record<string, unknown> = {
      colors:     colorTokensFromNodes,
      variables:  variablesList.slice(0, 80),
      styles:     stylesList.slice(0, 40),
    }

    const allComponents = uniqueComponents

    // ── Design spec abrangente (auto-layout, tipografia, fills, efeitos, tokens) ─
    const structure = extractDesignSpec(nodeEntry, varMap)

    // ── Tokens serializados (variáveis semânticas + cores) ─────────────────────
    function fmtVarValue(val: unknown): string {
      if (val && typeof val === 'object') {
        const c = val as { r?: number; g?: number; b?: number }
        if (typeof c.r === 'number') {
          const to = (x = 0) => Math.round(x * 255).toString(16).padStart(2, '0')
          return `#${to(c.r)}${to(c.g)}${to(c.b)}`.toUpperCase()
        }
        return JSON.stringify(val).slice(0, 40)
      }
      return String(val)
    }
    const tokenLines: string[] = []
    for (const v of variablesList.slice(0, 60)) {
      tokenLines.push(`${v.name} (${v.type}): ${fmtVarValue(v.value)}`)
    }
    const colorMap = allTokens.colors as Record<string, string>
    for (const [name, hexv] of Object.entries(colorMap).slice(0, 40)) {
      tokenLines.push(`${name}: ${hexv}`)
    }
    if (stylesList.length) tokenLines.push(`(+${stylesList.length} named styles)`)
    const tokensText = tokenLines.join('\n')

    // ── Resposta final ────────────────────────────────────────────────────────
    return NextResponse.json({
      // Para o componentMap do ScreenFigma
      components: allComponents,

      // Outline estrutural rico (estrutura + textos + dimensões/tipografia/cores)
      structure,

      // Tokens serializados para o prompt
      tokensText,

      // Tokens completos para o prompt
      tokens: allTokens,

      // Thumbnail para exibir no card
      thumbnailUrl,

      // Código de referência do MCP (tradução do próprio Figma — alta fidelidade)
      referenceCode: mcp?.code ?? null,

      // Metadados
      meta: {
        nodeId,
        fileKey,
        fetchedAt:        new Date().toISOString(),
        componentCount:   allComponents.length,
        variableCount:    variablesList.length,
        styleCount:       stylesList.length,
        mcpAvailable:     !!mcp,
      },
    })

  } catch (err) {
    console.error('[figma-mcp]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
