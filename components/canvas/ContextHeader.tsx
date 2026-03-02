'use client'

import { cn } from '@/utils'

// ─── Solution tabs for Design to Code ────────────────────────────────────────

type Solution = {
  id:      string
  label:   string
  soon:    boolean
  active:  boolean
}

const D2C_SOLUTIONS: Solution[] = [
  { id: 'context',      label: 'Context',      soon: false, active: true  },
  { id: 'accessibility',label: 'Accessibility', soon: true,  active: false },
  { id: 'analytics',    label: 'Analytics',    soon: true,  active: false },
  { id: 'preview',      label: 'Preview',      soon: true,  active: false },
  { id: 'publish',      label: 'Publish',      soon: true,  active: false },
]

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconContext() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="7" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

function IconAccessibility() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="2.5" r="1.2" stroke="currentColor" strokeWidth="1.15"/>
      <path d="M2 4.5h8M6 5.5v5M4 10l2-1.5L8 10M4 7.5l2 .5 2-.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/>
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1.5 9.5l2.5-3 2 2 2.5-3.5 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 11h10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )
}

function IconPreview() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 6C1 6 2.5 3 6 3s5 3 5 3-1.5 3-5 3S1 6 1 6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.15"/>
    </svg>
  )
}

function IconPublish() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 8V2M4 4l2-2 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 9v.5A1.5 1.5 0 003.5 11h5A1.5 1.5 0 0010 9.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

const ICONS: Record<string, React.ReactNode> = {
  context:       <IconContext />,
  accessibility: <IconAccessibility />,
  analytics:     <IconAnalytics />,
  preview:       <IconPreview />,
  publish:       <IconPublish />,
}

// ─── ContextHeader ────────────────────────────────────────────────────────────

export function ContextHeader() {
  return (
    <div className="h-[38px] bg-surface border-b border-border flex items-center px-[14px] gap-[2px] flex-shrink-0 z-20">

      {/* Product label */}
      <div className="flex items-center gap-[6px] mr-[12px] flex-shrink-0">
        <span className="text-[10px] font-semibold text-text-3 uppercase tracking-[0.08em]">Design to Code</span>
        <span className="w-[1px] h-[12px] bg-border-strong/60" />
      </div>

      {/* Solution tabs */}
      <nav className="flex items-center gap-[2px]">
        {D2C_SOLUTIONS.map(({ id, label, soon }) => {
          const isActive = id === 'context'
          return (
            <button
              key={id}
              disabled={soon}
              className={cn(
                'relative flex items-center gap-[5px] px-[9px] h-[26px] rounded-[6px] text-[11.5px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#EFF6FF] text-brand-blue'
                  : soon
                  ? 'text-text-3/50 cursor-not-allowed'
                  : 'text-text-2 hover:text-text-1 hover:bg-bg',
              )}
            >
              <span className={cn('flex-shrink-0', isActive ? 'text-brand-blue' : 'text-text-3')}>
                {ICONS[id]}
              </span>
              {label}
              {soon && (
                <span className="bg-border text-text-3 text-[8.5px] font-bold px-[4px] py-[1px] rounded-full tracking-wider uppercase">
                  soon
                </span>
              )}
              {/* Active underline */}
              {isActive && (
                <span className="absolute bottom-[-1px] left-[9px] right-[9px] h-[2px] rounded-full bg-brand-blue" />
              )}
            </button>
          )
        })}
      </nav>

    </div>
  )
}
