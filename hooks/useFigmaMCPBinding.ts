'use client'

import { useState, useCallback, useRef } from 'react'
import { parseFigmaUrl } from '@/utils'
import type { ScreenFigma, ScreenContext } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MCPDesignContext {
  pageName:             string
  inferredPurpose:      string
  components:           string[]
  componentInterfaces:  ComponentInterface[]
  tokens: {
    colors:     Record<string, string>
    typography: Record<string, string>
    spacing:    Record<string, string>
  }
}

interface ComponentInterface {
  name:  string
  props: Record<string, string>
}

export interface MCPBindResult {
  figma:          ScreenFigma
  contextPatches: Partial<ScreenContext>   // campos sugeridos para auto-fill
  rawTokens:      MCPDesignContext['tokens']
  interfaces:     ComponentInterface[]
}

export interface UseFigmaMCPBindingResult {
  loading:  boolean
  error:    string | null
  phase:    'idle' | 'calling-mcp' | 'parsing' | 'done' | 'error'
  bind:     (url: string, journeyId: string, flowId: string, screenId: string) => Promise<void>
  clear:    () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useFigmaMCPBinding
 *
 * Versão rica do binding: usa Anthropic API com Figma MCP server
 * para chamar get_design_context e extrair:
 * - Componentes com interfaces TypeScript completas
 * - Tokens de design (cores, tipografia, espaçamentos)
 * - Propósito inferido da tela
 * - Referência de código gerada pelo MCP
 *
 * Requer: Figma MCP conectado no claude.ai (https://mcp.figma.com/mcp)
 * Rate limit: Pro+ / seat Full ou Dev (ver documentação do Figma)
 */
export function useFigmaMCPBinding(
  onResolved: (journeyId: string, flowId: string, screenId: string, result: MCPBindResult) => void
): UseFigmaMCPBindingResult {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [phase,   setPhase]   = useState<UseFigmaMCPBindingResult['phase']>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
    setPhase('idle')
  }, [])

  const bind = useCallback(async (
    url:       string,
    journeyId: string,
    flowId:    string,
    screenId:  string,
  ) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setError(null)
    setPhase('idle')

    if (!url.trim()) return

    const parsed = parseFigmaUrl(url)
    if (!parsed) {
      setError('URL inválida — use o link do Figma com node-id selecionado')
      setPhase('error')
      return
    }

    const { fileKey, nodeId } = parsed

    if (!nodeId) {
      setError('Selecione um frame específico no Figma e copie o link com node-id')
      setPhase('error')
      return
    }

    setLoading(true)
    setPhase('calling-mcp')

    try {
      // ── 1. Chamar Anthropic API com Figma MCP ────────────────────────────
      const mcpContext = await callFigmaMCP(url, fileKey, nodeId, ctrl.signal)

      if (ctrl.signal.aborted) return

      setPhase('parsing')

      // ── 2. Construir ScreenFigma a partir do resultado MCP ───────────────
      const figma: ScreenFigma = {
        url,
        nodeId,
        fileKey,
        thumbnailUrl: undefined,          // MCP não retorna URL direta de thumbnail
        componentMap: (mcpContext.components ?? []).map(name => ({
          figmaName:     name,
          codeComponent: guessCodeName(name),
        })),
        fetchedAt: new Date().toISOString(),
      }

      // ── 3. Patches de contexto sugeridos (auto-fill opcional) ─────────────
      const contextPatches: Partial<ScreenContext> = {
        ...(mcpContext.inferredPurpose && { purpose: mcpContext.inferredPurpose }),
        ...(mcpContext.components?.length > 0 && {
          components: mcpContext.components.map(guessCodeName).filter(Boolean),
        }),
      }

      onResolved(journeyId, flowId, screenId, {
        figma,
        contextPatches,
        rawTokens:  mcpContext.tokens  ?? { colors: {}, typography: {}, spacing: {} },
        interfaces: mcpContext.componentInterfaces ?? [],
      })

      setPhase('done')
      setError(null)

    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = (err as Error).message ?? 'Falha ao chamar Figma MCP'
      setError(msg)
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }, [onResolved])

  return { loading, error, phase, bind, clear }
}

// ─── Anthropic API call with Figma MCP ───────────────────────────────────────

async function callFigmaMCP(
  figmaUrl: string,
  fileKey:  string,
  nodeId:   string,
  signal:   AbortSignal,
): Promise<MCPDesignContext> {
  const prompt = `You have access to the Figma MCP server.

Call get_design_context for this Figma node:
- File key: ${fileKey}
- Node ID: ${nodeId}
- Full URL: ${figmaUrl}

After getting the design context, return ONLY a valid JSON object (no markdown, no backticks, no explanation) with this exact structure:

{
  "pageName": "name of the frame or screen",
  "inferredPurpose": "1-2 sentence description of what this screen does, inferred from the design",
  "components": ["array of component names found, e.g. Button, Input, Accordion"],
  "componentInterfaces": [
    {
      "name": "ComponentName",
      "props": { "propName": "type | 'variant1' | 'variant2'" }
    }
  ],
  "tokens": {
    "colors": { "Token Name": "#hexvalue" },
    "typography": { "Style Name": "Montserrat Bold 40px / 1.2" },
    "spacing": { "token-name": "16px" }
  }
}

Return ONLY valid JSON starting with { and ending with }. No extra text.`

  const response = await fetch('/api/figma-mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, fileKey, nodeId }),
    signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data as MCPDesignContext
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guessCodeName(figmaName: string): string {
  return figmaName.split('/')[0].trim()
}
