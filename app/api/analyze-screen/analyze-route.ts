import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/analyze-screen
 *
 * Analisa uma tela do Figma usando visão do Claude.
 * Recebe a thumbnail como URL, faz fetch server-side, converte para base64
 * e envia junto com o prompt de análise.
 *
 * Body: {
 *   screenName:    string
 *   nodeId:        string
 *   thumbnailUrl?: string
 *   components:    string[]
 *   existingRoute?: string
 * }
 */

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      screenName:     string
      nodeId:         string
      thumbnailUrl?:  string
      components:     string[]
      existingRoute?: string
    }

    const { screenName, nodeId, thumbnailUrl, components, existingRoute } = body

    // ── Monta o conteúdo da mensagem ──────────────────────────────────────────
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

    const content: ContentBlock[] = []

    // Fetch e converte thumbnail para base64 (se disponível)
    if (thumbnailUrl) {
      try {
        const imgRes = await fetch(thumbnailUrl)
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') ?? 'image/png'
          const mediaType   = contentType.split(';')[0].trim()
          const buffer      = await imgRes.arrayBuffer()
          const base64      = Buffer.from(buffer).toString('base64')

          content.push({
            type: 'image',
            source: {
              type:       'base64',
              media_type: mediaType,
              data:       base64,
            },
          })
        }
      } catch (imgErr) {
        console.warn('[analyze-screen] Falha ao carregar thumbnail:', imgErr)
        // Continua sem a imagem
      }
    }

    // Prompt de análise
    const hasImage = content.length > 0
    content.push({
      type: 'text',
      text: `You are a senior frontend architect. Analyze this Figma screen${hasImage ? ' (screenshot above)' : ''} and generate structured context for code generation.

Screen name: "${screenName}"
Figma node ID: ${nodeId}
${existingRoute ? `Current route: ${existingRoute}` : ''}
Components detected (${components.length}): ${components.slice(0, 30).join(', ')}${components.length > 30 ? ` and ${components.length - 30} more` : ''}

${hasImage
  ? 'Look carefully at the screenshot. Identify the layout, UI patterns, forms, navigation, content sections, CTAs, and overall purpose.'
  : 'Based on component names and screen name, infer the purpose and patterns.'
}

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "purpose": "one clear sentence: what action this screen enables the user to perform",
  "userIntent": "one clear sentence: why the user navigates to this screen",
  "notes": "2-3 sentences: architectural observations — state management needs, data dependencies, layout patterns, animations if visible, responsive considerations",
  "genRules": "specific Next.js/TypeScript code generation rules based on what you see (e.g. use Server Action for form, use Suspense boundary for data, implement carousel for image gallery)",
  "endpoints": [
    {"method": "GET|POST|PUT|DELETE|PATCH", "path": "/api/...", "description": "what this endpoint does"}
  ],
  "colorTokens": ["list of 2-4 dominant colors you see in hex format, e.g. #DC2626"],
  "layoutPattern": "one of: hero, form, list, dashboard, detail, landing, auth, settings, checkout, empty-state"
}`,
    })

    // ── Chama Claude com visão ─────────────────────────────────────────────────
    const message = await client.messages.create({
      model:      process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 800,
      messages:   [{ role: 'user', content }],
    })

    // Extrai texto da resposta
    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    // Parseia JSON
    let parsed: unknown = null
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/)
      try { if (match) parsed = JSON.parse(match[0]) } catch { /* ok */ }
    }

    if (!parsed) {
      return NextResponse.json(
        { error: 'Claude não retornou JSON válido', raw: rawText },
        { status: 502 }
      )
    }

    return NextResponse.json({
      analysis:   parsed,
      usedVision: hasImage,
      inputTokens:  message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    })

  } catch (err) {
    console.error('[analyze-screen]', err)
    return NextResponse.json({ error: 'Erro interno na análise' }, { status: 500 })
  }
}
