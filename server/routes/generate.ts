import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt } from '../lib/prompt-builder.js'
import type { GenerationRequest } from '../types.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const generateRoute = Router()

// POST /api/generate
// Accepts a GenerationRequest, streams back code as SSE
generateRoute.post('/', async (req, res) => {
  const body = req.body as GenerationRequest

  if (!body.project || !body.screens?.length) {
    return res.status(400).json({ error: 'Missing project or screens in request body' })
  }

  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const { system, user } = buildPrompt(body)
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

    send('start', { model, screenCount: body.screens.length })

    const stream = client.messages.stream({
      model,
      max_tokens: 8096,
      system,
      messages: [{ role: 'user', content: user }],
    })

    // Stream text deltas to client
    stream.on('text', (text) => send('delta', { text }))

    const message = await stream.finalMessage()

    send('done', {
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      stopReason: message.stop_reason,
    })
  } catch (err) {
    console.error('[generate]', err)
    send('error', { message: err instanceof Error ? err.message : 'Unknown error' })
  } finally {
    res.end()
  }
})
