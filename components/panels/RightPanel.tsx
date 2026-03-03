'use client'

import { useCallback, useState, useRef } from 'react'
import {
  X, Plus, Trash2, Link, Loader2, AlertCircle, CheckCircle2, Sparkles,
  ChevronDown, ChevronRight, Eye, Zap, GitBranch, Copy, Check,
  ArrowRight, LayoutGrid, Wand2, Map, Layers, Monitor,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, screenCompleteness } from '@/utils'
import type {
  MacroNode, Screen, ApiEndpoint, ScreenFigma, ScreenContext,
  JourneyContext, FlowContext, Flow,
} from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// RightPanel (root)
// ─────────────────────────────────────────────────────────────────────────────

export function RightPanel() {
  const store        = useStore()
  const rpanelOpen   = useStore(s => s.rpanelOpen)
  const rpanelTab    = useStore(s => s.rpanelTab)
  const selNodeId    = useStore(s => s.selNodeId)
  const selScreenId  = useStore(s => s.selScreenId)
  const selFlowId    = useStore(s => s.selFlowId)
  const curProjectId = store.curProjectId
  const curJourneyId = store.curJourneyId

  const canvas       = curProjectId ? store.canvasData[curProjectId] : null
  const node         = canvas?.nodes.find(n => n.id === selNodeId)
  const activeFlowId = (curJourneyId ? canvas?.curFlow[curJourneyId] : null) ?? null

  // Journey node (for context inheritance)
  const journeyNode = curJourneyId ? canvas?.nodes.find(n => n.id === curJourneyId) : undefined

  // Selected Flow object (when a flow label is clicked)
  const selectedFlow: Flow | undefined = (selFlowId && curJourneyId)
    ? (canvas?.flows[curJourneyId] ?? []).find(f => f.id === selFlowId)
    : undefined

  // Active Flow object (for context inheritance in screen view)
  const activeFlowObj: Flow | undefined = (activeFlowId && curJourneyId)
    ? (canvas?.flows[curJourneyId] ?? []).find(f => f.id === activeFlowId)
    : undefined

  const screen = (activeFlowId && curJourneyId)
    ? (canvas?.flows[curJourneyId] ?? [])
        .find(f => f.id === activeFlowId)
        ?.screens.find(s => s.id === selScreenId)
    : undefined

  // All flows of the current journey (for analyzers)
  const allFlows: Flow[] = curJourneyId
    ? (canvas?.flows[curJourneyId] ?? [])
    : []

  // DS nodes connected to this journey (for component suggestions)
  const connectedDsTags: string[] = (() => {
    if (!canvas || !curJourneyId) return []
    const dsNodeIds = canvas.conns
      .filter(c => c.toId === curJourneyId)
      .map(c => c.fromId)
    return canvas.nodes
      .filter(n => dsNodeIds.includes(n.id) && n.type === 'ds')
      .flatMap(n => n.tags ?? [])
      .filter((t, i, a) => a.indexOf(t) === i)
  })()

  if (!rpanelOpen) return null

  // ── FLOW selected → dedicated Flow panel ──────────────────────────────────
  if (selectedFlow && curJourneyId) {
    return (
      <div className={cn(
        'w-80 bg-white border-l border-gray-200',
        'flex flex-col flex-shrink-0 overflow-hidden shadow-lg',
      )}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-violet-100 flex-shrink-0">
              <Layers size={11} className="text-violet-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">{selectedFlow.name}</h3>
              <p className="text-[10px] text-gray-400">{selectedFlow.screens.length} screens</p>
            </div>
          </div>
          <button
            onClick={() => store.closeRpanel()}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Flow tabs — só context e info */}
        <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
          {(['context', 'info'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => store.setRpTab(tab)}
              className={cn(
                'flex-1 py-2.5 px-3 text-xs font-semibold uppercase tracking-wide transition-all',
                rpanelTab === tab
                  ? 'border-b-2 border-violet-500 text-violet-600 bg-violet-50/50'
                  : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {rpanelTab === 'context' ? (
            <FlowContextPanel
              flow={selectedFlow}
              journeyNode={journeyNode}
              curJourneyId={curJourneyId}
            />
          ) : (
            <div className="p-5 space-y-3 text-sm">
              <InfoRow label="Flow ID"   value={selectedFlow.id.slice(0, 8) + '…'} mono />
              <InfoRow label="Screens"   value={String(selectedFlow.screens.length)} />
              <InfoRow label="Order"     value={String(selectedFlow.order)} />
              <InfoRow label="Created"   value={new Date(selectedFlow.createdAt).toLocaleDateString()} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── NODE / SCREEN selected → existing panel ────────────────────────────────
  const selectedItem = screen ?? node

  // Panel title + icon
  let panelTitle = 'No selection'
  let contextMode: 'journey' | 'screen' | null = null
  if (screen)                  { panelTitle = screen.name;  contextMode = 'screen' }
  else if (node?.type === 'journey') { panelTitle = node.name; contextMode = 'journey' }
  else if (node)               { panelTitle = node.name }

  return (
    <div className={cn(
      'w-80 bg-white border-l border-gray-200',
      'flex flex-col flex-shrink-0 overflow-hidden shadow-lg',
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          {contextMode === 'journey' && (
            <div className="w-5 h-5 rounded flex items-center justify-center bg-indigo-100 flex-shrink-0">
              <Map size={11} className="text-indigo-600" />
            </div>
          )}
          {contextMode === 'screen' && (
            <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-100 flex-shrink-0">
              <Monitor size={11} className="text-blue-600" />
            </div>
          )}
          <h3 className="text-sm font-bold text-gray-900 truncate">{panelTitle}</h3>
        </div>
        <button
          onClick={() => store.closeRpanel()}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
        {(['context', 'properties', 'components', 'info'] as const).map(tab => (
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
            <p className="text-sm text-gray-400 text-center">Select a node or screen to edit</p>
          </div>
        ) : rpanelTab === 'context' ? (
          <ContextTab
            screen={screen}
            node={node}
            journeyNode={journeyNode}
            activeFlowObj={activeFlowObj}
            allFlows={allFlows}
            curJourneyId={curJourneyId}
            activeFlow={activeFlowId}
            connectedDsTags={connectedDsTags}
          />
        ) : rpanelTab === 'components' ? (
          <ComponentsTab
            screen={screen}
            curJourneyId={curJourneyId}
            activeFlow={activeFlowId}
            connectedDsTags={connectedDsTags}
          />
        ) : rpanelTab === 'properties' ? (
          <PropertiesTab node={node} screen={screen} curJourneyId={curJourneyId} activeFlow={activeFlowId} />
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
            <div className="flex gap-2 flex-wrap">
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
              <MarkerToggle
                label="Draft"
                active={(screen.status as string) === 'draft'}
                color="slate"
                onClick={() => {
                  if (curJourneyId && activeFlow)
                    store.updateScreen(curJourneyId, activeFlow, screen.id, {
                      status: screen.status === 'draft' ? 'empty' : 'draft',
                    })
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
// ContextTab — multi-level context (Journey → Flow → Screen)
// ─────────────────────────────────────────────────────────────────────────────

function ContextTab({ screen, node, journeyNode, activeFlowObj, allFlows, curJourneyId, activeFlow, connectedDsTags }: {
  screen:           Screen | undefined
  node:             MacroNode | undefined
  journeyNode:      MacroNode | undefined
  activeFlowObj:    Flow | undefined
  allFlows:         Flow[]
  curJourneyId:     string | null
  activeFlow:       string | null
  connectedDsTags:  string[]
}) {
  const store = useStore()

  // ── JOURNEY selected (macro view) → show Journey context form ──────────────
  if (node?.type === 'journey') {
    const journeyFlows = allFlows  // already filtered to this journey in root
    return (
      <JourneyContextForm
        node={node}
        flows={journeyFlows}
        onUpdate={(ctx) => store.updateJourneyContext(node.id, ctx)}
      />
    )
  }

  // ── SCREEN selected (micro view) → show 3-level hierarchy ─────────────────
  if (screen && curJourneyId && activeFlow) {
    const ctx = screen.context
    const score = screenCompleteness(screen)

    function updateCtx(patch: Partial<ScreenContext>) {
      store.updateScreenContext(curJourneyId!, activeFlow!, screen!.id, patch)
    }

    return (
      <div className="divide-y divide-gray-100">

        {/* ── Completeness ring ── */}
        <CompletenessRing screen={screen} score={score} />

        {/* ── LEVEL 1: Journey context (inherited, collapsible) ── */}
        <ContextLevelBlock
          level={1}
          label="Journey"
          sublabel={journeyNode?.name ?? 'Journey'}
          icon={<Map size={11} />}
          color="indigo"
          defaultOpen={false}
          empty={!journeyNode?.journeyCtx?.goal && !journeyNode?.journeyCtx?.targetUser}
          emptyHint="No journey context defined — click the Journey node to add it"
        >
          <JourneyContextReadonly ctx={journeyNode?.journeyCtx} />
        </ContextLevelBlock>

        {/* ── LEVEL 2: Flow context (editable) ── */}
        <ContextLevelBlock
          level={2}
          label="Flow"
          sublabel={activeFlowObj?.name ?? 'Flow'}
          icon={<Layers size={11} />}
          color="violet"
          defaultOpen={false}
          empty={!activeFlowObj?.flowCtx?.general && !activeFlowObj?.flowCtx?.specific}
          emptyHint="Add flow context to help the AI understand this flow's scope"
        >
          {activeFlowObj && (
            <FlowContextForm
              flow={activeFlowObj}
              curJourneyId={curJourneyId!}
              onUpdate={(ctx) => store.updateFlowContext(curJourneyId!, activeFlowObj.id, ctx)}
            />
          )}
        </ContextLevelBlock>

        {/* ── LEVEL 3: Screen context (full form, editable) ── */}
        <ContextLevelBlock
          level={3}
          label="Screen"
          sublabel={screen.name}
          icon={<Monitor size={11} />}
          color="blue"
          defaultOpen={true}
          empty={false}
        >
          <div className="divide-y divide-gray-100">
            {/* Figma URL binding */}
            <FigmaSection screen={screen} curJourneyId={curJourneyId} activeFlow={activeFlow} />

            {/* AI Context Analyzer */}
            {screen.figma?.nodeId && (
              <AIContextAnalyzer
                screen={screen}
                curJourneyId={curJourneyId}
                activeFlow={activeFlow}
                onApply={updateCtx}
              />
            )}

            {/* Core fields */}
            <div className="p-4 space-y-4">
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

            {/* Component Map Editor */}
            <div className="p-4">
              <ComponentMapEditor
                selected={ctx.components}
                options={connectedDsTags}
                figmaComponentMap={screen.figma?.componentMap ?? []}
                onChange={components => updateCtx({ components })}
              />
            </div>

            {/* API Endpoint Builder */}
            <div className="p-4">
              <ApiEndpointBuilderAI
                endpoints={ctx.apiEndpoints}
                screen={screen}
                onChange={apiEndpoints => updateCtx({ apiEndpoints })}
              />
            </div>

            {/* Notes + Gen Rules */}
            <div className="p-4 space-y-4">
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

            {/* Context Preview */}
            <ContextPreview screen={screen} journeyCtx={journeyNode?.journeyCtx} flowCtx={activeFlowObj?.flowCtx} />

            {/* Context Inheritance */}
            <ContextInheritancePanel screen={screen} connectedDsTags={connectedDsTags} />

            {/* Generation Preview */}
            <GenerationPreview screen={screen} curJourneyId={curJourneyId} activeFlow={activeFlow} />
          </div>
        </ContextLevelBlock>

      </div>
    )
  }

  // ── DS node or nothing useful selected ────────────────────────────────────
  return (
    <div className="p-5">
      <p className="text-sm text-gray-400">
        {node?.type === 'ds'
          ? 'Context is available for Journey nodes and Screens.'
          : 'Select a Journey node or screen to edit context.'}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowContextPanel — rendered when a Flow label is clicked (selFlowId set)
// Contains: batch screen analyzer + flow unlock logic + FlowContextForm
// ─────────────────────────────────────────────────────────────────────────────

function FlowContextPanel({ flow, journeyNode, curJourneyId }: {
  flow:         Flow
  journeyNode:  MacroNode | undefined
  curJourneyId: string
}) {
  const store = useStore()

  const screens         = flow.screens
  const activeScreens   = screens.filter(s => s.status !== 'draft')
  const draftCount      = screens.length - activeScreens.length
  const analyzedScreens = activeScreens.filter(s => s.context.purpose.trim().length > 5)
  const hasFlowCtx      = !!(flow.flowCtx?.general)

  return (
    <div className="divide-y divide-gray-100">

      {/* ── Screen status overview ── */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Screens</span>
          <span className="text-[11px] text-gray-400">
            {analyzedScreens.length}/{activeScreens.length} analisadas
            {draftCount > 0 && <span className="text-slate-300 ml-1">· {draftCount} draft</span>}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              analyzedScreens.length === activeScreens.length && activeScreens.length > 0
                ? 'bg-green-500'
                : analyzedScreens.length > 0 ? 'bg-violet-400' : 'bg-gray-200'
            )}
            style={{ width: activeScreens.length > 0 ? `${(analyzedScreens.length / activeScreens.length) * 100}%` : '0%' }}
          />
        </div>

        {/* Screen list */}
        {screens.length > 0 && (
          <div className="space-y-1">
            {screens.map(s => {
              const isDraft    = s.status === 'draft'
              const isAnalyzed = s.context.purpose.trim().length > 5
              return (
                <div key={s.id} className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px]',
                  isDraft ? 'opacity-40' : isAnalyzed ? 'bg-green-50' : 'bg-amber-50',
                )}>
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    isDraft ? 'bg-slate-300' : isAnalyzed ? 'bg-green-500' : 'bg-amber-400',
                  )} />
                  <span className={cn('truncate flex-1', isDraft && 'line-through text-gray-300')}>
                    {s.name}
                  </span>
                  {isDraft    && <span className="text-[9px] text-slate-300 uppercase font-bold flex-shrink-0">draft</span>}
                  {!isDraft && isAnalyzed  && <CheckCircle2 size={10} className="text-green-500 flex-shrink-0" />}
                  {!isDraft && !isAnalyzed && <AlertCircle  size={10} className="text-amber-400 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        )}

        {screens.length === 0 && (
          <p className="text-[11px] text-gray-400">Nenhuma screen neste flow.</p>
        )}
      </div>

      {/* ── Flow Context header ── */}
      <div className="px-4 py-3 bg-violet-50 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-violet-100 text-violet-600 border border-violet-200 flex-shrink-0">
          2
        </div>
        <Layers size={11} className="text-violet-600 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Flow Context</span>
        {hasFlowCtx && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 ml-auto flex-shrink-0" />}
      </div>

      {/* ── AIFlowAnalyzer + FlowContextForm — handles all batch/unlock logic ── */}
      <FlowContextForm
        flow={flow}
        curJourneyId={curJourneyId}
        onUpdate={(ctx) => store.updateFlowContext(curJourneyId, flow.id, ctx)}
      />

      {/* ── Journey context — inherited, readonly ── */}
      {journeyNode?.journeyCtx?.goal && (
        <div className="p-4 bg-indigo-50/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
            Herdado da Journey
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">{journeyNode.journeyCtx.goal}</p>
        </div>
      )}
    </div>
  )
}

type LevelColor = 'indigo' | 'violet' | 'blue'

const levelColorMap: Record<LevelColor, {
  bg: string; border: string; text: string; dot: string; badge: string
}> = {
  indigo: {
    bg:     'bg-indigo-50',
    border: 'border-indigo-200',
    text:   'text-indigo-700',
    dot:    'bg-indigo-400',
    badge:  'bg-indigo-100 text-indigo-600 border-indigo-200',
  },
  violet: {
    bg:     'bg-violet-50',
    border: 'border-violet-200',
    text:   'text-violet-700',
    dot:    'bg-violet-400',
    badge:  'bg-violet-100 text-violet-600 border-violet-200',
  },
  blue: {
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    text:   'text-blue-700',
    dot:    'bg-blue-500',
    badge:  'bg-blue-100 text-blue-600 border-blue-200',
  },
}

function ContextLevelBlock({
  level, label, sublabel, icon, color, defaultOpen, empty, emptyHint, children,
}: {
  level:       number
  label:       string
  sublabel:    string
  icon:        React.ReactNode
  color:       LevelColor
  defaultOpen: boolean
  empty:       boolean
  emptyHint?:  string
  children:    React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const c = levelColorMap[color]

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors',
          open ? c.bg : 'hover:bg-gray-50',
        )}
      >
        {/* Level badge */}
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 border',
          c.badge,
        )}>
          {level}
        </div>

        {/* Icon + label */}
        <div className={cn('flex items-center gap-1.5 flex-shrink-0', c.text)}>
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>

        {/* Sublabel */}
        <span className="text-[11px] text-gray-400 truncate flex-1 min-w-0">{sublabel}</span>

        {/* Status dot */}
        {empty ? (
          <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide flex-shrink-0">
            empty
          </span>
        ) : (
          <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
        )}

        <ChevronDown size={12} className={cn('text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {/* Body */}
      {open && (
        <div className={cn('border-t', c.border)}>
          {empty && emptyHint ? (
            <div className="px-4 py-3">
              <p className="text-[11px] text-gray-400 leading-relaxed">{emptyHint}</p>
              <div className="mt-2">{children}</div>
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// JourneyContextForm — editable, shown when Journey node is selected
// ─────────────────────────────────────────────────────────────────────────────

function JourneyContextForm({ node, flows, onUpdate }: {
  node:     MacroNode
  flows:    Flow[]
  onUpdate: (ctx: Partial<JourneyContext>) => void
}) {
  const ctx = node.journeyCtx ?? {
    goal: '', targetUser: '', platform: '',
    techNotes: '', designTokens: '', globalRules: '',
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* Level header */}
      <div className="px-4 py-3 bg-indigo-50 flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200 flex-shrink-0">
          1
        </div>
        <Map size={12} className="text-indigo-600 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Journey Context</span>
        <span className="text-[11px] text-gray-400 truncate flex-1">{node.name}</span>
      </div>

      {/* AI Journey Analyzer — topo, antes dos campos */}
      <AIJourneyAnalyzer
        node={node}
        flows={flows}
        onApply={onUpdate}
      />

      <div className="p-4 space-y-4">
        <p className="text-[11px] text-gray-400 leading-relaxed bg-indigo-50 rounded p-2.5 border border-indigo-100">
          Este contexto é herdado por todos os flows e screens desta journey. Define o objetivo macro, usuário-alvo e regras globais de geração.
        </p>

        <FormGroup label="Objetivo da Journey">
          <textarea
            value={ctx.goal}
            onChange={e => onUpdate({ goal: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="Allow new users to complete onboarding and verify their identity"
          />
        </FormGroup>

        <FormGroup label="Usuário-alvo">
          <input
            type="text"
            value={ctx.targetUser}
            onChange={e => onUpdate({ targetUser: e.target.value })}
            className={inputCls}
            placeholder="New user who just created an account"
          />
        </FormGroup>

        <FormGroup label="Plataforma">
          <input
            type="text"
            value={ctx.platform}
            onChange={e => onUpdate({ platform: e.target.value })}
            className={inputCls}
            placeholder="Web (desktop-first), responsive mobile"
          />
        </FormGroup>

        <FormGroup label="Notas técnicas">
          <textarea
            value={ctx.techNotes}
            onChange={e => onUpdate({ techNotes: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="Uses Server Actions throughout. Auth via Supabase. Next.js App Router."
          />
        </FormGroup>

        <FormGroup label="Design tokens / sistema">
          <input
            type="text"
            value={ctx.designTokens}
            onChange={e => onUpdate({ designTokens: e.target.value })}
            className={inputCls}
            placeholder="Design System v2 — Tailwind custom tokens, Geist font"
          />
        </FormGroup>

        <FormGroup label="Regras globais de geração">
          <textarea
            value={ctx.globalRules}
            onChange={e => onUpdate({ globalRules: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="All forms use react-hook-form. Zod validation. shadcn/ui components."
          />
        </FormGroup>
      </div>

      {/* Inherited preview */}
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
          Herdado por todos os screens
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 bg-gray-50 rounded p-2">
          <span className="text-indigo-500 font-semibold">Journey</span>
          <ArrowRight size={8} className="text-gray-300" />
          <span className="text-violet-400">{flows.length} flow{flows.length !== 1 ? 's' : ''}</span>
          <ArrowRight size={8} className="text-gray-300" />
          <span className="text-blue-400">{flows.reduce((a, f) => a + f.screens.length, 0)} screens</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// JourneyContextReadonly — displayed inside the Screen level block
// ─────────────────────────────────────────────────────────────────────────────

function JourneyContextReadonly({ ctx }: { ctx?: JourneyContext }) {
  if (!ctx) return (
    <div className="px-4 py-3">
      <p className="text-[11px] text-gray-400">Selecione o Journey node para adicionar contexto global.</p>
    </div>
  )

  const entries = [
    { label: 'Objetivo',    value: ctx.goal },
    { label: 'Usuário',     value: ctx.targetUser },
    { label: 'Plataforma',  value: ctx.platform },
    { label: 'Técnico',     value: ctx.techNotes },
    { label: 'Tokens',      value: ctx.designTokens },
    { label: 'Regras',      value: ctx.globalRules },
  ].filter(e => e.value)

  if (entries.length === 0) return (
    <div className="px-4 py-3">
      <p className="text-[11px] text-gray-400">Journey context está vazio.</p>
    </div>
  )

  return (
    <div className="px-4 py-3 space-y-2">
      {entries.map(e => (
        <div key={e.label}>
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">{e.label}</span>
          <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">{e.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowContextForm — editable, shown inside the Level 2 block
// ─────────────────────────────────────────────────────────────────────────────

function FlowContextForm({ flow, curJourneyId, onUpdate }: {
  flow:         Flow
  curJourneyId: string
  onUpdate:     (ctx: Partial<FlowContext>) => void
}) {
  const ctx = flow.flowCtx ?? {
    general: '', specific: '', entryPoint: '', exitPoints: '', stateNotes: '',
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* AI Flow Analyzer — aparece sempre no topo do form */}
      <AIFlowAnalyzer
        flow={flow}
        curJourneyId={curJourneyId}
        onApply={onUpdate}
      />

      <div className="p-4 space-y-4">
        <FormGroup label="Descrição geral do flow">
          <textarea
            value={ctx.general}
            onChange={e => onUpdate({ general: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="Happy path for the sign-up funnel — 3 steps"
          />
        </FormGroup>

        <FormGroup label="Notas específicas">
          <textarea
            value={ctx.specific}
            onChange={e => onUpdate({ specific: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="Shares auth state with /login via cookie. Handles email verification."
          />
        </FormGroup>

        <FormGroup label="Entry point">
          <input
            type="text"
            value={ctx.entryPoint}
            onChange={e => onUpdate({ entryPoint: e.target.value })}
            className={inputCls}
            placeholder="User arrives from landing page via CTA button"
          />
        </FormGroup>

        <FormGroup label="Exit points">
          <input
            type="text"
            value={ctx.exitPoints}
            onChange={e => onUpdate({ exitPoints: e.target.value })}
            className={inputCls}
            placeholder="Success → /dashboard, Error → retry screen"
          />
        </FormGroup>

        <FormGroup label="Estado compartilhado">
          <textarea
            value={ctx.stateNotes}
            onChange={e => onUpdate({ stateNotes: e.target.value })}
            rows={2}
            className={cn(inputCls, 'resize-none')}
            placeholder="Form state managed locally via react-hook-form. No global state."
          />
        </FormGroup>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AIFlowAnalyzer — lógica completa de desbloqueio
// 1) Screens sem contexto → botão "X screens pendentes — Analisar tudo"
// 2) Todas as non-draft screens com contexto → botão "Analisar Flow Completo"
// ─────────────────────────────────────────────────────────────────────────────

interface AIFlowAnalysis {
  general:    string
  specific:   string
  entryPoint: string
  exitPoints: string
  stateNotes: string
}

function AIFlowAnalyzer({ flow, curJourneyId, onApply }: {
  flow:         Flow
  curJourneyId: string
  onApply:      (ctx: Partial<FlowContext>) => void
}) {
  const store = useStore()

  // State for flow-level analysis
  const [flowLoading,  setFlowLoading]  = useState(false)
  const [flowAnalysis, setFlowAnalysis] = useState<AIFlowAnalysis | null>(null)
  const [flowError,    setFlowError]    = useState<string | null>(null)
  const [flowApplied,  setFlowApplied]  = useState(false)

  // State for batch screen analysis
  const [batchLoading,   setBatchLoading]   = useState(false)
  const [batchProgress,  setBatchProgress]  = useState<{ done: number; total: number } | null>(null)
  const [batchError,     setBatchError]     = useState<string | null>(null)
  const [batchDone,      setBatchDone]      = useState(false)

  // Screen classification
  const allScreens     = flow.screens
  const activeScreens  = allScreens.filter(s => s.status !== 'draft')
  const draftScreens   = allScreens.filter(s => s.status === 'draft')
  const pendingScreens = activeScreens.filter(s => s.context.purpose.trim().length < 5)
  const readyScreens   = activeScreens.filter(s => s.context.purpose.trim().length >= 5)

  const allScreensReady = pendingScreens.length === 0 && activeScreens.length > 0
  const hasAnyScreens   = activeScreens.length > 0

  // ── Batch: analisar todas as screens pendentes em sequência ─────────────────
  async function analyzeBatch() {
    if (pendingScreens.length === 0) return
    setBatchLoading(true)
    setBatchError(null)
    setBatchDone(false)
    setBatchProgress({ done: 0, total: pendingScreens.length })

    let successCount = 0

    for (let i = 0; i < pendingScreens.length; i++) {
      const screen = pendingScreens[i]
      setBatchProgress({ done: i, total: pendingScreens.length })

      try {
        const components   = screen.figma?.componentMap.map(c => c.figmaName) ?? []
        const thumbnailUrl = screen.figma?.thumbnailUrl

        let analysis: { purpose: string; userIntent: string; notes: string; genRules: string } | null = null

        // Try API first
        try {
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
          if (res.ok) {
            const data = await res.json() as { analysis: { purpose: string; userIntent: string; notes: string; genRules: string } | null }
            analysis = data.analysis
          }
        } catch { /* fallback below */ }

        // Local heuristic fallback
        if (!analysis || !analysis.purpose) {
          const hasForm = components.some(c => /input|form|field|login|register|search/i.test(c))
          const hasList = components.some(c => /list|table|grid|card|item/i.test(c))
          const hasAuth = components.some(c => /auth|login|signup|password/i.test(c))
          analysis = {
            purpose:    hasAuth ? 'Allow user to authenticate and access their account'
                      : hasForm ? 'Allow user to submit information via form'
                      : hasList ? 'Display and manage a list of items'
                      : `${screen.name} — inferred from ${components.length} component(s)`,
            userIntent: hasAuth ? 'User wants to sign in or create an account'
                      : hasForm ? 'User wants to complete and submit a form'
                      : hasList ? 'User wants to view or manage items'
                      : `User wants to interact with ${screen.name}`,
            notes:      components.length > 0
                      ? `Detected: ${[...new Set(components.slice(0,5).map(c => c.split('/')[0]))].join(', ')}`
                      : 'No component data available',
            genRules:   hasForm ? 'Use Server Action for form submission. Validate on server.' : '',
          }
        }

        // Apply to screen — only fill empty fields
        const patch: Partial<typeof screen.context> = {}
        if (analysis.purpose    && !screen.context.purpose)    patch.purpose    = analysis.purpose
        if (analysis.userIntent && !screen.context.userIntent) patch.userIntent = analysis.userIntent
        if (analysis.notes      && !screen.context.notes)      patch.notes      = analysis.notes
        if (analysis.genRules   && !screen.context.genRules)   patch.genRules   = analysis.genRules

        if (Object.keys(patch).length > 0) {
          store.updateScreenContext(curJourneyId, flow.id, screen.id, patch)
        }

        // Mark as partial if was empty
        if (screen.status === 'empty') {
          store.updateScreen(curJourneyId, flow.id, screen.id, { status: 'partial' })
        }

        successCount++

        // Small delay between calls to avoid rate limiting
        if (i < pendingScreens.length - 1) {
          await new Promise(r => setTimeout(r, 300))
        }
      } catch {
        // continue with next screen even if one fails
      }
    }

    setBatchProgress({ done: pendingScreens.length, total: pendingScreens.length })
    setBatchLoading(false)
    setBatchDone(true)

    if (successCount < pendingScreens.length) {
      setBatchError(`${pendingScreens.length - successCount} screen(s) falharam — verifique e tente novamente`)
    }
  }

  // ── Flow analysis — só roda quando todas as screens estão prontas ───────────
  async function analyzeFlow() {
    if (!allScreensReady) return
    setFlowLoading(true)
    setFlowError(null)
    setFlowAnalysis(null)
    setFlowApplied(false)

    try {
      const screenSummaries = activeScreens.map((s, i) => ({
        index:       i + 1,
        name:        s.name,
        route:       s.context.route,
        purpose:     s.context.purpose,
        userIntent:  s.context.userIntent,
        components:  s.context.components.slice(0, 8),
        endpoints:   s.context.apiEndpoints.map(e => `${e.method} ${e.path}`),
        isEntry:     s.isEntry,
        isError:     s.isError,
        requiresAuth: s.context.requiresAuth,
      }))

      const prompt = `You are analyzing a user flow called "${flow.name}" with ${activeScreens.length} screen(s).

${screenSummaries.map(s => `
Screen ${s.index}: "${s.name}"
- Route: ${s.route || '(not set)'}
- Purpose: ${s.purpose || '(not set)'}
- Intent: ${s.userIntent || '(not set)'}
- Components: ${s.components.join(', ') || '(none)'}
- Endpoints: ${s.endpoints.join(', ') || '(none)'}
- Auth: ${s.requiresAuth ? 'required' : 'public'}
- Markers: ${[s.isEntry && 'entry', s.isError && 'error'].filter(Boolean).join(', ') || 'none'}
`).join('\n')}

Synthesize a FlowContext. Respond ONLY with JSON (no markdown):
{
  "general": "one sentence — what this flow accomplishes",
  "specific": "2-3 sentences — technical patterns, auth, state sharing, edge cases",
  "entryPoint": "where users arrive at this flow",
  "exitPoints": "where users go after completing or failing",
  "stateNotes": "state management notes across screens"
}`

      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, maxTokens: 600, _previewMode: true }),
      })

      let rawText = ''
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
                if (typeof d.text  === 'string') rawText += d.text
                if (typeof d.delta === 'string') rawText += d.delta
              } catch { rawText += line.slice(6) }
            }
          }
        }
      }

      let parsed: AIFlowAnalysis | null = null
      try {
        const clean = rawText.replace(/```json|```/g, '').trim()
        const match = clean.match(/\{[\s\S]+\}/)
        if (match) parsed = JSON.parse(match[0]) as AIFlowAnalysis
      } catch { /* fallback */ }

      if (!parsed || !parsed.general) {
        const routes   = activeScreens.map(s => s.context.route).filter(Boolean)
        const hasAuth  = activeScreens.some(s => s.context.requiresAuth)
        const entry    = activeScreens.find(s => s.isEntry) ?? activeScreens[0]
        const errorScr = activeScreens.find(s => s.isError)
        parsed = {
          general:    activeScreens[0]?.context.purpose || `${flow.name} — ${activeScreens.length} screens`,
          specific:   hasAuth ? 'Requires authentication throughout.' : 'Public flow.',
          entryPoint: entry ? `"${entry.name}"${entry.context.route ? ` (${entry.context.route})` : ''}` : '(not defined)',
          exitPoints: errorScr ? `Error: "${errorScr.name}"` : routes.length > 0 ? routes.join(' → ') : '(not defined)',
          stateNotes: 'No complex state identified.',
        }
      }

      setFlowAnalysis(parsed)
    } catch {
      setFlowError('Falha na análise — tente novamente')
    } finally {
      setFlowLoading(false)
    }
  }

  function applyFlow() {
    if (!flowAnalysis) return
    const current = flow.flowCtx
    const patch: Partial<FlowContext> = {}
    if (flowAnalysis.general    && !current?.general)    patch.general    = flowAnalysis.general
    if (flowAnalysis.specific   && !current?.specific)   patch.specific   = flowAnalysis.specific
    if (flowAnalysis.entryPoint && !current?.entryPoint) patch.entryPoint = flowAnalysis.entryPoint
    if (flowAnalysis.exitPoints && !current?.exitPoints) patch.exitPoints = flowAnalysis.exitPoints
    if (flowAnalysis.stateNotes && !current?.stateNotes) patch.stateNotes = flowAnalysis.stateNotes
    onApply(patch)
    setFlowApplied(true)
  }

  if (!hasAnyScreens) return (
    <div className="px-4 py-3 border-b border-gray-100">
      <p className="text-[11px] text-gray-400">Adicione screens a este flow para usar o AI Analyzer.</p>
    </div>
  )

  return (
    <div className="border-b border-gray-100">

      {/* ── HEADER ── */}
      <div className="px-4 py-3 bg-violet-50/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wand2 size={13} className="text-violet-500 flex-shrink-0" />
          <span className="text-xs font-bold text-violet-800 uppercase tracking-wide">AI Flow Analyzer</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-violet-400 flex-shrink-0">
          <span className="font-semibold text-violet-600">{readyScreens.length}</span>
          <span>/</span>
          <span>{activeScreens.length}</span>
          <span>screens</span>
          {draftScreens.length > 0 && (
            <span className="text-slate-400 ml-1">· {draftScreens.length} draft</span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">

        {/* ── STEP 1: Screens pendentes ── */}
        {pendingScreens.length > 0 && (
          <div className="space-y-2">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500 font-medium">
                  {pendingScreens.length === activeScreens.length
                    ? 'Nenhuma screen analisada ainda'
                    : `${pendingScreens.length} screen${pendingScreens.length > 1 ? 's' : ''} sem contexto`}
                </span>
                <span className="text-[10px] text-gray-400">
                  {Math.round((readyScreens.length / activeScreens.length) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-300 rounded-full transition-all duration-500"
                  style={{ width: `${(readyScreens.length / activeScreens.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Batch analyze button */}
            {!batchLoading && !batchDone && (
              <button
                onClick={analyzeBatch}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 transition-colors"
              >
                <Sparkles size={12} />
                {pendingScreens.length} screen{pendingScreens.length > 1 ? 's' : ''} não analisada{pendingScreens.length > 1 ? 's' : ''} — Analisar tudo
              </button>
            )}

            {/* Batch progress */}
            {batchLoading && batchProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-violet-600">
                  <Loader2 size={12} className="animate-spin flex-shrink-0" />
                  <span>
                    Analisando screen {batchProgress.done + 1} de {batchProgress.total}…
                  </span>
                </div>
                <div className="h-1 w-full bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${((batchProgress.done) / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {batchDone && pendingScreens.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg p-2 border border-green-100">
                <CheckCircle2 size={12} className="flex-shrink-0" />
                <span>Todas as screens analisadas — agora analise o flow completo</span>
              </div>
            )}

            {batchError && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-100">
                <AlertCircle size={12} className="flex-shrink-0" />
                <span>{batchError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Analisar flow completo — só habilitado quando tudo pronto ── */}
        <div className="space-y-2">
          {!flowAnalysis && !flowLoading && (
            <button
              onClick={analyzeFlow}
              disabled={!allScreensReady}
              className={cn(
                'w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors',
                allScreensReady
                  ? 'bg-violet-600 text-white hover:bg-violet-700 border-violet-600'
                  : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed',
              )}
              title={!allScreensReady ? `Analise as ${pendingScreens.length} screen(s) pendentes primeiro` : 'Analisar flow completo'}
            >
              <Wand2 size={12} />
              {allScreensReady ? 'Analisar Flow Completo' : `Aguardando ${pendingScreens.length} screen${pendingScreens.length > 1 ? 's' : ''}…`}
            </button>
          )}

          {flowLoading && (
            <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 rounded-lg p-3 border border-violet-100">
              <Loader2 size={13} className="animate-spin flex-shrink-0" />
              <span>Sintetizando {activeScreens.length} screens…</span>
            </div>
          )}

          {flowError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
              <AlertCircle size={12} className="flex-shrink-0" />
              <span>{flowError}</span>
            </div>
          )}

          {flowAnalysis && !flowApplied && (
            <div className="space-y-2">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
                <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide mb-1">Síntese do Flow</p>
                {flowAnalysis.general    && <PreviewRow label="Geral"   value={flowAnalysis.general} />}
                {flowAnalysis.specific   && <PreviewRow label="Notas"   value={flowAnalysis.specific} />}
                {flowAnalysis.entryPoint && <PreviewRow label="Entry"   value={flowAnalysis.entryPoint} />}
                {flowAnalysis.exitPoints && <PreviewRow label="Exits"   value={flowAnalysis.exitPoints} />}
                {flowAnalysis.stateNotes && <PreviewRow label="Estado"  value={flowAnalysis.stateNotes} />}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={applyFlow}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  <Check size={11} /> Aplicar
                </button>
                <button onClick={() => setFlowAnalysis(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">Ignorar</button>
                <button onClick={analyzeFlow} className="text-xs text-gray-400 hover:text-gray-600 px-2">Reanalisar</button>
              </div>
            </div>
          )}

          {flowApplied && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2 border border-green-100">
              <CheckCircle2 size={12} className="flex-shrink-0" />
              <span>Flow context preenchido — edite os campos abaixo se necessário</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AIJourneyAnalyzer — sintetiza todos os FlowContexts e gera JourneyContext
// Aparece no JourneyContextForm quando Journey node está selecionado
// ─────────────────────────────────────────────────────────────────────────────

interface AIJourneyAnalysis {
  goal:         string
  targetUser:   string
  platform:     string
  techNotes:    string
  designTokens: string
  globalRules:  string
}

function AIJourneyAnalyzer({ node, flows, onApply }: {
  node:    MacroNode
  flows:   Flow[]
  onApply: (ctx: Partial<JourneyContext>) => void
}) {
  const [loading,  setLoading]  = useState(false)
  const [analysis, setAnalysis] = useState<AIJourneyAnalysis | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [applied,  setApplied]  = useState(false)

  const analyzedFlows  = flows.filter(f => f.flowCtx?.general)
  const totalScreens   = flows.reduce((acc, f) => acc + f.screens.length, 0)

  // Journey analyzer is most useful when flows have context, but allow always
  const hasAnyContext  = analyzedFlows.length > 0 || totalScreens > 0

  async function analyze() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setApplied(false)

    try {
      // Build rich context from all flows
      const flowSummaries = flows.map((f, i) => {
        const ctx = f.flowCtx
        const screens = f.screens
        const allPurposes = screens.map(s => s.context.purpose).filter(Boolean)
        const allRoutes   = screens.map(s => s.context.route).filter(Boolean)
        const allComponents = [...new Set(screens.flatMap(s => s.context.components))].slice(0, 10)
        const usesAuth    = screens.some(s => s.context.requiresAuth)

        return `
Flow ${i + 1}: "${f.name}" (${screens.length} screens)
${ctx?.general    ? `- General: ${ctx.general}` : ''}
${ctx?.entryPoint ? `- Entry: ${ctx.entryPoint}` : ''}
${ctx?.exitPoints ? `- Exits: ${ctx.exitPoints}` : ''}
${ctx?.stateNotes ? `- State: ${ctx.stateNotes}` : ''}
${allPurposes.length > 0 ? `- Screen purposes: ${allPurposes.slice(0, 3).join('; ')}` : ''}
${allRoutes.length   > 0 ? `- Routes: ${allRoutes.join(', ')}` : ''}
${allComponents.length > 0 ? `- Components used: ${allComponents.join(', ')}` : ''}
${usesAuth ? '- Requires authentication' : '- Public flow'}`
      }).join('\n')

      const prompt = `You are analyzing a complete user journey called "${node.name}" in a web application.

This journey has ${flows.length} flow(s) and ${totalScreens} total screens:

${flowSummaries}

Based on this complete journey, synthesize a JourneyContext. Respond ONLY with a JSON object (no markdown, no explanation):
{
  "goal": "one clear sentence — what is the overarching goal of this entire journey?",
  "targetUser": "who is the target user going through this journey?",
  "platform": "what platform/device is this primarily designed for?",
  "techNotes": "key technical patterns observed across all flows (auth, state management, API patterns)",
  "designTokens": "design system / component library patterns observed",
  "globalRules": "generation rules that apply to ALL screens in this journey"
}`

      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, maxTokens: 700, _previewMode: true }),
      })

      let rawText = ''
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
                if (typeof d.text  === 'string') rawText += d.text
                if (typeof d.delta === 'string') rawText += d.delta
              } catch { rawText += line.slice(6) }
            }
          }
        }
      }

      let parsed: AIJourneyAnalysis | null = null
      try {
        const clean = rawText.replace(/```json|```/g, '').trim()
        const jsonMatch = clean.match(/\{[\s\S]+\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]) as AIJourneyAnalysis
      } catch { /* fallback below */ }

      // Local heuristic fallback
      if (!parsed || !parsed.goal) {
        const allScreens    = flows.flatMap(f => f.screens)
        const usesAuth      = allScreens.some(s => s.context.requiresAuth)
        const allComponents = [...new Set(allScreens.flatMap(s => s.context.components))].slice(0, 8)
        const allPurposes   = allScreens.map(s => s.context.purpose).filter(Boolean).slice(0, 3)

        parsed = {
          goal:         allPurposes.length > 0
            ? allPurposes[0]
            : `${node.name} — ${flows.length} flows, ${totalScreens} screens`,
          targetUser:   usesAuth ? 'Authenticated user' : 'General user',
          platform:     'Web application',
          techNotes:    usesAuth
            ? 'Requires authentication. Protected routes present.'
            : 'Public journey. No auth required.',
          designTokens: allComponents.length > 0
            ? `Components: ${allComponents.join(', ')}`
            : 'No component data available.',
          globalRules:  'Use Next.js App Router. TypeScript strict. Tailwind CSS.',
        }
      }

      setAnalysis(parsed)
    } catch (e) {
      setError('Falha na análise — tente novamente')
      console.error('[AIJourneyAnalyzer]', e)
    } finally {
      setLoading(false)
    }
  }

  function applyAll() {
    if (!analysis) return
    const current = node.journeyCtx
    const patch: Partial<JourneyContext> = {}
    if (analysis.goal         && !current?.goal)         patch.goal         = analysis.goal
    if (analysis.targetUser   && !current?.targetUser)   patch.targetUser   = analysis.targetUser
    if (analysis.platform     && !current?.platform)     patch.platform     = analysis.platform
    if (analysis.techNotes    && !current?.techNotes)    patch.techNotes    = analysis.techNotes
    if (analysis.designTokens && !current?.designTokens) patch.designTokens = analysis.designTokens
    if (analysis.globalRules  && !current?.globalRules)  patch.globalRules  = analysis.globalRules
    onApply(patch)
    setApplied(true)
  }

  if (!hasAnyContext) return (
    <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
      <p className="text-[11px] text-gray-400">
        Adicione flows e screens à journey para usar o AI Analyzer.
      </p>
    </div>
  )

  return (
    <div className="p-4 border-b border-indigo-100 bg-indigo-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 size={13} className="text-indigo-500" />
          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">AI Journey Analyzer</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status badges */}
          <span className="text-[10px] text-indigo-400">
            {flows.length} flow{flows.length !== 1 ? 's' : ''} · {totalScreens} screens
          </span>
          {!analysis && !loading && (
            <button
              onClick={analyze}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Sparkles size={11} /> Analisar journey
            </button>
          )}
        </div>
      </div>

      {/* Flow coverage bar */}
      {analyzedFlows.length < flows.length && flows.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-indigo-400">
              {analyzedFlows.length === 0
                ? 'Flows sem contexto — análise usará dados das screens'
                : `${analyzedFlows.length}/${flows.length} flows com contexto`}
            </span>
          </div>
          <div className="h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', analyzedFlows.length === 0 ? 'bg-indigo-200' : 'bg-indigo-500')}
              style={{ width: `${flows.length > 0 ? Math.max(4, (analyzedFlows.length / flows.length) * 100) : 100}%` }}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-100 rounded p-3 border border-indigo-200">
          <Loader2 size={13} className="animate-spin flex-shrink-0" />
          <span>Sintetizando {flows.length} flows e {totalScreens} screens…</span>
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
          <div className="bg-indigo-100 border border-indigo-200 rounded-lg p-3 space-y-2">
            <p className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wide mb-1.5">
              Síntese da Journey
            </p>
            {analysis.goal         && <PreviewRow label="Objetivo"  value={analysis.goal} color="indigo" />}
            {analysis.targetUser   && <PreviewRow label="Usuário"   value={analysis.targetUser} color="indigo" />}
            {analysis.platform     && <PreviewRow label="Plataforma" value={analysis.platform} color="indigo" />}
            {analysis.techNotes    && <PreviewRow label="Técnico"   value={analysis.techNotes} color="indigo" />}
            {analysis.designTokens && <PreviewRow label="Design"    value={analysis.designTokens} color="indigo" />}
            {analysis.globalRules  && <PreviewRow label="Regras"    value={analysis.globalRules} color="indigo" />}
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyAll}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Check size={11} /> Aplicar
            </button>
            <button onClick={() => setAnalysis(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
              Ignorar
            </button>
            <button onClick={analyze} className="text-xs text-gray-400 hover:text-gray-600 px-2">
              Reanalisar
            </button>
          </div>
        </div>
      )}

      {applied && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2 border border-green-100">
          <CheckCircle2 size={12} className="flex-shrink-0" />
          <span>Journey context preenchido — edite os campos abaixo</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewRow — shared primitive for analyzer preview cards
// ─────────────────────────────────────────────────────────────────────────────

function PreviewRow({ label, value, color = 'violet' }: {
  label:  string
  value:  string
  color?: 'violet' | 'indigo'
}) {
  const labelCls = color === 'indigo'
    ? 'text-indigo-500'
    : 'text-violet-500'

  return (
    <p className="text-xs text-gray-700">
      <span className={cn('font-semibold', labelCls)}>{label}: </span>
      {value}
    </p>
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
    { label: 'Figma vinculado',    pts: 30, done: !!screen.figma?.nodeId,     impact: 'Thumbnail e componentes para o Claude' },
    { label: 'Purpose',            pts: 20, done: ctx.purpose.length > 10,    impact: 'Define o objetivo da tela no prompt' },
    { label: 'Route',              pts: 15, done: ctx.route.length > 1,       impact: 'Define o path do arquivo gerado' },
    { label: 'Components',         pts: 15, done: ctx.components.length > 0,  impact: 'Lista de imports do código gerado' },
    { label: 'API Endpoints',      pts: 10, done: ctx.apiEndpoints.length > 0, impact: 'Gera chamadas de dados corretas' },
    { label: 'Architecture Notes', pts: 10, done: ctx.notes.length > 10,      impact: 'Padrões e decisões arquiteturais' },
  ]

  const missing = items.filter(i => !i.done)
  const done    = items.filter(i =>  i.done)

  const barColor = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = score >= 80 ? 'text-green-700' : score >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="px-4 pt-4 pb-3">
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Bar + score */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn('text-xs font-bold', textColor)}>{score}% completo</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">
              {score >= 80 ? '✓ Pronto para geração' : score >= 50 ? `${100 - score}pts restantes` : `${missing.length} campos faltando`}
            </span>
            <ChevronDown size={12} className={cn('text-gray-400 transition-transform', expanded && 'rotate-180')} />
          </div>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${score}%` }}
          />
        </div>
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
// Mostra o prompt context que o Claude vai receber, em tempo real (3 níveis)
// ─────────────────────────────────────────────────────────────────────────────

function ContextPreview({ screen, journeyCtx, flowCtx }: {
  screen:     Screen
  journeyCtx?: JourneyContext
  flowCtx?:    FlowContext
}) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const ctx = screen.context

  const preview = [
    // Level 1 — Journey
    journeyCtx?.goal        ? `[journey] goal: ${journeyCtx.goal}` : null,
    journeyCtx?.targetUser  ? `[journey] target_user: ${journeyCtx.targetUser}` : null,
    journeyCtx?.globalRules ? `[journey] global_rules: ${journeyCtx.globalRules}` : null,
    journeyCtx?.techNotes   ? `[journey] tech_notes: ${journeyCtx.techNotes}` : null,
    // Level 2 — Flow
    flowCtx?.general    ? `[flow] general: ${flowCtx.general}` : null,
    flowCtx?.entryPoint ? `[flow] entry: ${flowCtx.entryPoint}` : null,
    flowCtx?.exitPoints ? `[flow] exits: ${flowCtx.exitPoints}` : null,
    flowCtx?.stateNotes ? `[flow] state: ${flowCtx.stateNotes}` : null,
    // Level 3 — Screen
    `[screen] name: ${screen.name}`,
    ctx.route        ? `[screen] route: ${ctx.route}` : null,
    ctx.purpose      ? `[screen] purpose: ${ctx.purpose}` : '⚠ [screen] purpose: (vazio)',
    ctx.userIntent   ? `[screen] intent: ${ctx.userIntent}` : null,
    ctx.requiresAuth ? `[screen] auth: required` : `[screen] auth: public`,
    ctx.components.length > 0
      ? `[screen] components (${ctx.components.length}): ${ctx.components.slice(0,5).join(', ')}${ctx.components.length > 5 ? '…' : ''}`
      : '⚠ [screen] components: (vazio)',
    screen.figma?.componentMap.length
      ? `[screen] figma_components: ${screen.figma.componentMap.length} extraídos`
      : '⚠ [screen] figma: não vinculado',
    ctx.apiEndpoints.length > 0
      ? `[screen] endpoints: ${ctx.apiEndpoints.map(e => `${e.method} ${e.path}`).join(', ')}`
      : '⚠ [screen] endpoints: (vazio)',
    ctx.notes    ? `[screen] notes: ${ctx.notes}` : null,
    ctx.genRules ? `[screen] gen_rules: ${ctx.genRules}` : null,
  ].filter(Boolean).join('\n')

  function copy() {
    navigator.clipboard.writeText(preview).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // color by prefix
  function lineColor(line: string) {
    if (line.startsWith('⚠'))        return 'text-amber-400'
    if (line.startsWith('[journey]')) return 'text-indigo-400'
    if (line.startsWith('[flow]'))    return 'text-violet-400'
    return 'text-gray-300'
  }

  return (
    <div className="p-4">
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
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wide">journey</span>
                <span className="text-gray-600">·</span>
                <span className="text-[9px] font-mono text-violet-400 uppercase tracking-wide">flow</span>
                <span className="text-gray-600">·</span>
                <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wide">screen</span>
              </div>
              <button
                onClick={copy}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'copiado' : 'copiar'}
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
              {preview.split('\n').map((line, i) => (
                <span key={i} className={cn('block', lineColor(line))}>
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
// Components Tab — smart grouping, variant collapsing, DS preview
// ─────────────────────────────────────────────────────────────────────────────

// Smart grouping: collapses variants into one base component
// "Button/Primary", "Button/Ghost", "Button/Disabled" → group "Button" with 3 variants
// Components without "/" go into group by their full name
function smartGroup(figmaMap: Array<{ figmaName: string; codeComponent: string; props?: Record<string, unknown> }>) {
  const groups: Record<string, {
    base:     string   // e.g. "Button"
    variants: typeof figmaMap
  }> = {}

  for (const c of figmaMap) {
    const parts = c.figmaName.split('/')
    const base  = parts[0].trim()
    if (!groups[base]) groups[base] = { base, variants: [] }
    groups[base].variants.push(c)
  }
  return groups
}

// Color preview for a component based on its name
function componentColor(name: string): string {
  const n = name.toLowerCase()
  if (/button|btn|cta/i.test(n))    return '#3B82F6'
  if (/input|field|form|text/i.test(n)) return '#8B5CF6'
  if (/card|tile|panel/i.test(n))   return '#10B981'
  if (/nav|header|footer|menu/i.test(n)) return '#F59E0B'
  if (/icon|avatar|badge/i.test(n)) return '#EC4899'
  if (/modal|dialog|drawer/i.test(n)) return '#EF4444'
  if (/tab|step|progress/i.test(n)) return '#6366F1'
  if (/table|list|grid/i.test(n))   return '#14B8A6'
  // deterministic color from string hash
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EC4899','#EF4444','#6366F1','#14B8A6','#F97316','#06B6D4']
  return colors[Math.abs(hash) % colors.length]
}

// Tiny component preview — icon + name + variant count
function ComponentPreview({ base, variants, isActive, onToggleAll }: {
  base:        string
  variants:    Array<{ figmaName: string; codeComponent: string }>
  isActive:    boolean
  onToggleAll: () => void
}) {
  const color      = componentColor(base)
  const initials   = base.split(/(?=[A-Z])|[-_ ]/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)
  const variantCount = variants.length

  return (
    <button
      onClick={onToggleAll}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left w-full',
        isActive
          ? 'border-blue-200 bg-blue-50'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      )}
    >
      {/* Color preview tile */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {initials || base[0]?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn('text-[12px] font-semibold truncate', isActive ? 'text-blue-800' : 'text-gray-800')}>
          {base}
        </div>
        <div className="text-[10px] text-gray-400 truncate">
          {variantCount === 1
            ? variants[0].codeComponent
            : `${variantCount} variantes`
          }
        </div>
      </div>

      {/* Active dot */}
      <div className={cn(
        'w-2 h-2 rounded-full flex-shrink-0 transition-colors',
        isActive ? 'bg-blue-500' : 'bg-gray-200'
      )} />
    </button>
  )
}

function ComponentsTab({ screen, curJourneyId, activeFlow, connectedDsTags }: {
  screen:           Screen | undefined
  curJourneyId:     string | null
  activeFlow:       string | null
  connectedDsTags:  string[]
}) {
  const store = useStore()
  const [search,         setSearch]         = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  if (!screen || !curJourneyId || !activeFlow) {
    return (
      <div className="p-5">
        <p className="text-sm text-gray-400">Components are available for screens only.</p>
      </div>
    )
  }

  const figmaMap = screen.figma?.componentMap ?? []
  const selected = screen.context.components
  const groups   = smartGroup(figmaMap)

  // DS tags not already in figma groups
  const dsOnly = connectedDsTags.filter(t =>
    !Object.keys(groups).some(base => base === t || t.startsWith(base + '/'))
  )

  const q = search.toLowerCase().trim()

  function matchesSearch(base: string, variants: Array<{ figmaName: string; codeComponent: string }>) {
    if (!q) return true
    return base.toLowerCase().includes(q) ||
      variants.some(v => v.figmaName.toLowerCase().includes(q) || v.codeComponent.toLowerCase().includes(q))
  }

  function toggleGroup(g: string) {
    setExpandedGroups(prev => {
      const n = new Set(prev)
      if (n.has(g)) { n.delete(g) } else { n.add(g) }
      return n
    })
  }

  function isGroupActive(variants: Array<{ codeComponent: string }>) {
    return variants.some(v => selected.includes(v.codeComponent))
  }

  function toggleGroupActive(base: string, variants: Array<{ codeComponent: string }>) {
    const anyActive = variants.some(v => selected.includes(v.codeComponent))
    let next = [...selected]
    if (anyActive) {
      // deactivate all
      next = next.filter(s => !variants.some(v => v.codeComponent === s))
    } else {
      // activate base component (first variant or the one matching the base name)
      const mainVariant = variants.find(v => v.codeComponent === base) ?? variants[0]
      if (mainVariant && !next.includes(mainVariant.codeComponent)) {
        next.push(mainVariant.codeComponent)
      }
    }
    store.updateScreenContext(curJourneyId!, activeFlow!, screen!.id, { components: next })
  }

  function toggleVariant(codeComponent: string) {
    const next = selected.includes(codeComponent)
      ? selected.filter(s => s !== codeComponent)
      : [...selected, codeComponent]
    store.updateScreenContext(curJourneyId!, activeFlow!, screen!.id, { components: next })
  }

  const totalGroups     = Object.keys(groups).length
  const activeGroupCount = Object.values(groups).filter(g => isGroupActive(g.variants)).length

  const filteredGroupEntries = Object.entries(groups).filter(([base, { variants }]) =>
    matchesSearch(base, variants)
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {totalGroups > 0 ? `${totalGroups} componentes` : 'Nenhum componente'}
          </span>
          {activeGroupCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {activeGroupCount} ativos
            </span>
          )}
        </div>
        {totalGroups > 0 && (
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (activeGroupCount / Math.max(1, totalGroups)) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar componente…"
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white"
          />
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>

      {/* Component grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {totalGroups === 0 && dsOnly.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 opacity-30">◈</div>
            <p className="text-xs text-gray-400">Vincule um design do Figma para ver os componentes</p>
          </div>
        ) : (
          <>
            {filteredGroupEntries.map(([base, { variants }]) => {
              const active   = isGroupActive(variants)
              const isOpen   = expandedGroups.has(base) || !!q
              const hasMulti = variants.length > 1

              return (
                <div key={base}>
                  {/* Component card preview */}
                  <div className={cn(hasMulti ? 'mb-0' : '')}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <ComponentPreview
                          base={base}
                          variants={variants}
                          isActive={active}
                          onToggleAll={() => toggleGroupActive(base, variants)}
                        />
                      </div>
                      {hasMulti && (
                        <button
                          onClick={() => toggleGroup(base)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600"
                          title="Ver variantes"
                        >
                          <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variants list (collapsed by default) */}
                  {hasMulti && isOpen && (
                    <div className="ml-2 mt-1 mb-1 border-l-2 border-gray-100 pl-3 space-y-1">
                      {variants.map(v => {
                        const variantName = v.figmaName.includes('/')
                          ? v.figmaName.split('/').slice(1).join('/')
                          : v.figmaName
                        const isVarActive = selected.includes(v.codeComponent)
                        return (
                          <button
                            key={v.figmaName}
                            onClick={() => toggleVariant(v.codeComponent)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                              isVarActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                            )}
                          >
                            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isVarActive ? 'bg-blue-500' : 'bg-gray-300')} />
                            <span className="text-[11px] flex-1 truncate">{variantName}</span>
                            {isVarActive && <span className="text-[9px] text-blue-500 font-semibold">ativo</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* DS-only group */}
            {(!q || dsOnly.some(t => t.toLowerCase().includes(q))) && dsOnly.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 pt-3 pb-1.5">
                  Design System
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {dsOnly.filter(t => !q || t.toLowerCase().includes(q)).map(tag => {
                    const isActive = selected.includes(tag)
                    const color    = componentColor(tag)
                    const initials = tag.split(/(?=[A-Z])|[-_ ]/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleVariant(tag)}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all',
                          isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
                        )}
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {initials || tag[0]?.toUpperCase()}
                        </div>
                        <span className={cn('text-[11px] font-medium truncate', isActive ? 'text-blue-700' : 'text-gray-600')}>
                          {tag}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {selected.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">{selected.length}</span> no contexto
          </span>
          <button
            onClick={() => store.updateScreenContext(curJourneyId!, activeFlow!, screen!.id, { components: [] })}
            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 7 — Generation Preview por Screen
// Gera código apenas desta screen e exibe em modal inline
// ─────────────────────────────────────────────────────────────────────────────

function GenerationPreview({ screen, curJourneyId, activeFlow: _activeFlow }: {
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
  onResolved: (journeyId: string, flowId: string, screenId: string, figma: ScreenFigma, frameName?: string) => void
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
      const nodesData = await res.json() as { nodes?: Record<string, unknown> }
      // Figma retorna chaves com ':' ou '-' dependendo da versão — tenta todas
      const nodeKey = nodeId  // ex: "1:999"
      const nodeDash = nodeId.replace(/:/g, '-')  // ex: "1-999"
      const nodeEntry =
        (nodesData?.nodes)?.[nodeKey] ??
        (nodesData?.nodes)?.[nodeDash] ??
        Object.values(nodesData?.nodes ?? {})[0]

      // Extrai nome do frame — a estrutura é { document: { name: "...", type: "FRAME" } }
      const frameDoc  = (nodeEntry as Record<string, unknown>)?.document as Record<string, unknown> | undefined
      const frameName = typeof frameDoc?.name === 'string' && frameDoc.name
        ? frameDoc.name
        : null

      // Extrai nomes de componentes da árvore
      const names = new Set<string>()
      function walk(node: unknown) {
        if (!node || typeof node !== 'object') return
        const n = node as Record<string, unknown>
        if ((n.type === 'INSTANCE' || n.type === 'COMPONENT') && typeof n.name === 'string') names.add(n.name)
        const children = n.children
        if (Array.isArray(children)) children.forEach(walk)
      }
      walk(frameDoc ?? nodeEntry)

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
      }, frameName ?? undefined)
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
  frameName?:     string
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
      const data = await res.json() as Record<string, unknown> & { frameName?: string; meta?: { frameName?: string } }

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
      const frameName = typeof data.frameName === 'string' && data.frameName
        ? data.frameName
        : typeof data.meta?.frameName === 'string' && data.meta.frameName
          ? data.meta.frameName
          : undefined
      onResolved(journeyId, flowId, screenId, { figma, contextPatches, frameName })
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

  const handleRESTResolved = useCallback((jId: string, fId: string, sId: string, figma: ScreenFigma, frameName?: string) => {
    store.updateScreen(jId, fId, sId, {
      figma,
      ...(frameName ? { name: frameName } : {}),
    })
    if (screen.context.components.length === 0 && figma.componentMap.length > 0) {
      store.updateScreenContext(jId, fId, sId, {
        components: figma.componentMap.map(m => m.codeComponent).filter(Boolean),
      })
    }
  }, [store, screen.context.components])

  const handleMCPResolved = useCallback((jId: string, fId: string, sId: string, result: MCPBindResult) => {
    store.updateScreen(jId, fId, sId, {
      figma: result.figma,
      ...(result.frameName ? { name: result.frameName } : {}),
    })
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
  color:   'green' | 'red' | 'slate'
  onClick: () => void
}) {
  const cls = active
    ? color === 'green'
      ? 'bg-green-50 text-green-700 border-green-300'
      : color === 'red'
      ? 'bg-red-50 text-red-700 border-red-300'
      : 'bg-slate-100 text-slate-600 border-slate-400'
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
