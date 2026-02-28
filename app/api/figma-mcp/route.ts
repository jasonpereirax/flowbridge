import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/figma-mcp
 *
 * Proxy para o figma-developer-mcp rodando no VPS (Hostinger).
 * Chama get_design_context via JSON-RPC e retorna resultado estruturado.
 *
 * Env vars necessárias:
 *   FIGMA_MCP_URL = https://mcp.seudominio.com
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { fileKey?: string; nodeId?: string }

    const fileKey = body.fileKey
    const nodeId  = body.nodeId

    if (!fileKey || !nodeId) {
      return NextResponse.json(
        { error: 'fileKey e nodeId são obrigatórios' },
        { status: 400 }
      )
    }

    const mcpUrl = process.env.FIGMA_MCP_URL
    if (!mcpUrl) {
      return NextResponse.json(
        { error: 'FIGMA_MCP_URL não configurada nas variáveis de ambiente' },
        { status: 500 }
      )
    }

    // ── Chamar get_design_context no MCP server do VPS ────────────────────
    const mcpRes = await fetch(`${mcpUrl}/mcp`, {
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

    if (!mcpRes.ok) {
      const errText = await mcpRes.text().catch(() => '')
      return NextResponse.json(
        { error: `MCP server retornou ${mcpRes.status}${errText ? ': ' + errText : ''}` },
        { status: 502 }
      )
    }

    const mcpData = await mcpRes.json() as {
      result?: { content?: Array<{ type: string; text?: string }> | unknown }
      error?:  { message?: string }
    }

    if (mcpData.error) {
      return NextResponse.json(
        { error: mcpData.error.message ?? 'Erro JSON-RPC do MCP server' },
        { status: 502 }
      )
    }

    // ── Extrair texto do resultado ─────────────────────────────────────────
    const resultContent = mcpData?.result?.content
    if (!resultContent) {
      return NextResponse.json(
        { error: 'MCP não retornou conteúdo no campo result.content' },
        { status: 502 }
      )
    }

    const textBlock = Array.isArray(resultContent)
      ? resultContent.find((b: { type: string }) => b.type === 'text')
      : null

    const rawText: string = (textBlock as { text?: string } | null)?.text ?? JSON.stringify(resultContent)

    // ── Tentar extrair JSON estruturado ────────────────────────────────────
    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      try {
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: rawText, components: [], tokens: {} }
      } catch {
        parsed = { raw: rawText, components: [], tokens: {} }
      }
    }

    return NextResponse.json(parsed)

  } catch (err) {
    console.error('[figma-mcp]', err)
    return NextResponse.json(
      { error: 'Erro interno ao chamar Figma MCP no VPS' },
      { status: 500 }
    )
  }
}
