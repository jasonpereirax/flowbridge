'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/utils'
import { screenCompleteness } from '@/utils'
import type { Screen } from '@/types'

interface ScreenNodeCardProps {
  screen: Screen
  isSelected?: boolean
  onSelect?: (id: string) => void
  onDragStart?: (id: string, x: number, y: number) => void
  onDoubleClick?: (id: string) => void
}

/**
 * ScreenNodeCard
 * 
 * Visual representation of a screen in micro view.
 * 
 * Features:
 * - Figma thumbnail display
 * - Entry/Error state badges
 * - Completeness scoring ring (0-100%)
 * - Route and status display
 * - Drag to reposition
 * - Selection highlight
 */
export function ScreenNodeCard({
  screen,
  isSelected,
  onSelect,
  onDragStart,
  onDoubleClick,
}: ScreenNodeCardProps) {
  const completeness = screenCompleteness(screen)

  // Completeness color coding
  const completenessColor =
    completeness >= 80
      ? 'text-green-600 border-green-200'
      : completeness >= 50
        ? 'text-yellow-600 border-yellow-200'
        : 'text-red-600 border-red-200'

  // Event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      onDragStart?.(screen.id, e.clientX, e.clientY)
    },
    [screen.id, onDragStart]
  )

  const handleClick = useCallback(() => {
    onSelect?.(screen.id)
  }, [screen.id, onSelect])

  const handleDoubleClickLocal = useCallback(
    (_e: React.MouseEvent) => {
      onDoubleClick?.(screen.id)
    },
    [screen.id, onDoubleClick]
  )

  return (
    <div
      className={cn(
        // Base styles
        'absolute rounded-lg border-2 bg-white cursor-move',
        'transition-all duration-150 ease-out',
        'shadow-md hover:shadow-lg hover:border-gray-300',
        'w-48 overflow-hidden',
        // Selection state
        isSelected
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200'
      )}
      style={{
        left: `${screen.position.x}px`,
        top: `${screen.position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClickLocal}
      data-screen-id={screen.id}
      role="button"
      tabIndex={0}
      title={`Screen: ${screen.name}`}
    >
      {/* Thumbnail area */}
      <div className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 
                      border-b border-gray-200 flex items-center justify-center 
                      overflow-hidden">
        {screen.figma?.thumbnailUrl ? (
          <>
            <Image
              src={screen.figma.thumbnailUrl}
              alt={`Screenshot of ${screen.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 192px) 100vw, 192px"
            />
            {/* Overlay to improve readability of badges */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </>
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-1 opacity-50">🎨</div>
            <div className="text-xs text-gray-400 font-medium">
              No design linked
            </div>
          </div>
        )}

        {/* State badges (top-right) */}
        <div className="absolute top-2 right-2 flex gap-1 flex-shrink-0">
          {screen.isEntry && (
            <span className={cn(
              'px-2 py-1 bg-green-500 text-white text-xs font-semibold',
              'rounded shadow-sm'
            )}>
              Entry
            </span>
          )}
          {screen.isError && (
            <span className={cn(
              'px-2 py-1 bg-red-500 text-white text-xs font-semibold',
              'rounded shadow-sm'
            )}>
              Error
            </span>
          )}
        </div>

        {/* Completeness ring (bottom-left) */}
        <div className={cn(
          'absolute bottom-2 left-2',
          'w-12 h-12 rounded-full bg-white border-2 shadow-md',
          'flex flex-col items-center justify-center',
          completenessColor
        )}>
          <div className="text-sm font-bold">
            {completeness}%
          </div>
          <div className="text-xs text-gray-500">
            done
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {/* Screen name */}
        <h4 className="text-xs font-bold text-gray-900 truncate mb-1">
          {screen.name}
        </h4>

        {/* Footer metadata */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-mono text-xs truncate">
            {screen.context.route || '(no route)'}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
            screen.status === 'empty' && 'bg-gray-100 text-gray-600',
            screen.status === 'partial' && 'bg-yellow-100 text-yellow-700',
            screen.status === 'ready' && 'bg-green-100 text-green-700',
            screen.status === 'generated' && 'bg-blue-100 text-blue-700'
          )}>
            {screen.status}
          </span>
        </div>
      </div>
    </div>
  )
}
