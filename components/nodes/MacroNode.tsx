'use client'

import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { MacroNode as MacroNodeType } from '@/types'

export const MACRO_NODE_W = 220

interface MacroNodeCardProps {
  node:        MacroNodeType
  isSelected?: boolean
}

// Interaction (drag, single-click select, double-click open) is handled
// by useCanvasInteraction via pointer events on the parent canvas element.
// Do NOT add onDoubleClick here — it conflicts with pointer capture.
export function MacroNodeCard({ node, isSelected }: MacroNodeCardProps) {
  const store     = useStore()
  const isDS      = node.type === 'ds'
  const canvas    = store.canvasData[store.curProjectId!]
  const connCount = canvas?.conns.filter(c => c.fromId === node.id || c.toId === node.id).length ?? 0
  const flows     = canvas?.flows[node.id] ?? []

  return (
    <div
      className={cn(
        'absolute bg-surface rounded-[10px] border select-none cursor-grab active:cursor-grabbing',
        'transition-shadow duration-150 node-enter',
        isSelected
          ? 'border-brand-blue ring-2 ring-brand-blue/20 shadow-[0_4px_16px_rgba(0,0,0,.12)]'
          : 'border-border hover:border-border-strong hover:shadow-[0_4px_12px_rgba(0,0,0,.08)]',
      )}
      style={{ left: node.position.x, top: node.position.y, width: MACRO_NODE_W }}
      data-node
      data-macro-id={node.id}
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

          {/* DS: drag handle to connect */}
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

          {/* Journey: double-click hint */}
          {!isDS && (
            <span className="text-[9px] text-text-3 font-mono select-none">↩ dbl-click</span>
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

        {/* Journey: show flow count as tags */}
        {!isDS && flows.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mb-[8px]">
            {flows.slice(0, 3).map(f => (
              <span key={f.id} className="inline-flex px-[6px] py-[1.5px] rounded-full text-[10px] font-medium bg-bg text-text-2 border border-border">
                {f.name}
              </span>
            ))}
            {flows.length > 3 && (
              <span className="text-[10px] text-text-3 px-[4px] py-[1.5px]">+{flows.length - 3}</span>
            )}
          </div>
        )}

        {/* DS: show component tags */}
        {isDS && node.tags.length > 0 && (
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
            {isDS
              ? `${connCount} conn${connCount !== 1 ? 's' : ''}`
              : `${flows.length} flow${flows.length !== 1 ? 's' : ''}`
            }
          </span>
          {/* Status dot for journeys */}
          {!isDS && node.status && (
            <span className={cn(
              'text-[8.5px] font-semibold uppercase tracking-[.06em] font-mono px-[5px] py-[1px] rounded-full',
              node.status === 'draft'       ? 'bg-bg text-text-3 border border-border' :
              node.status === 'in-progress' ? 'bg-yellow-50 text-yellow-600' :
              node.status === 'ready'       ? 'bg-green-50 text-green-600' :
              'bg-blue-50 text-brand-blue',
            )}>
              {node.status}
            </span>
          )}
          {isDS && (
            <div className={cn(
              'w-[6px] h-[6px] rounded-full flex-shrink-0',
              connCount > 0 ? 'bg-brand-purple' : 'bg-border-strong',
            )} />
          )}
        </div>
      </div>
    </div>
  )
}
