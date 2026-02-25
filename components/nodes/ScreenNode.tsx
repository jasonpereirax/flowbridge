'use client'

import { useRef } from 'react'
import { useStore } from '@/lib/store'
import { screenCompleteness, cn } from '@/utils'
import type { Screen, NodeId, FlowId } from '@/types'

interface ScreenNodeProps { screen: Screen; journeyId: NodeId; flowId: FlowId; index?: number }

// Wireframe mock patterns
const MOCKS = [
  <div key={0} className="flex flex-col gap-[3px] p-2">
    <div className="h-[4px] rounded-sm bg-[#93C5FD] w-[55%]" />
    <div className="h-[9px] rounded-sm bg-bg border border-border" />
    <div className="h-[4px] rounded-sm bg-border w-3/4" />
    <div className="h-[14px] rounded-sm bg-text-1 mt-0.5" />
  </div>,
  <div key={1} className="flex flex-col gap-[3px] p-2">
    <div className="h-[4px] rounded-sm bg-border" />
    <div className="h-[9px] rounded-sm bg-bg border border-border" />
    <div className="h-[4px] rounded-sm bg-border w-3/4" />
    <div className="h-[9px] rounded-sm bg-bg border border-border" />
    <div className="h-[14px] rounded-sm bg-text-1 mt-0.5" />
  </div>,
  <div key={2} className="flex flex-col gap-[3px] p-2">
    <div className="h-[9px] rounded-sm bg-[#FEE2E2]" />
    <div className="h-[4px] rounded-sm bg-border w-[45%]" />
    <div className="h-[9px] rounded-sm bg-bg border border-border" />
    <div className="h-[14px] rounded-sm bg-text-1 mt-0.5" />
  </div>,
  <div key={3} className="flex flex-col gap-[3px] p-2">
    <div className="h-[4px] rounded-sm bg-[#93C5FD] w-[55%]" />
    <div className="flex gap-[3px]">
      <div className="flex-1 h-[14px] rounded-sm bg-bg border border-border p-0.5"><div className="h-[2px] rounded-sm bg-border mb-px" /></div>
      <div className="flex-1 h-[14px] rounded-sm bg-bg border border-border p-0.5"><div className="h-[2px] rounded-sm bg-[#93C5FD]" /></div>
    </div>
    <div className="h-[9px] rounded-sm bg-bg border border-border" />
  </div>,
]

export function ScreenNodeCard({ screen, journeyId, flowId, index = 0 }: ScreenNodeProps) {
  const store      = useStore()
  const isSelected = useStore(s => s.selScreenId === screen.id)

  const isDragging = useRef(false)
  const dragStart  = useRef({ px: 0, py: 0, nx: 0, ny: 0 })
  const pct        = screenCompleteness(screen)
  const isDone     = pct > 60

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    store.selectScreen(screen.id)
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { px: e.clientX, py: e.clientY, nx: screen.position.x, ny: screen.position.y }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const { scale } = useStore.getState().transform
    const dx = (e.clientX - dragStart.current.px) / scale
    const dy = (e.clientY - dragStart.current.py) / scale
    store.moveScreen(journeyId, flowId, screen.id, { x: dragStart.current.nx + dx, y: dragStart.current.ny + dy })
  }

  function onPointerUp() { isDragging.current = false }
  function onClick(e: React.MouseEvent) { e.stopPropagation(); store.selectScreen(screen.id) }

  return (
    <div
      data-screen data-selectable data-screen-id={screen.id}
      className={cn(
        'absolute w-[170px] rounded-[12px] bg-surface border cursor-pointer select-none overflow-hidden node-enter',
        'transition-[box-shadow,border-color] duration-[140ms]',
        isDone ? 'border-t-[2px] border-t-brand-green' : 'border-t border-t-border',
        isSelected
          ? 'border-text-1 shadow-[0_0_0_3px_rgba(24,24,26,0.06),0_4px_12px_rgba(0,0,0,0.08)]'
          : 'border-border shadow-sm hover:border-border-strong hover:shadow-md',
      )}
      style={{ left: screen.position.x, top: screen.position.y }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onClick}
    >
      {/* preview */}
      <div className="relative h-[88px] bg-bg border-b border-border overflow-hidden" style={{ borderRadius: '10px 10px 0 0' }}>
        {screen.figma?.thumbnailUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={screen.figma.thumbnailUrl} alt={screen.name} className="w-full h-full object-cover" />
          : MOCKS[index % MOCKS.length]
        }
        {screen.isEntry && (
          <span className="absolute top-[5px] left-[5px] text-[9px] font-mono font-medium px-[5px] py-px rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green">Entry</span>
        )}
        {screen.isError && (
          <span className="absolute top-[5px] left-[5px] text-[9px] font-mono font-medium px-[5px] py-px rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red">Error</span>
        )}
      </div>

      {/* body */}
      <div className="px-[10px] py-[8px]">
        <div className="text-[12px] font-semibold text-text-1 mb-[2px] truncate">{screen.name}</div>
        <div className={cn('text-[11px] leading-[1.35] line-clamp-2', screen.context.purpose ? 'text-text-2' : 'text-text-3')}>
          {screen.context.purpose || 'Add context…'}
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between px-[10px] py-[5px] border-t border-border">
        <div className="flex items-center gap-[4px] text-[10.5px] font-mono text-text-3">
          {isDone && <span className="w-[5px] h-[5px] rounded-full bg-brand-green flex-shrink-0" />}
          <span>{isDone ? 'done' : 'empty'}</span>
        </div>
        <span className="text-[10.5px] font-mono text-text-3">{index === 0 ? 'entry' : `step ${index + 1}`}</span>
      </div>
    </div>
  )
}
