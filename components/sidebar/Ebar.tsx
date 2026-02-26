'use client'

import { useState, useCallback } from 'react'
import { useStore, useProject } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils'
import { ChevronLeft, ChevronRight, X, Trash2, Database, GitBranch, Plus, Component } from 'lucide-react'

export function Ebar() {
  const store        = useStore()
  const project      = useProject()
  const router       = useRouter()
  const ebarOpen     = useStore(s => s.ebarOpen)
  const ebarSection  = useStore(s => s.ebarSection)
  const curProjectId = useStore(s => s.curProjectId)
  const selNodeId    = useStore(s => s.selNodeId)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const canvas = curProjectId ? store.canvasData[curProjectId] : null

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  if (!ebarOpen) return null

  const dsNodes      = canvas?.nodes.filter(n => n.type === 'ds')      ?? []
  const journeyNodes = canvas?.nodes.filter(n => n.type === 'journey') ?? []
  const total        = canvas?.nodes.length ?? 0

  return (
    <aside className="w-[240px] bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-hidden panel-enter-left">

      {/* ── Project header ── */}
      <div className="px-[14px] pt-[11px] pb-[10px] border-b border-border flex-shrink-0">

        {/* Top row: back link + close */}
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
            title="Close panel"
          >
            <X size={11} strokeWidth={2} />
          </button>
        </div>

        {/* Project identity */}
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
              {total} node{total !== 1 ? 's' : ''} · {journeyNodes.length} journey{journeyNodes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div className="flex border-b border-border flex-shrink-0 px-[10px] gap-[0px]">
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
              <div className="py-[8px]">

                {/* Design Systems */}
                {dsNodes.length > 0 && (
                  <div className="mb-[4px]">
                    <GroupLabel label="Design Systems" count={dsNodes.length} />
                    {dsNodes.map(node => (
                      <LayerRow
                        key={node.id}
                        label={node.name}
                        meta={node.tags.length > 0 ? `${node.tags.length}` : undefined}
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

                {/* Journeys */}
                {journeyNodes.length > 0 && (
                  <div>
                    <GroupLabel label="Journeys" count={journeyNodes.length} />
                    {journeyNodes.map(node => {
                      const isExpanded  = expanded.has(node.id)
                      const flows       = canvas?.flows[node.id] ?? []
                      const screenCount = flows.reduce((a, f) => a + f.screens.length, 0)

                      return (
                        <div key={node.id}>
                          <LayerRow
                            label={node.name}
                            meta={flows.length > 0 ? `${flows.length}f · ${screenCount}s` : undefined}
                            isSelected={selNodeId === node.id}
                            onSelect={() => store.selectNode(node.id)}
                            onDelete={() => store.deleteNode(node.id)}
                            expandable
                            isExpanded={isExpanded}
                            onToggleExpand={e => { e.stopPropagation(); toggleExpand(node.id) }}
                            icon={
                              <span className="w-[16px] h-[16px] rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0">
                                <GitBranch size={8} className="text-brand-blue" />
                              </span>
                            }
                          />

                          {isExpanded && (
                            <div className="pb-[2px]">
                              {flows.length === 0 ? (
                                <p className="pl-[42px] py-[4px] text-[10.5px] text-text-3 italic">no flows</p>
                              ) : (
                                flows.map(flow => (
                                  <button
                                    key={flow.id}
                                    onClick={() => { store.selectNode(node.id); store.setActiveFlow(node.id, flow.id) }}
                                    className="w-full flex items-center gap-[8px] pl-[36px] pr-[12px] py-[4px] group hover:bg-bg transition-colors"
                                  >
                                    <div className="w-[1px] h-[14px] bg-border flex-shrink-0 self-center" />
                                    <div className="w-[4px] h-[4px] rounded-full bg-border-strong flex-shrink-0" />
                                    <span className="text-[11.5px] text-text-2 group-hover:text-text-1 flex-1 truncate text-left transition-colors">
                                      {flow.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-text-3 flex-shrink-0 tabular-nums">
                                      {flow.screens.length}
                                    </span>
                                  </button>
                                ))
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-[8px] px-[14px] pb-[2px]">
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
  isSelected:      boolean
  onSelect:        () => void
  onDelete:        () => void
  expandable?:     boolean
  isExpanded?:     boolean
  onToggleExpand?: (e: React.MouseEvent) => void
}

function LayerRow({ label, meta, icon, isSelected, onSelect, onDelete, expandable, isExpanded, onToggleExpand }: LayerRowProps) {
  return (
    <div
      onClick={onSelect}
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
