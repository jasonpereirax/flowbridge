'use client'

import { Layers, Box } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { EbarSection } from '@/types'

interface IbarButton {
  section: EbarSection
  icon:    React.ReactNode
  label:   string
}

const BUTTONS: IbarButton[] = [
  { section: 'macro', icon: <Layers size={16} />, label: 'Workspace' },
  { section: 'comp',  icon: <Box size={16} />,    label: 'Components' },
]

export function Ibar() {
  const store       = useStore()
  const ebarOpen    = useStore(s => s.ebarOpen)
  const ebarSection = useStore(s => s.ebarSection)

  return (
    <div className="flex flex-col items-center gap-1 w-11 flex-shrink-0 border-r border-border bg-surface py-2 z-30">
      {BUTTONS.map(btn => {
        const isActive = ebarOpen && ebarSection === btn.section
        return (
          <button
            key={btn.section}
            title={btn.label}
            onClick={() => store.toggleEbar(btn.section)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              isActive
                ? 'bg-text-1 text-white'
                : 'text-text-2 hover:bg-bg hover:text-text-1',
            )}
          >
            {btn.icon}
          </button>
        )
      })}
    </div>
  )
}
