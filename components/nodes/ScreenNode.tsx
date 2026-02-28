'use client'

import { useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn, screenCompleteness } from '@/utils'
import type { Screen } from '@/types'

interface ScreenNodeCardProps {
  screen:      Screen
  isSelected?: boolean
}

// Pure display component — interaction handled by useCanvasInteraction
export function ScreenNodeCard({ screen, isSelected }: ScreenNodeCardProps) {
  const store        = useStore()
  const completeness = screenCompleteness(screen)

  const barColor = completeness >= 80 ? '#16A34A' : completeness >= 50 ? '#D97706' : '#DC2626'

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    store.selectScreen(screen.id)
  }, [screen.id, store])

  return (
    <div
      className={cn(
        'absolute bg-surface rounded-[10px] border select-none cursor-grab active:cursor-grabbing',
        'w-[180px] overflow-hidden',
        'shadow-[0_2px_8px_rgba(0,0,0,.08)]',
        isSelected
          ? 'border-brand-blue ring-2 ring-brand-blue/20 shadow-[0_4px_16px_rgba(0,0,0,.12)]'
          : 'border-border hover:border-border-strong hover:shadow-[0_4px_12px_rgba(0,0,0,.1)]',
      )}
      style={{ left: screen.position.x, top: screen.position.y }}
      data-screen
      data-screen-id={screen.id}
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
    >
      {/* Thumbnail / placeholder */}
      <div className="relative w-full h-[120px] bg-bg border-b border-border flex items-center justify-center overflow-hidden">
        {screen.figma?.thumbnailUrl ? (
          <img
            src={screen.figma.thumbnailUrl}
            alt={screen.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-[28px] mb-[4px] opacity-30">⬜</div>
            <div className="text-[10px] text-text-3">No design linked</div>
          </div>
        )}

        {/* State badges */}
        <div className="absolute top-[6px] right-[6px] flex gap-[4px]">
          {screen.isEntry && (
            <span className="px-[6px] py-[2px] bg-[#16A34A] text-white text-[9px] font-semibold rounded-[4px]">
              Entry
            </span>
          )}
          {screen.isError && (
            <span className="px-[6px] py-[2px] bg-[#DC2626] text-white text-[9px] font-semibold rounded-[4px]">
              Error
            </span>
          )}
        </div>

        {/* Completeness bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${completeness}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-[10px] py-[8px]">
        <div className="text-[11.5px] font-semibold text-text-1 truncate mb-[4px]">
          {screen.name}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-text-3 truncate">
            {screen.context.route || '(no route)'}
          </span>
          <span className={cn(
            'text-[9.5px] font-medium px-[5px] py-[1px] rounded-[4px] flex-shrink-0',
            screen.status === 'empty'     && 'bg-bg text-text-3 border border-border',
            screen.status === 'partial'   && 'bg-[#FFFBEB] text-[#D97706]',
            screen.status === 'ready'     && 'bg-[#F0FDF4] text-[#16A34A]',
            screen.status === 'generated' && 'bg-[#EFF6FF] text-[#2563EB]',
          )}>
            {screen.status}
          </span>
        </div>
      </div>
    </div>
  )
}
