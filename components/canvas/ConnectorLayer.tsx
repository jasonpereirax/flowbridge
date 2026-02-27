'use client'

import { useMemo } from 'react'
import type { MacroNode, Connection } from '@/types'

// Must match the MacroNode card dimensions (w-[220px])
const NODE_W  = 220
const NODE_H  = 116  // header ~68 + body ~48 — connector exits from right-center of header

interface ConnectorLayerProps {
  nodes:          MacroNode[]
  conns:          Connection[]
  pendingConn?:   { x1: number; y1: number; x2: number; y2: number } | null
  selectedConnId: string | null
  onConnSelect?:  (connId: string) => void
  onConnDelete?:  (connId: string) => void
}

/** Build a cubic bezier path between two points with horizontal handles.
 *  Exit right, enter left — standard flow-graph convention. */
function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1)
  // Handle strength: grow with distance, capped so it looks clean
  const h  = Math.max(60, Math.min(dx * 0.55, 220))
  return `M ${x1} ${y1} C ${x1 + h} ${y1}, ${x2 - h} ${y2}, ${x2} ${y2}`
}

export function ConnectorLayer({
  nodes,
  conns,
  pendingConn,
  selectedConnId,
  onConnSelect,
  onConnDelete,
}: ConnectorLayerProps) {

  const paths = useMemo(() => {
    return conns.flatMap(conn => {
      const from = nodes.find(n => n.id === conn.fromId)
      const to   = nodes.find(n => n.id === conn.toId)
      // Skip conns where either endpoint doesn't exist in the current view's node list
      if (!from || !to) return []

      // DS node: connector exits from right-center of the header area
      const x1 = from.position.x + NODE_W
      const y1 = from.position.y + 44   // vertical center of DS header

      // Journey node: connector enters from left-center
      const x2 = to.position.x
      const y2 = to.position.y + NODE_H / 2

      return [{ id: conn.id, d: cubicPath(x1, y1, x2, y2), x1, y1, x2, y2 }]
    })
  }, [nodes, conns])

  return (
    // NOTE: this SVG sits *inside* the already-transformed canvas div.
    // Do NOT add another transform — it would double-apply.
    // IMPORTANT: no pointer-events-none on root — individual decorative paths
    // get pointer-events:none. Hit areas need to receive click events.
    <svg
      className="absolute inset-0 overflow-visible"
      style={{ width: 8000, height: 8000 }}
    >
      <defs>
        {/* Default arrowhead */}
        <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5" fill="none" stroke="#C9C9C3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        {/* Selected arrowhead */}
        <marker id="arr-sel" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5" fill="none" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        {/* Hover arrowhead */}
        <marker id="arr-hov" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5" fill="none" stroke="#18181A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* Real connections */}
      {paths.map(p => {
        const isSel = selectedConnId === p.id
        return (
          <g key={p.id} className="group" style={{ pointerEvents: 'auto' }}>
            {/* Wide invisible hit area */}
            <path
              d={p.d}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              style={{ cursor: 'pointer' }}
              data-conn-hit
              onClick={e => { e.stopPropagation(); onConnSelect?.(p.id) }}
            />

            {/* Glow behind when selected */}
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
              className="transition-colors duration-100 group-hover:[stroke:#18181A]"
              style={{ pointerEvents: 'none' }}
            />

            {/* Delete badge — shown on hover near midpoint */}
            {!isSel && (
              <foreignObject
                x={(p.x1 + p.x2) / 2 - 10}
                y={(p.y1 + p.y2) / 2 - 10}
                width={20}
                height={20}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ pointerEvents: 'auto' }}
              >
                <div
                  className="w-[20px] h-[20px] rounded-full bg-surface border border-border flex items-center justify-center cursor-pointer shadow-sm hover:bg-[#FEF2F2] hover:border-[#FECACA] transition-colors"
                  onClick={e => { e.stopPropagation(); onConnDelete?.(p.id) }}
                  title="Delete connection"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </foreignObject>
            )}
          </g>
        )
      })}

      {/* Pending (in-progress drag) connector */}
      {pendingConn && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Dashed ghost line */}
          <path
            d={cubicPath(pendingConn.x1, pendingConn.y1, pendingConn.x2, pendingConn.y2)}
            fill="none"
            stroke="#7C3AED"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinecap="round"
            opacity={0.7}
          />
          {/* Dot at cursor end */}
          <circle cx={pendingConn.x2} cy={pendingConn.y2} r={4} fill="#7C3AED" opacity={0.5} />
        </g>
      )}
    </svg>
  )
}
