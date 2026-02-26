'use client'

import { useRef, useCallback } from 'react'
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

export function MacroNodeCard({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onConnDragStart,
}: MacroNodeCardProps) {
  const store    = useStore()
  const nodeRef  = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const pointerDownPos = useRef({ x: 0, y: 0 })

  const isDS         = node.type === 'ds'
  const nodeTypeLabel = isDS ? 'Design System' : 'Journey'

  const canvas    = store.canvasData[store.curProjectId!]
  const connCount = canvas?.conns.filter(
    c => c.fromId === node.id || c.toId === node.id
  ).length ?? 0

  // ── Drag: use pointer capture on the node element itself ──────────────────
  // This avoids any conflict with the canvas panning listener.
  // Pointer capture means all pointermove/pointerup go to this element,
  // even when the pointer leaves it — no swing, no elastic effect.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-conn-handle]')) return
      if (e.button !== 0) return

      e.stopPropagation()          // prevent canvas panning from starting
      e.currentTarget.setPointerCapture(e.pointerId)

      isDragging.current   = false
      pointerDownPos.current = { x: e.clientX, y: e.clientY }

      onDragStart?.(node.id, e.clientX, e.clientY)
    },
    [node.id, onDragStart]
  )

  // ── Click vs drag discrimination ─────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x)
      const dy = Math.abs(e.clientY - pointerDownPos.current.y)
      if (dx < 4 && dy < 4) {
        // It was a click, not a drag
        onSelect?.(node.id)
      }
      isDragging.current = false
    },
    [node.id, onSelect]
  )

  // ── Double-click: open journey ────────────────────────────────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isDS) return
      store.openJourney(node.id)
    },
    [isDS, node.id, store]
  )

  // ── Connector handle drag ─────────────────────────────────────────────────
  const handleConnPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      onConnDragStart?.(node.id, e.clientX, e.clientY)
    },
    [node.id, onConnDragStart]
  )

  return (
    <div
      ref={nodeRef}
      className={cn(
        'absolute rounded-[10px] border bg-surface cursor-grab active:cursor-grabbing',
        'w-[220px] select-none',
        'shadow-[0_2px_8px_rgba(0,0,0,.08)]',
        isSelected
          ? 'border-brand-blue ring-2 ring-brand-blue/20 shadow-[0_4px_16px_rgba(0,0,0,.12)]'
          : 'border-border hover:border-border-strong hover:shadow-[0_4px_12px_rgba(0,0,0,.1)]'
      )}
      style={{ left: node.position.x, top: node.position.y }}
      data-node
      data-macro-id={node.id}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
    >
      {/* ── Header ── */}
      <div className={cn(
        'px-[14px] pt-[12px] pb-[10px] rounded-t-[9px] border-b border-border',
        isDS ? 'bg-[#F5F3FF]' : 'bg-[#EFF6FF]'
      )}>
        <div className="flex items-center justify-between mb-[8px]">
          <div className="flex items-center gap-[6px]">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-[.06em] font-mono',
              isDS ? 'text-brand-purple' : 'text-brand-blue'
            )}>
              {nodeTypeLabel}
            </span>
          </div>

          {/* Connector handle — DS only, right side */}
          {isDS && (
            <div
              data-conn-handle
              className="w-[10px] h-[10px] rounded-full bg-brand-purple cursor-crosshair hover:scale-125 transition-transform flex-shrink-0"
              onPointerDown={handleConnPointerDown}
              title="Drag to connect to a Journey"
            />
          )}

          {/* Double-click hint — Journey only */}
          {!isDS && (
            <span className="text-[9px] text-text-3 font-mono">↩ dbl-click</span>
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
            {node.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex px-[6px] py-[2px] rounded-full text-[10px] font-medium bg-bg text-text-2 border border-border">
                {tag}
              </span>
            ))}
            {node.tags.length > 4 && (
              <span className="text-[10px] text-text-3 px-[4px] py-[2px]">+{node.tags.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-[8px] border-t border-border">
          <span className="text-[10px] text-text-3 font-mono">
            {connCount} conn{connCount !== 1 ? 's' : ''}
          </span>
          <div className={cn(
            'w-[6px] h-[6px] rounded-full flex-shrink-0',
            connCount > 0 ? (isDS ? 'bg-brand-purple' : 'bg-brand-blue') : 'bg-border-strong'
          )} />
        </div>
      </div>
    </div>
  )
}
