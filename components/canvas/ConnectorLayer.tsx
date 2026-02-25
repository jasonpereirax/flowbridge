'use client'

import { useMemo } from 'react'
import { cn } from '@/utils'
import type { MacroNode, Connection } from '@/types'

interface ConnectorLayerProps {
  nodes: MacroNode[]
  conns: Connection[]
  selectedConnId: string | null
  transform: { x: number; y: number; scale: number }
  onConnSelect?: (connId: string) => void
}

interface PathData {
  id: string
  path: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * ConnectorLayer
 * 
 * SVG layer rendering bezier curves between macro nodes.
 * 
 * Features:
 * - Smooth quadratic bezier curves
 * - Arrowhead endpoints
 * - Selection highlighting
 * - Hover effects
 * - Click to select
 * - Canvas transform-aware
 */
export function ConnectorLayer({
  nodes,
  conns,
  selectedConnId,
  transform,
  onConnSelect,
}: ConnectorLayerProps) {
  // Memoize path calculations
  const paths = useMemo<PathData[]>(() => {
    return conns
      .map((conn) => {
        const fromNode = nodes.find(n => n.id === conn.fromId)
        const toNode = nodes.find(n => n.id === conn.toId)

        if (!fromNode || !toNode) return null

        // Calculate positions (center of nodes)
        // MacroNode width = 224px (w-56), approximate height = 100px
        const nodeWidth = 224
        const nodeHeight = 100

        const x1 = fromNode.position.x + nodeWidth / 2
        const y1 = fromNode.position.y + nodeHeight

        const x2 = toNode.position.x + nodeWidth / 2
        const y2 = toNode.position.y

        // Quadratic bezier control point
        // Place it midway horizontally, below the curve to create arc
        const cpX = (x1 + x2) / 2
        const cpY = (y1 + y2) / 2 - 80

        // Generate SVG path data
        const pathData = `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`

        return {
          id: conn.id,
          path: pathData,
          x1,
          y1,
          x2,
          y2,
        }
      })
      .filter((p) => p !== null) as PathData[]
  }, [nodes, conns])

  const isSelected = (connId: string) => selectedConnId === connId

  const handlePathClick = (connId: string) => {
    onConnSelect?.(connId)
  }

  return (
    <svg
      className={cn(
        'absolute inset-0 w-full h-full',
        'pointer-events-none' // Will enable pointerEvents on individual elements
      )}
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}
    >
      {/* Define arrowhead marker */}
      <defs>
        <marker
          id="arrowhead-default"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="currentColor"
            className="text-gray-400"
          />
        </marker>

        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="currentColor"
            className="text-blue-500"
          />
        </marker>

        {/* Shadow filter for better visibility */}
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="2"
            floodOpacity="0.1"
          />
        </filter>
      </defs>

      {/* Render connector paths */}
      {paths.map((p) => {
        const selected = isSelected(p.id)

        return (
          <g
            key={p.id}
            className="connector-group"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Invisible thick hitbox for easier clicking */}
            <path
              d={p.path}
              stroke="transparent"
              strokeWidth="24"
              fill="none"
              className="cursor-pointer"
              style={{ pointerEvents: 'stroke' }}
              onClick={() => handlePathClick(p.id)}
              title={`Connection ${p.id.slice(0, 8)}`}
              role="button"
              tabIndex={0}
            />

            {/* Visible path with shadow */}
            <g filter="url(#shadow)">
              <path
                d={p.path}
                stroke={selected ? '#2563EB' : '#D1D5DB'}
                strokeWidth={selected ? 3 : 2}
                fill="none"
                markerEnd={selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-default)'}
                className={cn(
                  'transition-all duration-150 ease-out',
                  selected && 'opacity-100',
                  !selected && 'opacity-75 hover:opacity-100'
                )}
                pointerEvents="none"
              />
            </g>

            {/* Optional: selection glow on top */}
            {selected && (
              <path
                d={p.path}
                stroke="#2563EB"
                strokeWidth="6"
                fill="none"
                opacity="0.2"
                pointerEvents="none"
                className="transition-opacity duration-150"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
