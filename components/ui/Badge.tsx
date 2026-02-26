'use client'

import { cn } from '@/utils'

export type BadgeVariant = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-bg border-border text-text-2',
  blue:    'bg-brand-blue/10 border-brand-blue/30 text-brand-blue',
  green:   'bg-brand-green/10 border-brand-green/30 text-brand-green',
  amber:   'bg-brand-amber/10 border-brand-amber/30 text-brand-amber',
  red:     'bg-brand-red/10 border-brand-red/30 text-brand-red',
  purple:  'bg-brand-purple/10 border-brand-purple/30 text-brand-purple',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium font-mono px-1.5 py-0.5 rounded border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
