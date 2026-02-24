'use client'

import { useRef } from 'react'
import { Layers, GitBranch, Link2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { MacroNode } from '@/types'

// Width matches w-52; handle center Y from node top
export const NODE_WIDTH = 208
export const CONN_HANDLE_Y = 44

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
    dragStart.current = {
      px: e.clientX,
      py: e.clientY,
      nx: node.position.x,
      ny: node.position.y,
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const { scale } = useStore.getState().transform
    const dx = (e.clientX - dragStart.current.px) / scale
    const dy = (e.clientY - dragStart.current.py) / scale
    store.moveNode(node.id, {
      x: dragStart.current.nx + dx,
      y: dragStart.current.ny + dy,
    })
  }

  function onPointerUp() {
    isDragging.current = false
  }

  function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    store.selectNode(node.id)
  }

  function onDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (node.type === 'journey') store.openJourney(node.id)
  }

  return (
    <div
      data-node
      data-selectable
      data-node-id={node.id}
      data-node-type={node.type}
      data-journey-id={node.type === 'journey' ? node.id : undefined}
      className={cn(
        'absolute w-52 rounded-[10px] bg-surface border-y border-r shadow-sm cursor-pointer select-none transition-all',
        node.type === 'ds'      ? 'border-l-[3px] border-l-brand-blue'   : 'border-l-[3px] border-l-brand-purple',
        isSelected
          ? 'border-border-strong shadow-md'
          : 'border-border hover:border-border-strong hover:shadow-md',
      )}
      style={{ left: node.position.x, top: node.position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {node.type === 'ds' ? (
        <DSNodeContent node={node} onConnDragStart={onConnDragStart} />
      ) : (
        <JourneyNodeContent node={node} />
      )}
    </div>
  )
}

// ── DS Node ───────────────────────────────────────────────────────────────────

interface DSNodeContentProps {
  node: MacroNode
  onConnDragStart: (fromId: string, clientX: number, clientY: number) => void
}

function DSNodeContent({ node, onConnDragStart }: DSNodeContentProps) {
  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.preventDefault()
    onConnDragStart(node.id, e.clientX, e.clientY)
  }

  return (
    <>
      {/* Header */}
      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-4 h-4 rounded bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
            <Layers size={10} className="text-brand-blue" />
          </div>
          <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">DS / Lib</span>
        </div>
        <div className="font-semibold text-[13px] text-text-1 leading-tight">{node.name}</div>
        {node.description && (
          <div className="text-[11px] text-text-2 mt-0.5 line-clamp-1">{node.description}</div>
        )}
      </div>

      {/* Tags */}
      {node.tags.length > 0 && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1">
          {node.tags.slice(0, 5).map(tag => (
            <span
              key={tag}
              className="text-[10px] font-mono bg-bg border border-border rounded-full px-2 py-0.5 text-text-2"
            >
              {tag}
            </span>
          ))}
          {node.tags.length > 5 && (
            <span className="text-[10px] text-text-3">+{node.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* Figma link */}
      {node.figmaFileKey && (
        <div className="px-3 pb-2.5 flex items-center gap-1.5">
          <Link2 size={10} className="text-text-3 flex-shrink-0" />
          <span className="text-[10px] font-mono text-text-3 truncate">Figma linked</span>
        </div>
      )}

      {/* Output connector handle — right edge, vertically centered at CONN_HANDLE_Y */}
      <div
        data-handle
        data-from-id={node.id}
        className="absolute right-0 top-[44px] translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-surface border-2 border-border-strong rounded-full cursor-crosshair hover:border-brand-blue hover:scale-125 transition-all z-10"
        onPointerDown={onHandlePointerDown}
      />
    </>
  )
}

// ── Journey Node ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  'draft':       'bg-bg border-border text-text-3',
  'in-progress': 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber',
  'ready':       'bg-brand-green/10 border-brand-green/30 text-brand-green',
  'generated':   'bg-brand-purple/10 border-brand-purple/30 text-brand-purple',
}

function JourneyNodeContent({ node }: { node: MacroNode }) {
  return (
    <>
      {/* Header */}
      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
              <GitBranch size={10} className="text-brand-purple" />
            </div>
            <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">Journey</span>
          </div>
          {node.status && (
            <span
              className={cn(
                'text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border',
                STATUS_STYLES[node.status] ?? STATUS_STYLES['draft'],
              )}
            >
              {node.status}
            </span>
          )}
        </div>
        <div className="font-semibold text-[13px] text-text-1 leading-tight">{node.name}</div>
        {node.description && (
          <div className="text-[11px] text-text-2 mt-0.5 line-clamp-1">{node.description}</div>
        )}
      </div>

      {/* Double-click hint */}
      <div className="px-3 pb-2.5">
        <span className="text-[10px] text-text-3">Double-click to open</span>
      </div>
    </>
  )
}
