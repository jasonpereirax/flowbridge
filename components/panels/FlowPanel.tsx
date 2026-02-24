'use client'

import { useState } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
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
    <div className="absolute top-3 left-3 bg-surface border border-border rounded-xl shadow-md z-20 min-w-[220px] max-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">Flows</span>
        <button
          onClick={() => setIsAdding(true)}
          className="w-5 h-5 flex items-center justify-center rounded text-text-2 hover:bg-bg hover:text-text-1 transition-colors"
          title="Add flow"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Flow tabs */}
      <div className="py-1 max-h-48 overflow-y-auto">
        {flows.map(flow => (
          <button
            key={flow.id}
            onClick={() => store.setActiveFlow(journey.id, flow.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors',
              activeFlow?.id === flow.id
                ? 'bg-bg text-text-1'
                : 'text-text-2 hover:bg-bg',
            )}
          >
            <span className="text-[12px] font-medium truncate">{flow.name}</span>
            <span className="text-[10px] font-mono text-text-3 flex-shrink-0 ml-2">
              {flow.screens.length}
            </span>
          </button>
        ))}

        {flows.length === 0 && !isAdding && (
          <div className="px-3 py-2 text-[11px] text-text-3">No flows yet</div>
        )}
      </div>

      {/* Add flow input */}
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
            className="w-full text-[12px] px-2 py-1.5 rounded-lg border border-border bg-bg outline-none focus:border-text-1 transition-colors"
          />
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={handleAddFlow}
              className="flex-1 text-[11px] bg-text-1 text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewName('') }}
              className="flex-1 text-[11px] text-text-2 px-2 py-1 rounded-lg border border-border hover:bg-bg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
