'use client'

import { useEffect, useRef } from 'react'
import { Layers, GitBranch, FileText } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, makeNode, makeFlow, makeScreen } from '@/utils'

export function FAB() {
  const store        = useStore()
  const fabOpen      = useStore(s => s.fabOpen)
  const view         = useStore(s => s.view)
  const canvas       = useStore(s => s.canvas())
  const curJourneyId = useStore(s => s.curJourneyId)
  const activeFlow   = useStore(s => s.activeFlow())

  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fabOpen) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) store.closeFab()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [fabOpen, store])

  function getViewCenter() {
    const { x, y, scale } = useStore.getState().transform
    return { x: (600 - x) / scale, y: (300 - y) / scale }
  }

  function addDSNode() {
    const projectId = store.curProjectId; if (!projectId) return
    const pos   = getViewCenter()
    const count = canvas?.nodes.filter(n => n.type === 'ds').length ?? 0
    const node  = makeNode({ type: 'ds', name: `Design System ${count + 1}`, projectId, position: { x: pos.x - 40 * count, y: pos.y } })
    store.addNode(node); store.selectNode(node.id); store.closeFab()
  }

  function addJourneyNode() {
    const projectId = store.curProjectId; if (!projectId) return
    const pos   = getViewCenter()
    const count = canvas?.nodes.filter(n => n.type === 'journey').length ?? 0
    const node  = makeNode({ type: 'journey', name: `Journey ${count + 1}`, projectId, status: 'draft', position: { x: pos.x + 40 * count, y: pos.y } })
    const flow  = makeFlow({ journeyId: node.id, projectId, name: 'Main Flow', order: 0 })
    store.addNode(node); store.addFlow(node.id, flow); store.selectNode(node.id); store.closeFab()
  }

  function addScreen() {
    if (!curJourneyId || !activeFlow || !store.curProjectId) return
    const count  = activeFlow.screens.length
    const screen = makeScreen({ flowId: activeFlow.id, projectId: store.curProjectId, name: `Screen ${count + 1}`, position: { x: 160 + count * 220, y: 160 }, order: count })
    store.addScreen(curJourneyId, activeFlow.id, screen); store.selectScreen(screen.id); store.closeFab()
  }

  const macroOptions = [
    { icon: <Layers size={17} />,    label: 'DS / Lib', colorClass: 'bg-brand-blue/10 border border-brand-blue/30 text-brand-blue',       onClick: addDSNode      },
    { icon: <GitBranch size={17} />, label: 'Journey',  colorClass: 'bg-brand-purple/10 border border-brand-purple/30 text-brand-purple',  onClick: addJourneyNode },
  ]

  const microOptions = [
    { icon: <FileText size={17} />, label: 'Screen', colorClass: 'bg-bg border border-border-strong text-text-2', onClick: addScreen },
  ]

  const options = view === 'micro' ? microOptions : macroOptions

  return (
    <div ref={wrapRef} className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">

      {/* Option icons — row of column (icon + label) */}
      <div className={cn(
        'flex items-end gap-[10px] transition-all duration-[180ms]',
        fabOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-[5px] pointer-events-none',
      )}>
        {options.map(opt => (
          <button
            key={opt.label}
            onClick={opt.onClick}
            className="flex flex-col items-center gap-[5px] cursor-pointer group"
          >
            <div className={cn(
              'w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shadow-md transition-transform group-hover:scale-[1.08]',
              opt.colorClass,
            )}>
              {opt.icon}
            </div>
            <span className="text-[11px] font-medium text-text-1 bg-surface border border-border px-2 py-px rounded-full shadow-sm whitespace-nowrap">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main button — rounded rect like v6 HTML .fab (border-radius: 13px) */}
      <button
        onClick={() => store.toggleFab()}
        className={cn(
          'w-[42px] h-[42px] rounded-[13px] bg-text-1 text-white flex items-center justify-center outline-none',
          'text-[22px] font-light leading-none select-none',
          'shadow-[0_4px_14px_rgba(24,24,26,0.22),0_1px_4px_rgba(24,24,26,0.12)]',
          'hover:scale-[1.05] hover:shadow-[0_6px_18px_rgba(24,24,26,0.28)] active:scale-[0.97]',
          fabOpen ? 'rotate-45' : 'rotate-0',
        )}
        style={{ transition: 'transform 170ms ease, box-shadow 170ms ease' }}
      >
        +
      </button>
    </div>
  )
}
