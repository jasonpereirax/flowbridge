'use client'

import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import { Home, GitBranch, Layers } from 'lucide-react'

export function Ibar() {
  const router      = useRouter()
  const store       = useStore()
  const ebarOpen    = useStore(s => s.ebarOpen)
  const ebarSection = useStore(s => s.ebarSection)

  function handleSectionClick(section: 'macro' | 'comp') {
    // Toggle: if already open on this section, close. Otherwise open on section.
    if (ebarOpen && ebarSection === section) {
      store.toggleEbar()
    } else {
      store.toggleEbar(section)
    }
  }

  return (
    <aside className="w-[48px] bg-surface border-r border-border flex flex-col flex-shrink-0 select-none z-20">

      {/* ── Logo ── */}
      <div className="h-[46px] border-b border-border flex items-center justify-center flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          title="Flowbridge"
          className="w-[26px] h-[26px] bg-text-1 rounded-[6px] flex items-center justify-center hover:bg-neutral-700 active:scale-95 transition-all"
        >
          <span className="text-white font-serif italic text-[13px] leading-none">F</span>
        </button>
      </div>

      {/* ── Nav icons ── */}
      <div className="flex flex-col flex-1 px-[7px] pt-[6px] gap-[2px]">

        {/* Journeys */}
        <IbarBtn
          icon={<GitBranch size={15} strokeWidth={1.8} />}
          label="Journeys"
          isActive={ebarOpen && ebarSection === 'macro'}
          onClick={() => handleSectionClick('macro')}
        />

        {/* Styles & DS */}
        <IbarBtn
          icon={<Layers size={15} strokeWidth={1.8} />}
          label="Styles & DS"
          isActive={ebarOpen && ebarSection === 'comp'}
          onClick={() => handleSectionClick('comp')}
        />

      </div>

      {/* ── Home (bottom) ── */}
      <div className="px-[7px] pb-[8px] flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          title="All projects"
          className="relative group w-full h-[30px] rounded-[7px] flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg transition-all duration-150"
        >
          <Home size={13} strokeWidth={1.8} />
          <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-text-1 text-white text-[11px] font-medium px-[8px] py-[4px] rounded-[6px] whitespace-nowrap shadow-md z-50 opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 delay-200">
            All projects
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-text-1" />
          </span>
        </button>
      </div>

    </aside>
  )
}

// ─── IbarBtn ─────────────────────────────────────────────────────────────────

interface IbarBtnProps {
  icon:     React.ReactNode
  label:    string
  isActive: boolean
  onClick:  () => void
}

function IbarBtn({ icon, label, isActive, onClick }: IbarBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative group w-[34px] h-[34px] rounded-[8px] flex items-center justify-center transition-all duration-150',
        isActive
          ? 'bg-bg text-text-1 shadow-[inset_0_0_0_1px_var(--border)]'
          : 'text-text-3 hover:bg-bg hover:text-text-2',
      )}
    >
      {/* Active accent bar */}
      {isActive && (
        <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-text-1 rounded-r-[2px]" />
      )}

      {icon}

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 translate-x-[-4px] bg-text-1 text-white text-[11px] font-medium px-[8px] py-[4px] rounded-[6px] whitespace-nowrap shadow-md z-50 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 delay-200">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-text-1" />
      </span>
    </button>
  )
}
