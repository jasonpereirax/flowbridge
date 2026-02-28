import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/figma-mcp
 *
 * Proxy seguro para Anthropic API com Figma MCP server.
 * Mantém a ANTHROPIC_API_KEY no servidor — nunca exposta ao client.
 *
 * Body: { prompt: string, fileKey: string, nodeId: string }
 * Response: MCPDesignContext JSON
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente' },
        { status: 500 }
      )
    }

    // ── Chamar Anthropic API com Figma MCP ────────────────────────────────
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model:      process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        mcp_servers: [
          {
            type: 'url',
            url:  'https://mcp.figma.com/mcp',
            name: 'figma',
          },
        ],
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      const msg = (err as Record<string, unknown>)?.error
      if (typeof msg === 'object' && msg !== null && 'message' in msg) {
        return NextResponse.json({ error: (msg as { message: string }).message }, { status: anthropicRes.status })
      }
      return NextResponse.json({ error: `Anthropic API error ${anthropicRes.status}` }, { status: anthropicRes.status })
    }

    const anthropicData = await anthropicRes.json()

    // ── Extrair texto da resposta ─────────────────────────────────────────
    const textContent = (anthropicData.content as Array<{ type: string; text?: string }>)
      ?.filter(b => b.type === 'text')
      ?.map(b => b.text ?? '')
      ?.join('\n')
      ?? ''

    // ── Extrair JSON da resposta ──────────────────────────────────────────
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'MCP não retornou JSON válido — tente novamente' },
        { status: 502 }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { error: 'Falha ao parsear resposta do MCP' },
        { status: 502 }
      )
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
