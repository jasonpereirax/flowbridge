'use client'

import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'

export function Ibar() {
  const router = useRouter()

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

      {/* ── Spacer — nav icons moved to Ebar tabs ── */}
      <div className="flex-1" />

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
