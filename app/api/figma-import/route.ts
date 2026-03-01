import { type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime     = 'nodejs'
export const maxDuration = 60

const FIGMA_BASE = 'https://api.figma.com/v1'

function figmaHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN not set')
  return { 'X-Figma-Token': token }
}

import type { ImportedFrame, ImportedPage, FrameAIContext, ImportResult } from '@/types/figma-import'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FigmaNode {
  id:       string
  name:     string
  type:     string
  children?: FigmaNode[]
}

interface FigmaPage {
  id:       string
  name:     string
  type:     string
  children?: FigmaNode[]
}





// ── Helpers ───────────────────────────────────────────────────────────────────

function isTopLevelFrame(node: FigmaNode): boolean {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'SECTION'
}

function extractComponents(node: FigmaNode, names: Set<string>) {
  if ((node.type === 'INSTANCE' || node.type === 'COMPONENT') && node.name) {
    names.add(node.name)
  }
  node.children?.forEach(c => extractComponents(c, names))
}

function slugRoute(pageName: string, frameName: string): string {
  const slug = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const page  = slug(pageName)
  const frame = slug(frameName)

  // If page looks like "index/home/landing" → root-level
  const isRoot = /^(home|index|landing|main|root)$/i.test(pageName)
  return isRoot ? `/${frame}` : `/${page}/${frame}`
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { fileKey, analyzeWithAI = true } = await req.json() as {
      fileKey: string
      analyzeWithAI?: boolean
    }

    if (!fileKey) {
      return Response.json({ error: 'fileKey is required' }, { status: 400 })
    }

    // ── 1. Fetch full file structure ────────────────────────────────────────
    const fileRes = await fetch(`${FIGMA_BASE}/files/${fileKey}?depth=2`, {
      headers: figmaHeaders(),
    })

    if (!fileRes.ok) {
      const text = await fileRes.text()
      if (fileRes.status === 403) return Response.json({ error: 'Sem acesso ao arquivo — verifique o FIGMA_ACCESS_TOKEN' }, { status: 403 })
      if (fileRes.status === 404) return Response.json({ error: 'Arquivo não encontrado — verifique a URL' }, { status: 404 })
      return Response.json({ error: text }, { status: fileRes.status })
    }

    const fileData = await fileRes.json() as {
      name: string
      document: { children: FigmaPage[] }
    }

    const fileName = fileData.name ?? 'Figma File'
    const rawPages = fileData.document?.children ?? []

    // ── 2. Extract pages + top-level frames ────────────────────────────────
    const pages: ImportedPage[] = []
    const allFrameIds: string[] = []

    rawPages.forEach((page, pageIdx) => {
      if (page.type !== 'CANVAS') return

      const frames: ImportedFrame[] = (page.children ?? [])
        .filter(isTopLevelFrame)
        .map((frame, frameIdx) => {
          allFrameIds.push(frame.id)
          return {
            nodeId:   frame.id,
            name:     frame.name,
            pageId:   page.id,
            pageName: page.name,
            order:    frameIdx,
          }
        })

      if (frames.length > 0) {
        pages.push({ pageId: page.id, name: page.name, order: pageIdx, frames })
      }
    })

    const totalFrames = allFrameIds.length

    if (totalFrames === 0) {
      return Response.json({ error: 'Nenhum frame encontrado no arquivo' }, { status: 422 })
    }

    // ── 3. Batch thumbnails (max 50 IDs per request) ───────────────────────
    const thumbnails: Record<string, string> = {}

    const BATCH = 50
    for (let i = 0; i < allFrameIds.length; i += BATCH) {
      const batch = allFrameIds.slice(i, i + BATCH)
      try {
        const imgRes = await fetch(
          `${FIGMA_BASE}/images/${fileKey}?ids=${batch.join(',')}&format=png&scale=1`,
          { headers: figmaHeaders() }
        )
        if (imgRes.ok) {
          const imgData = await imgRes.json() as { images?: Record<string, string> }
          Object.assign(thumbnails, imgData.images ?? {})
        }
      } catch { /* thumbnails optional */ }
    }

    // Normalize thumbnail keys (Figma may return with : or -)
    const normalizedThumbnails: Record<string, string> = {}
    for (const [k, v] of Object.entries(thumbnails)) {
      normalizedThumbnails[k.replace(/-/g, ':')] = v
      normalizedThumbnails[k.replace(/:/g, '-')] = v
      normalizedThumbnails[k] = v
    }

    // ── 4. AI batch analysis (optional) ───────────────────────────────────
    const aiContext: Record<string, FrameAIContext> = {}

    if (analyzeWithAI && allFrameIds.length <= 80) {
      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        // Build a summary of all frames for the AI to analyze in one shot
        const frameList = pages.flatMap(p =>
          p.frames.map(f => `- Page "${p.name}" > Frame "${f.name}" (id: ${f.nodeId})`)
        ).join('\n')

        const prompt = `You are analyzing a Figma design file to understand its structure and generate semantic context for each screen.

File: "${fileName}"
Pages and frames:
${frameList}

For EACH frame listed, return a JSON object where keys are the frame IDs and values have this shape:
{
  "purpose": "one sentence describing what this screen does",
  "userIntent": "one sentence describing why a user navigates here",
  "route": "suggested Next.js route like /dashboard or /auth/login",
  "layoutPattern": "one of: hero, form, list, dashboard, detail, landing, auth, settings, checkout, empty-state, onboarding",
  "notes": "brief architecture notes (1-2 sentences max)"
}

Infer from page names and frame names. Be concise. Return ONLY the JSON object, no fences.`

        const message = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        })

        const rawText = message.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')

        let parsed: Record<string, FrameAIContext> | null = null
        try {
          parsed = JSON.parse(rawText)
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/)
          if (match) { try { parsed = JSON.parse(match[0]) } catch { /* ok */ } }
        }

        if (parsed) Object.assign(aiContext, parsed)
      } catch (aiErr) {
        console.warn('[figma-import] AI analysis failed (non-fatal):', aiErr)
      }
    }

    // ── 5. Fill missing AI context with local inference ────────────────────
    for (const page of pages) {
      for (const frame of page.frames) {
        if (!aiContext[frame.nodeId]) {
          aiContext[frame.nodeId] = {
            purpose:      `${frame.name} screen`,
            userIntent:   `User navigates to ${frame.name}`,
            route:        slugRoute(page.name, frame.name),
            layoutPattern: 'landing',
            notes:        '',
          }
        }
      }
    }

    const result: ImportResult = {
      fileKey,
      fileName,
      pages,
      totalFrames,
      thumbnails: normalizedThumbnails,
      aiContext,
    }

    return Response.json(result)

  } catch (err) {
    console.error('[figma-import]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
