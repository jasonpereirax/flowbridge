'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/utils'
import { useState } from 'react'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconD2C() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
      <rect x="9" y="9" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
      <path d="M6.5 4.75h1.5M10.5 12.25h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 4.75L10 6.5 8.5 8.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconBench() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="1.5" y="2.5" width="14" height="12" rx="1.8" stroke="currentColor" strokeWidth="1.35"/>
      <path d="M3 11.5l3-3.5 2.5 2.5 3-4.5 2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconPlanning() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="2" y="4" width="13" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.35"/>
      <path d="M5.5 2v4M11.5 2v4M2 8h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M5 11h2M9 11h3M5 13.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IconPrototype() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="8.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.35"/>
      <path d="M8.5 2.5v2M8.5 12.5v2M2.5 8.5h2M12.5 8.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2.2 1.8"/>
    </svg>
  )
}

// ─── Product config ───────────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 'd2c',       label: 'Design to Code', soon: false, Icon: IconD2C },
  { id: 'benchmark', label: 'Benchmarking',   soon: true,  Icon: IconBench },
  { id: 'planning',  label: 'Planning',       soon: true,  Icon: IconPlanning },
  { id: 'prototype', label: 'Prototype',      soon: true,  Icon: IconPrototype },
] as const

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function IbarTooltip({ label, soon }: { label: string; soon: boolean }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 flex items-center gap-[6px] opacity-0 -translate-x-[6px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 delay-200">
      <span className="relative bg-text-1 text-white text-[11px] font-medium px-[9px] py-[5px] rounded-[7px] shadow-lg whitespace-nowrap flex items-center gap-[5px]">
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-text-1" />
        {label}
        {soon && (
          <span className="bg-white/20 text-[9px] font-bold px-[4px] py-[1px] rounded-full tracking-widest">SOON</span>
        )}
      </span>
    </span>
  )
}

// ─── Ibar ─────────────────────────────────────────────────────────────────────

export function Ibar() {
  const router = useRouter()
  const [activeProduct, setActiveProduct] = useState<string>('d2c')

  return (
    <aside className="w-[48px] bg-surface border-r border-border flex flex-col flex-shrink-0 select-none z-20">

      {/* ── Logo ── */}
      <div className="h-[46px] border-b border-border flex items-center justify-center flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="relative group w-[28px] h-[28px] bg-text-1 rounded-[7px] flex items-center justify-center hover:bg-neutral-700 active:scale-95 transition-all"
        >
          <span className="text-white font-serif italic text-[14px] leading-none">F</span>
          <IbarTooltip label="Flowbridge Studio" soon={false} />
        </button>
      </div>

      {/* ── Product nav ── */}
      <nav className="flex flex-col items-center gap-[4px] px-[7px] pt-[12px]">
        {PRODUCTS.map(({ id, label, soon, Icon }) => {
          const isActive = activeProduct === id
          return (
            <button
              key={id}
              onClick={() => { if (!soon) setActiveProduct(id) }}
              className={cn(
                'relative group w-[34px] h-[34px] rounded-[9px] flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-text-1 text-white shadow-sm'
                  : soon
                  ? 'text-text-3/50 cursor-not-allowed'
                  : 'text-text-2 hover:text-text-1 hover:bg-bg',
              )}
            >
              <Icon />
              {/* Active pip */}
              {isActive && (
                <span className="absolute top-[4px] right-[4px] w-[5px] h-[5px] rounded-full bg-brand-blue ring-[1.5px] ring-surface" />
              )}
              <IbarTooltip label={label} soon={soon} />
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* ── Home (bottom) ── */}
      <div className="flex flex-col items-center px-[7px] pb-[10px] border-t border-border pt-[10px] flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="relative group w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg transition-all duration-150"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M1.5 7.5L7.5 2l6 5.5M3 6.5V13h3.5v-3h2v3H12V6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <IbarTooltip label="All projects" soon={false} />
        </button>
      </div>

    </aside>
  )
}
