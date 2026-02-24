'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers, GitBranch, Tag, FileText, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, makeFlow, makeScreen, now } from '@/utils'
import type { MacroNode, Flow } from '@/types'

export function Ebar() {
  const store       = useStore()
  const ebarOpen    = useStore(s => s.ebarOpen)
  const ebarSection = useStore(s => s.ebarSection)
  const canvas      = useStore(s => s.canvas())
  const selNodeId   = useStore(s => s.selNodeId)
  const selScreenId = useStore(s => s.selScreenId)
  const view        = useStore(s => s.view)
  const curJourneyId = useStore(s => s.curJourneyId)

  if (!ebarOpen) return null

  const nodes = canvas?.nodes ?? []
  const dsNodes      = nodes.filter(n => n.type === 'ds')
  const journeyNodes = nodes.filter(n => n.type === 'journey')

  return (
    <div className="w-56 flex-shrink-0 border-r border-border bg-surface overflow-y-auto z-20">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <span className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">
          {ebarSection === 'macro' ? 'Workspace' : 'Components'}
        </span>
      </div>

      {ebarSection === 'macro' && (
        <div className="py-1">
          {/* DS Nodes section */}
          {dsNodes.length > 0 && (
            <div className="mb-1">
              <div className="px-3 py-1 flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">Design Systems</span>
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

          {/* Journey Nodes section */}
          {journeyNodes.length > 0 && (
            <div>
              <div className="px-3 py-1 flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">Journeys</span>
              </div>
              {journeyNodes.map(node => (
                <JourneyNodeRow
                  key={node.id}
                  node={node}
                  isSelected={selNodeId === node.id && view === 'macro'}
                  selScreenId={selScreenId}
                  currentJourneyId={curJourneyId}
                  onSelect={() => {
                    store.goMacro()
                    store.selectNode(node.id)
                  }}
                  onOpen={() => store.openJourney(node.id)}
                />
              ))}
            </div>
          )}

          {nodes.length === 0 && (
            <div className="px-3 py-4 text-[11px] text-text-3 text-center">
              No nodes yet. Use + to add.
            </div>
          )}
        </div>
      )}

      {ebarSection === 'comp' && (
        <div className="px-3 py-4 text-[11px] text-text-3 text-center">
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
          'w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors',
          isSelected ? 'bg-bg text-text-1' : 'hover:bg-bg text-text-2',
        )}
      >
        <span className="text-text-3 flex-shrink-0">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <Layers size={12} className="text-brand-blue flex-shrink-0" />
        <span className="text-[12px] font-medium truncate flex-1">{node.name}</span>
      </button>

      {open && node.tags.length > 0 && (
        <div className="pl-8 pb-1">
          {node.tags.map(tag => (
            <div key={tag} className="flex items-center gap-1.5 px-2 py-1">
              <Tag size={10} className="text-text-3 flex-shrink-0" />
              <span className="text-[11px] text-text-2 truncate">{tag}</span>
            </div>
          ))}
        </div>
      )}

      {open && node.tags.length === 0 && (
        <div className="pl-8 pb-1 px-2 py-1 text-[10px] text-text-3">No tags yet</div>
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
  const store = useStore()
  const [open, setOpen] = useState(false)
  const canvas = useStore(s => s.canvas())
  const flows  = canvas?.flows[node.id] ?? []

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 transition-colors',
          isSelected ? 'bg-bg text-text-1' : 'hover:bg-bg text-text-2',
        )}
      >
        <button
          onClick={() => setOpen(o => !o)}
          className="text-text-3 flex-shrink-0 p-0.5"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button
          onClick={onSelect}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <GitBranch size={12} className="text-brand-purple flex-shrink-0" />
          <span className="text-[12px] font-medium truncate flex-1">{node.name}</span>
        </button>
        <button
          onClick={onOpen}
          className="text-[10px] text-text-3 hover:text-text-1 px-1 py-0.5 rounded hover:bg-border/50 transition-colors flex-shrink-0"
        >
          open
        </button>
      </div>

      {open && (
        <div className="pl-6 pb-1">
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
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-bg text-text-2 transition-colors"
      >
        <span className="text-text-3 flex-shrink-0">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <span className="text-[11px] truncate flex-1">{flow.name}</span>
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
            'w-full flex items-center gap-1.5 pl-7 pr-2 py-1 text-left hover:bg-bg transition-colors',
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
