'use client'

import { useState, useCallback, useRef } from 'react'
import { parseFigmaUrl } from '@/utils'
import type { ScreenFigma } from '@/types'

interface UseFigmaBindingResult {
  loading:   boolean
  error:     string | null
  bind:      (url: string, journeyId: string, flowId: string, screenId: string) => void
  clear:     () => void
}

/**
 * useFigmaBinding
 *
 * Encapsula o fluxo de bind de uma URL Figma a uma screen:
 * 1. Valida + parseia a URL (fileKey + nodeId)
 * 2. Chama GET /api/figma?fileKey=...&nodeIds=... para metadados do node
 * 3. Chama GET /api/figma?type=images&... para a thumbnailUrl
 * 4. Retorna o objeto ScreenFigma pronto para salvar no store
 *
 * Uso:
 *   const { loading, error, bind } = useFigmaBinding(onFigmaResolved)
 *   bind(url, journeyId, flowId, screenId)
 */
export function useFigmaBinding(
  onResolved: (journeyId: string, flowId: string, screenId: string, figma: ScreenFigma) => void
): UseFigmaBindingResult {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
  }, [])

  const bind = useCallback(
    async (url: string, journeyId: string, flowId: string, screenId: string) => {
      // Abort qualquer request anterior
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      setError(null)

      if (!url.trim()) return

      const parsed = parseFigmaUrl(url)
      if (!parsed) {
        setError('URL inválida — use o link do Figma com node-id selecionado')
        return
      }

      const { fileKey, nodeId } = parsed

      if (!nodeId) {
        setError('Selecione um frame específico no Figma e copie o link com node-id')
        return
      }

      setLoading(true)

      try {
        // 1. Buscar metadados do node
        const nodesResp = await fetch(
          `/api/figma?fileKey=${encodeURIComponent(fileKey)}&nodeIds=${encodeURIComponent(nodeId)}`,
          { signal: ctrl.signal }
        )

        if (!nodesResp.ok) {
          const body = await nodesResp.json().catch(() => ({}))
          if (nodesResp.status === 500 && String(body?.error).includes('FIGMA_ACCESS_TOKEN')) {
            setError('FIGMA_ACCESS_TOKEN não configurado — adicione nas variáveis de ambiente')
          } else if (nodesResp.status === 403) {
            setError('Sem acesso a este arquivo Figma — verifique o token')
          } else {
            setError(`Erro ao buscar dados do Figma (${nodesResp.status})`)
          }
          return
        }

        const nodesData = await nodesResp.json()

        // Extrair nomes de componentes usados no node
        const nodeEntry = nodesData?.nodes?.[nodeId.replace(':', '-')]
          ?? nodesData?.nodes?.[nodeId]
          ?? Object.values(nodesData?.nodes ?? {})[0]

        const componentNames = extractComponentNames(nodeEntry)

        // 2. Buscar thumbnail
        let thumbnailUrl: string | undefined
        try {
          const imgResp = await fetch(
            `/api/figma?fileKey=${encodeURIComponent(fileKey)}&nodeIds=${encodeURIComponent(nodeId)}&type=images`,
            { signal: ctrl.signal }
          )
          if (imgResp.ok) {
            const imgData = await imgResp.json()
            // Figma retorna { images: { [nodeId]: url } }
            thumbnailUrl =
              imgData?.images?.[nodeId] ??
              imgData?.images?.[nodeId.replace(':', '-')] ??
              Object.values(imgData?.images ?? {})[0] as string | undefined
          }
        } catch {
          // thumbnail é opcional — não bloqueia o bind
        }

        const figma: ScreenFigma = {
          url,
          nodeId,
          fileKey,
          thumbnailUrl,
          componentMap: componentNames.map(name => ({
            figmaName:     name,
            codeComponent: guessCodeName(name),
          })),
          fetchedAt: new Date().toISOString(),
        }

        onResolved(journeyId, flowId, screenId, figma)
        setError(null)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Falha na conexão com o Figma — tente novamente')
      } finally {
        setLoading(false)
      }
    },
    [onResolved]
  )

  return { loading, error, bind, clear }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Percorre a árvore de nodes Figma e coleta nomes de COMPONENT_SET e COMPONENT.
 * Retorna lista deduplicada.
 */
function extractComponentNames(nodeEntry: unknown): string[] {
  const names = new Set<string>()

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (
      (n.type === 'INSTANCE' || n.type === 'COMPONENT') &&
      typeof n.name === 'string' &&
      n.name.length > 0
    ) {
      names.add(n.name)
    }

    // Figma retorna o node em { document: { ... } }
    const doc = n.document ?? n
    if (doc && typeof doc === 'object') {
      const children = (doc as Record<string, unknown>).children
      if (Array.isArray(children)) {
        children.forEach(walk)
      }
    }
  }

  walk(nodeEntry)
  return Array.from(names)
}

/**
 * Transforma nomes do Figma em nomes de componente de código.
 * "Button/Primary" → "Button"
 * "Input/TextField/Default" → "Input"
 */
function guessCodeName(figmaName: string): string {
  return figmaName.split('/')[0].trim()
}
