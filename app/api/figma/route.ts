import { type NextRequest } from 'next/server'

const FIGMA_BASE = 'https://api.figma.com/v1'

function figmaHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN not set')
  return { 'X-Figma-Token': token }
}

// GET /api/figma?fileKey=xxx&nodeIds=1:2,3:4
// Fetches node data from Figma API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fileKey = searchParams.get('fileKey')
  const nodeIds = searchParams.get('nodeIds')
  const type    = searchParams.get('type') ?? 'nodes'  // 'nodes' | 'images'

  if (!fileKey || !nodeIds) {
    return Response.json({ error: 'fileKey and nodeIds are required' }, { status: 400 })
  }

  try {
    let url: string

    if (type === 'images') {
      url = `${FIGMA_BASE}/images/${fileKey}?ids=${nodeIds}&format=png&scale=1`
    } else {
      url = `${FIGMA_BASE}/files/${fileKey}/nodes?ids=${nodeIds}`
    }

    const resp = await fetch(url, { headers: figmaHeaders() })

    if (!resp.ok) {
      const text = await resp.text()
      return Response.json({ error: text }, { status: resp.status })
    }

    const data = await resp.json()
    return Response.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Figma request failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
