'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore, useProject } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils'
import {
  ChevronLeft, ChevronRight, X, Trash2,
  Database, GitBranch, Plus, Component, Layout,
} from 'lucide-react'

export function Ebar() {
  const store        = useStore()
  const project      = useProject()
  const router       = useRouter()
  const ebarOpen     = useStore(s => s.ebarOpen)
  const ebarSection  = useStore(s => s.ebarSection)
  const curProjectId = useStore(s => s.curProjectId)
  const selNodeId    = useStore(s => s.selNodeId)
  const selScreenId  = useStore(s => s.selScreenId)
  const view         = useStore(s => s.view)
  const curFlow      = useStore(s => s.curJourneyId ? s.canvas()?.curFlow[s.curJourneyId] : undefined)

  // expandedJourneys: set of journey IDs with open flows list
  // expandedFlows: set of flow IDs with open screens list
  const [expandedJ, setExpandedJ] = useState<Set<string>>(new Set())
  const [expandedF, setExpandedF] = useState<Set<string>>(new Set())

  const [ebarWidth, setEbarWidth] = useState(240)
  const isResizing = useRef(false)
  const startX     = useRef(0)
  const startW     = useRef(0)

  const MIN_W = 200
  const MAX_W = 480

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    startX.current = e.clientX
    startW.current = ebarWidth
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [ebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const next = Math.min(MAX_W, Math.max(MIN_W, startW.current + e.clientX - startX.current))
      setEbarWidth(next)
    }
    const onUp = () => {
      if (!isResizing.current) return
      isResizing.current             = false
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // Auto-expand journey + flow when navigating to micro view
  useEffect(() => {
    const s = useStore.getState()
    if (s.view !== 'micro' || !s.curJourneyId) return
    setExpandedJ(prev => new Set(prev).add(s.curJourneyId!))
    const flows = s.canvas()?.flows[s.curJourneyId] ?? []
    const curFlow = s.activeFlow()
    if (curFlow) setExpandedF(prev => new Set(prev).add(curFlow.id))
    else if (flows[0]) setExpandedF(prev => new Set(prev).add(flows[0].id))
  }, [view])

  const canvas = curProjectId ? store.canvasData[curProjectId] : null

  const toggleJ = useCallback((id: string) => {
    setExpandedJ(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }, [])

  const toggleF = useCallback((id: string) => {
    setExpandedF(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }, [])

  if (!ebarOpen) return null

  const dsNodes      = canvas?.nodes.filter(n => n.type === 'ds')      ?? []
  const journeyNodes = canvas?.nodes.filter(n => n.type === 'journey') ?? []
  const total        = canvas?.nodes.length ?? 0

  return (
    <aside
      className="relative bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-hidden panel-enter-left"
      style={{ width: ebarWidth }}
    >
      {/* ── Resize handle ── */}
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize z-10 group hover:bg-brand-blue/20 transition-colors"
      >
        <div className="absolute right-[1px] top-1/2 -translate-y-1/2 w-[2px] h-8 rounded-full bg-border group-hover:bg-brand-blue/60 transition-colors" />
      </div>

      {/* ── Project header ── */}
      <div className="px-[14px] pt-[11px] pb-[10px] border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-[9px]">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-[3px] text-[10.5px] text-text-3 hover:text-text-2 transition-colors group"
          >
            <ChevronLeft size={11} strokeWidth={2} className="group-hover:-translate-x-[1px] transition-transform" />
            All projects
          </button>
          <button
            onClick={() => store.toggleEbar()}
            className="w-[20px] h-[20px] rounded-[5px] flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg transition-all"
          >
            <X size={11} strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-[9px]">
          <div
            className="w-[24px] h-[24px] rounded-[6px] flex-shrink-0 shadow-sm"
            style={{ background: project?.color ?? '#18181A' }}
          />
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="text-[13px] font-semibold text-text-1 leading-tight truncate">
              {project?.name ?? '—'}
            </span>
            <span className="text-[10px] font-mono text-text-3">
              {total} node{total !== 1 ? 's' : ''} · {journeyNodes.length}j
            </span>
          </div>
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div className="flex border-b border-border flex-shrink-0 px-[10px]">
        {([
          { key: 'macro', label: 'Layers'     },
          { key: 'comp',  label: 'Components' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => store.toggleEbar(key)}
            className={cn(
              'px-[8px] py-[7px] text-[11.5px] font-medium transition-all border-b-[2px] -mb-px',
              ebarSection === key
                ? 'text-text-1 border-text-1'
                : 'text-text-3 border-transparent hover:text-text-2'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* Components placeholder */}
        {ebarSection === 'comp' && (
          <div className="flex flex-col items-center gap-[10px] px-[24px] py-[40px] text-center">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-bg border border-border flex items-center justify-center">
              <Component size={16} className="text-text-3" />
            </div>
            <p className="text-[11.5px] text-text-2 leading-[1.55]">
              Component browser<br />coming in Phase 3
            </p>
          </div>
        )}

        {/* Layers */}
        {ebarSection === 'macro' && (
          <>
            {total === 0 ? (
              <div className="flex flex-col items-center gap-[10px] px-[24px] py-[36px] text-center">
                <div className="w-[38px] h-[38px] rounded-[10px] bg-bg border border-border flex items-center justify-center">
                  <Plus size={16} className="text-text-3" />
                </div>
                <p className="text-[11.5px] text-text-2 leading-[1.55]">
                  No nodes yet.<br />
                  Use the{' '}
                  <kbd className="font-mono text-[10px] bg-bg border border-border rounded-[4px] px-[5px] py-[1px] text-text-1">+</kbd>{' '}
                  to add one.
                </p>
              </div>
            ) : (
              <div className="py-[6px]">

                {/* ── Design Systems ── */}
                {dsNodes.length > 0 && (
                  <div className="mb-[4px]">
                    <GroupLabel label="Styles & DS" count={dsNodes.length} />
                    {dsNodes.map(node => (
                      <LayerRow
                        key={node.id}
                        label={node.name}
                        meta={node.tags.length > 0 ? `${node.tags.length}` : undefined}
                        depth={0}
                        isSelected={selNodeId === node.id}
                        onSelect={() => store.selectNode(node.id)}
                        onDelete={() => store.deleteNode(node.id)}
                        icon={
                          <span className="w-[16px] h-[16px] rounded-[4px] bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center flex-shrink-0">
                            <Database size={8} className="text-brand-purple" />
                          </span>
                        }
                      />
                    ))}
                  </div>
                )}

                {/* ── Journeys ── */}
                {journeyNodes.length > 0 && (
                  <div>
                    <GroupLabel label="Journeys" count={journeyNodes.length} />
                    {journeyNodes.map(node => {
                      const jExpanded   = expandedJ.has(node.id)
                      const flows       = canvas?.flows[node.id] ?? []
                      const screenCount = flows.reduce((a, f) => a + f.screens.length, 0)
                      const isJSel      = selNodeId === node.id

                      return (
                        <div key={node.id}>

                          {/* Journey row — single click selects, double click enters micro view */}
                          <LayerRow
                            label={node.name}
                            meta={flows.length > 0 ? `${flows.length}f · ${screenCount}s` : undefined}
                            depth={0}
                            isSelected={isJSel}
                            onSelect={() => store.selectNode(node.id)}
                            onDelete={() => store.deleteNode(node.id)}
                            expandable
                            isExpanded={jExpanded}
                            onToggleExpand={e => { e.stopPropagation(); toggleJ(node.id) }}
                            onDoubleClick={() => {
                              store.openJourney(node.id)
                              // Auto-open first flow
                              const f = canvas?.flows[node.id]?.[0]
                              if (f) {
                                store.setActiveFlow(node.id, f.id)
                                setExpandedF(prev => new Set(prev).add(f.id))
                              }
                              setExpandedJ(prev => new Set(prev).add(node.id))
                            }}
                            icon={
                              <span className="w-[16px] h-[16px] rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0">
                                <GitBranch size={8} className="text-brand-blue" />
                              </span>
                            }
                          />

                          {/* Flows list */}
                          {jExpanded && (
                            <div className="pb-[2px]">
                              {flows.length === 0 ? (
                                <p className="pl-[46px] py-[4px] text-[10.5px] text-text-3 italic">no flows</p>
                              ) : (
                                flows.map(flow => {
                                  const fExpanded = expandedF.has(flow.id)
                                  const isActiveFl = curFlow === flow.id && view === 'micro' && selNodeId === node.id

                                  return (
                                    <div key={flow.id}>

                                      {/* Flow row */}
                                      <div className="flex items-center group">
                                        {/* expand toggle */}
                                        <button
                                          onClick={() => toggleF(flow.id)}
                                          className="flex-shrink-0 w-[28px] flex items-center justify-end pr-[2px] text-text-3 hover:text-text-1 transition-colors"
                                        >
                                          <ChevronRight
                                            size={9}
                                            strokeWidth={2.5}
                                            className={cn('transition-transform duration-150', fExpanded && 'rotate-90')}
                                          />
                                        </button>

                                        <button
                                          onClick={() => {
                                            store.openJourney(node.id)
                                            store.setActiveFlow(node.id, flow.id)
                                          }}
                                          className={cn(
                                            'flex-1 flex items-center gap-[6px] pr-[10px] py-[4px] min-w-0 transition-colors',
                                            isActiveFl ? 'text-text-1' : 'text-text-2 hover:text-text-1'
                                          )}
                                        >
                                          <div className="w-[1px] h-[12px] bg-border flex-shrink-0" />
                                          <div className={cn(
                                            'w-[4px] h-[4px] rounded-full flex-shrink-0 transition-colors',
                                            isActiveFl ? 'bg-brand-blue' : 'bg-border-strong'
                                          )} />
                                          <span className="text-[11.5px] flex-1 truncate text-left font-medium">
                                            {flow.name}
                                          </span>
                                          <span className="text-[10px] font-mono text-text-3 flex-shrink-0 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                                            {flow.screens.length}s
                                          </span>
                                        </button>
                                      </div>

                                      {/* Screens list */}
                                      {fExpanded && flow.screens.length > 0 && (
                                        <div className="pb-[2px]">
                                          {flow.screens.map(screen => (
                                            <button
                                              key={screen.id}
                                              onClick={() => {
                                                store.openJourney(node.id)
                                                store.setActiveFlow(node.id, flow.id)
                                                store.selectScreen(screen.id)
                                              }}
                                              className={cn(
                                                'w-full flex items-center gap-[6px] pl-[44px] pr-[10px] py-[3px] group/s transition-colors',
                                                selScreenId === screen.id
                                                  ? 'bg-brand-blue/8 text-brand-blue'
                                                  : 'hover:bg-bg text-text-3 hover:text-text-2'
                                              )}
                                            >
                                              <div className="w-[1px] h-[11px] bg-border flex-shrink-0" />
                                              <span className="w-[14px] h-[14px] rounded-[3px] bg-bg border border-border flex items-center justify-center flex-shrink-0">
                                                <Layout size={7} className="text-text-3" />
                                              </span>
                                              <span className="text-[11px] flex-1 truncate text-left">
                                                {screen.name}
                                              </span>
                                              {screen.isEntry && (
                                                <span className="text-[8.5px] font-mono text-brand-blue bg-brand-blue/10 px-[4px] py-[1px] rounded-[3px] flex-shrink-0">
                                                  entry
                                                </span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-[8px] px-[14px] pt-[4px] pb-[3px]">
      <span className="text-[9.5px] font-semibold uppercase tracking-[.08em] text-text-3 font-mono whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[9.5px] font-mono text-text-3 tabular-nums">{count}</span>
    </div>
  )
}

interface LayerRowProps {
  label:           string
  meta?:           string
  icon:            React.ReactNode
  depth:           number
  isSelected:      boolean
  onSelect:        () => void
  onDelete:        () => void
  onDoubleClick?:  () => void
  expandable?:     boolean
  isExpanded?:     boolean
  onToggleExpand?: (e: React.MouseEvent) => void
}

function LayerRow({
  label, meta, icon, isSelected,
  onSelect, onDelete, onDoubleClick,
  expandable, isExpanded, onToggleExpand,
}: LayerRowProps) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={cn(
        'flex items-center gap-[5px] mx-[6px] px-[7px] py-[4px] rounded-[7px] cursor-pointer group transition-colors',
        isSelected ? 'bg-text-1' : 'hover:bg-bg',
      )}
    >
      {expandable ? (
        <button
          onClick={onToggleExpand}
          className={cn(
            'w-[14px] h-[14px] flex items-center justify-center flex-shrink-0 rounded-[3px] transition-colors',
            isSelected ? 'text-white/50 hover:text-white' : 'text-text-3 hover:text-text-1'
          )}
        >
          <ChevronRight size={10} strokeWidth={2.5} className={cn('transition-transform duration-150', isExpanded && 'rotate-90')} />
        </button>
      ) : (
        <div className="w-[14px] flex-shrink-0" />
      )}

      {icon}

      <span className={cn('text-[12px] font-medium flex-1 truncate leading-none', isSelected ? 'text-white' : 'text-text-1')}>
        {label}
      </span>

      {meta && !isSelected && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-text-3 tabular-nums flex-shrink-0">
          {meta}
        </span>
      )}

      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className={cn(
          'w-[16px] h-[16px] rounded-[4px] flex items-center justify-center flex-shrink-0 transition-all opacity-0 group-hover:opacity-100',
          isSelected
            ? 'text-white/50 hover:text-white hover:bg-white/10'
            : 'text-text-3 hover:text-brand-red hover:bg-[#FEF2F2]'
        )}
      >
        <Trash2 size={9} strokeWidth={2} />
      </button>
    </div>
  )
}
