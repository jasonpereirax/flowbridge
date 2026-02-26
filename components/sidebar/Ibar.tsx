'use client'

import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import { Grid3x3, Layers } from 'lucide-react'

/**
 * Ibar
 * 
 * Icon strip on the left side of the canvas.
 * Toggles between sections: Macro nodes and Components.
 * 
 * Each icon represents a section that can be toggled via Ebar.
 */
export function Ibar() {
  const ebarSection = useStore(s => s.ebarSection)
  const store = useStore()

  const handleMacroToggle = () => {
    store.toggleEbar('macro')
  }

  const handleComponentToggle = () => {
    store.toggleEbar('comp')
  }

  return (
    <div className={cn(
      'w-14 bg-white border-r border-gray-200',
      'flex flex-col items-center gap-3 py-4',
      'flex-shrink-0',
      'select-none'
    )}>
      {/* Macro/Nodes section toggle */}
      <button
        onClick={handleMacroToggle}
        className={cn(
          'p-2 rounded-lg transition-all duration-150',
          'flex items-center justify-center',
          'text-2xl',
          ebarSection === 'macro'
            ? 'bg-blue-100 text-blue-600 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        )}
        title="Toggle Nodes & Journeys panel"
        aria-label="Nodes and Journeys"
        aria-pressed={ebarSection === 'macro'}
      >
        <Grid3x3 size={20} strokeWidth={2.5} />
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-gray-200" />

      {/* Components section toggle */}
      <button
        onClick={handleComponentToggle}
        className={cn(
          'p-2 rounded-lg transition-all duration-150',
          'flex items-center justify-center',
          'text-2xl',
          ebarSection === 'comp'
            ? 'bg-purple-100 text-purple-600 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        )}
        title="Toggle Components library"
        aria-label="Components"
        aria-pressed={ebarSection === 'comp'}
      >
        <Layers size={20} strokeWidth={2.5} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings or other icons can go here in future */}
    </div>
  )
}
