'use client'

import { useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { MacroNode as MacroNodeType } from '@/types'

interface MacroNodeCardProps {
  node: MacroNodeType
  isSelected?: boolean
  onSelect?: (id: string) => void
  onDragStart?: (id: string, x: number, y: number) => void
  onConnDragStart?: (fromId: string, x: number, y: number) => void
}

/**
 * MacroNodeCard
 * 
 * Visual representation of a macro node (Design System or Journey).
 * 
 * Features:
 * - Drag to move on canvas
 * - Double-click journey to enter micro view
 * - Connector handle (DS only) to create connections
 * - Status badges and metadata
 * - Selection highlight
 */
export function MacroNodeCard({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onConnDragStart,
}: MacroNodeCardProps) {
  const store = useStore()

  // Type-specific styling
  const isDS = node.type === 'ds'
  const nodeTypeIcon = isDS ? '◈' : '⬡'
  const nodeTypeLabel = isDS ? 'Design System' : 'Journey'
  const nodeTypeBgColor = isDS ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'

  // Count connections
  const canvas = store.canvasData[store.curProjectId!]
  const connCount = canvas?.conns.filter(
    c => c.fromId === node.id || c.toId === node.id
  ).length ?? 0

  // Event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag if clicking on connector handle
      if ((e.target as HTMLElement).closest('[data-conn-handle]')) {
        return
      }
      onDragStart?.(node.id, e.clientX, e.clientY)
    },
    [node.id, onDragStart]
  )

  const handleConnHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onConnDragStart?.(node.id, e.clientX, e.clientY)
    },
    [node.id, onConnDragStart]
  )

  const handleDoubleClick = useCallback(
    (_e: React.MouseEvent) => {
      if (isDS) return // Only journeys can be entered
      store.openJourney(node.id)
    },
    [isDS, node.id, store]
  )

  const handleSelect = useCallback(
    () => onSelect?.(node.id),
    [node.id, onSelect]
  )

  return (
    <div
      className={cn(
        // Base styles
        'absolute rounded-lg border-2 bg-white cursor-move',
        'transition-all duration-150 ease-out',
        'shadow-md hover:shadow-lg hover:border-gray-300',
        'w-56',
        // Selection state
        isSelected
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200'
      )}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={handleSelect}
      data-macro-id={node.id}
      role="button"
      tabIndex={0}
      title={`${nodeTypeLabel}: ${node.name}`}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b border-gray-200',
          nodeTypeBgColor
        )}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-label={nodeTypeLabel}>
              {nodeTypeIcon}
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {nodeTypeLabel}
            </span>
          </div>

          {/* Connector handle (DS only) */}
          {isDS && (
            <div
              data-conn-handle
              className={cn(
                'w-3 h-3 rounded-full bg-blue-500 cursor-crosshair',
                'hover:scale-125 transition-transform duration-150',
                'flex-shrink-0'
              )}
              onMouseDown={handleConnHandleMouseDown}
              title="Drag to connect to a Journey"
              role="button"
              aria-label="Connection handle"
            />
          )}
        </div>

        {/* Node name */}
        <h3 className="text-sm font-bold text-gray-900 truncate">
          {node.name}
        </h3>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Description */}
        {node.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {node.description}
          </p>
        )}

        {/* Tags / Components list */}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {node.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={cn(
                  'inline-flex px-2 py-1 rounded text-xs font-medium',
                  'bg-gray-100 text-gray-700'
                )}
              >
                {tag}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="inline-flex px-2 py-1 text-gray-500 text-xs font-medium">
                +{node.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer metadata */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {connCount} connection{connCount !== 1 ? 's' : ''}
          </span>

          {!isDS && (
            <span className="text-xs text-blue-600 font-medium">
              ⅆ Double-click to edit
            </span>
          )}

          {isDS && (
            <span className="text-xs text-purple-600 font-medium">
              → Drag handle to wire
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
