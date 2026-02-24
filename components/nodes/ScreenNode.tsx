'use client'

import { useRef } from 'react'
import { useStore } from '@/lib/store'
import { screenCompleteness, cn } from '@/utils'
import type { Screen, NodeId, FlowId } from '@/types'

interface ScreenNodeProps {
  screen:    Screen
  journeyId: NodeId
  flowId:    FlowId
}

// Completeness ring dimensions
const RING_R     = 10
const RING_CIRC  = 2 * Math.PI * RING_R

const STATUS_COLOR: Record<string, string> = {
  empty:     'text-text-3',
  partial:   'text-brand-amber',
  ready:     'text-brand-green',
  generated: 'text-brand-purple',
}

export function ScreenNodeCard({ screen, journeyId, flowId }: ScreenNodeProps) {
  const store      = useStore()
  const isSelected = useStore(s => s.selScreenId === screen.id)

  const isDragging = useRef(false)
  const dragStart  = useRef({ px: 0, py: 0, nx: 0, ny: 0 })

  const pct    = screenCompleteness(screen)
  const offset = RING_CIRC - (pct / 100) * RING_CIRC

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    store.selectScreen(screen.id)
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = {
      px: e.clientX,
      py: e.clientY,
      nx: screen.position.x,
      ny: screen.position.y,
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const { scale } = useStore.getState().transform
    const dx = (e.clientX - dragStart.current.px) / scale
    const dy = (e.clientY - dragStart.current.py) / scale
    store.moveScreen(journeyId, flowId, screen.id, {
      x: dragStart.current.nx + dx,
      y: dragStart.current.ny + dy,
    })
  }

  function onPointerUp() {
    isDragging.current = false
  }

  function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    store.selectScreen(screen.id)
  }

  return (
    <div
      data-screen
      data-selectable
      data-screen-id={screen.id}
      className={cn(
        'absolute w-48 rounded-[10px] bg-surface border-y border-r shadow-sm cursor-pointer select-none transition-all',
        screen.isEntry ? 'border-l-[3px] border-l-brand-green' : screen.isError ? 'border-l-[3px] border-l-brand-red' : 'border-l-[3px] border-l-border-strong',
        isSelected
          ? 'border-border-strong shadow-md'
          : 'border-border hover:border-border-strong hover:shadow-md',
      )}
      style={{ left: screen.position.x, top: screen.position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
    >
      {/* Thumbnail placeholder or Figma thumbnail */}
      {screen.figma?.thumbnailUrl ? (
        <div className="relative mx-2 mt-2 rounded-[8px] overflow-hidden bg-bg border border-border" style={{ height: 80 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screen.figma.thumbnailUrl}
            alt={screen.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="mx-2 mt-2 rounded-[8px] bg-bg border border-border flex items-center justify-center" style={{ height: 80 }}>
          <span className="text-[10px] text-text-3 font-mono">no figma</span>
        </div>
      )}

      {/* Content */}
      <div className="px-3 pt-2 pb-3">
        {/* Badges */}
        <div className="flex items-center gap-1 mb-1.5">
          {screen.isEntry && (
            <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green">
              entry
            </span>
          )}
          {screen.isError && (
            <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red">
              error
            </span>
          )}
          {!screen.isEntry && !screen.isError && (
            <span className={cn('text-[9px] font-mono', STATUS_COLOR[screen.status] ?? 'text-text-3')}>
              {screen.status}
            </span>
          )}
        </div>

        {/* Name + completeness ring */}
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-[12px] text-text-1 leading-tight truncate">{screen.name}</span>

          {/* Completeness ring */}
          <svg width="24" height="24" className="flex-shrink-0 -rotate-90" viewBox="0 0 24 24">
            {/* Track */}
            <circle
              cx="12"
              cy="12"
              r={RING_R}
              fill="none"
              stroke="#E3E3DF"
              strokeWidth="2.5"
            />
            {/* Progress */}
            <circle
              cx="12"
              cy="12"
              r={RING_R}
              fill="none"
              stroke={pct >= 80 ? '#16A34A' : pct >= 20 ? '#D97706' : '#ADADAD'}
              strokeWidth="2.5"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
        </div>

        {/* Route */}
        {screen.context.route && (
          <div className="mt-1 text-[10px] font-mono text-text-3 truncate">{screen.context.route}</div>
        )}
      </div>
    </div>
  )
}
