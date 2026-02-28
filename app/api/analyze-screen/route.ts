import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const runtime     = 'nodejs'
export const maxDuration = 30

interface AnalyzeBody {
  screenName:     string
  nodeId:         string
  thumbnailUrl?:  string
  components:     string[]
  existingRoute?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnalyzeBody
    const { screenName, nodeId, thumbnailUrl, components, existingRoute } = body

    type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const content: Anthropic.Messages.ContentBlockParam[] = []

    // Tenta carregar thumbnail como base64
    let usedVision = false
    if (thumbnailUrl) {
      try {
        const imgRes = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(8000) })
        if (imgRes.ok) {
          const ct        = imgRes.headers.get('content-type') ?? 'image/png'
          const rawType   = ct.split(';')[0].trim()
          const allowed: MediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          const mediaType: MediaType = allowed.includes(rawType as MediaType)
            ? (rawType as MediaType)
            : 'image/png'
          const buf    = await imgRes.arrayBuffer()
          const base64 = Buffer.from(buf).toString('base64')
          content.push({
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          })
          usedVision = true
        }
      } catch (e) {
        console.warn('[analyze-screen] thumbnail failed:', e)
      }
    }

    content.push({
      type: 'text',
      text: `You are a senior frontend architect. Analyze this Figma screen${usedVision ? ' (screenshot above)' : ''} and generate structured context for code generation.

Screen name: "${screenName}"
Figma node ID: ${nodeId}
${existingRoute ? `Current route: ${existingRoute}` : ''}
Components detected (${components.length}): ${components.slice(0, 30).join(', ')}${components.length > 30 ? ` +${components.length - 30} more` : ''}

${usedVision
  ? 'Look carefully at the screenshot: identify layout sections, forms, navigation, CTAs, content hierarchy, and the overall product purpose.'
  : 'Based on component names and screen name, infer the purpose and patterns.'
}

Return ONLY a valid JSON object — no markdown fences, no explanation:
{
  "purpose": "one clear sentence: what action this screen enables the user to perform",
  "userIntent": "one clear sentence: why the user navigates to this screen",
  "notes": "2-3 sentences: layout, state management needs, data dependencies, key interactions",
  "genRules": "specific Next.js/TypeScript rules (e.g. use Server Action for form, Suspense for async data)",
  "endpoints": [{"method": "GET", "path": "/api/example", "description": "what it does"}],
  "layoutPattern": "one of: hero, form, list, dashboard, detail, landing, auth, settings, checkout, empty-state"
}`,
    })

    const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

    const message = await client.messages.create({
      model,
      max_tokens: 800,
      messages: [{ role: 'user', content }],
    })

    const rawText = message.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    let analysis: unknown = null
    try {
      analysis = JSON.parse(rawText)
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) { try { analysis = JSON.parse(match[0]) } catch { /* ok */ } }
    }

    if (!analysis) {
      return Response.json({ error: 'No valid JSON from Claude', raw: rawText.slice(0, 500) }, { status: 502 })
    }

    return Response.json({ analysis, usedVision, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens })

  } catch (err) {
    console.error('[analyze-screen]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
