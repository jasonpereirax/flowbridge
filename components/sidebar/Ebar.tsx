'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import { ChevronRight, Trash2 } from 'lucide-react'

/**
 * Ebar
 * 
 * Expandable tree panel showing project hierarchy.
 * Sections: Macro Nodes, Components (future).
 * 
 * Features:
 * - Expand/collapse nodes
 * - Show flows inside journeys
 * - Delete nodes/flows
 * - Click to select
 */
export function Ebar() {
  const store = useStore()
  const ebarSection = useStore(s => s.ebarSection)
  const curProjectId = useStore(s => s.curProjectId)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const canvas = curProjectId ? store.canvasData[curProjectId] : null

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      store.selectNode(nodeId)
    },
    [store]
  )

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      store.deleteNode(nodeId)
    },
    [store]
  )

  if (!canvas) {
    return (
      <div className={cn(
        'w-60 bg-white border-r border-gray-200',
        'flex flex-col flex-shrink-0',
        'overflow-hidden'
      )}>
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          No project open
        </div>
      </div>
    )
  }

  if (ebarSection === 'macro') {
    return (
      <div className={cn(
        'w-60 bg-white border-r border-gray-200',
        'flex flex-col flex-shrink-0',
        'overflow-hidden'
      )}>
        {/* Header */}
        <div className={cn(
          'px-4 py-3 border-b border-gray-200',
          'sticky top-0 bg-white',
          'flex-shrink-0'
        )}>
          <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wide">
            Nodes & Journeys
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {canvas.nodes.length} node{canvas.nodes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {canvas.nodes.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No nodes yet. Use FAB to create one.
            </div>
          ) : (
            canvas.nodes.map(node => {
              const isExpanded = expandedNodes.has(node.id)
              const nodeFlows = canvas.flows[node.id] || []
              const isJourney = node.type === 'journey'
              const nodeIcon = node.type === 'ds' ? '◈' : '⬡'

              return (
                <div key={node.id}>
                  {/* Node item */}
                  <div
                    className={cn(
                      'px-4 py-2 flex items-center gap-2',
                      'cursor-pointer hover:bg-gray-50',
                      'border-l-2 border-transparent hover:border-gray-300',
                      'transition-all duration-150',
                      'group'
                    )}
                    onClick={() => handleSelectNode(node.id)}
                    role="button"
                    tabIndex={0}
                    title={node.description || node.name}
                  >
                    {/* Expand/collapse toggle (journey only) */}
                    {isJourney && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded(node.id)
                        }}
                        className={cn(
                          'flex-shrink-0 p-0.5 -ml-1',
                          'rounded hover:bg-gray-200 transition-colors'
                        )}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <ChevronRight
                          size={16}
                          className={cn(
                            'transition-transform duration-200',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </button>
                    )}

                    {/* Spacer if not expandable */}
                    {!isJourney && (
                      <div className="w-6 flex-shrink-0" />
                    )}

                    {/* Node type icon */}
                    <span className="text-xs flex-shrink-0 font-bold">
                      {nodeIcon}
                    </span>

                    {/* Node name */}
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                      {node.name}
                    </span>

                    {/* Delete button (appears on hover) */}
                    <button
                      onClick={(e) => handleDeleteNode(e, node.id)}
                      className={cn(
                        'flex-shrink-0 p-1 -mr-2',
                        'text-gray-400 hover:text-red-600 hover:bg-red-50',
                        'rounded transition-all duration-150',
                        'opacity-0 group-hover:opacity-100'
                      )}
                      title="Delete node"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Flows (if journey is expanded) */}
                  {isJourney && isExpanded && nodeFlows.length > 0 && (
                    <div className="bg-gray-50 border-l-2 border-gray-200">
                      {nodeFlows.map(flow => (
                        <div
                          key={flow.id}
                          className={cn(
                            'px-6 py-1.5 text-xs font-medium text-gray-600',
                            'hover:bg-gray-100 cursor-pointer',
                            'border-l-2 border-transparent hover:border-gray-400',
                            'transition-all duration-150'
                          )}
                          title={flow.name}
                        >
                          ├─ {flow.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state for journey with no flows */}
                  {isJourney && isExpanded && nodeFlows.length === 0 && (
                    <div className="px-6 py-2 text-xs text-gray-400 bg-gray-50">
                      ├─ (no flows)
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Components section (placeholder for Phase 3)
  return (
    <div className={cn(
      'w-60 bg-white border-r border-gray-200',
      'flex flex-col flex-shrink-0',
      'overflow-hidden'
    )}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wide">
          Components
        </h3>
      </div>
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Coming in Phase 3
      </div>
    </div>
  )
}
