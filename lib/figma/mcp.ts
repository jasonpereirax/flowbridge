// ─────────────────────────────────────────────────────────────────────────────
// Shared client for the local Figma Dev Mode MCP server (Streamable HTTP).
// Exposes: reference code (get_design_context), and per-SECTION screenshots
// (get_metadata → enumerate top-level sections → get_screenshot each), so the
// model sees each section in CRISP detail instead of one tiny downscaled page.
// ─────────────────────────────────────────────────────────────────────────────

const MCP_URL = process.env.FIGMA_DEVMODE_MCP_URL ?? 'http://127.0.0.1:3845/mcp'
const HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }

interface ContentBlock { type: string; text?: string; data?: string; mimeType?: string }

function parseSSE(text: string): Record<string, unknown> | null {
  let result: Record<string, unknown> | null = null
  for (const line of text.split('\n')) {
    const l = line.trim()
    if (!l.startsWith('data:')) continue
    try {
      const o = JSON.parse(l.slice(5).trim()) as Record<string, unknown>
      if ('result' in o || 'error' in o) result = o
    } catch { /* skip */ }
  }
  return result
}

async function initSession(): Promise<string | null> {
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'flowbridge', version: '1' } } }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const sid = res.headers.get('mcp-session-id')
    await res.text().catch(() => {})
    if (!sid) return null
    await fetch(MCP_URL, { method: 'POST', headers: { ...HEADERS, 'mcp-session-id': sid }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(8_000) }).then(r => r.text()).catch(() => {})
    return sid
  } catch { return null }
}

async function callTool(sid: string, name: string, args: Record<string, unknown>, timeoutMs = 40_000): Promise<ContentBlock[] | null> {
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST', headers: { ...HEADERS, 'mcp-session-id': sid },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const result = parseSSE(await res.text())
    if (!result || 'error' in result) return null
    return (result.result as { content?: ContentBlock[] })?.content ?? []
  } catch { return null }
}

const COMMON = { clientLanguages: 'typescript', clientFrameworks: 'react' }

// Figma's own React+Tailwind translation of the node (highest-fidelity reference).
export async function mcpGetDesignContext(nodeId: string, maxChars = 120_000): Promise<string | null> {
  const sid = await initSession(); if (!sid) return null
  const content = await callTool(sid, 'get_design_context', { nodeId, ...COMMON, disableCodeConnect: true, forceCode: true })
  if (!content) return null
  const texts = content.filter(b => b.type === 'text' && b.text).map(b => b.text as string)
  const code  = texts.find(t => t.length > 400 && /const |function |=>|<[A-Za-z]/.test(t)) ?? texts[0]
  return code ? code.slice(0, maxChars) : null
}

// Parse get_metadata XML → top-level section frames (direct children of root).
function topLevelSections(xml: string): { id: string; name: string }[] {
  const sections: { id: string; name: string }[] = []
  let depth = -1  // root frame is depth 0
  const tagRe = /<(\/?)(\w+)([^>]*?)(\/?)>/g
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(xml))) {
    const closing = m[1] === '/'
    const attrs   = m[3]
    const selfClose = m[4] === '/'
    if (closing) { depth--; continue }
    depth++
    if (depth === 1) {  // direct child of root
      const id   = /id="([^"]+)"/.exec(attrs)?.[1]
      const name = /name="([^"]*)"/.exec(attrs)?.[1] ?? ''
      if (id) sections.push({ id, name })
    }
    if (selfClose) depth--
  }
  return sections
}

export interface SectionShot { name: string; data: string; mime: string }

// Crisp PNG screenshot per top-level section, base64-encoded for vision input.
export async function mcpGetSectionScreenshots(nodeId: string, max = 8): Promise<SectionShot[]> {
  const sid = await initSession(); if (!sid) return []

  const meta = await callTool(sid, 'get_metadata', { nodeId, ...COMMON }, 20_000)
  const xml  = meta?.find(b => b.type === 'text')?.text ?? ''
  const sections = topLevelSections(xml).slice(0, max)
  if (!sections.length) return []

  const shots: SectionShot[] = []
  for (const s of sections) {
    const content = await callTool(sid, 'get_screenshot', { nodeId: s.id, ...COMMON }, 20_000)
    const img = content?.find(b => b.type === 'image' && b.data)
    if (img?.data) shots.push({ name: s.name, data: img.data, mime: img.mimeType ?? 'image/png' })
  }
  return shots
}
