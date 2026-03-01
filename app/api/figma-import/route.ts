import { type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ImportedPage, FrameAIContext, ImportResult } from '@/types/figma-import'

export const runtime     = 'nodejs'
export const maxDuration = 60

const FIGMA_BASE = 'https://api.figma.com/v1'

function figmaHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN not set')
  return { 'X-Figma-Token': token }
}

interface FigmaChild {
  id:       string
  name:     string
  type:     string
  children?: FigmaChild[]
}

interface FigmaPage {
  id:       string
  name:     string
  type:     string
  children?: FigmaChild[]
}

function isTopLevelFrame(node: FigmaChild): boolean {
  return node.type === 'FRAME' || node.type === 'COMPONENT'
}

function isContainer(node: FigmaChild): boolean {
  // SECTION and GROUP can contain frames but are not screens themselves
  return node.type === 'SECTION' || node.type === 'GROUP'
}

// Recursively collect screens: frames inside PAGE, SECTION, or GROUP
// Returns flat list of { frame, sectionName? }
function collectFrames(
  nodes: FigmaChild[],
  sectionName?: string,
): Array<{ frame: FigmaChild; sectionName?: string }> {
  const result: Array<{ frame: FigmaChild; sectionName?: string }> = []
  for (const node of nodes) {
    if (isTopLevelFrame(node)) {
      result.push({ frame: node, sectionName })
    } else if (isContainer(node)) {
      // Use section name as group label
      result.push(...collectFrames(node.children ?? [], node.name))
    }
  }
  return result
}

function slugRoute(pageName: string, frameName: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const isRoot = /^(home|index|landing|main|root)$/i.test(pageName)
  return isRoot ? `/${slug(frameName)}` : `/${slug(pageName)}/${slug(frameName)}`
}

export async function POST(req: NextRequest) {
  try {
    const { fileKey, analyzeWithAI = true } = await req.json() as {
      fileKey: string
      analyzeWithAI?: boolean
    }

    if (!fileKey) {
      return Response.json({ error: 'fileKey é obrigatório' }, { status: 400 })
    }

    if (!process.env.FIGMA_ACCESS_TOKEN) {
      return Response.json({ error: 'FIGMA_ACCESS_TOKEN não configurado no servidor' }, { status: 500 })
    }

    // ── 1. Fetch file with depth=3 ──────────────────────────────────────────
    // depth=3 needed to see: document → pages → sections → frames
    // Files with PAGE → SECTION → FRAME structure require at least depth=3
    const fileUrl = `${FIGMA_BASE}/files/${fileKey}?depth=3&branch_data=false`

    let fileRes: Response
    try {
      fileRes = await fetch(fileUrl, {
        headers: figmaHeaders(),
        signal: AbortSignal.timeout(40000),
      })
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'timeout'
      return Response.json({ error: `Não foi possível conectar ao Figma: ${msg}` }, { status: 503 })
    }

    if (!fileRes.ok) {
      const text = await fileRes.text().catch(() => '')
      if (fileRes.status === 403) return Response.json({ error: 'Sem acesso ao arquivo — verifique o FIGMA_ACCESS_TOKEN' }, { status: 403 })
      if (fileRes.status === 404) return Response.json({ error: 'Arquivo não encontrado — verifique a URL do Figma' }, { status: 404 })
      return Response.json({ error: `Figma API respondeu ${fileRes.status}: ${text.slice(0, 200)}` }, { status: fileRes.status })
    }

    let fileData: { name: string; document: { children: FigmaPage[] } }
    try {
      fileData = await fileRes.json()
    } catch {
      return Response.json({ error: 'Resposta inválida da API do Figma' }, { status: 502 })
    }

    const fileName  = fileData.name ?? 'Figma File'
    const rawPages  = fileData.document?.children ?? []

    // ── 2. Extract pages + top-level frames ────────────────────────────────
    const pages: ImportedPage[] = []
    const allFrameIds: string[] = []

    for (const [pageIdx, page] of rawPages.entries()) {
      if (page.type !== 'CANVAS') continue

      const collected = collectFrames(page.children ?? [])

      const frames = collected.map(({ frame, sectionName }, frameIdx) => {
        allFrameIds.push(frame.id)
        return {
          nodeId:      frame.id,
          name:        frame.name,
          pageId:      page.id,
          pageName:    page.name,
          sectionName,   // carries section name for grouping (optional)
          order:       frameIdx,
        }
      })

      if (frames.length > 0) {
        pages.push({ pageId: page.id, name: page.name, order: pageIdx, frames })
      }
    }

    const totalFrames = allFrameIds.length

    if (totalFrames === 0) {
      return Response.json({ error: 'Nenhum frame encontrado no arquivo. Certifique-se de que o arquivo tem frames top-level nas páginas.' }, { status: 422 })
    }

    // ── 3. Batch thumbnails (max 50 IDs per call) ──────────────────────────
    const thumbnails: Record<string, string> = {}

    for (let i = 0; i < allFrameIds.length; i += 50) {
      const batch = allFrameIds.slice(i, i + 50)
      try {
        const imgRes = await fetch(
          `${FIGMA_BASE}/images/${fileKey}?ids=${batch.join(',')}&format=png&scale=1`,
          { headers: figmaHeaders(), signal: AbortSignal.timeout(15000) }
        )
        if (imgRes.ok) {
          const imgData = await imgRes.json() as { images?: Record<string, string> }
          // Normalize: store with both : and - so lookup always works
          for (const [k, v] of Object.entries(imgData.images ?? {})) {
            thumbnails[k] = v
            thumbnails[k.replace(/-/g, ':')] = v
            thumbnails[k.replace(/:/g, '-')] = v
          }
        }
      } catch { /* thumbnails optional — don't fail import */ }
    }

    // ── 4. AI batch analysis ───────────────────────────────────────────────
    const aiContext: Record<string, FrameAIContext> = {}

    if (analyzeWithAI && allFrameIds.length <= 100) {
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (apiKey) {
          const client = new Anthropic({ apiKey })

          const frameList = pages.flatMap(p =>
            p.frames.map(f => `Page "${p.name}" > Frame "${f.name}" [${f.nodeId}]`)
          ).join('\n')

          const msg = await client.messages.create({
            model:      process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: `Analyze this Figma file structure and return semantic context for each frame.

File: "${fileName}"
Frames (Page > Frame [nodeId]):
${frameList}

Return ONLY a JSON object. Keys are the nodeIds in brackets above. Values:
{
  "purpose": "one sentence: what this screen does",
  "userIntent": "one sentence: why user comes here",
  "route": "Next.js route suggestion like /dashboard or /auth/login",
  "layoutPattern": "hero|form|list|dashboard|detail|landing|auth|settings|checkout|empty-state|onboarding",
  "notes": "1 sentence architecture note or empty string"
}

Infer from page and frame names. Return ONLY the JSON, no fences.`,
            }],
          })

          const raw = msg.content
            .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
            .map(b => b.text).join('')

          let parsed: Record<string, FrameAIContext> | null = null
          try { parsed = JSON.parse(raw) } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) { try { parsed = JSON.parse(m[0]) } catch { /* ok */ } }
          }
          if (parsed) Object.assign(aiContext, parsed)
        }
      } catch (aiErr) {
        console.warn('[figma-import] AI analysis skipped:', aiErr)
      }
    }

    // ── 5. Fill missing AI context with local inference ────────────────────
    for (const page of pages) {
      for (const frame of page.frames) {
        if (!aiContext[frame.nodeId]) {
          aiContext[frame.nodeId] = {
            purpose:       `${frame.name} screen`,
            userIntent:    `User navigates to ${frame.name}`,
            route:         slugRoute(page.name, frame.name),
            layoutPattern: 'landing',
            notes:         '',
          }
        }
      }
    }

    const result: ImportResult = { fileKey, fileName, pages, totalFrames, thumbnails, aiContext }
    return Response.json(result)

  } catch (err) {
    console.error('[figma-import] unexpected error:', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}
