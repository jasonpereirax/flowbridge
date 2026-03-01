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
interface FigmaFileResponse {
  name:     string
  document: { children: FigmaPage[] }
  err?:     string   // Figma sometimes returns { err: "message" }
}

// ── Recursive frame collector ──────────────────────────────────────────────
// Handles: PAGE → SECTION* → FRAME  (any nesting depth)
function collectFrames(
  nodes:       FigmaChild[],
  sectionPath: string[] = [],
): Array<{ frame: FigmaChild; sectionPath: string[] }> {
  const result: Array<{ frame: FigmaChild; sectionPath: string[] }> = []
  for (const node of nodes) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      result.push({ frame: node, sectionPath })
    } else if (['SECTION', 'GROUP', 'CANVAS'].includes(node.type)) {
      result.push(...collectFrames(node.children ?? [], [...sectionPath, node.name]))
    }
  }
  return result
}

function slugRoute(pageName: string, frameName: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const isRoot = /^(home|index|landing|main|root|capa)$/i.test(pageName)
  return isRoot ? `/${slug(frameName)}` : `/${slug(pageName)}/${slug(frameName)}`
}

// ── Fetch Figma file with fallback depths ──────────────────────────────────
async function fetchFigmaFile(fileKey: string): Promise<{ data: FigmaFileResponse; depth: number }> {
  // Try depths from most detailed to least — stop at first success with frames
  for (const depth of [4, 3, 2]) {
    const url = `${FIGMA_BASE}/files/${fileKey}?depth=${depth}&branch_data=false`
    
    let res: Response
    try {
      res = await fetch(url, {
        headers: figmaHeaders(),
        signal:  AbortSignal.timeout(40000),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`Timeout ao conectar com o Figma (depth=${depth}): ${msg}`)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if (res.status === 403) throw new Error('Sem acesso ao arquivo — verifique o FIGMA_ACCESS_TOKEN')
      if (res.status === 404) throw new Error('Arquivo não encontrado — verifique a URL do Figma')
      // For other errors (413, 500), try shallower depth
      console.warn(`[figma-import] depth=${depth} failed with ${res.status}: ${body.slice(0, 100)}`)
      continue
    }

    // Figma sometimes returns 200 with a text error body
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const body = await res.text().catch(() => '')
      console.warn(`[figma-import] depth=${depth} non-JSON response: ${body.slice(0, 100)}`)
      continue
    }

    let data: FigmaFileResponse
    try {
      data = await res.json()
    } catch (e) {
      console.warn(`[figma-import] depth=${depth} JSON parse failed`)
      continue
    }

    // Figma API returns { err: "..." } for certain errors
    if (data.err) {
      console.warn(`[figma-import] depth=${depth} Figma err: ${data.err}`)
      continue
    }

    return { data, depth }
  }

  throw new Error('Não foi possível obter dados do arquivo Figma. O arquivo pode ser muito grande — tente importar uma página específica.')
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

    // ── 1. Fetch file ──────────────────────────────────────────────────────
    let fileData: FigmaFileResponse
    let usedDepth: number
    try {
      const result = await fetchFigmaFile(fileKey)
      fileData  = result.data
      usedDepth = result.depth
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return Response.json({ error: msg }, { status: 503 })
    }

    console.log(`[figma-import] fetched "${fileData.name}" at depth=${usedDepth}`)

    const fileName = fileData.name ?? 'Figma File'
    const rawPages = fileData.document?.children ?? []

    // ── 2. Extract pages + frames ──────────────────────────────────────────
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
          sectionName: sectionPath.length > 0 ? sectionPath[sectionPath.length - 1] : undefined,
          order:       frameIdx,
        }
      })

      pages.push({ pageId: page.id, name: page.name, order: pageIdx, frames })
    }

    const totalFrames = allFrameIds.length

    if (totalFrames === 0) {
      return Response.json({
        error: `Nenhum frame encontrado (depth usado: ${usedDepth}). O arquivo pode ter frames muito aninhados ou usar componentes no lugar de frames.`
      }, { status: 422 })
    }

    // ── 3. Batch thumbnails (max 200 frames) ──────────────────────────────
    const thumbnails: Record<string, string> = {}
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

    // ── 4. AI analysis ────────────────────────────────────────────────────
    const aiContext: Record<string, FrameAIContext> = {}

    if (analyzeWithAI && allFrameIds.length <= 150) {
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (apiKey) {
          const client = new Anthropic({ apiKey })

          const frameList = pages.flatMap(p =>
            p.frames.map(f => {
              const sec = f.sectionName ? ` (${f.sectionName})` : ''
              return `Page "${p.name}" > "${f.name}"${sec} [${f.nodeId}]`
            })
          ).join('\n')

          const msg = await client.messages.create({
            model:      process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{
              role:    'user',
              content: `Analyze this Figma file and return semantic context for each screen.

File: "${fileName}"
Screens:
${frameList}

Return ONLY a valid JSON object. Keys = the nodeIds in brackets []. Values:
{
  "purpose": "one sentence what this screen does",
  "userIntent": "one sentence why user is here",
  "route": "Next.js route like /dashboard or /auth/login",
  "layoutPattern": "hero|form|list|dashboard|detail|landing|auth|settings|checkout|empty-state|onboarding",
  "notes": "brief architecture note or empty string"
}

Infer from page and frame names. No markdown. Return ONLY the JSON object.`,
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

    // ── 5. Fill missing context with local inference ───────────────────────
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
