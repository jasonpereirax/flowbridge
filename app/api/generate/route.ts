import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { buildPrompt } from '@/lib/claude/prompt-builder'
import type { GenerateRequest } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const runtime = 'nodejs'  // needs streaming — not edge
export const maxDuration = 60    // 60s timeout for generation

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json()

  if (!body.screens?.length) {
    return Response.json({ error: 'No screens provided' }, { status: 400 })
  }

  const { system, user } = buildPrompt(body)
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

  // Return a streaming SSE response
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()

      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send('start', { model, screenCount: body.screens.length })

        const claudeStream = client.messages.stream({
          model,
          max_tokens: 8096,
          system,
          messages: [{ role: 'user', content: user }],
        })

        claudeStream.on('text', (text) => send('delta', { text }))

        const message = await claudeStream.finalMessage()

        send('done', {
          tokensIn:  message.usage.input_tokens,
          tokensOut: message.usage.output_tokens,
          stopReason: message.stop_reason,
        })
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'Generation failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
    },
  })
}
