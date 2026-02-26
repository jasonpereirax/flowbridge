'use client'

import { useStore } from '@/lib/store'
import { useProject } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils'
import { Grid3x3, Layers, ArrowLeft } from 'lucide-react'

export function Ibar() {
  const store       = useStore()
  const project     = useProject()
  const router      = useRouter()
  const ebarSection = useStore(s => s.ebarSection)
  const ebarOpen    = useStore(s => s.ebarOpen)

  return (
    <div className={cn(
      'w-[46px] bg-surface border-r border-border',
      'flex flex-col items-center',
      'flex-shrink-0 select-none z-20'
    )}>

      {/* ── Logo / back to dashboard ── */}
      <button
        onClick={() => router.push('/')}
        className="w-full h-[46px] border-b border-border flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
        title="Back to projects"
      >
        <div className="w-[22px] h-[22px] bg-text-1 rounded-[5px] flex items-center justify-center text-white font-serif italic text-[12px] leading-none">
          F
        </div>
      </button>

      {/* ── Project name (rotated, vertical) ── */}
      <button
        onClick={() => store.toggleEbar()}
        className="w-full flex items-center justify-center py-[10px] border-b border-border hover:bg-bg transition-colors flex-shrink-0"
        title={project?.name ?? 'Project'}
      >
        <span
          className="text-[10px] font-semibold text-text-2 tracking-[.06em] uppercase leading-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {project?.name ?? '—'}
        </span>
      </button>

      {/* ── Nav icons ── */}
      <div className="flex flex-col items-center gap-[6px] py-[10px] flex-1">

        {/* Nodes & Journeys */}
        <button
          onClick={() => store.toggleEbar('macro')}
          className={cn(
            'w-[30px] h-[30px] rounded-[7px] flex items-center justify-center transition-all',
            ebarOpen && ebarSection === 'macro'
              ? 'bg-text-1 text-white'
              : 'text-text-3 hover:text-text-1 hover:bg-bg'
          )}
          title="Nodes & Journeys"
        >
          <Grid3x3 size={14} strokeWidth={2} />
        </button>

        {/* Components */}
        <button
          onClick={() => store.toggleEbar('comp')}
          className={cn(
            'w-[30px] h-[30px] rounded-[7px] flex items-center justify-center transition-all',
            ebarOpen && ebarSection === 'comp'
              ? 'bg-text-1 text-white'
              : 'text-text-3 hover:text-text-1 hover:bg-bg'
          )}
          title="Components"
        >
          <Layers size={14} strokeWidth={2} />
        </button>
      </div>

      {/* ── Back to projects (bottom) ── */}
      <button
        onClick={() => router.push('/')}
        className="w-full h-[40px] border-t border-border flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg transition-colors flex-shrink-0"
        title="All projects"
      >
        <ArrowLeft size={13} strokeWidth={2} />
      </button>

    </div>
  )
}
