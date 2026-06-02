import type { Screen } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Fetches FRESH render URLs for the Figma nodes behind a set of screens, so the
// generation/preview model can SEE the design (Claude is multimodal). Fresh URLs
// avoid the stale-thumbnail expiry problem, and the render is scaled so its long
// edge stays within Claude's image limits (hard max 8000px; optimal ~1568px).
// ─────────────────────────────────────────────────────────────────────────────

const FIGMA_API   = 'https://api.figma.com/v1'
const TARGET_EDGE = 1536   // Claude's optimal long-edge; also keeps us << 8000px hard cap

export function screenFigmaRefs(screens: Screen[]): { fileKey: string; nodeId: string }[] {
  const seen = new Set<string>()
  const refs: { fileKey: string; nodeId: string }[] = []
  for (const s of screens) {
    const f = s.figma
    if (f?.fileKey && f?.nodeId) {
      const key = `${f.fileKey}:${f.nodeId}`
      if (!seen.has(key)) { seen.add(key); refs.push({ fileKey: f.fileKey, nodeId: f.nodeId }) }
    }
  }
  return refs
}

// Scale that keeps the largest dimension near TARGET_EDGE (Figma allows 0.01–4).
async function computeScale(fileKey: string, nodeId: string, token: string): Promise<number> {
  try {
    const res = await fetch(
      `${FIGMA_API}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=0`,
      { headers: { 'X-Figma-Token': token } },
    )
    if (!res.ok) return 1
    const data  = await res.json() as { nodes?: Record<string, { document?: { absoluteBoundingBox?: { width?: number; height?: number } } }> }
    const entry = data.nodes?.[nodeId] ?? data.nodes?.[nodeId.replace(':', '-')] ?? Object.values(data.nodes ?? {})[0]
    const bb    = entry?.document?.absoluteBoundingBox
    const maxDim = Math.max(bb?.width ?? 0, bb?.height ?? 0)
    if (maxDim <= 0) return 1
    return Math.min(2, Math.max(0.1, TARGET_EDGE / maxDim))
  } catch {
    return 1
  }
}

export async function fetchFigmaImageUrls(refs: { fileKey: string; nodeId: string }[]): Promise<string[]> {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token || !refs.length) return []

  const urls: string[] = []
  for (const { fileKey, nodeId } of refs.slice(0, 6)) {  // cap to keep cost bounded
    try {
      const scale = await computeScale(fileKey, nodeId, token)
      const r = await fetch(
        `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${scale}`,
        { headers: { 'X-Figma-Token': token } },
      )
      if (!r.ok) continue
      const data = await r.json() as { images?: Record<string, string> }
      const url = data.images?.[nodeId]
        ?? data.images?.[nodeId.replace(':', '-')]
        ?? Object.values(data.images ?? {})[0]
      if (url) urls.push(url)
    } catch {
      // skip — vision is a best-effort enhancement, never blocks generation
    }
  }
  return urls
}
