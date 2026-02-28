'use client'

import { useCallback, useState, useRef } from 'react'
import { X, Plus, Trash2, Link, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, screenCompleteness } from '@/utils'
import type { MacroNode, Screen, ApiEndpoint, ScreenFigma, ScreenContext } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// RightPanel (root)
// ─────────────────────────────────────────────────────────────────────────────

export function RightPanel() {
  const store        = useStore()
  const rpanelOpen   = useStore(s => s.rpanelOpen)
  const rpanelTab    = useStore(s => s.rpanelTab)
  const selNodeId    = useStore(s => s.selNodeId)
  const selScreenId  = useStore(s => s.selScreenId)
  const curProjectId = store.curProjectId
  const curJourneyId = store.curJourneyId

  const canvas     = curProjectId ? store.canvasData[curProjectId] : null
  const node       = canvas?.nodes.find(n => n.id === selNodeId)
  const activeFlow = (curJourneyId ? canvas?.curFlow[curJourneyId] : null) ?? null

  const screen = (activeFlow && curJourneyId)
    ? (canvas?.flows[curJourneyId] ?? [])
        .find(f => f.id === activeFlow)
        ?.screens.find(s => s.id === selScreenId)
    : undefined

  const selectedItem = screen ?? node

  // DS nodes connected to this journey (for component suggestions)
  const connectedDsTags: string[] = (() => {
    if (!canvas || !curJourneyId) return []
    const dsNodeIds = canvas.conns
      .filter(c => c.toId === curJourneyId)
      .map(c => c.fromId)
    return canvas.nodes
      .filter(n => dsNodeIds.includes(n.id) && n.type === 'ds')
      .flatMap(n => n.tags ?? [])
      .filter((t, i, a) => a.indexOf(t) === i) // dedupe
  })()

  if (!rpanelOpen) return null

  return (
    <div className={cn(
      'w-80 bg-white border-l border-gray-200',
      'flex flex-col flex-shrink-0 overflow-hidden shadow-lg',
    )}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-900 truncate">
          {selectedItem?.name ?? 'No selection'}
        </h3>
        <button
          onClick={() => store.closeRpanel()}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
        {(['properties', 'context', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => store.setRpTab(tab)}
            className={cn(
              'flex-1 py-2.5 px-3 text-xs font-semibold uppercase tracking-wide transition-all',
              rpanelTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600',
            )}
            role="tab"
            aria-selected={rpanelTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedItem ? (
          <div className="flex items-center justify-center h-full p-6">
            <p className="text-sm text-gray-400 text-center">
              Select a node or screen to edit
            </p>
          </div>
        ) : rpanelTab === 'properties' ? (
          <PropertiesTab node={node} screen={screen} store={store} curJourneyId={curJourneyId} activeFlow={activeFlow} />
        ) : rpanelTab === 'context' ? (
          <ContextTab
            screen={screen}
            store={store}
            curJourneyId={curJourneyId}
            activeFlow={activeFlow}
            connectedDsTags={connectedDsTags}
          />
        ) : (
          <InfoTab item={selectedItem} />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Properties Tab
// ─────────────────────────────────────────────────────────────────────────────

function PropertiesTab({ node, screen, store, curJourneyId, activeFlow }: {
  node:          MacroNode | undefined
  screen:        Screen | undefined
  store:         ReturnType<typeof useStore>
  curJourneyId:  string | null
  activeFlow:    string | null
}) {
  return (
    <div className="p-5 space-y-4">
      {screen ? (
        <>
          <FormGroup label="Screen Name">
            <input
              type="text"
              value={screen.name}
              onChange={e => {
                if (curJourneyId && activeFlow)
                  store.updateScreen(curJourneyId, activeFlow, screen.id, { name: e.target.value })
              }}
              className={inputCls}
              placeholder="e.g., Login Form"
            />
          </FormGroup>

          {/* Figma thumbnail if bound */}
          {screen.figma?.thumbnailUrl && (
            <FormGroup label="Figma Preview">
              <div className="rounded overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screen.figma.thumbnailUrl}
                  alt={`Figma: ${screen.name}`}
                  className="w-full object-cover"
                  style={{ maxHeight: 160 }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 font-mono truncate">
                {screen.figma.nodeId}
              </p>
            </FormGroup>
          )}

          <FormGroup label="Markers">
            <div className="flex gap-2">
              <MarkerToggle
                label="Entry"
                active={!!screen.isEntry}
                color="green"
                onClick={() => {
                  if (curJourneyId && activeFlow)
                    store.updateScreen(curJourneyId, activeFlow, screen.id, { isEntry: !screen.isEntry })
                }}
              />
              <MarkerToggle
                label="Error"
                active={!!screen.isError}
                color="red"
                onClick={() => {
                  if (curJourneyId && activeFlow)
                    store.updateScreen(curJourneyId, activeFlow, screen.id, { isError: !screen.isError })
                }}
              />
            </div>
          </FormGroup>

          <FormGroup label="Status">
            <span className={cn('inline-flex text-xs font-semibold px-2 py-0.5 rounded-full', statusColors[screen.status])}>
              {screen.status}
            </span>
          </FormGroup>

          <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
            💡 Switch to <strong>Context</strong> tab to fill purpose, components, Figma URL
          </p>
        </>
      ) : node ? (
        <>
          <FormGroup label="Name">
            <input
              type="text"
              value={node.name}
              onChange={e => store.updateNode(node.id, { name: e.target.value })}
              className={inputCls}
              placeholder="e.g., Design System v1"
            />
          </FormGroup>

          <FormGroup label="Description">
            <textarea
              value={node.description}
              onChange={e => store.updateNode(node.id, { description: e.target.value })}
              rows={3}
              className={cn(inputCls, 'resize-none')}
              placeholder="Describe this node..."
            />
          </FormGroup>

          {node.tags.length > 0 && (
            <FormGroup label="Components / Tags">
              <div className="flex flex-wrap gap-1">
                {node.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                    {tag}
                  </span>
                ))}
              </div>
            </FormGroup>
          )}
        </>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Tab — coração da Phase 3
// ─────────────────────────────────────────────────────────────────────────────

function ContextTab({ screen, store, curJourneyId, activeFlow, connectedDsTags }: {
  screen:           Screen | undefined
  store:            ReturnType<typeof useStore>
  curJourneyId:     string | null
  activeFlow:       string | null
  connectedDsTags:  string[]
}) {
  if (!screen || !curJourneyId || !activeFlow) {
    return (
      <div className="p-5">
        <p className="text-sm text-gray-400">Context is available for screens only.</p>
      </div>
    )
  }

  const ctx   = screen.context
  const score = screenCompleteness(screen)

  function updateCtx(patch: Partial<typeof ctx>) {
    store.updateScreenContext(curJourneyId!, activeFlow!, screen!.id, patch)
  }

  return (
    <div className="divide-y divide-gray-100">

      {/* ── Figma URL binding ── */}
      <FigmaSection screen={screen} store={store} curJourneyId={curJourneyId} activeFlow={activeFlow} />

      {/* ── Core fields ── */}
      <div className="p-5 space-y-4">

        <FormGroup label="Route">
          <input
            type="text"
            value={ctx.route}
            onChange={e => updateCtx({ route: e.target.value })}
            className={inputCls}
            placeholder="/auth/login"
          />
        </FormGroup>

        <FormGroup label="Purpose">
          <textarea
            value={ctx.purpose}
            onChange={e => updateCtx({ purpose: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="Allow user to sign in with email and password"
          />
        </FormGroup>

        <FormGroup label="User Intent">
          <textarea
            value={ctx.userIntent}
            onChange={e => updateCtx({ userIntent: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="User wants to access their account"
          />
        </FormGroup>

        <FormGroup label="Requires Auth">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => updateCtx({ requiresAuth: !ctx.requiresAuth })}
              className={cn(
                'w-9 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0',
                ctx.requiresAuth ? 'bg-blue-500' : 'bg-gray-200',
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                ctx.requiresAuth ? 'translate-x-4' : 'translate-x-0.5',
              )} />
            </div>
            <span className="text-xs text-gray-600">
              {ctx.requiresAuth ? 'Protected route' : 'Public route'}
            </span>
          </label>
        </FormGroup>
      </div>

      {/* ── Components ── */}
      <div className="p-5">
        <ComponentSelect
          selected={ctx.components}
          options={connectedDsTags}
          figmaComponents={screen.figma?.componentMap.map(m => m.figmaName) ?? []}
          onChange={components => updateCtx({ components })}
        />
      </div>

      {/* ── API Endpoints ── */}
      <div className="p-5">
        <ApiEndpointBuilder
          endpoints={ctx.apiEndpoints}
          onChange={apiEndpoints => updateCtx({ apiEndpoints })}
        />
      </div>

      {/* ── Notes + Gen Rules ── */}
      <div className="p-5 space-y-4">
        <FormGroup label="Architecture Notes">
          <textarea
            value={ctx.notes}
            onChange={e => updateCtx({ notes: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="e.g., Shares state with /auth/register via URL params"
          />
        </FormGroup>

        <FormGroup label="Gen Rules">
          <textarea
            value={ctx.genRules}
            onChange={e => updateCtx({ genRules: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="e.g., Use Server Action for form. Redirect to /dashboard on success."
          />
        </FormGroup>
      </div>

      {/* ── Score breakdown ── */}
      <ScoreBreakdown screen={screen} score={score} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// useFigmaRESTBinding — inline (evita dependência externa)
// Usa /api/figma Route Handler existente (REST API do Figma)
// ─────────────────────────────────────────────────────────────────────────────

interface UseRESTBindingResult {
  loading: boolean
  error:   string | null
  bind:    (url: string, journeyId: string, flowId: string, screenId: string) => void
  clear:   () => void
}

function useFigmaRESTBinding(
  onResolved: (journeyId: string, flowId: string, screenId: string, figma: ScreenFigma) => void
): UseRESTBindingResult {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
  }, [])

  const bind = useCallback(async (
    url: string, journeyId: string, flowId: string, screenId: string
  ) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError(null)
    if (!url.trim()) return

    // Parse fileKey + nodeId da URL
    let fileKey = '', nodeId = ''
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      const ki = parts.indexOf('design') + 1
      if (ki < 1) { setError('URL inválida'); return }
      fileKey = parts[ki]
      nodeId  = u.searchParams.get('node-id')?.replace('-', ':') ?? ''
    } catch { setError('URL inválida'); return }

    if (!nodeId) { setError('Selecione um frame no Figma e copie o link com node-id'); return }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/figma?fileKey=${encodeURIComponent(fileKey)}&nodeIds=${encodeURIComponent(nodeId)}`,
        { signal: ctrl.signal }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 500 && String((body as Record<string,unknown>)?.error).includes('FIGMA_ACCESS_TOKEN')) {
          setError('FIGMA_ACCESS_TOKEN não configurado no .env')
        } else if (res.status === 403) {
          setError('Sem acesso a este arquivo Figma — verifique o token')
        } else {
          setError(`Erro Figma REST (${res.status})`)
        }
        return
      }
      const nodesData = await res.json()
      const nodeEntry = (nodesData?.nodes as Record<string, unknown>)?.[nodeId.replace(':', '-')]
        ?? (nodesData?.nodes as Record<string, unknown>)?.[nodeId]
        ?? Object.values((nodesData?.nodes as Record<string, unknown>) ?? {})[0]

      // Extrai nomes de componentes da árvore
      const names = new Set<string>()
      function walk(node: unknown) {
        if (!node || typeof node !== 'object') return
        const n = node as Record<string, unknown>
        if ((n.type === 'INSTANCE' || n.type === 'COMPONENT') && typeof n.name === 'string') names.add(n.name)
        const doc = n.document ?? n
        const children = (doc as Record<string, unknown>).children
        if (Array.isArray(children)) children.forEach(walk)
      }
      walk(nodeEntry)

      // Thumbnail (opcional)
      let thumbnailUrl: string | undefined
      try {
        const imgRes = await fetch(
          `/api/figma?fileKey=${encodeURIComponent(fileKey)}&nodeIds=${encodeURIComponent(nodeId)}&type=images`,
          { signal: ctrl.signal }
        )
        if (imgRes.ok) {
          const imgData = await imgRes.json()
          thumbnailUrl = (imgData?.images as Record<string,string>)?.[nodeId]
            ?? (imgData?.images as Record<string,string>)?.[nodeId.replace(':', '-')]
            ?? Object.values((imgData?.images as Record<string,string>) ?? {})[0]
        }
      } catch { /* thumbnail é opcional */ }

      onResolved(journeyId, flowId, screenId, {
        url, nodeId, fileKey, thumbnailUrl,
        componentMap: Array.from(names).map(name => ({
          figmaName: name,
          codeComponent: name.split('/')[0].trim(),
        })),
        fetchedAt: new Date().toISOString(),
      })
      setError(null)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Falha na conexão com o Figma — tente novamente')
    } finally {
      setLoading(false)
    }
  }, [onResolved])

  return { loading, error, bind, clear }
}

// ─────────────────────────────────────────────────────────────────────────────
// MCPBindResult — inline type (sem dependência externa)
// ─────────────────────────────────────────────────────────────────────────────

interface MCPBindResult {
  figma:          ScreenFigma
  contextPatches: Partial<ScreenContext>
  rawTokens:      { colors: Record<string,string>; typography: Record<string,string>; spacing: Record<string,string> }
  interfaces:     Array<{ name: string; props: Record<string,string> }>
}

// ─────────────────────────────────────────────────────────────────────────────
// useFigmaMCPBinding — inline hook (sem dependência externa)
// ─────────────────────────────────────────────────────────────────────────────

interface UseMCPResult {
  loading: boolean
  error:   string | null
  phase:   'idle' | 'calling-mcp' | 'parsing' | 'done' | 'error'
  bind:    (url: string, journeyId: string, flowId: string, screenId: string) => Promise<void>
  clear:   () => void
}

function useFigmaMCPBinding(
  onResolved: (journeyId: string, flowId: string, screenId: string, result: MCPBindResult) => void
): UseMCPResult {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [phase,   setPhase]   = useState<UseMCPResult['phase']>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false); setError(null); setPhase('idle')
  }, [])

  const bind = useCallback(async (
    url: string, journeyId: string, flowId: string, screenId: string
  ) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError(null); setPhase('idle')
    if (!url.trim()) return

    // Parse URL
    let fileKey = '', nodeId = ''
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      const ki = parts.indexOf('design') + 1
      if (ki < 1) { setError('URL inválida'); setPhase('error'); return }
      fileKey = parts[ki]
      nodeId  = u.searchParams.get('node-id')?.replace('-', ':') ?? ''
    } catch { setError('URL inválida'); setPhase('error'); return }

    if (!nodeId) { setError('Selecione um frame no Figma e copie o link com node-id'); setPhase('error'); return }

    setLoading(true); setPhase('calling-mcp')

    try {
      const prompt = `You have access to the Figma MCP server.
Call get_design_context for fileKey=${fileKey} nodeId=${nodeId} url=${url}
Return ONLY valid JSON (no markdown, no backticks):
{
  "pageName": "string",
  "inferredPurpose": "1 sentence what this screen does",
  "components": ["ComponentName"],
  "componentInterfaces": [{"name":"Comp","props":{"prop":"type"}}],
  "tokens": {"colors":{"Name":"#hex"},"typography":{"Style":"desc"},"spacing":{"token":"value"}}
}`

      const res = await fetch('/api/figma-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as Record<string,string>)?.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as {
        pageName?: string; inferredPurpose?: string
        components?: string[]; componentInterfaces?: Array<{name:string;props:Record<string,string>}>
        tokens?: { colors?: Record<string,string>; typography?: Record<string,string>; spacing?: Record<string,string> }
      }

      setPhase('parsing')

      const figma: ScreenFigma = {
        url, nodeId, fileKey,
        thumbnailUrl: undefined,
        componentMap: (data.components ?? []).map(name => ({
          figmaName: name,
          codeComponent: name.split('/')[0].trim(),
        })),
        fetchedAt: new Date().toISOString(),
      }

      const contextPatches: Partial<ScreenContext> = {
        ...(data.inferredPurpose ? { purpose: data.inferredPurpose } : {}),
        ...(data.components?.length ? { components: data.components.map(n => n.split('/')[0].trim()) } : {}),
      }

      onResolved(journeyId, flowId, screenId, {
        figma, contextPatches,
        rawTokens:  { colors: data.tokens?.colors ?? {}, typography: data.tokens?.typography ?? {}, spacing: data.tokens?.spacing ?? {} },
        interfaces: data.componentInterfaces ?? [],
      })

      setPhase('done'); setError(null)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message ?? 'Falha ao chamar Figma MCP')
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }, [onResolved])

  return { loading, error, phase, bind, clear }
}

// ─────────────────────────────────────────────────────────────────────────────
// Figma Section — suporta dois modos: REST API (rápido) e MCP (rico)
// ─────────────────────────────────────────────────────────────────────────────

type BindMode = 'rest' | 'mcp'

function FigmaSection({ screen, store, curJourneyId, activeFlow }: {
  screen:        Screen
  store:         ReturnType<typeof useStore>
  curJourneyId:  string
  activeFlow:    string
}) {
  const [url,      setUrl]      = useState(screen.figma?.url ?? '')
  const [bindMode, setBindMode] = useState<BindMode>('mcp')

  // ── Callback compartilhado entre os dois modos ────────────────────────────
  const handleRestResolved = useCallback((jId: string, fId: string, sId: string, figma: ScreenFigma) => {
    store.updateScreen(jId, fId, sId, { figma })
    if (screen.context.components.length === 0 && figma.componentMap.length > 0) {
      store.updateScreenContext(jId, fId, sId, {
        components: figma.componentMap.map(m => m.codeComponent).filter(Boolean),
      })
    }
  }, [store, screen.context.components])

  const handleMCPResolved = useCallback((jId: string, fId: string, sId: string, result: MCPBindResult) => {
    // Salva ScreenFigma no store
    store.updateScreen(jId, fId, sId, { figma: result.figma })

    // Auto-preenche campos de contexto com sugestões do MCP
    const patches = result.contextPatches
    if (Object.keys(patches).length > 0) {
      // Só auto-preenche campos que ainda estão vazios
      const currentCtx = screen.context
      const safePatch: typeof patches = {}
      if (patches.purpose && !currentCtx.purpose) safePatch.purpose = patches.purpose
      if (patches.components && currentCtx.components.length === 0) safePatch.components = patches.components
      if (Object.keys(safePatch).length > 0) {
        store.updateScreenContext(jId, fId, sId, safePatch)
      }
    }
  }, [store, screen.context])

  // ── REST binding ──────────────────────────────────────────────────────────
  const rest = useFigmaRESTBinding(handleRestResolved)

  // ── MCP binding ───────────────────────────────────────────────────────────
  const mcp  = useFigmaMCPBinding(handleMCPResolved)

  const active  = bindMode === 'mcp' ? mcp : rest
  const loading = active.loading
  const error   = active.error
  const isBound = !!screen.figma?.nodeId

  function handleBind() {
    if (!url.trim()) return
    if (bindMode === 'mcp') {
      mcp.bind(url, curJourneyId, activeFlow, screen.id)
    } else {
      rest.bind(url, curJourneyId, activeFlow, screen.id)
    }
  }

  function handleClear() {
    rest.clear()
    mcp.clear()
    setUrl('')
    store.updateScreen(curJourneyId, activeFlow, screen.id, { figma: undefined })
    // Limpa componentes que foram auto-preenchidos pelo MCP
    store.updateScreenContext(curJourneyId, activeFlow, screen.id, {
      purpose:    screen.context.purpose,
      components: [],
    })
  }

  // Fase descritiva do MCP para feedback ao usuário
  const mcpPhaseLabel: Record<string, string> = {
    'calling-mcp': 'Chamando Figma MCP…',
    'parsing':     'Extraindo componentes e tokens…',
    'done':        'Concluído',
    'error':       'Erro',
  }

  return (
    <div className="p-5 space-y-3">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Link size={13} className="text-purple-500 flex-shrink-0" />
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          Figma Design
        </label>
        <span className="ml-auto text-xs font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
          +30 pts
        </span>
      </div>

      {/* ── Mode toggle ── */}
      {!isBound && (
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-[11px] font-semibold">
          <button
            onClick={() => setBindMode('mcp')}
            className={cn(
              'flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors',
              bindMode === 'mcp'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-400 hover:text-gray-600',
            )}
          >
            <Sparkles size={11} />
            MCP — Rico
          </button>
          <button
            onClick={() => setBindMode('rest')}
            className={cn(
              'flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors border-l border-gray-200',
              bindMode === 'rest'
                ? 'bg-gray-700 text-white'
                : 'bg-white text-gray-400 hover:text-gray-600',
            )}
          >
            <Link size={11} />
            REST — Rápido
          </button>
        </div>
      )}

      {/* Descrição do modo selecionado */}
      {!isBound && (
        <p className="text-[10px] text-gray-400 leading-relaxed">
          {bindMode === 'mcp'
            ? '✦ Extrai componentes, interfaces TypeScript, tokens de cor e tipografia via Figma MCP. Requer Figma Pro+ com seat Full/Dev.'
            : '→ Usa REST API: extrai lista de componentes e thumbnail. Requer FIGMA_ACCESS_TOKEN no .env.'}
        </p>
      )}

      {/* ── URL input + botão ── */}
      {!isBound && (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBind()}
            className={cn(inputCls, 'flex-1 text-xs')}
            placeholder="figma.com/design/…?node-id=…"
            disabled={loading}
          />
          <button
            onClick={handleBind}
            disabled={loading || !url.trim()}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors flex-shrink-0 flex items-center gap-1',
              bindMode === 'mcp'
                ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40'
                : 'bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-40',
            )}
          >
            {loading
              ? <Loader2 size={13} className="animate-spin" />
              : bindMode === 'mcp' ? <Sparkles size={12} /> : <Link size={12} />
            }
            {loading ? '' : 'Bind'}
          </button>
        </div>
      )}

      {/* ── MCP phase feedback ── */}
      {bindMode === 'mcp' && loading && mcp.phase !== 'idle' && (
        <div className="text-[10px] text-purple-600 bg-purple-50 rounded px-3 py-2 border border-purple-100 flex items-center gap-2">
          <Loader2 size={11} className="animate-spin flex-shrink-0" />
          {mcpPhaseLabel[mcp.phase] ?? 'Processando…'}
        </div>
      )}

      {/* ── Erro ── */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Estado vinculado ── */}
      {isBound && !error && (
        <div className="space-y-2">
          {/* Confirmação */}
          <div className="flex items-start gap-2 bg-green-50 rounded p-2.5 border border-green-100">
            <CheckCircle2 size={13} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700">Design vinculado</p>
              <p className="text-[10px] text-green-600 font-mono truncate mt-0.5">
                {screen.figma!.nodeId}
              </p>
              <p className="text-[10px] text-green-600 mt-0.5">
                {screen.figma!.componentMap.length} componente{screen.figma!.componentMap.length !== 1 ? 's' : ''} extraído{screen.figma!.componentMap.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-red-500 transition-colors text-xs flex-shrink-0"
              title="Remover vínculo"
            >
              ×
            </button>
          </div>

          {/* Chips de componentes extraídos */}
          {screen.figma!.componentMap.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {screen.figma!.componentMap.slice(0, 12).map(m => (
                <span
                  key={m.figmaName}
                  className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100 font-medium"
                  title={`Figma: ${m.figmaName}`}
                >
                  {m.codeComponent}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Thumbnail ── */}
      {screen.figma?.thumbnailUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screen.figma.thumbnailUrl}
            alt={`Figma: ${screen.name}`}
            className="w-full object-cover"
            style={{ maxHeight: 140 }}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Select
// ─────────────────────────────────────────────────────────────────────────────

function ComponentSelect({ selected, options, figmaComponents, onChange }: {
  selected:         string[]
  options:          string[]   // from DS node tags
  figmaComponents:  string[]   // from Figma binding
  onChange:         (v: string[]) => void
}) {
  const [inputVal, setInputVal] = useState('')

  // Merge DS tags + Figma components as suggestion pool, deduplicated
  const pool = [...new Set([...options, ...figmaComponents])].filter(
    o => !selected.includes(o)
  )

  const filtered = inputVal.trim()
    ? pool.filter(o => o.toLowerCase().includes(inputVal.toLowerCase()))
    : pool

  function add(name: string) {
    const clean = name.trim()
    if (clean && !selected.includes(clean)) onChange([...selected, clean])
    setInputVal('')
  }

  function remove(name: string) {
    onChange(selected.filter(s => s !== name))
  }

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
        Components
      </label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map(s => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100"
            >
              {s}
              <button
                onClick={() => remove(s)}
                className="hover:text-blue-900 leading-none"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && inputVal.trim()) { e.preventDefault(); add(inputVal) }
          }}
          className={cn(inputCls, 'text-xs')}
          placeholder={options.length > 0 ? 'Search or type to add…' : 'Type component name…'}
        />
      </div>

      {/* Suggestions */}
      {filtered.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {filtered.slice(0, 12).map(opt => (
            <button
              key={opt}
              onClick={() => add(opt)}
              className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              + {opt}
            </button>
          ))}
        </div>
      )}

      {options.length === 0 && figmaComponents.length === 0 && selected.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">
          Connect a DS node to this Journey for suggestions
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// API Endpoint Builder
// ─────────────────────────────────────────────────────────────────────────────

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

function ApiEndpointBuilder({ endpoints, onChange }: {
  endpoints: ApiEndpoint[]
  onChange:  (v: ApiEndpoint[]) => void
}) {
  function add() {
    onChange([...endpoints, { method: 'GET', path: '', description: '' }])
  }

  function update(i: number, patch: Partial<ApiEndpoint>) {
    onChange(endpoints.map((ep, idx) => idx === i ? { ...ep, ...patch } : ep))
  }

  function remove(i: number) {
    onChange(endpoints.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          API Endpoints
        </label>
        <button
          onClick={add}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {endpoints.length === 0 ? (
        <p className="text-xs text-gray-400">No endpoints — click Add to define API calls</p>
      ) : (
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              {/* Method */}
              <select
                value={ep.method}
                onChange={e => update(i, { method: e.target.value as ApiEndpoint['method'] })}
                className={cn(
                  'py-1.5 px-1 border border-gray-200 rounded text-xs font-bold flex-shrink-0',
                  'focus:outline-none focus:ring-1 focus:ring-blue-400',
                  methodColors[ep.method],
                )}
                style={{ width: 68 }}
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              {/* Path + description */}
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={ep.path}
                  onChange={e => update(i, { path: e.target.value })}
                  className={cn(inputCls, 'text-xs font-mono')}
                  placeholder="/api/resource"
                />
                <input
                  type="text"
                  value={ep.description}
                  onChange={e => update(i, { description: e.target.value })}
                  className={cn(inputCls, 'text-xs')}
                  placeholder="Description (optional)"
                />
              </div>

              {/* Delete */}
              <button
                onClick={() => remove(i)}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                aria-label="Remove endpoint"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Breakdown
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBreakdown({ screen, score }: { screen: Screen; score: number }) {
  const ctx = screen.context

  const items = [
    { label: 'Figma URL',   pts: 30, done: !!screen.figma?.nodeId },
    { label: 'Purpose',     pts: 20, done: ctx.purpose.length > 10 },
    { label: 'Route',       pts: 15, done: ctx.route.length > 1 },
    { label: 'Components',  pts: 15, done: ctx.components.length > 0 },
    { label: 'API endpoints', pts: 10, done: ctx.apiEndpoints.length > 0 },
    { label: 'Notes',       pts: 10, done: ctx.notes.length > 10 },
  ]

  const missing = items.filter(i => !i.done)

  return (
    <div className="p-5">
      {/* Ring + score */}
      <div className="flex items-center gap-3 mb-3">
        <ScoreRing score={score} size={44} />
        <div>
          <div className={cn('text-sm font-bold', scoreColor(score))}>
            {score}% complete
          </div>
          <div className="text-xs text-gray-400">
            {score >= 80 ? 'Ready to generate' : score >= 50 ? 'Almost there' : 'Add more context'}
          </div>
        </div>
      </div>

      {/* What to fill next */}
      {missing.length > 0 && (
        <div className="space-y-1">
          {missing.map(item => (
            <div key={item.label} className="flex items-center justify-between text-xs text-gray-400">
              <span>+ {item.label}</span>
              <span className="font-semibold text-gray-500">+{item.pts} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Ring (SVG)
// ─────────────────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const r   = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (score / 100)

  const color =
    score >= 80 ? '#16a34a' :
    score >= 50 ? '#d97706' : '#dc2626'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Info Tab
// ─────────────────────────────────────────────────────────────────────────────

function InfoTab({ item }: { item: MacroNode | Screen | undefined }) {
  if (!item) return null

  const isScreen  = 'flowId' in item
  const typeLabel = isScreen ? 'screen' : (item as MacroNode).type
  const route     = isScreen ? (item as Screen).context?.route : undefined
  const status    = 'status' in item ? item.status : undefined

  return (
    <div className="p-5 space-y-3 text-sm">
      <InfoRow label="Type"    value={typeLabel} />
      <InfoRow label="ID"      value={item.id.slice(0, 8) + '…'} mono />
      <InfoRow label="Created" value={new Date(item.createdAt ?? '').toLocaleDateString()} />
      {route  && <InfoRow label="Route"  value={route} />}
      {status && <InfoRow label="Status" value={status} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-bold text-gray-600 flex-shrink-0">{label}:</span>
      <span className={cn('text-gray-500 truncate', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

function MarkerToggle({ label, active, color, onClick }: {
  label:   string
  active:  boolean
  color:   'green' | 'red'
  onClick: () => void
}) {
  const cls = active
    ? color === 'green'
      ? 'bg-green-50 text-green-700 border-green-300'
      : 'bg-red-50 text-red-700 border-red-300'
    : 'bg-gray-50 text-gray-400 border-gray-200'

  return (
    <button
      onClick={onClick}
      className={cn('px-2.5 py-1 text-xs font-semibold rounded border transition-colors', cls)}
    >
      {label}
    </button>
  )
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputCls = cn(
  'w-full px-3 py-2 border border-gray-200 rounded',
  'text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent',
  'transition-colors bg-white',
)

const statusColors: Record<string, string> = {
  empty:     'bg-gray-100 text-gray-500',
  partial:   'bg-amber-50 text-amber-700',
  ready:     'bg-green-50 text-green-700',
  generated: 'bg-blue-50 text-blue-700',
}

const methodColors: Record<string, string> = {
  GET:    'text-green-700 bg-green-50',
  POST:   'text-red-700 bg-red-50',
  PUT:    'text-amber-700 bg-amber-50',
  PATCH:  'text-amber-700 bg-amber-50',
  DELETE: 'text-red-700 bg-red-50',
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-700'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}
