'use client'

import { useStore } from '@/lib/store'
import type { Connection, MacroNode } from '@/types'
import { NODE_WIDTH, CONN_HANDLE_Y } from '@/components/nodes/MacroNode'

interface PendingConn {
  fromId: string
  x1: number
  y1: number
  x2: number
  y2: number
}

interface ConnectorLayerProps {
  pendingConn?: PendingConn | null
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cp = Math.abs(x2 - x1) * 0.4 + 60
  return `M ${x1} ${y1} C ${x1 + cp} ${y1} ${x2 - cp} ${y2} ${x2} ${y2}`
}

function getEndpoints(conn: Connection, nodes: MacroNode[]): { x1: number; y1: number; x2: number; y2: number } | null {
  const from = nodes.find(n => n.id === conn.fromId)
  const to   = nodes.find(n => n.id === conn.toId)
  if (!from || !to) return null
  return {
    x1: from.position.x + NODE_WIDTH,
    y1: from.position.y + CONN_HANDLE_Y,
    x2: to.position.x,
    y2: to.position.y + CONN_HANDLE_Y,
  }
}

export function ConnectorLayer({ pendingConn }: ConnectorLayerProps) {
  const store     = useStore()
  const canvas    = useStore(s => s.canvas())
  const selConnId = useStore(s => s.selConnId)

  if (!canvas) return null

  const { nodes, conns } = canvas

  return (
    <svg
      className="absolute inset-0 overflow-visible"
      width={8000}
      height={8000}
      style={{ pointerEvents: 'none' }}
    >
      {/* Static connectors */}
      {conns.map(conn => {
        const ep = getEndpoints(conn, nodes)
        if (!ep) return null
        const isSelected = selConnId === conn.id
        const d = bezierPath(ep.x1, ep.y1, ep.x2, ep.y2)
        return (
          <g key={conn.id} style={{ pointerEvents: 'all' }}>
            {/* Wide invisible hit area */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'pointer' }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); store.selectConn(conn.id) }}
            />
            {/* Visible connector */}
            <path
              d={d}
              fill="none"
              stroke={isSelected ? '#18181A' : '#C9C9C3'}
              strokeWidth={isSelected ? 2 : 1.5}
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
            {/* Arrowhead at target */}
            <ConnArrow x={ep.x2} y={ep.y2} selected={isSelected} />
          </g>
        )
      })}

      {/* Pending connector drag */}
      {pendingConn && (
        <g style={{ pointerEvents: 'none' }}>
          <path
            d={bezierPath(pendingConn.x1, pendingConn.y1, pendingConn.x2, pendingConn.y2)}
            fill="none"
            stroke="#2563EB"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            strokeLinejoin="round"
          />
          <circle cx={pendingConn.x2} cy={pendingConn.y2} r={4} fill="#2563EB" />
        </g>
      )}
    </svg>
  )
}

function ConnArrow({ x, y, selected }: { x: number; y: number; selected: boolean }) {
  const color = selected ? '#18181A' : '#C9C9C3'
  return (
    <polygon
      points={`${x},${y} ${x - 7},${y - 4} ${x - 7},${y + 4}`}
      fill={color}
      style={{ pointerEvents: 'none' }}
    />
  )
}
