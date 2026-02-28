import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/figma-mcp
 *
 * Comunica com o figma-developer-mcp no VPS via protocolo SSE:
 * 1. Abre sessão em /sse → recebe sessionId
 * 2. Envia tools/call via POST /messages?sessionId=...
 * 3. Lê a resposta do stream SSE
 * 4. Retorna resultado estruturado
 */

const MCP_URL = process.env.FIGMA_MCP_URL ?? ''

// ── Helpers SSE ───────────────────────────────────────────────────────────────

function parseSSELine(line: string): unknown | null {
  if (!line.startsWith('data:')) return null
  const raw = line.slice(5).trim()
  if (!raw || raw === '[DONE]') return null
  try { return JSON.parse(raw) } catch { return null }
}

async function readSSEUntilResult(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 30_000
): Promise<{ sessionId?: string; result?: unknown; error?: unknown }> {
  const decoder = new TextDecoder()
  let buffer = ''
  let sessionId: string | undefined
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()

      // Endpoint event — contém o sessionId
      if (trimmed.startsWith('event: endpoint')) continue
      if (trimmed.startsWith('data: /messages?sessionId=')) {
        sessionId = trimmed.replace('data: /messages?sessionId=', '').trim()
        continue
      }

      // Resultado JSON-RPC
      const parsed = parseSSELine(trimmed)
      if (!parsed || typeof parsed !== 'object') continue
      const obj = parsed as Record<string, unknown>

      if ('result' in obj)  return { sessionId, result: obj.result }
      if ('error'  in obj)  return { sessionId, error:  obj.error  }
    }
  }

  return { sessionId }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { fileKey?: string; nodeId?: string }
    const { fileKey, nodeId } = body

    if (!fileKey || !nodeId) {
      return NextResponse.json(
        { error: 'fileKey e nodeId são obrigatórios' },
        { status: 400 }
      )
    }

    if (!MCP_URL) {
      return NextResponse.json(
        { error: 'FIGMA_MCP_URL não configurada' },
        { status: 500 }
      )
    }

    // ── 1. Abrir sessão SSE ───────────────────────────────────────────────────
    const sseRes = await fetch(`${MCP_URL}/sse`, {
      method:  'GET',
      headers: { Accept: 'text/event-stream' },
    })

    if (!sseRes.ok || !sseRes.body) {
      return NextResponse.json(
        { error: `Falha ao abrir sessão SSE (${sseRes.status})` },
        { status: 502 }
      )
    }

    const reader = sseRes.body.getReader()

    // ── 2. Aguardar sessionId ─────────────────────────────────────────────────
    const decoder = new TextDecoder()
    let buffer = ''
    let sessionId: string | undefined
    const sseDeadline = Date.now() + 10_000

    while (!sessionId && Date.now() < sseDeadline) {
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

    if (!sessionId) {
      reader.cancel()
      return NextResponse.json(
        { error: 'Timeout aguardando sessionId do MCP server' },
        { status: 502 }
      )
    }

    // ── 3. Enviar get_design_context ──────────────────────────────────────────
    const msgRes = await fetch(`${MCP_URL}/messages?sessionId=${sessionId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'tools/call',
        params:  {
          name:      'get_design_context',
          arguments: { fileKey, nodeId, depth: 3 },
        },
      }),
    })

    if (!msgRes.ok) {
      reader.cancel()
      const errText = await msgRes.text().catch(() => '')
      return NextResponse.json(
        { error: `Erro ao enviar comando MCP (${msgRes.status}): ${errText}` },
        { status: 502 }
      )
    }

    // ── 4. Ler resultado do stream SSE ────────────────────────────────────────
    const { result, error: rpcError } = await readSSEUntilResult(reader)
    reader.cancel()

    if (rpcError) {
      const e = rpcError as Record<string, unknown>
      return NextResponse.json(
        { error: String(e?.message ?? JSON.stringify(rpcError)) },
        { status: 502 }
      )
    }

    if (!result) {
      return NextResponse.json(
        { error: 'MCP não retornou resultado dentro do timeout' },
        { status: 504 }
      )
    }

    // ── 5. Extrair texto do content block ─────────────────────────────────────
    const content = (result as Record<string, unknown>)?.content
    const textBlock = Array.isArray(content)
      ? content.find((b: { type: string }) => b.type === 'text')
      : null
    const rawText: string = (textBlock as { text?: string } | null)?.text
      ?? JSON.stringify(result)

    // ── 6. Parsear JSON estruturado ───────────────────────────────────────────
    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/)
      try {
        parsed = match ? JSON.parse(match[0]) : { raw: rawText, components: [], tokens: {} }
      } catch {
        parsed = { raw: rawText, components: [], tokens: {} }
      }
    }

    return NextResponse.json(parsed)

  } catch (err) {
    console.error('[figma-mcp]', err)
    return NextResponse.json(
      { error: 'Erro interno ao chamar Figma MCP' },
      { status: 500 }
    )
  }
}
