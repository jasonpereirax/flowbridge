'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { cn, makeFlow } from '@/utils'

export function FlowPanel() {
  const store      = useStore()
  const canvas     = useStore(s => s.canvas())
  const journey    = useStore(s => s.journey())
  const activeFlow = useStore(s => s.activeFlow())

  const [isAdding, setIsAdding] = useState(false)
  const [newName,  setNewName]  = useState('')

  if (!journey) return null

  const flows = canvas?.flows[journey.id] ?? []

  function handleAddFlow() {
    if (!newName.trim() || !journey || !store.curProjectId) return
    const flow = makeFlow({
      journeyId: journey.id,
      projectId: store.curProjectId,
      name:      newName.trim(),
      order:     flows.length,
    })
    store.addFlow(journey.id, flow)
    setNewName('')
    setIsAdding(false)
  }

  return (
    <div className="w-[210px] flex-shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden z-20">
      {/* Header */}
      <div className="px-3 py-[9px] border-b border-border flex-shrink-0">
        <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-text-3">Flows</span>
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto">
        {flows.map(flow => (
          <button
            key={flow.id}
            onClick={() => store.setActiveFlow(journey.id, flow.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-[7px] text-left transition-colors',
              activeFlow?.id === flow.id ? 'bg-bg' : 'hover:bg-bg',
            )}
          >
            <span className={cn(
              'w-[6px] h-[6px] rounded-full flex-shrink-0 transition-colors',
              activeFlow?.id === flow.id ? 'bg-text-1' : 'bg-border-strong',
            )} />
            <span className={cn(
              'text-[12.5px] font-medium flex-1 truncate',
              activeFlow?.id === flow.id ? 'text-text-1' : 'text-text-2',
            )}>
              {flow.name}
            </span>
            <span className="text-[11px] font-mono text-text-3 flex-shrink-0">
              {flow.screens.length}
            </span>
          </button>
        ))}

        {flows.length === 0 && !isAdding && (
          <div className="px-3 py-3 text-[11px] text-text-3">No flows yet</div>
        )}
      </div>

      {/* Add flow inline input */}
      {isAdding && (
        <div className="px-2 py-2 border-t border-border">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddFlow()
              if (e.key === 'Escape') { setIsAdding(false); setNewName('') }
            }}
            placeholder="Flow name…"
            className="w-full text-[12px] px-[10px] py-[6px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
          />
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border flex-shrink-0">
        <button
          onClick={() => setIsAdding(true)}
          className="w-full bg-bg border border-border rounded-[8px] py-[6px] text-[12px] text-text-2 hover:text-text-1 hover:border-border-strong transition-colors"
        >
          + Add Flow
        </button>
      </div>
    </div>
  )
}
