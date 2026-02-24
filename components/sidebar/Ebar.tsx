'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronRight, Layers, GitBranch, FileText } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { MacroNode, Flow } from '@/types'

export function Ebar() {
  const store        = useStore()
  const ebarOpen     = useStore(s => s.ebarOpen)
  const ebarSection  = useStore(s => s.ebarSection)
  const canvas       = useStore(s => s.canvas())
  const selNodeId    = useStore(s => s.selNodeId)
  const selScreenId  = useStore(s => s.selScreenId)
  const view         = useStore(s => s.view)
  const curJourneyId = useStore(s => s.curJourneyId)

  if (!ebarOpen) return null

  const nodes        = canvas?.nodes ?? []
  const dsNodes      = nodes.filter(n => n.type === 'ds')
  const journeyNodes = nodes.filter(n => n.type === 'journey')

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-border bg-surface shadow-lg overflow-y-auto z-25 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-[13px] pt-[11px] pb-[9px] border-b border-border flex-shrink-0">
        <span className="text-[13px] font-semibold tracking-tight text-text-1">
          {ebarSection === 'macro' ? 'Workspace' : 'Components'}
        </span>
        <button
          onClick={() => store.closeEbar()}
          className="w-[20px] h-[20px] flex items-center justify-center rounded-[4px] text-text-3 hover:bg-bg hover:text-text-1 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {ebarSection === 'macro' && (
        <div className="py-1 flex-1">
          {dsNodes.length > 0 && (
            <div className="mb-1">
              <div className="text-[10px] font-semibold tracking-[0.06em] uppercase text-text-3 px-[12px] pt-[10px] pb-1">
                Design Systems
              </div>
              {dsNodes.map(node => (
                <DSNodeRow
                  key={node.id}
                  node={node}
                  isSelected={selNodeId === node.id}
                  onSelect={() => store.selectNode(node.id)}
                />
              ))}
            </div>
          )}

          {journeyNodes.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-[0.06em] uppercase text-text-3 px-[12px] pt-[10px] pb-1">
                Journeys
              </div>
              {journeyNodes.map(node => (
                <JourneyNodeRow
                  key={node.id}
                  node={node}
                  isSelected={selNodeId === node.id && view === 'macro'}
                  selScreenId={selScreenId}
                  currentJourneyId={curJourneyId}
                  onSelect={() => { store.goMacro(); store.selectNode(node.id) }}
                  onOpen={() => store.openJourney(node.id)}
                />
              ))}
            </div>
          )}

          {nodes.length === 0 && (
            <div className="px-[12px] py-4 text-[11px] text-text-3 text-center">
              No nodes yet. Use + to add.
            </div>
          )}
        </div>
      )}

      {ebarSection === 'comp' && (
        <div className="px-[12px] py-4 text-[11px] text-text-3 text-center">
          Component library view coming soon.
        </div>
      )}
    </div>
  )
}

// ── DS Node row ───────────────────────────────────────────────────────────────

function DSNodeRow({
  node,
  isSelected,
  onSelect,
}: {
  node: MacroNode
  isSelected: boolean
  onSelect: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => { onSelect(); setOpen(o => !o) }}
        className={cn(
          'w-full flex items-center gap-[8px] px-[12px] py-[7px] text-left transition-colors',
          isSelected ? 'bg-bg text-text-1' : 'hover:bg-bg text-text-2',
        )}
      >
        <span className="text-text-3 flex-shrink-0">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <div className="w-[17px] h-[17px] rounded-[4px] bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
          <Layers size={9} className="text-brand-blue" />
        </div>
        <span className="text-[12.5px] font-medium truncate flex-1">{node.name}</span>
      </button>

      {open && (
        <div className="pl-[46px] pb-1">
          {node.tags.length > 0 ? node.tags.map(tag => (
            <div key={tag} className="flex items-center py-[3px]">
              <span className="text-[11px] text-text-2 truncate">{tag}</span>
            </div>
          )) : (
            <div className="py-1 text-[10px] text-text-3">No components yet</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Journey Node row ──────────────────────────────────────────────────────────

function JourneyNodeRow({
  node,
  isSelected,
  selScreenId,
  currentJourneyId,
  onSelect,
  onOpen,
}: {
  node: MacroNode
  isSelected: boolean
  selScreenId: string | null
  currentJourneyId: string | null
  onSelect: () => void
  onOpen: () => void
}) {
  const store  = useStore()
  const [open, setOpen] = useState(false)
  const canvas = useStore(s => s.canvas())
  const flows  = canvas?.flows[node.id] ?? []

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-[8px] px-[12px] py-[7px] transition-colors',
          isSelected ? 'bg-bg text-text-1' : 'hover:bg-bg text-text-2',
        )}
      >
        <button onClick={() => setOpen(o => !o)} className="text-text-3 flex-shrink-0">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <button
          onClick={onSelect}
          className="flex items-center gap-[8px] flex-1 min-w-0 text-left"
        >
          <div className="w-[17px] h-[17px] rounded-[4px] bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
            <GitBranch size={9} className="text-brand-purple" />
          </div>
          <span className="text-[12.5px] font-medium truncate flex-1">{node.name}</span>
        </button>
        <button
          onClick={onOpen}
          className="text-[10px] text-text-3 hover:text-text-1 px-1 py-0.5 rounded hover:bg-border/50 transition-colors flex-shrink-0"
        >
          open
        </button>
      </div>

      {open && (
        <div className="pl-[38px] pb-1">
          {flows.map(flow => (
            <FlowRow
              key={flow.id}
              flow={flow}
              journeyId={node.id}
              selScreenId={selScreenId}
              isCurrentJourney={currentJourneyId === node.id}
              onOpenJourney={onOpen}
            />
          ))}
          {flows.length === 0 && (
            <div className="px-2 py-1 text-[10px] text-text-3">No flows yet</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Flow row ──────────────────────────────────────────────────────────────────

function FlowRow({
  flow,
  journeyId,
  selScreenId,
  isCurrentJourney,
  onOpenJourney,
}: {
  flow: Flow
  journeyId: string
  selScreenId: string | null
  isCurrentJourney: boolean
  onOpenJourney: () => void
}) {
  const store = useStore()
  const [open, setOpen] = useState(false)

  function handleFlowClick() {
    if (!isCurrentJourney) onOpenJourney()
    store.setActiveFlow(journeyId, flow.id)
    setOpen(o => !o)
  }

  return (
    <div>
      <button
        onClick={handleFlowClick}
        className="w-full flex items-center gap-[8px] px-2 py-[6px] text-left hover:bg-bg text-text-2 transition-colors"
      >
        <span className="text-text-3 flex-shrink-0">
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
        <span className="text-[11.5px] truncate flex-1">{flow.name}</span>
        <span className="text-[10px] font-mono text-text-3 flex-shrink-0">{flow.screens.length}</span>
      </button>

      {open && flow.screens.map(screen => (
        <button
          key={screen.id}
          onClick={e => {
            e.stopPropagation()
            if (!isCurrentJourney) onOpenJourney()
            store.setActiveFlow(journeyId, flow.id)
            store.selectScreen(screen.id)
          }}
          className={cn(
            'w-full flex items-center gap-1.5 pl-7 pr-2 py-[5px] text-left hover:bg-bg transition-colors',
            selScreenId === screen.id ? 'text-text-1' : 'text-text-2',
          )}
        >
          <FileText size={10} className="text-text-3 flex-shrink-0" />
          <span className="text-[11px] truncate">{screen.name}</span>
        </button>
      ))}
    </div>
  )
}
