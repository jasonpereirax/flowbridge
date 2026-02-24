import { Router } from 'express'
import type { Request, Response } from 'express'

const FIGMA_BASE = 'https://api.figma.com/v1'
const TOKEN      = process.env.FIGMA_ACCESS_TOKEN ?? ''

export const figmaRoute = Router()

// GET /api/figma/file/:fileKey/nodes?ids=1:2,3:4
// Proxies Figma's GET /v1/files/:key/nodes and strips down the response
figmaRoute.get('/file/:fileKey/nodes', async (req: Request, res: Response) => {
  const { fileKey } = req.params
  const { ids }     = req.query as { ids?: string }

  if (!ids) return res.status(400).json({ error: 'ids query param required' })
  if (!TOKEN) return res.status(500).json({ error: 'FIGMA_ACCESS_TOKEN not configured' })

  try {
    const url  = `${FIGMA_BASE}/files/${fileKey}/nodes?ids=${ids}`
    const resp = await fetch(url, { headers: { 'X-Figma-Token': TOKEN } })

    if (!resp.ok) {
      const text = await resp.text()
      return res.status(resp.status).json({ error: text })
    }

    const data = await resp.json()
    return res.json(data)
  } catch (err) {
    console.error('[figma]', err)
    return res.status(500).json({ error: 'Failed to fetch from Figma API' })
  }
})

// GET /api/figma/images/:fileKey?ids=1:2
// Returns render URLs for given node IDs (for thumbnails)
figmaRoute.get('/images/:fileKey', async (req: Request, res: Response) => {
  const { fileKey } = req.params
  const { ids }     = req.query as { ids?: string }

  if (!ids)  return res.status(400).json({ error: 'ids query param required' })
  if (!TOKEN) return res.status(500).json({ error: 'FIGMA_ACCESS_TOKEN not configured' })

  try {
    const url  = `${FIGMA_BASE}/images/${fileKey}?ids=${ids}&format=png&scale=1`
    const resp = await fetch(url, { headers: { 'X-Figma-Token': TOKEN } })

    if (!resp.ok) {
      const text = await resp.text()
      return res.status(resp.status).json({ error: text })
    }

    const data = await resp.json()
    return res.json(data)
  } catch (err) {
    console.error('[figma/images]', err)
    return res.status(500).json({ error: 'Failed to fetch Figma images' })
  }
})
