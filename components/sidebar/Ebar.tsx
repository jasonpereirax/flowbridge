'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils'
import { makeFlow, makeScreen } from '@/utils'
import {
  ChevronRight, ChevronLeft, Trash2, GitBranch,
  Layers, Database, Plus, Settings,
} from 'lucide-react'

type EbarFilter = 'all' | 'journeys' | 'styles'

const STATUS_DOT: Record<string, string> = {
  draft:         'bg-neutral-300',
  'in-progress': 'bg-yellow-400',
  ready:         'bg-green-400',
  generated:     'bg-brand-blue',
}

// ─────────────────────────────────────────────────────────────────────────────

export function Ebar() {
  const store        = useStore()
  const router       = useRouter()
  const curProjectId = useStore(s => s.curProjectId)
  const selNodeId    = useStore(s => s.selNodeId)
  const view         = useStore(s => s.view)
  const curJourneyId = useStore(s => s.curJourneyId)

  const canvas  = curProjectId ? store.canvasData[curProjectId] : null
  const project = store.projects.find(p => p.id === curProjectId)

  const [filter, setFilter] = useState<EbarFilter>('all')
  const [jExp,   setJExp]   = useState<Set<string>>(new Set())
  const [fExp,   setFExp]   = useState<Set<string>>(new Set())
  const [dsExp,  setDsExp]  = useState<Set<string>>(new Set())

  // ── Resizable sidebar ─────────────────────────────────────────────────────
  const [ebarWidth, setEbarWidth] = useState(240)
  const isResizing = useRef(false)
  const rStartX    = useRef(0)
  const rStartW    = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    rStartX.current    = e.clientX
    rStartW.current    = ebarWidth
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [ebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      setEbarWidth(Math.min(480, Math.max(200, rStartW.current + e.clientX - rStartX.current)))
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

  const dsNodes      = canvas?.nodes.filter(n => n.type === 'ds')      ?? []
  const journeyNodes = canvas?.nodes.filter(n => n.type === 'journey') ?? []
  const totalNodes   = canvas?.nodes.length ?? 0

  // ── Expand helpers ─────────────────────────────────────────────────────────
  const toggleJ  = (id: string) => setJExp(p  => flipSet(p, id))
  const toggleF  = (id: string) => setFExp(p  => flipSet(p, id))
  const toggleDs = (id: string) => setDsExp(p => flipSet(p, id))

  function flipSet(prev: Set<string>, id: string) {
    const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) } return n
  }

  // ── Auto-expand when canvas node selected ─────────────────────────────────
  useEffect(() => {
    if (!selNodeId) return
    const node = canvas?.nodes.find(n => n.id === selNodeId)
    if (!node) return
    if (node.type === 'journey') {
      setJExp(p => { const n = new Set(p); n.add(selNodeId); return n })
      setFilter(f => f === 'styles'   ? 'all' : f)
    } else {
      setDsExp(p => { const n = new Set(p); n.add(selNodeId); return n })
      setFilter(f => f === 'journeys' ? 'all' : f)
    }
  }, [selNodeId]) // eslint-disable-line

  // ── Open flow (enter micro view) ───────────────────────────────────────────
  const openFlow = useCallback((journeyId: string, flowId: string) => {
    store.setActiveFlow(journeyId, flowId)
    store.selectFlow(flowId)
    setJExp(p => { const n = new Set(p); n.add(journeyId); return n })
    setFExp(p => { const n = new Set(p); n.add(flowId);    return n })
  }, [store])

  // ── Add flow ───────────────────────────────────────────────────────────────
  const addFlow = useCallback((journeyId: string) => {
    if (!curProjectId) return
    const existing = canvas?.flows[journeyId] ?? []
    const flow = makeFlow({ journeyId, projectId: curProjectId, name: `Flow ${existing.length + 1}`, order: existing.length })
    store.addFlow(journeyId, flow)
    // Expand the journey to show the new flow
    setJExp(p => { const n = new Set(p); n.add(journeyId); return n })
  }, [store, curProjectId, canvas])

  // ── Add screen ─────────────────────────────────────────────────────────────
  const addScreen = useCallback((journeyId: string, flowId: string) => {
    if (!curProjectId) return
    const flow   = (canvas?.flows[journeyId] ?? []).find(f => f.id === flowId)
    const count  = flow?.screens.length ?? 0
    const screen = makeScreen({ flowId, projectId: curProjectId, name: `Screen ${count + 1}`, position: { x: 160 + count * 220, y: 160 }, order: count })
    store.addScreen(journeyId, flowId, screen)
    setFExp(p => { const n = new Set(p); n.add(flowId); return n })
    if (view === 'micro' && curJourneyId === journeyId) {
      store.setActiveFlow(journeyId, flowId)
      store.selectScreen(screen.id)
    }
  }, [store, curProjectId, canvas, view, curJourneyId])

  const showJ = filter === 'all' || filter === 'journeys'
  const showS = filter === 'all' || filter === 'styles'

  return (
    <aside
      className="relative bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-hidden"
      style={{ width: ebarWidth }}>
      <div onMouseDown={onResizeStart} className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize z-10 group hover:bg-brand-blue/20 transition-colors"><div className="absolute right-[1px] top-1/2 -translate-y-1/2 w-[2px] h-8 rounded-full bg-border group-hover:bg-brand-blue/60 transition-colors" /></div>

      {/* ── Project header ── */}
      <div className="flex items-center gap-[10px] px-[12px] h-[46px] border-b border-border flex-shrink-0">
        <div className="flex flex-col gap-[1px] flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-text-1 leading-tight truncate">{project?.name ?? '—'}</span>
          <span className="text-[10px] font-mono text-text-3">{totalNodes} nodes · {journeyNodes.length}j · {dsNodes.length} libs</span>
        </div>
        <button title="Project settings"
          className="w-[24px] h-[24px] rounded-[5px] flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg transition-all flex-shrink-0">
          <Settings size={12} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-[2px] px-[8px] py-[6px] border-b border-border flex-shrink-0">
        {(['all', 'journeys', 'styles'] as EbarFilter[]).map(key => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-[4px] px-[8px] py-[4px] rounded-[6px] text-[11.5px] font-medium transition-all',
              filter === key ? 'bg-bg text-text-1 shadow-[inset_0_0_0_1px_var(--border)]' : 'text-text-3 hover:bg-bg hover:text-text-2',
            )}>
            {key === 'journeys' && <GitBranch size={10} strokeWidth={2} />}
            {key === 'styles'   && <Layers    size={10} strokeWidth={2} />}
            {key === 'all' ? 'All' : key === 'journeys' ? 'Journeys' : 'Styles'}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-[8px]">
        {totalNodes === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ──── Journeys ──── */}
            {showJ && (
              <>
                {filter === 'all' && <GroupLabel label="Journeys" count={journeyNodes.length} />}
                {journeyNodes.map(node => {
                  const flows       = canvas?.flows[node.id] ?? []
                  const screenCount = flows.reduce((a, f) => a + f.screens.length, 0)
                  const isJOpen     = jExp.has(node.id)
                  const activeFid   = canvas?.curFlow[node.id]

                  return (
                    <div key={node.id} className="ebar-jcard mx-[6px] mb-[4px] rounded-[8px] border border-border overflow-hidden">

                      {/* Journey row */}
                      <div
                        className="flex items-center gap-[7px] px-[10px] py-[7px] cursor-pointer hover:bg-bg transition-colors group/jrow"
                        onClick={() => { store.openJourney(node.id); setJExp(p => { const n = new Set(p); n.add(node.id); return n }) }}
                      >
                        <div
                          onClick={e => { e.stopPropagation(); toggleJ(node.id) }}
                          className="flex-shrink-0 p-[2px] rounded hover:bg-border transition-colors"
                        >
                          <Chevron open={isJOpen} />
                        </div>
                        <span className="w-[16px] h-[16px] rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0">
                          <GitBranch size={8} className="text-brand-blue" />
                        </span>
                        <InlineEdit
                          value={node.name}
                          onSave={name => store.updateNode(node.id, { name })}
                          className="text-[12px] font-semibold text-text-1 flex-1 min-w-0"
                        />
                        {node.status && (
                          <div className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', STATUS_DOT[node.status] ?? 'bg-border-strong')} title={node.status} />
                        )}
                        <span className="text-[10px] font-mono text-text-3 tabular-nums opacity-0 group-hover/jrow:opacity-100 transition-opacity flex-shrink-0">
                          {flows.length}f·{screenCount}s
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); store.deleteNode(node.id) }}
                          title="Delete journey"
                          className="ebar-del w-[16px] h-[16px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] transition-all"
                        >
                          <Trash2 size={9} strokeWidth={2} />
                        </button>
                      </div>

                      {/* Flows */}
                      {isJOpen && (
                        <div className="border-t border-border bg-bg pb-[2px]">
                          {flows.length === 0 && (
                            <p className="px-[14px] py-[5px] text-[10.5px] text-text-3 italic">no flows yet</p>
                          )}

                          {flows.map(flow => {
                            const isFOpen     = fExp.has(flow.id)
                            const isActiveFl  = view === 'micro' && curJourneyId === node.id && activeFid === flow.id

                            return (
                              <div key={flow.id} className="ebar-fcard mx-[8px] mt-[3px] rounded-[6px] border border-border overflow-hidden">

                                {/* Flow row */}
                                <div
                                  className={cn(
                                    'flex items-center gap-[7px] px-[8px] py-[5px] cursor-pointer transition-colors group/frow',
                                    isActiveFl ? 'bg-[#EFF6FF]' : 'hover:bg-surface',
                                  )}
                                  onClick={() => openFlow(node.id, flow.id)}
                                >
                                  <button
                                    onClick={e => { e.stopPropagation(); toggleF(flow.id) }}
                                    className="flex-shrink-0 p-[1px] rounded-[3px] hover:bg-border transition-colors"
                                  >
                                    <Chevron open={isFOpen} active={isActiveFl} />
                                  </button>
                                  <div className={cn('w-[7px] h-[7px] rounded-full border-[1.5px] flex-shrink-0 transition-all', isActiveFl ? 'bg-brand-blue border-brand-blue' : 'bg-white border-border-strong')} />
                                  <InlineEdit
                                    value={flow.name}
                                    onSave={name => store.updateFlow(node.id, flow.id, { name })}
                                    className={cn('text-[11.5px] font-medium flex-1 min-w-0', isActiveFl ? 'text-brand-blue' : 'text-text-2')}
                                  />
                                  <span className={cn('text-[10px] font-mono tabular-nums flex-shrink-0 opacity-0 group-hover/frow:opacity-100 transition-opacity', isActiveFl ? 'text-brand-blue/60' : 'text-text-3')}>
                                    {flow.screens.length}s
                                  </span>
                                  {/* Add screen */}
                                  <button
                                    onClick={e => { e.stopPropagation(); addScreen(node.id, flow.id) }}
                                    title="Add screen"
                                    className="ebar-fcard-act w-[14px] h-[14px] rounded-[3px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-blue hover:bg-[#EFF6FF] transition-all"
                                  >
                                    <Plus size={8} strokeWidth={2.5} />
                                  </button>
                                  {/* Delete flow */}
                                  <button
                                    onClick={e => { e.stopPropagation(); store.deleteFlow(node.id, flow.id) }}
                                    title="Delete flow"
                                    className="ebar-fcard-act w-[14px] h-[14px] rounded-[3px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] transition-all"
                                  >
                                    <Trash2 size={8} strokeWidth={2} />
                                  </button>
                                </div>

                                {/* Screens */}
                                {isFOpen && (
                                  <div className="border-t border-border bg-surface py-[2px]">
                                    {flow.screens.length === 0 && (
                                      <p className="px-[12px] py-[3px] text-[10.5px] text-text-3 italic">no screens</p>
                                    )}
                                    {flow.screens.map(screen => (
                                      <div
                                        key={screen.id}
                                        className="flex items-center gap-[7px] px-[8px] py-[3px] cursor-pointer hover:bg-bg transition-colors group/srow"
                                        onClick={() => { openFlow(node.id, flow.id); store.selectScreen(screen.id) }}
                                      >
                                        <div className="w-[5px] h-[5px] rounded-[1.5px] bg-brand-blue opacity-25 flex-shrink-0 group-hover/srow:opacity-70 transition-opacity" />
                                        <InlineEdit
                                          value={screen.name}
                                          onSave={name => store.updateScreen(node.id, flow.id, screen.id, { name })}
                                          className="text-[11px] text-text-2 flex-1 min-w-0 group-hover/srow:text-text-1 transition-colors"
                                        />
                                        {screen.status && screen.status !== 'empty' && (
                                          <span className={cn(
                                            'text-[8.5px] font-mono px-[4px] py-[0.5px] rounded-full flex-shrink-0 border',
                                            screen.status === 'ready'     ? 'bg-green-50 text-green-600 border-green-200' :
                                            screen.status === 'generated' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            'bg-yellow-50 text-yellow-600 border-yellow-200'
                                          )}>
                                            {screen.status}
                                          </span>
                                        )}
                                        <button
                                          onClick={e => { e.stopPropagation(); store.deleteScreen(node.id, flow.id, screen.id) }}
                                          title="Delete screen"
                                          className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] opacity-0 group-hover/srow:opacity-100 transition-all"
                                        >
                                          <Trash2 size={8} strokeWidth={2} />
                                        </button>
                                      </div>
                                    ))}
                                    {/* Add screen button */}
                                    <button
                                      onClick={() => addScreen(node.id, flow.id)}
                                      className="w-full flex items-center gap-[5px] px-[10px] py-[4px] text-[10.5px] text-text-3 hover:text-brand-blue hover:bg-[#EFF6FF] transition-all"
                                    >
                                      <Plus size={9} strokeWidth={2.5} />
                                      Add screen
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Add flow button — always visible inside open journey */}
                          <button
                            onClick={() => addFlow(node.id)}
                            className="w-full flex items-center gap-[5px] px-[12px] py-[5px] mt-[1px] text-[11px] text-text-3 hover:text-brand-blue hover:bg-[#EFF6FF] transition-all"
                          >
                            <Plus size={9} strokeWidth={2.5} />
                            Add flow
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {showJ && showS && <div className="h-[8px]" />}

            {/* ──── Styles & DS ──── */}
            {showS && (
              <>
                {filter === 'all' && <GroupLabel label="Styles & DS" count={dsNodes.length} />}
                {dsNodes.map(node => {
                  const isDsOpen = dsExp.has(node.id)
                  return (
                    <div key={node.id} className="ebar-jcard mx-[6px] mb-[4px] rounded-[8px] border border-border overflow-hidden">
                      <div
                        className="flex items-center gap-[7px] px-[10px] py-[7px] cursor-pointer hover:bg-bg transition-colors group/dsrow"
                        onClick={() => toggleDs(node.id)}
                        onDoubleClick={e => { e.stopPropagation(); store.selectNode(node.id) }}
                      >
                        <Chevron open={isDsOpen} />
                        <span className="w-[16px] h-[16px] rounded-[4px] bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center flex-shrink-0">
                          <Database size={8} className="text-brand-purple" />
                        </span>
                        <InlineEdit
                          value={node.name}
                          onSave={name => store.updateNode(node.id, { name })}
                          className="text-[12px] font-semibold text-text-1 flex-1 min-w-0"
                        />
                        <span className="text-[10px] font-mono text-text-3 tabular-nums flex-shrink-0 opacity-0 group-hover/dsrow:opacity-100 transition-opacity">
                          {node.tags.length}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); store.deleteNode(node.id) }}
                          title="Delete DS"
                          className="ebar-del w-[16px] h-[16px] rounded-[4px] flex items-center justify-center flex-shrink-0 text-text-3 hover:text-brand-red hover:bg-[#FEF2F2] transition-all"
                        >
                          <Trash2 size={9} strokeWidth={2} />
                        </button>
                      </div>

                      {isDsOpen && (
                        <div className="border-t border-border bg-bg py-[3px]">
                          {node.tags.length === 0 ? (
                            <p className="px-[12px] py-[4px] text-[10.5px] text-text-3 italic">no components yet</p>
                          ) : (
                            node.tags.map(tag => (
                              <div key={tag} className="flex items-center gap-[8px] px-[10px] py-[4px] cursor-pointer hover:bg-surface transition-colors group/comp"
                                onClick={() => store.selectNode(node.id)}>
                                <div className="w-[6px] h-[6px] rounded-[2px] bg-brand-purple opacity-40 flex-shrink-0 group-hover/comp:opacity-80 transition-opacity" />
                                <span className="text-[11.5px] text-text-2 flex-1 group-hover/comp:text-text-1 transition-colors">{tag}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {filter !== 'all' && (
                  <div className="flex flex-col items-center gap-[8px] mx-[6px] mt-[4px] px-[16px] py-[20px] text-center border border-dashed border-border rounded-[8px]">
                    <span className="text-[18px]">??</span>
                    <p className="text-[11px] text-text-3 leading-[1.55]">Tokens, cores e tipografia<br />chegam na Phase 3</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-[12px] py-[8px] border-t border-border flex-shrink-0">
        <button onClick={() => router.push('/')}
          className="flex items-center gap-[4px] text-[10.5px] text-text-3 hover:text-text-2 transition-colors">
          <ChevronLeft size={10} strokeWidth={2} />
          All projects
        </button>
      </div>
    </aside>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chevron({ open, active }: { open: boolean; active?: boolean }) {
  return (
    <span className={cn('flex items-center flex-shrink-0 transition-transform duration-150', open && 'rotate-90', active ? 'text-brand-blue' : 'text-text-3')}>
      <ChevronRight size={10} strokeWidth={2.5} />
    </span>
  )
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-[8px] px-[14px] pb-[4px]">
      <span className="text-[9.5px] font-semibold uppercase tracking-[.08em] text-text-3 font-mono whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[9.5px] font-mono text-text-3 tabular-nums">{count}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-[10px] px-[24px] py-[36px] text-center">
      <div className="w-[38px] h-[38px] rounded-[10px] bg-bg border border-border flex items-center justify-center">
        <Plus size={16} className="text-text-3" />
      </div>
      <p className="text-[11.5px] text-text-2 leading-[1.55]">
        No nodes yet.<br />Use o <kbd className="font-mono text-[10px] bg-bg border border-border rounded-[4px] px-[5px] py-[1px] text-text-1">+</kbd> para adicionar.
      </p>
    </div>
  )
}

// ─── InlineEdit ───────────────────────────────────────────────────────────────
// Double-click on the label text enters edit mode.
// IMPORTANT: must stopPropagation on its own dblclick to avoid triggering the
// parent card's onDoubleClick (which would open a journey or DS panel).
function InlineEdit({ value, onSave, className }: {
  value: string; onSave: (v: string) => void; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select() } }, [editing])

  function commit() {
    setEditing(false)
    const t = draft.trim()
    if (t && t !== value) onSave(t)
    else setDraft(value)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          e.stopPropagation()
          if (e.key === 'Enter')  { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setEditing(false); setDraft(value) }
        }}
        onClick={e  => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        className="flex-1 min-w-0 bg-surface border border-brand-blue rounded-[4px] px-[5px] py-[1px] text-[11.5px] font-medium text-text-1 outline-none"
      />
    )
  }

  return (
    <span
      className={cn('truncate cursor-default select-none', className)}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
    >
      {value}
    </span>
  )
}
