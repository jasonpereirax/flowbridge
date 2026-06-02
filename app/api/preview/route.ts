import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { buildPreviewPrompt } from '@/lib/claude/preview-prompt'
import { fetchFigmaImageUrls, screenFigmaRefs } from '@/lib/figma/images'
import { mcpGetSectionScreenshots } from '@/lib/figma/mcp'
import type { GenerateRequest } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime     = 'nodejs'
export const maxDuration = 120

// Strip any accidental markdown fences and isolate the HTML document.
function cleanHtml(raw: string): string {
  let t = raw.trim()
  const fence = t.match(/```(?:html)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const i = t.search(/<!doctype html>/i)
  if (i > 0) t = t.slice(i)
  return t
}

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json()

  if (!body.screens?.length) {
    return Response.json({ error: 'No screens provided' }, { status: 400 })
  }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
  const { system, user } = buildPreviewPrompt(body)

  // Vision — prefer crisp per-section screenshots (MCP); fall back to full-page render.
  const content: Anthropic.ContentBlockParam[] = [{ type: 'text', text: user }]
  const firstNode = body.screens.find(s => s.figma?.nodeId)?.figma?.nodeId
  const shots = firstNode ? await mcpGetSectionScreenshots(firstNode) : []
  if (shots.length) {
    for (const s of shots) {
      content.push({ type: 'image', source: { type: 'base64', media_type: s.mime as 'image/png', data: s.data } })
    }
  } else {
    const imageUrls = await fetchFigmaImageUrls(screenFigmaRefs(body.screens))
    for (const url of imageUrls) content.push({ type: 'image', source: { type: 'url', url } })
  }

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content }],
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const html = cleanHtml(text)
    if (!html.toLowerCase().includes('<html')) {
      return Response.json({ error: 'Preview model returned unexpected output' }, { status: 502 })
    }

    return Response.json({
      html,
      usage: {
        inputTokens:  message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Preview generation failed' },
      { status: 500 },
    )
  }
}
