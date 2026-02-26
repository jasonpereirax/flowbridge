'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import { ChevronRight, Trash2 } from 'lucide-react'

export function Ebar() {
  const store        = useStore()
  const ebarOpen     = useStore(s => s.ebarOpen)
  const ebarSection  = useStore(s => s.ebarSection)
  const curProjectId = useStore(s => s.curProjectId)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const canvas = curProjectId ? store.canvasData[curProjectId] : null

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) { next.delete(nodeId) } else { next.add(nodeId) }
      return next
    })
  }, [])

  if (!ebarOpen) return null

  if (!canvas) {
    return (
      <div className="w-[220px] bg-surface border-r border-border flex flex-col flex-shrink-0">
        <div className="px-4 py-6 text-center text-[12px] text-text-3">No project open</div>
      </div>
    )
  }

  const dsNodes      = canvas.nodes.filter(n => n.type === 'ds')
  const journeyNodes = canvas.nodes.filter(n => n.type === 'journey')

  if (ebarSection === 'macro') {
    return (
      <div className="w-[220px] bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-hidden">

        {/* Header */}
        <div className="px-[14px] py-[10px] border-b border-border flex-shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-[.07em] text-text-3 font-mono">
            Layers
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-[6px]">

          {/* ── Design Systems section ── */}
          {dsNodes.length > 0 && (
            <div className="mb-[4px]">
              <div className="px-[14px] py-[4px] flex items-center gap-[6px]">
                <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-text-3 font-mono">Design Systems</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {dsNodes.map(node => (
                <div
                  key={node.id}
                  className={cn(
                    'mx-[6px] px-[8px] py-[5px] rounded-[6px] flex items-center gap-[7px]',
                    'cursor-pointer hover:bg-bg transition-colors group',
                    store.selNodeId === node.id && 'bg-bg'
                  )}
                  onClick={() => store.selectNode(node.id)}
                >
                  {/* DS icon */}
                  <div className="w-[18px] h-[18px] rounded-[4px] bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] text-brand-purple font-bold">◈</span>
                  </div>
                  <span className="text-[12px] font-medium text-text-1 flex-1 truncate">{node.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); store.deleteNode(node.id) }}
                    className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-red-500 transition-all p-[2px] rounded flex-shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Journeys section ── */}
          {journeyNodes.length > 0 && (
            <div>
              <div className="px-[14px] py-[4px] flex items-center gap-[6px]">
                <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-text-3 font-mono">Journeys</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {journeyNodes.map(node => {
                const isExpanded = expandedNodes.has(node.id)
                const nodeFlows  = canvas.flows[node.id] ?? []
                return (
                  <div key={node.id}>
                    <div
                      className={cn(
                        'mx-[6px] px-[8px] py-[5px] rounded-[6px] flex items-center gap-[7px]',
                        'cursor-pointer hover:bg-bg transition-colors group',
                        store.selNodeId === node.id && 'bg-bg'
                      )}
                      onClick={() => store.selectNode(node.id)}
                    >
                      {/* Expand toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id) }}
                        className="w-[14px] h-[14px] flex items-center justify-center text-text-3 flex-shrink-0"
                      >
                        <ChevronRight size={11} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                      </button>

                      {/* Journey icon */}
                      <div className="w-[18px] h-[18px] rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] text-brand-blue font-bold">⬡</span>
                      </div>

                      <span className="text-[12px] font-medium text-text-1 flex-1 truncate">{node.name}</span>

                      <button
                        onClick={(e) => { e.stopPropagation(); store.deleteNode(node.id) }}
                        className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-red-500 transition-all p-[2px] rounded flex-shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Flows (children of Journey) */}
                    {isExpanded && (
                      <div className="ml-[28px] mr-[6px] mb-[2px]">
                        {nodeFlows.length === 0 ? (
                          <div className="px-[8px] py-[4px] text-[10px] text-text-3 font-mono">no flows</div>
                        ) : (
                          nodeFlows.map(flow => (
                            <div
                              key={flow.id}
                              className="px-[8px] py-[4px] rounded-[5px] text-[11px] text-text-2 hover:bg-bg hover:text-text-1 cursor-pointer transition-colors flex items-center gap-[5px]"
                            >
                              <div className="w-[3px] h-[3px] rounded-full bg-text-3 flex-shrink-0" />
                              {flow.name}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {canvas.nodes.length === 0 && (
            <div className="px-[14px] py-[24px] text-center text-[11px] text-text-3">
              No nodes yet.<br />Use the + button to create one.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Components section
  return (
    <div className="w-[220px] bg-surface border-r border-border flex flex-col flex-shrink-0">
      <div className="px-[14px] py-[10px] border-b border-border">
        <div className="text-[10px] font-semibold uppercase tracking-[.07em] text-text-3 font-mono">Components</div>
      </div>
      <div className="flex-1 flex items-center justify-center text-[11px] text-text-3">
        Coming in Phase 3
      </div>
    </div>
  )
}
