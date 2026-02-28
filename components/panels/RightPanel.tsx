'use client'

import { useCallback, useState, useRef } from 'react'
import {
  X, Plus, Trash2, Link, Loader2, AlertCircle, CheckCircle2, Sparkles,
  ChevronDown, Eye, Zap, GitBranch, Copy, Check,
  ArrowRight, LayoutGrid, Wand2,
} from 'lucide-react'
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
          <PropertiesTab node={node} screen={screen} curJourneyId={curJourneyId} activeFlow={activeFlow} />
        ) : rpanelTab === 'context' ? (
          <ContextTab
            screen={screen}
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

function PropertiesTab({ node, screen, curJourneyId, activeFlow }: {
  node:          MacroNode | undefined
  screen:        Screen | undefined
  curJourneyId:  string | null
  activeFlow:    string | null
}) {
  const store = useStore()
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
// Context Tab — Phase 3, todos os 7 pontos implementados
// ─────────────────────────────────────────────────────────────────────────────

function ContextTab({ screen, curJourneyId, activeFlow, connectedDsTags }: {
  screen:           Screen | undefined
  curJourneyId:     string | null
  activeFlow:       string | null
  connectedDsTags:  string[]
}) {
  const store = useStore()
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

      {/* ── [FEATURE 2] Completeness Ring expandida — topo ── */}
      <CompletenessRing screen={screen} score={score} />

      {/* ── Figma URL binding ── */}
      <FigmaSection screen={screen} curJourneyId={curJourneyId} activeFlow={activeFlow} />

      {/* ── [FEATURE 1] AI Context Analyzer ── */}
      {screen.figma?.nodeId && (
        <AIContextAnalyzer
          screen={screen}
          curJourneyId={curJourneyId}
          activeFlow={activeFlow}
          onApply={updateCtx}
        />
      )}

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

      {/* ── [FEATURE 3] Component Map Editor ── */}
      <div className="p-5">
        <ComponentMapEditor
          selected={ctx.components}
          options={connectedDsTags}
          figmaComponentMap={screen.figma?.componentMap ?? []}
          onChange={components => updateCtx({ components })}
        />
      </div>

      {/* ── [FEATURE 4] API Endpoint Builder com AI ── */}
      <div className="p-5">
        <ApiEndpointBuilderAI
          endpoints={ctx.apiEndpoints}
          screen={screen}
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

      {/* ── [FEATURE 5] Context Preview ── */}
      <ContextPreview screen={screen} />

      {/* ── [FEATURE 6] Context Inheritance indicator ── */}
      <ContextInheritancePanel screen={screen} connectedDsTags={connectedDsTags} />

      {/* ── [FEATURE 7] Generation Preview por Screen ── */}
      <GenerationPreview screen={screen} curJourneyId={curJourneyId} activeFlow={activeFlow} />

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1 — AI Context Analyzer
// Analisa thumbnail + componentes + tokens e sugere Purpose, User Intent, Notes
// ─────────────────────────────────────────────────────────────────────────────

interface AIAnalysis {
  purpose:      string
  userIntent:   string
  notes:        string
  genRules:     string
  endpoints:    Array<{ method: string; path: string; description: string }>
}

function AIContextAnalyzer({ screen, curJourneyId: _curJourneyId, activeFlow: _activeFlow, onApply }: {
  screen:        Screen
  curJourneyId:  string
  activeFlow:    string
  onApply:       (patch: Partial<ScreenContext>) => void
}) {
  const [loading,    setLoading]    = useState(false)
  const [analysis,   setAnalysis]   = useState<AIAnalysis | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [applied,    setApplied]    = useState(false)
  const [usedVision, setUsedVision] = useState(false)

  async function analyze() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setApplied(false)

    try {
      const components   = screen.figma?.componentMap.map(c => c.figmaName) ?? []
      const thumbnailUrl = screen.figma?.thumbnailUrl

      // ── Chama /api/analyze-screen com visão ────────────────────────────────
      const res = await fetch('/api/analyze-screen', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenName:    screen.name,
          nodeId:        screen.figma?.nodeId ?? '',
          thumbnailUrl,
          components,
          existingRoute: screen.context.route,
        }),
      })

      let parsed: AIAnalysis | null = null

      if (res.ok) {
        const data = await res.json() as { analysis: AIAnalysis; usedVision?: boolean }
        parsed = data.analysis
        setUsedVision(data.usedVision ?? false)
      }

      // ── Fallback local se a API falhar ─────────────────────────────────────
      if (!parsed) {
        const hasForm    = components.some(c => /input|form|field|login|register|search/i.test(c))
        const hasList    = components.some(c => /list|table|grid|card|item/i.test(c))
        const hasAuth    = components.some(c => /auth|login|signup|password/i.test(c))
        const hasPayment = components.some(c => /payment|checkout|cart|billing/i.test(c))
        parsed = {
          purpose:    hasAuth    ? 'Allow user to authenticate and access their account'
                    : hasForm    ? 'Allow user to submit information via form'
                    : hasList    ? 'Display and manage a list of items'
                    : hasPayment ? 'Complete the payment process'
                    : `${screen.name} — inferred from ${components.length} components`,
          userIntent: hasAuth    ? 'User wants to sign in or create an account'
                    : hasForm    ? 'User wants to complete and submit a form'
                    : hasList    ? 'User wants to view, filter or manage items'
                    : `User wants to interact with ${screen.name}`,
          notes:      components.length > 0
                    ? `Detected: ${[...new Set(components.slice(0,5).map(c => c.split('/')[0]))].join(', ')}`
                    : 'No component data available',
          genRules:   hasForm ? 'Use Server Action for form submission. Validate on server.' : '',
          endpoints:  hasForm && hasAuth ? [{ method: 'POST', path: '/api/auth/login', description: 'Authenticate user' }] : [],
        }
        setUsedVision(false)
      }

      setAnalysis(parsed)
    } catch (e) {
      setError('Falha na análise — tente novamente')
      console.error('[AIAnalyzer]', e)
    } finally {
      setLoading(false)
    }
  }

  function applyAll() {
    if (!analysis) return
    const patch: Partial<ScreenContext> = {}
    if (analysis.purpose    && !screen.context.purpose)    patch.purpose    = analysis.purpose
    if (analysis.userIntent && !screen.context.userIntent) patch.userIntent = analysis.userIntent
    if (analysis.notes      && !screen.context.notes)      patch.notes      = analysis.notes
    if (analysis.genRules   && !screen.context.genRules)   patch.genRules   = analysis.genRules
    if (analysis.endpoints?.length > 0 && screen.context.apiEndpoints.length === 0) {
      patch.apiEndpoints = analysis.endpoints.map(e => ({
        method:      (e.method ?? 'GET') as ApiEndpoint['method'],
        path:        e.path ?? '',
        description: e.description ?? '',
      }))
    }
    onApply(patch)
    setApplied(true)
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 size={13} className="text-purple-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">AI Analyzer</span>
        </div>
        {!analysis && !loading && (
          <button
            onClick={analyze}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <Sparkles size={11} /> Analisar tela
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded p-3 border border-purple-100">
          <Loader2 size={13} className="animate-spin flex-shrink-0" />
          <span>
            {screen.figma?.thumbnailUrl
              ? 'Analisando screenshot com visão + componentes…'
              : 'Analisando componentes e inferindo contexto…'}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {analysis && !applied && (
        <div className="space-y-2">
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              Sugestões do AI
              {usedVision && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold tracking-wide">
                  📷 VISÃO
                </span>
              )}
            </p>
            {analysis.purpose    && <p className="text-xs text-gray-700"><span className="font-semibold text-gray-500">Purpose:</span> {analysis.purpose}</p>}
            {analysis.userIntent && <p className="text-xs text-gray-700"><span className="font-semibold text-gray-500">Intent:</span> {analysis.userIntent}</p>}
            {analysis.notes      && <p className="text-xs text-gray-700"><span className="font-semibold text-gray-500">Notes:</span> {analysis.notes}</p>}
            {analysis.endpoints?.length > 0 && (
              <p className="text-xs text-gray-700">
                <span className="font-semibold text-gray-500">Endpoints:</span>{' '}
                {analysis.endpoints.map(e => `${e.method} ${e.path}`).join(', ')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyAll}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <Check size={11} /> Aplicar sugestões
            </button>
            <button
              onClick={() => { setAnalysis(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2"
            >
              Ignorar
            </button>
            <button
              onClick={analyze}
              className="text-xs text-gray-400 hover:text-gray-600 px-2"
            >
              Reanalisar
            </button>
          </div>
        </div>
      )}

      {applied && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2 border border-green-100">
          <CheckCircle2 size={12} className="flex-shrink-0" />
          <span>Sugestões aplicadas — edite os campos acima conforme necessário</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — Completeness Ring Expandida
// Score visual com checklist detalhado e impacto de cada campo
// ─────────────────────────────────────────────────────────────────────────────

function CompletenessRing({ screen, score }: { screen: Screen; score: number }) {
  const [expanded, setExpanded] = useState(false)
  const ctx = screen.context

  const items = [
    { label: 'Figma vinculado',  pts: 30, done: !!screen.figma?.nodeId,           impact: 'Thumbnail e componentes para o Claude' },
    { label: 'Purpose',          pts: 20, done: ctx.purpose.length > 10,           impact: 'Define o objetivo da tela no prompt' },
    { label: 'Route',            pts: 15, done: ctx.route.length > 1,              impact: 'Define o path do arquivo gerado' },
    { label: 'Components',       pts: 15, done: ctx.components.length > 0,         impact: 'Lista de imports do código gerado' },
    { label: 'API Endpoints',    pts: 10, done: ctx.apiEndpoints.length > 0,       impact: 'Gera chamadas de dados corretas' },
    { label: 'Architecture Notes', pts: 10, done: ctx.notes.length > 10,           impact: 'Padrões e decisões arquiteturais' },
  ]

  const missing = items.filter(i => !i.done)
  const done    = items.filter(i =>  i.done)

  const ringColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  const r = 18, circ = 2 * Math.PI * r

  return (
    <div className="p-4">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Ring SVG */}
        <svg width={44} height={44} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle cx={22} cy={22} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
          <circle
            cx={22} cy={22} r={r}
            fill="none" stroke={ringColor} strokeWidth={4}
            strokeDasharray={`${circ * score / 100} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray .4s ease' }}
          />
        </svg>

        <div className="flex-1">
          <div className={cn('text-sm font-bold', score >= 80 ? 'text-green-700' : score >= 50 ? 'text-amber-600' : 'text-red-600')}>
            {score}% completo
          </div>
          <div className="text-xs text-gray-400">
            {score >= 80 ? '✓ Pronto para geração' : score >= 50 ? `${100 - score}pts para melhorar` : `${missing.length} campos críticos faltando`}
          </div>
        </div>

        <ChevronDown
          size={14}
          className={cn('text-gray-400 transition-transform flex-shrink-0', expanded && 'rotate-180')}
        />
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {done.map(item => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              <span className="text-green-600 font-semibold">+{item.pts}</span>
            </div>
          ))}
          {missing.map(item => (
            <div key={item.label} className="flex items-start gap-2 text-xs">
              <div className="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-gray-700 font-medium">{item.label}</span>
                <span className="text-gray-400 ml-1">— {item.impact}</span>
              </div>
              <span className="text-gray-400 font-semibold flex-shrink-0">+{item.pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3 — Component Map Editor
// Figma nome → código import path, com sugestões automáticas
// ─────────────────────────────────────────────────────────────────────────────

function ComponentMapEditor({ selected, options, figmaComponentMap, onChange }: {
  selected:          string[]
  options:           string[]
  figmaComponentMap: Array<{ figmaName: string; codeComponent: string; props?: Record<string, unknown> }>
  onChange:          (v: string[]) => void
}) {
  const [showMap,   setShowMap]   = useState(false)
  const [inputVal,  setInputVal]  = useState('')
  const [localMap,  setLocalMap]  = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    figmaComponentMap.forEach(c => { m[c.figmaName] = c.codeComponent })
    return m
  })

  const pool = [...new Set([...options, ...figmaComponentMap.map(c => c.figmaName)])].filter(
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
  function remove(name: string) { onChange(selected.filter(s => s !== name)) }
  function updateMapping(figmaName: string, codeName: string) {
    setLocalMap(m => ({ ...m, [figmaName]: codeName }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Components</label>
        {figmaComponentMap.length > 0 && (
          <button
            onClick={() => setShowMap(s => !s)}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            <LayoutGrid size={11} />
            {showMap ? 'Ocultar mapa' : `Mapa Figma→Código (${figmaComponentMap.length})`}
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map(s => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100"
            >
              {s}
              <button onClick={() => remove(s)} className="hover:text-blue-900 leading-none" aria-label={`Remove ${s}`}>×</button>
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
          onKeyDown={e => { if (e.key === 'Enter' && inputVal.trim()) { e.preventDefault(); add(inputVal) } }}
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

      {/* [FEATURE 3] Figma → Code mapping table */}
      {showMap && figmaComponentMap.length > 0 && (
        <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-100">
            <ArrowRight size={11} className="text-purple-500" />
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Figma → Código</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {figmaComponentMap.map(c => (
              <div key={c.figmaName} className="grid grid-cols-5 gap-1 px-3 py-2 items-center hover:bg-gray-50">
                <span className="col-span-2 text-[10px] text-gray-400 font-mono truncate" title={c.figmaName}>
                  {c.figmaName}
                </span>
                <ArrowRight size={10} className="text-gray-300 justify-self-center" />
                <input
                  className="col-span-2 text-[10px] font-mono px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-300 text-purple-700 bg-purple-50"
                  value={localMap[c.figmaName] ?? c.codeComponent}
                  onChange={e => updateMapping(c.figmaName, e.target.value)}
                  placeholder="@/components/..."
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {options.length === 0 && figmaComponentMap.length === 0 && selected.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">Connect a DS node to this Journey for suggestions</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4 — API Endpoint Builder com inferência de AI
// ─────────────────────────────────────────────────────────────────────────────

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

function ApiEndpointBuilderAI({ endpoints, screen, onChange }: {
  endpoints: ApiEndpoint[]
  screen:    Screen
  onChange:  (v: ApiEndpoint[]) => void
}) {
  const [inferring, setInferring] = useState(false)
  const [suggestions, setSuggestions] = useState<ApiEndpoint[]>([])

  function add() {
    onChange([...endpoints, { method: 'GET', path: '', description: '' }])
  }

  function update(i: number, patch: Partial<ApiEndpoint>) {
    onChange(endpoints.map((ep, idx) => idx === i ? { ...ep, ...patch } : ep))
  }

  function remove(i: number) {
    onChange(endpoints.filter((_, idx) => idx !== i))
  }

  async function inferEndpoints() {
    setInferring(true)
    setSuggestions([])
    await new Promise(r => setTimeout(r, 400)) // simula latência

    // Inferência local baseada em componentes + nome da tela
    const comps   = screen.figma?.componentMap.map(c => c.figmaName.toLowerCase()) ?? []
    const name    = screen.name.toLowerCase()
    const route   = screen.context.route ?? ''
    const segment = route.split('/').filter(Boolean).pop() ?? name

    const inferred: ApiEndpoint[] = []

    const hasForm    = comps.some(c => /form|input|field|submit|button/i.test(c)) || /login|register|create|edit|update/i.test(name)
    const hasList    = comps.some(c => /list|table|grid|card/i.test(c)) || /list|dashboard|home|index/i.test(name)
    const hasDetail  = /detail|show|view|profile/i.test(name)
    const hasDelete  = /delete|remove/i.test(name)
    const hasAuth    = /login|signin|auth/i.test(name)
    const hasRegister = /register|signup/i.test(name)

    if (hasAuth)     inferred.push({ method: 'POST', path: '/api/auth/login',    description: 'Authenticate user credentials' })
    if (hasRegister) inferred.push({ method: 'POST', path: '/api/auth/register', description: 'Create new user account' })
    if (hasList)     inferred.push({ method: 'GET',  path: `/api/${segment}`,    description: `Fetch list of ${segment}` })
    if (hasDetail)   inferred.push({ method: 'GET',  path: `/api/${segment}/[id]`, description: `Fetch single ${segment} by ID` })
    if (hasForm && !hasAuth && !hasRegister) inferred.push({ method: 'POST', path: `/api/${segment}`, description: `Create or update ${segment}` })
    if (hasDelete)   inferred.push({ method: 'DELETE', path: `/api/${segment}/[id]`, description: `Delete ${segment}` })

    if (inferred.length === 0) {
      inferred.push({ method: 'GET', path: `/api/${segment}`, description: `Fetch data for ${screen.name}` })
    }

    setSuggestions(inferred)
    setInferring(false)
  }

  function acceptAll() {
    const merged = [...endpoints]
    suggestions.forEach(s => {
      if (!merged.some(e => e.path === s.path)) merged.push(s)
    })
    onChange(merged)
    setSuggestions([])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">API Endpoints</label>
        <div className="flex items-center gap-2">
          {endpoints.length === 0 && suggestions.length === 0 && (
            <button
              onClick={inferEndpoints}
              disabled={inferring}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
            >
              {inferring ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Inferir
            </button>
          )}
          <button onClick={add} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Sugestões AI */}
      {suggestions.length > 0 && (
        <div className="mb-3 border border-purple-100 rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-purple-500" />
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Sugerido pelo AI</span>
            </div>
            <div className="flex gap-2">
              <button onClick={acceptAll} className="text-[10px] font-semibold text-purple-700 hover:text-purple-900">Aceitar todos</button>
              <button onClick={() => setSuggestions([])} className="text-[10px] text-gray-400 hover:text-gray-600">Ignorar</button>
            </div>
          </div>
          <div className="divide-y divide-purple-50">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0', methodColors[s.method])}>
                  {s.method}
                </span>
                <span className="text-[11px] font-mono text-gray-600 flex-1">{s.path}</span>
                <button
                  onClick={() => { onChange([...endpoints, s]); setSuggestions(sugs => sugs.filter((_, idx) => idx !== i)) }}
                  className="text-[10px] text-purple-600 hover:text-purple-800 font-medium flex-shrink-0"
                >
                  + Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {endpoints.length === 0 && suggestions.length === 0 ? (
        <p className="text-xs text-gray-400">No endpoints — click Add or Inferir</p>
      ) : (
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <select
                value={ep.method}
                onChange={e => update(i, { method: e.target.value as ApiEndpoint['method'] })}
                className={cn('py-1.5 px-1 border border-gray-200 rounded text-xs font-bold flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-400', methodColors[ep.method])}
                style={{ width: 68 }}
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
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
              <button onClick={() => remove(i)} className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5" aria-label="Remove">
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
// FEATURE 5 — Context Preview
// Mostra o prompt context que o Claude vai receber, em tempo real
// ─────────────────────────────────────────────────────────────────────────────

function ContextPreview({ screen }: { screen: Screen }) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const ctx = screen.context

  const preview = [
    `screen: ${screen.name}`,
    ctx.route        ? `route: ${ctx.route}` : null,
    ctx.purpose      ? `purpose: ${ctx.purpose}` : '⚠ purpose: (vazio)',
    ctx.userIntent   ? `intent: ${ctx.userIntent}` : null,
    ctx.requiresAuth ? `auth: required` : `auth: public`,
    ctx.components.length > 0
      ? `components (${ctx.components.length}): ${ctx.components.slice(0,5).join(', ')}${ctx.components.length > 5 ? '…' : ''}`
      : '⚠ components: (vazio)',
    screen.figma?.componentMap.length
      ? `figma_components: ${screen.figma.componentMap.length} extraídos`
      : '⚠ figma: não vinculado',
    ctx.apiEndpoints.length > 0
      ? `endpoints: ${ctx.apiEndpoints.map(e => `${e.method} ${e.path}`).join(', ')}`
      : '⚠ endpoints: (vazio — impacta data fetching)',
    ctx.notes    ? `notes: ${ctx.notes}` : null,
    ctx.genRules ? `gen_rules: ${ctx.genRules}` : null,
  ].filter(Boolean).join('\n')

  function copy() {
    navigator.clipboard.writeText(preview).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="p-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Eye size={13} className="text-gray-400 flex-shrink-0" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex-1">Context Preview</span>
        <ChevronDown size={13} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide">prompt context</span>
              <button
                onClick={copy}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'copiado' : 'copiar'}
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {preview.split('\n').map((line, i) => (
                <span key={i} className={cn(
                  'block',
                  line.startsWith('⚠') ? 'text-amber-400' : 'text-gray-300'
                )}>
                  {line}
                </span>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 6 — Context Inheritance Panel
// Mostra o contexto herdado do DS e Journey nodes
// ─────────────────────────────────────────────────────────────────────────────

function ContextInheritancePanel({ screen, connectedDsTags }: {
  screen:           Screen
  connectedDsTags:  string[]
}) {
  const [open, setOpen] = useState(false)

  const hasInheritance = connectedDsTags.length > 0

  if (!hasInheritance) return null

  return (
    <div className="p-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left"
      >
        <GitBranch size={13} className="text-indigo-400 flex-shrink-0" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex-1">Herança de Contexto</span>
        <ChevronDown size={13} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Este screen herda automaticamente os componentes dos DS nodes conectados à Journey.
            Campos definidos aqui sobrescrevem os valores herdados.
          </p>

          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 bg-gray-50 rounded p-2">
            <span className="text-indigo-500 font-semibold">DS</span>
            <ArrowRight size={9} className="text-gray-300" />
            <span className="text-indigo-400">Journey</span>
            <ArrowRight size={9} className="text-gray-300" />
            <span className="text-indigo-300">Screen ←</span>
            <span className="text-green-600 ml-1">você está aqui</span>
          </div>

          {connectedDsTags.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">Componentes herdados do DS</p>
              <div className="flex flex-wrap gap-1">
                {connectedDsTags.slice(0, 16).map(tag => (
                  <span
                    key={tag}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                      screen.context.components.includes(tag)
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    )}
                    title={screen.context.components.includes(tag) ? 'Ativo nesta screen' : 'Disponível — adicione acima'}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 7 — Generation Preview por Screen
// Gera código apenas desta screen e exibe em modal inline
// ─────────────────────────────────────────────────────────────────────────────

function GenerationPreview({ screen, curJourneyId, activeFlow }: {
  screen:        Screen
  curJourneyId:  string
  activeFlow:    string
}) {
  const store        = useStore()
  const curProjectId = store.curProjectId
  const [loading,  setLoading]  = useState(false)
  const [code,     setCode]     = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [open,     setOpen]     = useState(false)
  const [copied,   setCopied]   = useState(false)

  const score = screenCompleteness(screen)
  const ready = score >= 50

  async function generatePreview() {
    setLoading(true)
    setError(null)
    setCode(null)
    setOpen(true)

    try {
      const canvas     = curProjectId ? store.canvasData[curProjectId] : null
      const journey    = canvas?.nodes.find(n => n.id === curJourneyId)
      const ctx        = screen.context
      const components = screen.figma?.componentMap ?? []

      const prompt = `Generate a single Next.js TypeScript page component for this screen.

Screen: ${screen.name}
Route: ${ctx.route || '(not defined)'}
Purpose: ${ctx.purpose || '(not defined)'}
User Intent: ${ctx.userIntent || '(not defined)'}
Journey: ${journey?.name ?? '(unknown)'}
Requires Auth: ${ctx.requiresAuth}

Components to use (${components.length}):
${components.slice(0, 20).map(c => `- ${c.codeComponent} (Figma: ${c.figmaName})`).join('\n')}

API Endpoints:
${ctx.apiEndpoints.length > 0 ? ctx.apiEndpoints.map(e => `- ${e.method} ${e.path}: ${e.description}`).join('\n') : '(none defined)'}

Architecture Notes: ${ctx.notes || '(none)'}
Gen Rules: ${ctx.genRules || 'Use Next.js App Router. TypeScript strict. Tailwind CSS.'}

Generate ONLY the component code. Use proper TypeScript types. Include all imports. Make it production-ready.`

      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, maxTokens: 2000, _previewMode: true }),
      })

      let fullCode = ''
      if (res.ok && res.body) {
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6)) as Record<string, unknown>
                if (typeof d.text  === 'string') fullCode += d.text
                if (typeof d.delta === 'string') fullCode += d.delta
              } catch { fullCode += line.slice(6) }
            }
          }
        }
      }

      // Extrai bloco de código
      const match = fullCode.match(/```(?:tsx?|jsx?)?\n([\s\S]+?)```/)
      setCode(match ? match[1] : fullCode || 'Sem output recebido')
    } catch (e) {
      setError('Falha na geração — verifique a conexão')
      console.error('[GenPreview]', e)
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-amber-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Preview de Geração</span>
        </div>
        {!open && (
          <button
            onClick={generatePreview}
            disabled={!ready || loading}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-colors',
              ready
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            title={!ready ? `Score muito baixo (${score}%). Adicione mais contexto.` : 'Gerar preview desta screen'}
          >
            <Zap size={11} />
            {loading ? 'Gerando…' : `Preview (${score}%)`}
          </button>
        )}
        {open && (
          <button onClick={() => { setOpen(false); setCode(null); setError(null) }} className="text-xs text-gray-400 hover:text-gray-600">
            Fechar
          </button>
        )}
      </div>

      {!ready && !open && (
        <p className="text-xs text-gray-400">
          Complete pelo menos 50% do contexto para habilitar o preview.
        </p>
      )}

      {open && (
        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
            <span className="text-[10px] font-mono text-gray-400">{screen.context.route || screen.name}.tsx</span>
            <div className="flex items-center gap-2">
              {loading && <Loader2 size={11} className="animate-spin text-amber-400" />}
              {code && (
                <button onClick={copy} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200">
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? 'copiado' : 'copiar'}
                </button>
              )}
            </div>
          </div>

          {/* Code */}
          <div className="bg-gray-900 max-h-96 overflow-y-auto">
            {loading && !code && (
              <div className="p-4 text-xs font-mono text-gray-400 animate-pulse">
                Gerando código para {screen.name}…
              </div>
            )}
            {error && (
              <div className="p-4 text-xs text-red-400">{error}</div>
            )}
            {code && (
              <pre className="p-4 text-[11px] font-mono text-gray-200 leading-relaxed overflow-x-auto whitespace-pre">
                {code}
              </pre>
            )}
          </div>

          {code && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{code.split('\n').length} linhas geradas</span>
              <span className="text-[10px] text-green-600 font-semibold">✓ Preview completo</span>
            </div>
          )}
        </div>
      )}
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
// useFigmaMCPBinding — chama /api/figma-mcp → VPS → figma-developer-mcp
// ─────────────────────────────────────────────────────────────────────────────

interface MCPComponent {
  figmaName:     string
  codeComponent: string
  props?:        Record<string, string[]>
}

interface MCPBindResult {
  figma:          ScreenFigma
  contextPatches: { purpose?: string; components?: string[] }
}

interface UseMCPBindingResult {
  loading: boolean
  error:   string | null
  phase:   'idle' | 'calling-mcp' | 'parsing' | 'done' | 'error'
  bind:    (url: string, journeyId: string, flowId: string, screenId: string) => void
  clear:   () => void
}

function useFigmaMCPBinding(
  onResolved: (journeyId: string, flowId: string, screenId: string, result: MCPBindResult) => void
): UseMCPBindingResult {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [phase,   setPhase]   = useState<UseMCPBindingResult['phase']>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
    setPhase('idle')
  }, [])

  const bind = useCallback(async (
    url: string, journeyId: string, flowId: string, screenId: string
  ) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError(null)
    if (!url.trim()) return

    // Parse fileKey + nodeId
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
    setPhase('calling-mcp')

    try {
      const res = await fetch('/api/figma-mcp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fileKey, nodeId }),
        signal:  ctrl.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>
        setError(String(body?.error ?? `Erro MCP (${res.status})`))
        setPhase('error')
        return
      }

      setPhase('parsing')
      const data = await res.json() as Record<string, unknown>

      // ── Extrair componentes da resposta combinada MCP+REST ────────────────
      const rawComponents: MCPComponent[] = []

      if (Array.isArray(data.components)) {
        for (const c of data.components as unknown[]) {
          if (typeof c === 'string') {
            rawComponents.push({ figmaName: c, codeComponent: c.split('/')[0].trim() })
          } else if (c && typeof c === 'object') {
            const co = c as Record<string, unknown>
            rawComponents.push({
              figmaName:     String(co.figmaName ?? co.name ?? ''),
              codeComponent: String(co.codeComponent ?? co.figmaName ?? co.name ?? '').split('/')[0].trim(),
              props:         co.props as Record<string, string[]> | undefined,
            })
          }
        }
      }

      // Fallback: extrair do texto raw do MCP
      if (rawComponents.length === 0 && typeof data.mcpRaw === 'string') {
        const matches = data.mcpRaw.match(/[A-Z][a-zA-Z]+(?:\/[A-Z][a-zA-Z]+)*/g) ?? []
        for (const m of [...new Set(matches)] as string[]) {
          rawComponents.push({ figmaName: m, codeComponent: m.split('/')[0].trim() })
        }
      }

      // ── Thumbnail já vem na resposta ──────────────────────────────────────
      const thumbnailUrl = typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined

      const figma: ScreenFigma = {
        url, nodeId, fileKey, thumbnailUrl,
        componentMap: rawComponents,
        fetchedAt: new Date().toISOString(),
      }

      // ── Sugestões de contexto ─────────────────────────────────────────────
      const contextPatches: MCPBindResult['contextPatches'] = {}
      if (typeof data.inferredPurpose === 'string' && data.inferredPurpose) {
        contextPatches.purpose = data.inferredPurpose
      }
      if (rawComponents.length > 0) {
        contextPatches.components = [...new Set(rawComponents.map(c => c.codeComponent).filter(Boolean))]
      }

      setPhase('done')
      onResolved(journeyId, flowId, screenId, { figma, contextPatches })
      setError(null)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Falha ao conectar com o MCP server — tente novamente')
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }, [onResolved])

  return { loading, error, phase, bind, clear }
}

// ─────────────────────────────────────────────────────────────────────────────
// Figma Section — suporta MCP (rico, via VPS) e REST (rápido, fallback)
// ─────────────────────────────────────────────────────────────────────────────

type BindMode = 'mcp' | 'rest'

function FigmaSection({ screen, curJourneyId, activeFlow }: {
  screen:        Screen
  curJourneyId:  string
  activeFlow:    string
}) {
  const store = useStore()
  const [url,      setUrl]      = useState(screen.figma?.url ?? '')
  const [bindMode, setBindMode] = useState<BindMode>('mcp')

  const handleRESTResolved = useCallback((jId: string, fId: string, sId: string, figma: ScreenFigma) => {
    store.updateScreen(jId, fId, sId, { figma })
    if (screen.context.components.length === 0 && figma.componentMap.length > 0) {
      store.updateScreenContext(jId, fId, sId, {
        components: figma.componentMap.map(m => m.codeComponent).filter(Boolean),
      })
    }
  }, [store, screen.context.components])

  const handleMCPResolved = useCallback((jId: string, fId: string, sId: string, result: MCPBindResult) => {
    store.updateScreen(jId, fId, sId, { figma: result.figma })
    const patches = result.contextPatches
    const safePatch: typeof patches = {}
    if (patches.purpose   && !screen.context.purpose)              safePatch.purpose    = patches.purpose
    if (patches.components && screen.context.components.length === 0) safePatch.components = patches.components
    if (Object.keys(safePatch).length > 0) {
      store.updateScreenContext(jId, fId, sId, safePatch)
    }
  }, [store, screen.context])

  const rest = useFigmaRESTBinding(handleRESTResolved)
  const mcp  = useFigmaMCPBinding(handleMCPResolved)

  const active  = bindMode === 'mcp' ? mcp : rest
  const isBound = !!screen.figma?.nodeId

  const mcpPhaseLabel: Record<string, string> = {
    'calling-mcp': 'Chamando MCP server…',
    'parsing':     'Extraindo componentes e tokens…',
    'done':        'Concluído',
  }

  function handleBind() {
    if (!url.trim()) return
    if (bindMode === 'mcp') mcp.bind(url, curJourneyId, activeFlow, screen.id)
    else                    rest.bind(url, curJourneyId, activeFlow, screen.id)
  }

  function handleClear() {
    rest.clear(); mcp.clear()
    setUrl('')
    store.updateScreen(curJourneyId, activeFlow, screen.id, { figma: undefined })
    store.updateScreenContext(curJourneyId, activeFlow, screen.id, { components: [] })
  }

  return (
    <div className="p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link size={13} className="text-purple-500 flex-shrink-0" />
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          Figma Design
        </label>
        <span className="ml-auto text-xs font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
          +30 pts
        </span>
      </div>

      {/* Toggle MCP / REST */}
      {!isBound && (
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-[11px] font-semibold">
          <button
            onClick={() => setBindMode('mcp')}
            className={cn(
              'flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors',
              bindMode === 'mcp' ? 'bg-purple-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'
            )}
          >
            <Sparkles size={11} /> MCP — Rico
          </button>
          <button
            onClick={() => setBindMode('rest')}
            className={cn(
              'flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors border-l border-gray-200',
              bindMode === 'rest' ? 'bg-gray-100 text-gray-700' : 'bg-white text-gray-400 hover:text-gray-600'
            )}
          >
            <Link size={11} /> REST — Rápido
          </button>
        </div>
      )}

      {/* Descrição do modo */}
      {!isBound && (
        <p className="text-[11px] text-gray-400 leading-relaxed">
          {bindMode === 'mcp'
            ? '✦ Extrai componentes, props, tokens e Code Connect via MCP server.'
            : '✦ Extrai nomes de componentes e thumbnail via REST API do Figma.'}
        </p>
      )}

      {/* URL + botão Bind */}
      {!isBound && (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBind()}
            className={cn(inputCls, 'flex-1 text-xs')}
            placeholder="figma.com/design/…?node-id=…"
            disabled={active.loading}
          />
          <button
            onClick={handleBind}
            disabled={active.loading || !url.trim()}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors flex-shrink-0 flex items-center gap-1 disabled:opacity-40',
              bindMode === 'mcp'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-700 text-white hover:bg-gray-800'
            )}
          >
            {active.loading
              ? <Loader2 size={13} className="animate-spin" />
              : bindMode === 'mcp' ? <Sparkles size={12} /> : <Link size={12} />}
            {!active.loading && 'Bind'}
          </button>
        </div>
      )}

      {/* Fase MCP em progresso */}
      {bindMode === 'mcp' && mcp.loading && (mcp as UseMCPBindingResult).phase !== 'idle' && (
        <div className="flex items-center gap-2 text-[11px] text-purple-600">
          <Loader2 size={11} className="animate-spin flex-shrink-0" />
          <span>{mcpPhaseLabel[(mcp as UseMCPBindingResult).phase] ?? 'Processando…'}</span>
        </div>
      )}

      {/* Erro */}
      {active.error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{active.error}</span>
        </div>
      )}

      {/* Estado vinculado */}
      {isBound && !active.error && (
        <div className="space-y-2">
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
            <button onClick={handleClear} className="text-gray-400 hover:text-red-500 transition-colors text-xs flex-shrink-0">
              ×
            </button>
          </div>

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

      {/* Thumbnail */}
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
// Score Ring (SVG) — usado pelo CompletenessRing

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
