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
  { section: 'macro', icon: <Layers size={15} />, label: 'Workspace' },
  { section: 'comp',  icon: <Box size={15} />,    label: 'Components' },
]

export function Ibar() {
  const store       = useStore()
  const ebarOpen    = useStore(s => s.ebarOpen)
  const ebarSection = useStore(s => s.ebarSection)

  return (
    <div className="flex flex-col items-center gap-1 w-[44px] flex-shrink-0 border-r border-border bg-surface pt-2 z-30">
      {BUTTONS.map(btn => {
        const isActive = ebarOpen && ebarSection === btn.section
        return (
          <button
            key={btn.section}
            onClick={() => store.toggleEbar(btn.section)}
            className={cn(
              'group relative w-[30px] h-[30px] flex items-center justify-center rounded-[8px] border transition-all',
              isActive
                ? 'bg-bg text-text-1 border-border'
                : 'text-text-3 border-transparent hover:bg-bg hover:text-text-2 hover:border-border',
            )}
          >
            {btn.icon}
            <span className="absolute left-[calc(100%+9px)] top-1/2 -translate-y-1/2 bg-text-1 text-white text-[11px] px-2 py-[3px] rounded-[6px] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
              {btn.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
