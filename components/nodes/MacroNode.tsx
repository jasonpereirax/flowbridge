'use client'

import { useRef } from 'react'
import { Layers, GitBranch, Link2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { MacroNode } from '@/types'

export const NODE_WIDTH    = 220
export const CONN_HANDLE_Y = 65

interface MacroNodeProps {
  node: MacroNode
  onConnDragStart: (fromId: string, clientX: number, clientY: number) => void
}

export function MacroNodeCard({ node, onConnDragStart }: MacroNodeProps) {
  const store      = useStore()
  const isSelected = useStore(s => s.selNodeId === node.id)

  const isDragging = useRef(false)
  const dragStart  = useRef({ px: 0, py: 0, nx: 0, ny: 0 })

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    store.selectNode(node.id)
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { px: e.clientX, py: e.clientY, nx: node.position.x, ny: node.position.y }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const { scale } = useStore.getState().transform
    const dx = (e.clientX - dragStart.current.px) / scale
    const dy = (e.clientY - dragStart.current.py) / scale
    store.moveNode(node.id, { x: dragStart.current.nx + dx, y: dragStart.current.ny + dy })
  }

  function onPointerUp()  { isDragging.current = false }
  function onClick(e: React.MouseEvent)     { e.stopPropagation(); store.selectNode(node.id) }
  function onDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (node.type === 'journey') store.openJourney(node.id)
  }

  const isDS = node.type === 'ds'

  return (
    <div
      data-node data-selectable
      data-node-id={node.id}
      data-node-type={node.type}
      data-journey-id={node.type === 'journey' ? node.id : undefined}
      className={cn(
        'absolute w-[220px] rounded-[12px] bg-surface border cursor-pointer select-none node-enter',
        'transition-[box-shadow,border-color] duration-[140ms]',
        isDS ? 'border-t-[3px] border-t-brand-blue' : 'border-t-[3px] border-t-brand-purple',
        isSelected
          ? isDS
            ? 'border-brand-blue shadow-[0_0_0_3px_rgba(37,99,235,0.1),0_4px_12px_rgba(0,0,0,0.08)]'
            : 'border-brand-purple shadow-[0_0_0_3px_rgba(124,58,237,0.1),0_4px_12px_rgba(0,0,0,0.08)]'
          : 'border-border shadow-sm hover:border-border-strong hover:shadow-md',
      )}
      style={{ left: node.position.x, top: node.position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {node.type === 'ds'
        ? <DSNodeContent   node={node} onConnDragStart={onConnDragStart} />
        : <JourneyNodeContent node={node} />
      }
    </div>
  )
}

// ── DS ────────────────────────────────────────────────────────────────────────

function DSNodeContent({ node, onConnDragStart }: { node: MacroNode; onConnDragStart: (id: string, x: number, y: number) => void }) {
  const connsOut = useStore(s => s.canvas()?.conns.filter(c => c.fromId === node.id).length ?? 0)

  return (
    <>
      <div className="flex items-center gap-[9px] px-[13px] pt-[11px] pb-[9px]">
        <div className="w-[29px] h-[29px] rounded-[7px] bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
          <Layers size={14} className="text-brand-blue" />
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] font-mono font-medium tracking-[0.04em] uppercase text-brand-blue mb-px">Assets · DS · Lib</div>
          <div className="text-[13px] font-semibold tracking-tight text-text-1 truncate">{node.name}</div>
        </div>
      </div>

      <div className="px-[13px] pb-[10px]">
        {node.description && <div className="text-[11.5px] text-text-2 leading-snug mb-[7px] line-clamp-2">{node.description}</div>}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-[3px]">
            {node.tags.slice(0, 6).map(tag => (
              <span key={tag} className="text-[10px] font-mono px-[6px] py-px rounded-full bg-bg border border-border text-text-3">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-[13px] py-[7px] border-t border-border">
        <span className="text-[11px] font-mono text-text-3">feeds {connsOut} journey{connsOut !== 1 ? 's' : ''}</span>
        {node.figmaFileKey && (
          <span className="flex items-center gap-[3px] text-[10.5px] text-text-3"><Link2 size={9} />Figma</span>
        )}
      </div>

      {/* connection handle */}
      <div
        data-handle data-from-id={node.id}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[10px] h-[10px] bg-surface border-2 border-border-strong rounded-full cursor-crosshair hover:bg-brand-blue hover:border-brand-blue hover:scale-125 transition-all z-10"
        onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onConnDragStart(node.id, e.clientX, e.clientY) }}
      />
    </>
  )
}

// ── Journey ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  'draft':       'bg-bg border-border text-text-3',
  'in-progress': 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber',
  'ready':       'bg-brand-green/10 border-brand-green/30 text-brand-green',
  'generated':   'bg-brand-purple/10 border-brand-purple/30 text-brand-purple',
}

function JourneyNodeContent({ node }: { node: MacroNode }) {
  const connsIn   = useStore(s => s.canvas()?.conns.filter(c => c.toId === node.id).length ?? 0)
  const flowCount = useStore(s => s.canvas()?.flows[node.id]?.length ?? 0)

  return (
    <>
      <div className="flex items-center gap-[9px] px-[13px] pt-[11px] pb-[9px]">
        <div className="w-[29px] h-[29px] rounded-[7px] bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
          <GitBranch size={14} className="text-brand-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9.5px] font-mono font-medium tracking-[0.04em] uppercase text-brand-purple mb-px">Journey · Flow</div>
          <div className="text-[13px] font-semibold tracking-tight text-text-1 truncate">{node.name}</div>
        </div>
        {node.status && (
          <span className={cn('text-[10px] font-semibold font-mono px-[7px] py-[2px] rounded-full border flex-shrink-0', STATUS_STYLES[node.status] ?? STATUS_STYLES['draft'])}>
            {node.status}
          </span>
        )}
      </div>

      {node.description && (
        <div className="px-[13px] pb-[10px]">
          <div className="text-[11.5px] text-text-2 leading-snug line-clamp-2">{node.description}</div>
        </div>
      )}

      <div className="flex items-center justify-between px-[13px] py-[7px] border-t border-border">
        <span className="text-[11px] font-mono text-text-3">{connsIn} source{connsIn !== 1 ? 's' : ''} · {flowCount} flow{flowCount !== 1 ? 's' : ''}</span>
        <span className="text-[10.5px] text-text-3 opacity-60">dbl-click</span>
      </div>
    </>
  )
}
