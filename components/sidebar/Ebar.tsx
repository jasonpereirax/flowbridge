'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore, useProject } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils'
import { ChevronRight, Trash2, GitBranch, Layers, Database, Plus, Settings } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type EbarFilter = 'all' | 'journeys' | 'styles'

export function Ebar() {
  const store        = useStore()
  const project      = useProject()
  const router       = useRouter()
  const curProjectId = useStore(s => s.curProjectId)
  const selNodeId    = useStore(s => s.selNodeId)
  const view         = useStore(s => s.view)
  const curJourneyId = useStore(s => s.curJourneyId)

  const [filter,    setFilter]    = useState<EbarFilter>('all')
  const [jExp,      setJExp]      = useState<Set<string>>(new Set())
  const [fExp,      setFExp]      = useState<Set<string>>(new Set())
  const [dsExp,     setDsExp]     = useState<Set<string>>(new Set())

  const canvas = curProjectId ? store.canvasData[curProjectId] : null

  // ── Auto-expand when a node is selected on the canvas ──────────────────────
  useEffect(() => {
    if (!selNodeId || !curProjectId) return
    const nodes = store.canvasData[curProjectId]?.nodes ?? []
    const node  = nodes.find(n => n.id === selNodeId)
    if (!node) return
    if (node.type === 'journey') {
      setJExp(prev => { const n = new Set(prev); n.add(selNodeId); return n })
      // scroll the filter to show journeys
      setFilter(f => f === 'styles' ? 'all' : f)
    } else {
      setDsExp(prev => { const n = new Set(prev); n.add(selNodeId); return n })
      setFilter(f => f === 'journeys' ? 'all' : f)
    }
  }, [selNodeId, curProjectId, store.canvasData])

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleJ  = useCallback((id: string) => setJExp(prev  => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n }), [])
  const toggleF  = useCallback((id: string) => setFExp(prev  => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n }), [])
  const toggleDs = useCallback((id: string) => setDsExp(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n }), [])

  // ── Open flow from Ebar ─────────────────────────────────────────────────────
  const openFlow = useCallback((journeyId: string, flowId: string) => {
    store.openJourney(journeyId)
    store.setActiveFlow(journeyId, flowId)
    setJExp(prev => { const n = new Set(prev); n.add(journeyId); return n })
  }, [store])

  const dsNodes      = canvas?.nodes.filter(n => n.type === 'ds')      ?? []
  const journeyNodes = canvas?.nodes.filter(n => n.type === 'journey') ?? []
  const totalNodes   = canvas?.nodes.length ?? 0

  const showJ = filter === 'all' || filter === 'journeys'
  const showS = filter === 'all' || filter === 'styles'

  return (
    <aside className="w-[240px] bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-hidden">

      {/* ── Logo + project header ── */}
      <div className="flex items-center gap-[10px] px-[12px] h-[46px] border-b border-border flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          title="Flowbridge"
          className="w-[26px] h-[26px] bg-text-1 rounded-[6px] flex items-center justify-center flex-shrink-0 hover:bg-neutral-700 active:scale-95 transition-all"
        >
          <span className="text-white font-serif italic text-[13px] leading-none">F</span>
        </button>

        <div className="flex flex-col gap-[1px] flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-text-1 leading-tight truncate">
            {project?.name ?? '—'}
          </span>
          <span className="text-[10px] font-mono text-text-3">
            {totalNodes} nodes · {journeyNodes.length}j · {dsNodes.length} libs
          </span>
        </div>

        <button
          title="Project settings"
          className="w-[24px] h-[24px] rounded-[5px] flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg transition-all flex-shrink-0"
        >
          <Settings size={12} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Filter bar: All / Journeys / Styles ── */}
      <div className="flex items-center gap-[2px] px-[8px] py-[6px] border-b border-border flex-shrink-0">
        {([
          { key: 'all',      label: 'All',      icon: null },
          { key: 'journeys', label: 'Journeys', icon: <GitBranch size={11} strokeWidth={2} /> },
          { key: 'styles',   label: 'Styles',   icon: <Layers    size={11} strokeWidth={2} /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-[5px] px-[8px] py-[4px] rounded-[6px] text-[11.5px] font-medium transition-all',
              filter === key
                ? 'bg-bg text-text-1 shadow-[inset_0_0_0_1px_var(--border)]'
                : 'text-text-3 hover:bg-bg hover:text-text-2',
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-[8px]">

        {totalNodes === 0 ? (
          <div className="flex flex-col items-center gap-[10px] px-[24px] py-[36px] text-center">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-bg border border-border flex items-center justify-center">
              <Plus size={16} className="text-text-3" />
            </div>
            <p className="text-[11.5px] text-text-2 leading-[1.55]">
              No nodes yet.<br />Use o <kbd className="font-mono text-[10px] bg-bg border border-border rounded-[4px] px-[5px] py-[1px] text-text-1">+</kbd> para adicionar.
            </p>
          </div>
        ) : (
          <>
            {/* ── Journeys section ── */}
            {showJ && (
              <>
                {filter === 'all' && <GroupLabel label="Journeys" count={journeyNodes.length} />}
                {journeyNodes.map(node => {
                  const flows      = canvas?.flows[node.id] ?? []
                  const screenCount = flows.reduce((a, f) => a + f.screens.length, 0)
                  const isOpen     = jExp.has(node.id)
                  const activeFlowId = canvas?.curFlow[node.id]

                  return (
                    <div key={node.id} className="card-block mx-[6px] mb-[4px] rounded-[8px] border border-border overflow-hidden">
                      {/* Journey row */}
                      <div
                        className="flex items-center gap-[7px] px-[10px] py-[7px] cursor-pointer hover:bg-bg transition-colors"
                        onClick={() => toggleJ(node.id)}
                        onDoubleClick={e => { e.stopPropagation(); store.openJourney(node.id) }}
                      >
                        <span className={cn('flex items-center text-text-3 transition-transform duration-150 flex-shrink-0', isOpen && 'rotate-90')}>
                          <ChevronRight size={10} strokeWidth={2.5} />
                        </span>
                        <span className="w-[16px] h-[16px] rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0">
                          <GitBranch size={8} className="text-brand-blue" />
                        </span>
                        <span className="text-[12px] font-semibold text-text-1 flex-1 truncate min-w-0">
                          {node.name}
                        </span>
                        <span className="text-[10px] font-mono text-text-3 flex-shrink-0 tabular-nums">
                          {flows.length}f · {screenCount}s
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); store.deleteNode(node.id) }}
                          className="w-[16px] h-[16px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] opacity-0 group-hover:opacity-100 transition-all card-del"
                        >
                          <Trash2 size={9} strokeWidth={2} />
                        </button>
                      </div>

                      {/* Flows */}
                      {isOpen && (
                        <div className="border-t border-border bg-bg pb-[6px]">
                          {flows.length === 0 ? (
                            <p className="px-[14px] py-[4px] text-[10.5px] text-text-3 italic">no flows yet</p>
                          ) : (
                            flows.map(flow => {
                              const isActiveFlow = view === 'micro' && curJourneyId === node.id && activeFlowId === flow.id
                              const isFlowOpen   = fExp.has(flow.id)

                              return (
                                <div key={flow.id} className="flow-card mx-[8px] mt-[3px] rounded-[6px] border border-border overflow-hidden">
                                  {/* Flow row */}
                                  <div
                                    className={cn(
                                      'flex items-center gap-[7px] px-[8px] py-[5px] cursor-pointer transition-colors',
                                      isActiveFlow ? 'bg-[#EFF6FF]' : 'hover:bg-surface',
                                    )}
                                    onClick={() => { openFlow(node.id, flow.id); toggleF(flow.id) }}
                                    onDoubleClick={e => { e.stopPropagation(); openFlow(node.id, flow.id) }}
                                  >
                                    <span className={cn('flex items-center flex-shrink-0 transition-transform duration-150', isFlowOpen && 'rotate-90', isActiveFlow ? 'text-brand-blue' : 'text-text-3')}>
                                      <ChevronRight size={10} strokeWidth={2.5} />
                                    </span>
                                    <div className={cn(
                                      'w-[7px] h-[7px] rounded-full border-[1.5px] flex-shrink-0 transition-all',
                                      isActiveFlow ? 'bg-brand-blue border-brand-blue' : 'bg-white border-border-strong',
                                    )} />
                                    <span className={cn('text-[11.5px] font-medium flex-1 truncate min-w-0 transition-colors', isActiveFlow ? 'text-brand-blue' : 'text-text-2')}>
                                      {flow.name}
                                    </span>
                                    <span className={cn('text-[10px] font-mono flex-shrink-0 tabular-nums', isActiveFlow ? 'text-brand-blue/60' : 'text-text-3')}>
                                      {flow.screens.length}
                                    </span>
                                    <button
                                      onClick={e => { e.stopPropagation(); store.deleteFlow(node.id, flow.id) }}
                                      className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] opacity-0 flow-del transition-all"
                                    >
                                      <Trash2 size={8} strokeWidth={2} />
                                    </button>
                                  </div>

                                  {/* Screens */}
                                  {isFlowOpen && flow.screens.length > 0 && (
                                    <div className="border-t border-border bg-surface py-[3px]">
                                      {flow.screens.map(screen => (
                                        <div
                                          key={screen.id}
                                          className="flex items-center gap-[7px] px-[8px] py-[3px] cursor-pointer hover:bg-bg transition-colors group/screen"
                                          onClick={() => { openFlow(node.id, flow.id); store.selectScreen(screen.id) }}
                                          onDoubleClick={e => { e.stopPropagation(); openFlow(node.id, flow.id); store.selectScreen(screen.id) }}
                                        >
                                          <div className="w-[5px] h-[5px] rounded-[1.5px] bg-brand-blue opacity-25 flex-shrink-0 group-hover/screen:opacity-70 transition-opacity" />
                                          <span className="text-[11px] text-text-2 flex-1 truncate min-w-0 group-hover/screen:text-text-1 transition-colors">
                                            {screen.name}
                                          </span>
                                          <button
                                            onClick={e => { e.stopPropagation(); store.deleteScreen(node.id, flow.id, screen.id) }}
                                            className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] opacity-0 group-hover/screen:opacity-100 transition-all"
                                          >
                                            <Trash2 size={8} strokeWidth={2} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                          <button className="w-full flex items-center gap-[6px] px-[14px] py-[4px] text-[11px] text-text-3 hover:text-text-2 hover:bg-bg transition-all opacity-0 hover:opacity-100 add-flow-hint">
                            + add flow
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {showJ && showS && <div className="h-[8px]" />}

            {/* ── Styles & DS section ── */}
            {showS && (
              <>
                {filter === 'all' && <GroupLabel label="Styles & DS" count={dsNodes.length} />}
                {dsNodes.map(node => {
                  const isOpen = dsExp.has(node.id)

                  return (
                    <div key={node.id} className="card-block mx-[6px] mb-[4px] rounded-[8px] border border-border overflow-hidden">
                      {/* DS row */}
                      <div
                        className="flex items-center gap-[7px] px-[10px] py-[7px] cursor-pointer hover:bg-bg transition-colors"
                        onClick={() => toggleDs(node.id)}
                        onDoubleClick={e => { e.stopPropagation(); store.selectNode(node.id) }}
                      >
                        <span className={cn('flex items-center text-text-3 transition-transform duration-150 flex-shrink-0', isOpen && 'rotate-90')}>
                          <ChevronRight size={10} strokeWidth={2.5} />
                        </span>
                        <span className="w-[16px] h-[16px] rounded-[4px] bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center flex-shrink-0">
                          <Database size={8} className="text-brand-purple" />
                        </span>
                        <span className="text-[12px] font-semibold text-text-1 flex-1 truncate min-w-0">
                          {node.name}
                        </span>
                        <span className="text-[10px] font-mono text-text-3 flex-shrink-0 tabular-nums">
                          {node.tags.length}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); store.deleteNode(node.id) }}
                          className="w-[16px] h-[16px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] opacity-0 card-del transition-all"
                        >
                          <Trash2 size={9} strokeWidth={2} />
                        </button>
                      </div>

                      {/* Components */}
                      {isOpen && node.tags.length > 0 && (
                        <div className="border-t border-border bg-bg py-[3px]">
                          {node.tags.map(tag => (
                            <div key={tag} className="flex items-center gap-[8px] px-[10px] py-[4px] cursor-pointer hover:bg-surface transition-colors group/comp">
                              <div className="w-[6px] h-[6px] rounded-[2px] bg-brand-purple opacity-40 flex-shrink-0 group-hover/comp:opacity-80 transition-opacity" />
                              <span className="text-[11.5px] text-text-2 flex-1 group-hover/comp:text-text-1 transition-colors">
                                {tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {filter !== 'all' && (
                  <div className="flex flex-col items-center gap-[8px] mx-[6px] mt-[4px] px-[16px] py-[20px] text-center border border-dashed border-border rounded-[8px]">
                    <span className="text-[18px]">🎨</span>
                    <p className="text-[11px] text-text-3 leading-[1.55]">
                      Tokens, cores e tipografia<br />chegam na Phase 3
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-[12px] py-[8px] border-t border-border flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-[4px] text-[10.5px] text-text-3 hover:text-text-2 transition-colors"
        >
          <ChevronRight size={10} strokeWidth={2} className="rotate-180" />
          All projects
        </button>
      </div>

    </aside>
  )
}

// ─── GroupLabel ───────────────────────────────────────────────────────────────
function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-[8px] px-[14px] pb-[4px]">
      <span className="text-[9.5px] font-semibold uppercase tracking-[.08em] text-text-3 font-mono whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[9.5px] font-mono text-text-3 tabular-nums">{count}</span>
    </div>
  )
}
