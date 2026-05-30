import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { buildPrompt } from '@/lib/claude/prompt-builder'
import type { GenerateRequest } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime    = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json()

  if (!body.screens?.length) {
    return Response.json({ error: 'No screens provided' }, { status: 400 })
  }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const startedAt = Date.now()

      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

      try {
        // ── Step 1 ────────────────────────────────────────────────
        send('step', {
          text:    `Validando ${body.screens.length} tela(s)…`,
          percent: 8,
        })

        // ── Step 2 — build prompt ─────────────────────────────────
        const { system, user } = buildPrompt(body)
        const estimatedIn = Math.floor((system.length + user.length) / 3.5)

        send('step', {
          text:    `Contexto montado (~${estimatedIn.toLocaleString()} tokens)…`,
          percent: 20,
        })

        // ── Step 3 — connect to Claude ────────────────────────────
        send('step', {
          text:    `Enviando para ${model}…`,
          percent: 30,
        })

        // ── Stream ────────────────────────────────────────────────
        const claudeStream = client.messages.stream({
          model,
          max_tokens: 8096,
          system,
          messages: [{ role: 'user', content: user }],
        })

        let charCount = 0
        claudeStream.on('text', (text) => {
          charCount += text.length
          const estOut      = Math.floor(charCount / 3.5)
          const streamPct   = Math.min(88, 30 + (estOut / 8096) * 58)
          send('delta', {
            text,
            estimatedOutputTokens: estOut,
            percent: Math.floor(streamPct),
          })
        })

        const message = await claudeStream.finalMessage()

        // ── Step 4 — parsing ──────────────────────────────────────
        send('step', { text: 'Parseando arquivos gerados…', percent: 92 })

        // ── Done ──────────────────────────────────────────────────
        send('done', {
          tokensIn:   message.usage.input_tokens,
          tokensOut:  message.usage.output_tokens,
          stopReason: message.stop_reason,
          durationMs: Date.now() - startedAt,
          percent:    100,
        })

      } catch (err) {
        send('error', {
          message:   err instanceof Error ? err.message : 'Generation failed',
          durationMs: Date.now() - startedAt,
        })
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
