'use client'

import { useMemo } from 'react'
import type { MacroNode, Connection } from '@/types'

const NODE_W  = 220
const NODE_H  = 116
const HEADER_H = 44

interface ConnectorLayerProps {
  nodes:           MacroNode[]
  conns:           Connection[]
  pendingConn?:    { x1: number; y1: number; x2: number; y2: number } | null
  selectedConnId:  string | null
  onConnSelect?:   (connId: string) => void
  onConnDelete?:   (connId: string) => void
  /** Called when user starts dragging an endpoint to reconnect */
  onReconnectStart?: (connId: string, endpoint: 'from' | 'to', x: number, y: number, pointerId: number) => void
}

function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1)
  const h  = Math.max(60, Math.min(dx * 0.55, 220))
  return `M ${x1} ${y1} C ${x1 + h} ${y1}, ${x2 - h} ${y2}, ${x2} ${y2}`
}

function midpoint(x1: number, y1: number, x2: number, y2: number) {
  // Approximate midpoint along bezier — good enough for badge placement
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
}

export function ConnectorLayer({
  nodes,
  conns,
  pendingConn,
  selectedConnId,
  onConnSelect,
  onConnDelete,
  onReconnectStart,
}: ConnectorLayerProps) {

  const paths = useMemo(() => {
    return conns.flatMap(conn => {
      const from = nodes.find(n => n.id === conn.fromId)
      const to   = nodes.find(n => n.id === conn.toId)
      if (!from || !to) return []

      const x1 = from.position.x + NODE_W
      const y1 = from.position.y + HEADER_H
      const x2 = to.position.x
      const y2 = to.position.y + NODE_H / 2

      return [{ id: conn.id, d: cubicPath(x1, y1, x2, y2), x1, y1, x2, y2 }]
    })
  }, [nodes, conns])

  return (
    <svg
      className="absolute inset-0 overflow-visible"
      style={{ width: 8000, height: 8000 }}
    >
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5" fill="none" stroke="#C9C9C3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="arr-sel" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5" fill="none" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {paths.map(p => {
        const isSel = selectedConnId === p.id
        const mid   = midpoint(p.x1, p.y1, p.x2, p.y2)

        return (
          <g key={p.id} className="group">

            {/* Wide invisible hit area — receives click for select */}
            <path
              d={p.d}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onClick={e => { e.stopPropagation(); onConnSelect?.(p.id) }}
            />

            {/* Glow when selected */}
            {isSel && (
              <path
                d={p.d}
                fill="none"
                stroke="#2563EB"
                strokeWidth={6}
                strokeOpacity={0.18}
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Visible stroke */}
            <path
              d={p.d}
              fill="none"
              stroke={isSel ? '#2563EB' : '#C9C9C3'}
              strokeWidth={isSel ? 2 : 1.5}
              strokeLinecap="round"
              markerEnd={isSel ? 'url(#arr-sel)' : 'url(#arr)'}
              style={{ pointerEvents: 'none' }}
              className="transition-colors duration-100 group-hover:[stroke:#18181A]"
            />

            {/* ── Delete badge — pure SVG, no foreignObject ── */}
            {/* Visible on hover OR when selected */}
            <g
              style={{
                opacity: isSel ? 1 : undefined,
                cursor: 'pointer',
                pointerEvents: 'all',
              }}
              className={isSel ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}
              onClick={e => { e.stopPropagation(); onConnDelete?.(p.id) }}
            >
              {/* Badge circle */}
              <circle
                cx={mid.x}
                cy={mid.y}
                r={10}
                fill="white"
                stroke={isSel ? '#FECACA' : '#E3E3DF'}
                strokeWidth={1}
                filter="drop-shadow(0 1px 2px rgba(0,0,0,.10))"
              />
              {/* X mark */}
              <path
                d={`M${mid.x-3.5} ${mid.y-3.5} L${mid.x+3.5} ${mid.y+3.5} M${mid.x+3.5} ${mid.y-3.5} L${mid.x-3.5} ${mid.y+3.5}`}
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
              />
            </g>

            {/* ── Reconnect handles on both endpoints ── */}
            {/* FROM handle (at DS side) */}
            <circle
              cx={p.x1}
              cy={p.y1}
              r={6}
              fill="#7C3AED"
              fillOpacity={0.15}
              stroke="#7C3AED"
              strokeWidth={1.5}
              style={{ cursor: 'crosshair', pointerEvents: 'all' }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onPointerDown={e => {
                e.stopPropagation()
                onReconnectStart?.(p.id, 'from', p.x1, p.y1, e.pointerId)
              }}
            />
            {/* TO handle (at Journey side) */}
            <circle
              cx={p.x2}
              cy={p.y2}
              r={6}
              fill="#2563EB"
              fillOpacity={0.15}
              stroke="#2563EB"
              strokeWidth={1.5}
              style={{ cursor: 'crosshair', pointerEvents: 'all' }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onPointerDown={e => {
                e.stopPropagation()
                onReconnectStart?.(p.id, 'to', p.x2, p.y2, e.pointerId)
              }}
            />

          </g>
        )
      })}

      {/* Pending drag connector */}
      {pendingConn && (
        <g style={{ pointerEvents: 'none' }}>
          <path
            d={cubicPath(pendingConn.x1, pendingConn.y1, pendingConn.x2, pendingConn.y2)}
            fill="none"
            stroke="#7C3AED"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinecap="round"
            opacity={0.7}
          />
          <circle cx={pendingConn.x2} cy={pendingConn.y2} r={4} fill="#7C3AED" opacity={0.5} />
        </g>
      )}
    </svg>
  )
}
