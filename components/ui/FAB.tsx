'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Layers, GitBranch, FileText, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, makeNode, makeFlow, makeScreen } from '@/utils'

export function FAB() {
  const store = useStore()
  const fabOpen  = useStore(s => s.fabOpen)
  const view     = useStore(s => s.view)
  const canvas   = useStore(s => s.canvas())
  const curJourneyId = useStore(s => s.curJourneyId)
  const activeFlow   = useStore(s => s.activeFlow())

  const btnRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!fabOpen) return
    function onDown(e: MouseEvent) {
      if (!btnRef.current?.closest('[data-fab]')?.contains(e.target as Node)) {
        store.closeFab()
      }
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [fabOpen, store])

  function getViewCenter(): { x: number; y: number } {
    const { x, y, scale } = useStore.getState().transform
    // Approximate canvas viewport center
    return {
      x: (600 - x) / scale,
      y: (300 - y) / scale,
    }
  }

  function addDSNode() {
    const projectId = store.curProjectId
    if (!projectId) return
    const pos = getViewCenter()
    const count = canvas?.nodes.filter(n => n.type === 'ds').length ?? 0
    const node = makeNode({
      type:      'ds',
      name:      `Design System ${count + 1}`,
      projectId,
      position:  { x: pos.x - 40 * count, y: pos.y },
    })
    store.addNode(node)
    store.selectNode(node.id)
    store.closeFab()
  }

  function addJourneyNode() {
    const projectId = store.curProjectId
    if (!projectId) return
    const pos = getViewCenter()
    const count = canvas?.nodes.filter(n => n.type === 'journey').length ?? 0
    const node = makeNode({
      type:      'journey',
      name:      `Journey ${count + 1}`,
      projectId,
      status:    'draft',
      position:  { x: pos.x + 40 * count, y: pos.y },
    })
    const flow = makeFlow({
      journeyId: node.id,
      projectId,
      name:      'Main Flow',
      order:     0,
    })
    store.addNode(node)
    store.addFlow(node.id, flow)
    store.selectNode(node.id)
    store.closeFab()
  }

  function addScreen() {
    if (!curJourneyId || !activeFlow || !store.curProjectId) return
    const count = activeFlow.screens.length
    const screen = makeScreen({
      flowId:    activeFlow.id,
      projectId: store.curProjectId,
      name:      `Screen ${count + 1}`,
      position:  { x: 160 + count * 220, y: 160 },
      order:     count,
    })
    store.addScreen(curJourneyId, activeFlow.id, screen)
    store.selectScreen(screen.id)
    store.closeFab()
  }

  const macroActions = [
    {
      icon: <Layers size={14} />,
      label: 'DS / Library',
      description: 'Add a Design System node',
      onClick: addDSNode,
    },
    {
      icon: <GitBranch size={14} />,
      label: 'Journey',
      description: 'Add a user journey',
      onClick: addJourneyNode,
    },
  ]

  const microActions = [
    {
      icon: <FileText size={14} />,
      label: 'Screen',
      description: 'Add a screen to this flow',
      onClick: addScreen,
    },
  ]

  const actions = view === 'micro' ? microActions : macroActions

  return (
    <div data-fab className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {/* Options */}
      {fabOpen && (
        <div className="flex flex-col gap-1.5 items-center animate-fadein mb-1">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2.5 px-3 py-2 bg-surface border border-border rounded-[10px] shadow-md hover:border-border-strong hover:shadow-lg transition-all text-left min-w-[180px]"
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-[6px] bg-bg border border-border text-text-1 flex-shrink-0">
                {action.icon}
              </span>
              <div>
                <div className="text-[13px] font-medium text-text-1">{action.label}</div>
                <div className="text-[11px] text-text-3">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main button */}
      <button
        ref={btnRef}
        onClick={() => store.toggleFab()}
        className={cn(
          'w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all',
          fabOpen
            ? 'bg-text-1 text-white hover:bg-neutral-800'
            : 'bg-text-1 text-white hover:bg-neutral-800 hover:scale-105',
        )}
      >
        {fabOpen ? <X size={18} /> : <Plus size={18} />}
      </button>
    </div>
  )
}
