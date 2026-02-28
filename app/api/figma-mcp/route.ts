import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/figma-mcp
 *
 * Extração máxima de contexto do Figma combinando:
 * - MCP (via SSE): get_design_context — props, variantes, Code Connect, snippet de código
 * - REST API: nós completos, estilos, variáveis locais, thumbnail
 *
 * Retorna tudo consolidado para o prompt builder.
 */

const MCP_URL          = process.env.FIGMA_MCP_URL    ?? ''
const FIGMA_TOKEN      = process.env.FIGMA_ACCESS_TOKEN ?? ''
const FIGMA_API        = 'https://api.figma.com/v1'

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

// ── SSE / MCP helpers ─────────────────────────────────────────────────────────

async function callMCPGetDesignContext(
  fileKey: string, nodeId: string
): Promise<{ code?: string; components?: string[]; tokens?: Record<string, string>; raw?: string } | null> {
  if (!MCP_URL) return null

  try {
    // 1. Abrir sessão SSE
    const sseRes = await fetch(`${MCP_URL}/sse`, {
      headers: { Accept: 'text/event-stream' },
    })
    if (!sseRes.ok || !sseRes.body) return null

    const reader  = sseRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer    = ''
    let sessionId: string | undefined
    const t0 = Date.now()

    // 2. Aguardar sessionId (max 8s)
    while (!sessionId && Date.now() - t0 < 8_000) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: /messages?sessionId=')) {
          sessionId = line.replace('data: /messages?sessionId=', '').trim()
        }
      }
    }
    if (!sessionId) { reader.cancel(); return null }

    // 3. Enviar get_design_context
    await fetch(`${MCP_URL}/messages?sessionId=${sessionId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method:  'tools/call',
        params:  { name: 'get_design_context', arguments: { fileKey, nodeId, depth: 6 } },
      }),
    })

    // 4. Ler resultado do stream (max 25s)
    buffer = ''
    const t1 = Date.now()
    while (Date.now() - t1 < 25_000) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (!raw) continue
        try {
          const obj = JSON.parse(raw) as Record<string, unknown>
          if ('result' in obj) {
            reader.cancel()
            const content = (obj.result as Record<string, unknown>)?.content
            const textBlock = Array.isArray(content)
              ? content.find((b: { type: string }) => b.type === 'text')
              : null
            const text: string = (textBlock as { text?: string } | null)?.text ?? JSON.stringify(obj.result)

            // Tenta parsear JSON embutido no texto
            let parsed: Record<string, unknown> = {}
            try { parsed = JSON.parse(text) } catch {
              const m = text.match(/\{[\s\S]*\}/)
              try { if (m) parsed = JSON.parse(m[0]) } catch { /* ok */ }
            }

            return {
              code:       parsed.code       as string | undefined,
              components: parsed.components as string[] | undefined,
              tokens:     parsed.tokens     as Record<string, string> | undefined,
              raw:        text,
            }
          }
          if ('error' in obj) { reader.cancel(); return null }
        } catch { /* continua */ }
      }
    }
    reader.cancel()
    return null
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
      callMCPGetDesignContext(fileKey, nodeId),
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
    const variablesList = Object.values(
      (vars?.variables as Record<string, FigmaVariable>) ?? {}
    ).map(v => ({
      name:         v.name,
      type:         v.resolvedType,
      value:        Object.values(v.valuesByMode ?? {})[0],
    }))

    // ── Thumbnail ─────────────────────────────────────────────────────────────
    const imgData = imagesData.status === 'fulfilled' ? imagesData.value as Record<string, unknown> : {}
    const thumbnailUrl = (imgData?.images as Record<string, string>)?.[nodeId]
      ?? (imgData?.images as Record<string, string>)?.[nodeKey]
      ?? Object.values((imgData?.images as Record<string, string>) ?? {})[0]

    // ── MCP: design context rico ──────────────────────────────────────────────
    const mcp = mcpResult.status === 'fulfilled' ? mcpResult.value : null

    // ── Consolidar tokens ─────────────────────────────────────────────────────
    const allTokens: Record<string, unknown> = {
      colors:     { ...colorTokensFromNodes, ...(mcp?.tokens ?? {}) },
      variables:  variablesList.slice(0, 80),
      styles:     stylesList.slice(0, 40),
    }

    // ── Consolidar componentes ────────────────────────────────────────────────
    // Merge: REST (com props completas) + MCP (com nomes extras)
    const mcpComponentNames: string[] = mcp?.components ?? []
    const mcpOnlyComponents = mcpComponentNames
      .filter(name => !uniqueComponents.some(c => c.figmaName === name || c.codeComponent === name))
      .map(name => ({ figmaName: name, codeComponent: name.split('/')[0].trim(), type: 'INSTANCE', nodeId: '' }))

    const allComponents = [...uniqueComponents, ...mcpOnlyComponents]

    // ── Resposta final ────────────────────────────────────────────────────────
    return NextResponse.json({
      // Para o componentMap do ScreenFigma
      components: allComponents,

      // Tokens completos para o prompt
      tokens: allTokens,

      // Thumbnail para exibir no card
      thumbnailUrl,

      // Código de referência do MCP (quando disponível)
      referenceCode: mcp?.code ?? null,

      // Texto bruto do MCP para debug
      mcpRaw: mcp?.raw ?? null,

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
