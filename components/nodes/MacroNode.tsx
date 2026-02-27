'use client'

import { useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { MacroNode as MacroNodeType } from '@/types'

export const MACRO_NODE_W = 220

interface MacroNodeCardProps {
  node:        MacroNodeType
  isSelected?: boolean
}

// MacroNodeCard is now a pure display component.
// All interaction (drag, click, conn drag) is handled by useCanvasInteraction
// on the parent canvas element via pointer capture + data attributes.
export function MacroNodeCard({ node, isSelected }: MacroNodeCardProps) {
  const store = useStore()

  const canvas    = store.canvasData[store.curProjectId!]
  const connCount = canvas?.conns.filter(c => c.fromId === node.id || c.toId === node.id).length ?? 0
  const isDS      = node.type === 'ds'

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDS) store.openJourney(node.id)
  }, [isDS, node.id, store])

  return (
    <div
      className={cn(
        'absolute bg-surface rounded-[10px] border select-none cursor-grab active:cursor-grabbing',
        'transition-shadow duration-150',
        isSelected
          ? 'border-brand-blue ring-2 ring-brand-blue/20 shadow-[0_4px_16px_rgba(0,0,0,.12)]'
          : 'border-border hover:border-border-strong hover:shadow-[0_4px_12px_rgba(0,0,0,.08)]',
      )}
      style={{ left: node.position.x, top: node.position.y, width: MACRO_NODE_W }}
      data-node
      data-macro-id={node.id}
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
    >
      {/* ── Header ── */}
      <div className={cn(
        'px-[14px] pt-[11px] pb-[10px] rounded-t-[9px] border-b border-border',
        isDS ? 'bg-[#F5F3FF]' : 'bg-[#EFF6FF]',
      )}>
        <div className="flex items-center justify-between mb-[6px]">
          <span className={cn(
            'text-[9.5px] font-semibold uppercase tracking-[.07em] font-mono',
            isDS ? 'text-brand-purple' : 'text-brand-blue',
          )}>
            {isDS ? 'Design System' : 'Journey'}
          </span>

          {/* Connector handle — DS only. data-conn-handle triggers conn drag in useCanvasInteraction */}
          {isDS && (
            <div
              data-conn-handle
              title="Drag to connect to a Journey"
              className={cn(
                'w-[14px] h-[14px] rounded-full flex-shrink-0',
                'bg-brand-purple/20 border-2 border-brand-purple',
                'cursor-crosshair transition-all duration-150',
                'hover:scale-125 hover:bg-brand-purple/40 hover:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]',
              )}
            />
          )}

          {!isDS && (
            <span className="text-[9px] text-text-3 font-mono select-none">↩ open</span>
          )}
        </div>

        <div className="text-[13px] font-semibold text-text-1 truncate leading-tight">
          {node.name}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-[14px] py-[10px]">
        {node.description && (
          <p className="text-[11px] text-text-2 mb-[8px] line-clamp-2 leading-[1.5]">
            {node.description}
          </p>
        )}

        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mb-[8px]">
            {node.tags.slice(0, 4).map(tag => (
              <span key={tag} className="inline-flex px-[6px] py-[1.5px] rounded-full text-[10px] font-medium bg-bg text-text-2 border border-border">
                {tag}
              </span>
            ))}
            {node.tags.length > 4 && (
              <span className="text-[10px] text-text-3 px-[4px] py-[1.5px]">+{node.tags.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-[8px] border-t border-border">
          <span className="text-[10px] text-text-3 font-mono tabular-nums">
            {connCount} conn{connCount !== 1 ? 's' : ''}
          </span>
          <div className={cn(
            'w-[6px] h-[6px] rounded-full flex-shrink-0',
            connCount > 0 ? (isDS ? 'bg-brand-purple' : 'bg-brand-blue') : 'bg-border-strong',
          )} />
        </div>
      </div>
    </div>
  )
}
