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
  id:        string
  name:      string
  type:      string
  children?: FigmaChild[]
}

interface FigmaPage {
  id:        string
  name:      string
  type:      string
  children?: FigmaChild[]
}

// ── Frame collector ────────────────────────────────────────────────────────
// Recurses through PAGE → SECTION* → FRAME
// Handles arbitrary nesting depth (Figma files can have sections inside sections)
// Stops recursing into FRAMEs (their children are components, not screens)
function collectFrames(
  nodes:       FigmaChild[],
  sectionPath: string[] = [],   // breadcrumb of section names
): Array<{ frame: FigmaChild; sectionPath: string[] }> {
  const result: Array<{ frame: FigmaChild; sectionPath: string[] }> = []

  for (const node of nodes) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      // This is a screen — collect it
      result.push({ frame: node, sectionPath })
    } else if (
      node.type === 'SECTION' ||
      node.type === 'GROUP'   ||
      node.type === 'CANVAS'
    ) {
      // Container — recurse, adding this node's name to the path
      result.push(...collectFrames(node.children ?? [], [...sectionPath, node.name]))
    }
    // Everything else (text, rectangles, etc.) is ignored
  }

  return result
}

function slugRoute(pageName: string, frameName: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const isRoot = /^(home|index|landing|main|root|capa)$/i.test(pageName)
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

    // ── 1. Fetch with depth=4 ─────────────────────────────────────────────
    // Structure: PAGE → SECTION → SECTION → FRAME  (real-world Figma files)
    // depth=4 is needed to see frames nested inside sub-sections
    // We ignore node content below FRAME level so payload stays manageable
    const fileUrl = `${FIGMA_BASE}/files/${fileKey}?depth=4&branch_data=false`

    let fileRes: Response
    try {
      fileRes = await fetch(fileUrl, {
        headers: figmaHeaders(),
        signal:  AbortSignal.timeout(45000),
      })
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'timeout'
      return Response.json({ error: `Não foi possível conectar ao Figma: ${msg}` }, { status: 503 })
    }

    if (!fileRes.ok) {
      const text = await fileRes.text().catch(() => '')
      if (fileRes.status === 403) return Response.json({ error: 'Sem acesso ao arquivo — verifique o FIGMA_ACCESS_TOKEN' }, { status: 403 })
      if (fileRes.status === 404) return Response.json({ error: 'Arquivo não encontrado — verifique a URL do Figma' }, { status: 404 })
      return Response.json({ error: `Figma API ${fileRes.status}: ${text.slice(0, 200)}` }, { status: fileRes.status })
    }

    let fileData: { name: string; document: { children: FigmaPage[] } }
    try {
      fileData = await fileRes.json()
    } catch {
      return Response.json({ error: 'Resposta inválida da API do Figma' }, { status: 502 })
    }

    const fileName = fileData.name ?? 'Figma File'
    const rawPages = fileData.document?.children ?? []

    // ── 2. Extract pages + frames recursively ─────────────────────────────
    const pages: ImportedPage[] = []
    const allFrameIds: string[] = []

    for (const [pageIdx, page] of rawPages.entries()) {
      if (page.type !== 'CANVAS') continue

      const collected = collectFrames(page.children ?? [])

      if (collected.length === 0) continue

      const frames = collected.map(({ frame, sectionPath }, frameIdx) => {
        allFrameIds.push(frame.id)
        return {
          nodeId:      frame.id,
          name:        frame.name,
          pageId:      page.id,
          pageName:    page.name,
          // Use innermost section name as grouping label
          sectionName: sectionPath.length > 0 ? sectionPath[sectionPath.length - 1] : undefined,
          order:       frameIdx,
        }
      })

      pages.push({ pageId: page.id, name: page.name, order: pageIdx, frames })
    }

    const totalFrames = allFrameIds.length

    if (totalFrames === 0) {
      return Response.json({
        error: 'Nenhum frame encontrado. O arquivo pode estar vazio ou usar uma estrutura não reconhecida (ex: frames dentro de componentes).'
      }, { status: 422 })
    }

    // ── 3. Batch thumbnails ────────────────────────────────────────────────
    const thumbnails: Record<string, string> = {}

    // Limit thumbnails to first 200 frames to avoid very long API calls
    const thumbIds = allFrameIds.slice(0, 200)

    for (let i = 0; i < thumbIds.length; i += 50) {
      const batch = thumbIds.slice(i, i + 50)
      try {
        const imgRes = await fetch(
          `${FIGMA_BASE}/images/${fileKey}?ids=${batch.join(',')}&format=png&scale=1`,
          { headers: figmaHeaders(), signal: AbortSignal.timeout(15000) }
        )
        if (imgRes.ok) {
          const imgData = await imgRes.json() as { images?: Record<string, string> }
          for (const [k, v] of Object.entries(imgData.images ?? {})) {
            thumbnails[k] = v
            thumbnails[k.replace(/-/g, ':')] = v
            thumbnails[k.replace(/:/g, '-')] = v
          }
        }
      } catch { /* thumbnails optional */ }
    }

    // ── 4. AI analysis (batch, single call) ───────────────────────────────
    const aiContext: Record<string, FrameAIContext> = {}

    // Only analyze if file isn't huge
    if (analyzeWithAI && allFrameIds.length <= 150) {
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (apiKey) {
          const client = new Anthropic({ apiKey })

          const frameList = pages.flatMap(p =>
            p.frames.map(f => {
              const section = f.sectionName ? ` (${f.sectionName})` : ''
              return `Page "${p.name}" > Frame "${f.name}"${section} [${f.nodeId}]`
            })
          ).join('\n')

          const msg = await client.messages.create({
            model:      process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{
              role:    'user',
              content: `Analyze this Figma file structure. Return semantic context for each screen.

File: "${fileName}"
Frames:
${frameList}

Return ONLY a JSON object. Keys = nodeIds in brackets. Values:
{
  "purpose": "one sentence what this screen does",
  "userIntent": "one sentence why user is here",
  "route": "Next.js route like /dashboard or /auth/login",
  "layoutPattern": "hero|form|list|dashboard|detail|landing|auth|settings|checkout|empty-state|onboarding",
  "notes": "one sentence architecture note or empty string"
}

Infer from page and frame names. Return ONLY the JSON object, no markdown.`,
            }],
          })

          const raw = msg.content
            .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
            .map(b => b.text).join('')

          let parsed: Record<string, FrameAIContext> | null = null
          try { parsed = JSON.parse(raw) } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) { try { parsed = JSON.parse(m[0]) } catch { /* skip */ } }
          }
          if (parsed) Object.assign(aiContext, parsed)
        }
      } catch (aiErr) {
        console.warn('[figma-import] AI skipped:', aiErr)
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
