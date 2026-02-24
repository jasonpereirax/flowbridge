'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, screenCompleteness } from '@/utils'
import type { RpanelTab, ApiEndpoint, MacroNode, Screen } from '@/types'

const RING_R    = 14
const RING_CIRC = 2 * Math.PI * RING_R

const TABS: { id: RpanelTab; label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'context',    label: 'Context' },
  { id: 'info',       label: 'Info' },
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export function RightPanel() {
  const store      = useStore()
  const rpanelOpen = useStore(s => s.rpanelOpen)
  const rpanelTab  = useStore(s => s.rpanelTab)
  const selNodeId  = useStore(s => s.selNodeId)
  const selScreenId = useStore(s => s.selScreenId)
  const canvas     = useStore(s => s.canvas())
  const curJourneyId = useStore(s => s.curJourneyId)
  const activeFlow = useStore(s => s.activeFlow())

  if (!rpanelOpen) return null

  const selNode   = selNodeId   ? canvas?.nodes.find(n => n.id === selNodeId) ?? null   : null
  const selScreen = selScreenId && curJourneyId && activeFlow
    ? activeFlow.screens.find(s => s.id === selScreenId) ?? null
    : null

  const entity = selScreen ? 'screen' : selNode ? 'node' : null

  // Context tab only available for screens
  const availableTabs = entity === 'screen'
    ? TABS
    : TABS.filter(t => t.id !== 'context')

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden z-20">
      {/* Panel header */}
      <div className="flex items-center justify-between px-[14px] py-[10px] border-b border-border flex-shrink-0">
        <span className="text-[12px] font-semibold text-text-1">
          {entity === 'screen' ? 'Screen' : entity === 'node' ? 'Node' : 'Inspector'}
        </span>
        <button
          onClick={() => store.closeRpanel()}
          className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px] text-text-3 hover:bg-bg hover:text-text-1 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-bg flex-shrink-0">
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => store.setRpTab(tab.id)}
            className={cn(
              'flex-1 py-[7px] text-[12px] font-medium text-center border-b-2 transition-all',
              rpanelTab === tab.id
                ? 'text-text-1 border-text-1 bg-surface'
                : 'text-text-3 border-transparent hover:text-text-2',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {entity === 'screen' && selScreen && curJourneyId && activeFlow && (
          <>
            {rpanelTab === 'properties' && (
              <ScreenProperties
                screen={selScreen}
                journeyId={curJourneyId}
                flowId={activeFlow.id}
              />
            )}
            {rpanelTab === 'context' && (
              <ScreenContextForm
                screen={selScreen}
                journeyId={curJourneyId}
                flowId={activeFlow.id}
              />
            )}
            {rpanelTab === 'info' && (
              <EntityInfo
                id={selScreen.id}
                createdAt={selScreen.createdAt}
                extra={[
                  { label: 'Flow', value: activeFlow.name },
                  { label: 'Status', value: selScreen.status },
                ]}
              />
            )}
          </>
        )}

        {entity === 'node' && selNode && (
          <>
            {rpanelTab === 'properties' && (
              <NodeProperties node={selNode} />
            )}
            {rpanelTab === 'info' && (
              <EntityInfo
                id={selNode.id}
                createdAt={selNode.createdAt}
                extra={[
                  { label: 'Type', value: selNode.type },
                ]}
              />
            )}
          </>
        )}

        {!entity && (
          <div className="p-4 text-[12px] text-text-3 text-center mt-4">
            Select a node or screen to inspect.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Screen Properties ─────────────────────────────────────────────────────────

function ScreenProperties({
  screen,
  journeyId,
  flowId,
}: {
  screen: Screen
  journeyId: string
  flowId: string
}) {
  const store = useStore()

  return (
    <div className="p-4 space-y-4">
      <Field label="Name">
        <input
          type="text"
          defaultValue={screen.name}
          onBlur={e => store.updateScreen(journeyId, flowId, screen.id, { name: e.target.value })}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
        />
      </Field>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={screen.isEntry ?? false}
            onChange={e => store.updateScreen(journeyId, flowId, screen.id, { isEntry: e.target.checked })}
            className="rounded"
          />
          <span className="text-[12px] text-text-2">Entry screen</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={screen.isError ?? false}
            onChange={e => store.updateScreen(journeyId, flowId, screen.id, { isError: e.target.checked })}
            className="rounded"
          />
          <span className="text-[12px] text-text-2">Error screen</span>
        </label>
      </div>
    </div>
  )
}

// ── Screen Context Form ───────────────────────────────────────────────────────

function ScreenContextForm({
  screen,
  journeyId,
  flowId,
}: {
  screen: Screen
  journeyId: string
  flowId: string
}) {
  const store   = useStore()
  const canvas  = useStore(s => s.canvas())
  const ctx     = screen.context
  const pct     = screenCompleteness(screen)
  const offset  = RING_CIRC - (pct / 100) * RING_CIRC

  // DS nodes wired to this journey
  const conns   = canvas?.conns.filter(c => c.toId === journeyId) ?? []
  const dsNodes = canvas?.nodes.filter(n => n.type === 'ds' && conns.some(c => c.fromId === n.id)) ?? []
  const allTags = Array.from(new Set(dsNodes.flatMap(n => n.tags)))

  function update(patch: Partial<typeof ctx>) {
    store.updateScreenContext(journeyId, flowId, screen.id, patch)
  }

  function addEndpoint() {
    update({
      apiEndpoints: [
        ...ctx.apiEndpoints,
        { method: 'GET', path: '', description: '' },
      ],
    })
  }

  function updateEndpoint(i: number, patch: Partial<ApiEndpoint>) {
    const endpoints = ctx.apiEndpoints.map((ep, idx) =>
      idx === i ? { ...ep, ...patch } : ep,
    )
    update({ apiEndpoints: endpoints })
  }

  function removeEndpoint(i: number) {
    update({ apiEndpoints: ctx.apiEndpoints.filter((_, idx) => idx !== i) })
  }

  function toggleComponent(tag: string) {
    const comps = ctx.components.includes(tag)
      ? ctx.components.filter(c => c !== tag)
      : [...ctx.components, tag]
    update({ components: comps })
  }

  return (
    <div className="p-4 space-y-5">
      {/* Completeness ring */}
      <div className="flex items-center gap-3 p-3 bg-bg rounded-[10px] border border-border">
        <svg width="36" height="36" className="-rotate-90 flex-shrink-0" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={RING_R} fill="none" stroke="#E3E3DF" strokeWidth="3" />
          <circle
            cx="18" cy="18" r={RING_R}
            fill="none"
            stroke={pct >= 80 ? '#16A34A' : pct >= 20 ? '#D97706' : '#ADADAD'}
            strokeWidth="3"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div>
          <div className="text-[13px] font-semibold text-text-1">{pct}% complete</div>
          <div className="text-[10px] text-text-3">
            {pct < 80 ? 'Add more context to improve code quality' : 'Ready to generate'}
          </div>
        </div>
      </div>

      {/* Route */}
      <Field label="Route">
        <input
          type="text"
          value={ctx.route}
          onChange={e => update({ route: e.target.value })}
          placeholder="/auth/login"
          className="w-full text-[12.5px] font-mono px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
        />
      </Field>

      {/* Purpose */}
      <Field label="Purpose">
        <textarea
          value={ctx.purpose}
          onChange={e => update({ purpose: e.target.value })}
          placeholder="Allow user to sign in with email + password"
          rows={2}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors resize-none"
        />
      </Field>

      {/* User Intent */}
      <Field label="User Intent">
        <textarea
          value={ctx.userIntent}
          onChange={e => update({ userIntent: e.target.value })}
          placeholder="User wants to access their account"
          rows={2}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors resize-none"
        />
      </Field>

      {/* Auth Required */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-2">Requires Auth</span>
        <button
          onClick={() => update({ requiresAuth: !ctx.requiresAuth })}
          className={cn(
            'relative w-9 h-5 rounded-full transition-colors',
            ctx.requiresAuth ? 'bg-text-1' : 'bg-border-strong',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all',
              ctx.requiresAuth ? 'left-4' : 'left-0.5',
            )}
          />
        </button>
      </div>

      {/* Components */}
      {allTags.length > 0 && (
        <Field label="Components">
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleComponent(tag)}
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded border transition-colors',
                  ctx.components.includes(tag)
                    ? 'bg-text-1 text-white border-text-1'
                    : 'bg-bg border-border text-text-2 hover:border-border-strong',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </Field>
      )}

      {allTags.length === 0 && (
        <div className="text-[11px] text-text-3 p-2 bg-bg rounded-lg border border-border">
          Connect a DS node to this journey to pick components.
        </div>
      )}

      {/* API Endpoints */}
      <Field label="API Endpoints">
        <div className="space-y-2">
          {ctx.apiEndpoints.map((ep, i) => (
            <div key={i} className="flex items-start gap-1">
              <select
                value={ep.method}
                onChange={e => updateEndpoint(i, { method: e.target.value as ApiEndpoint['method'] })}
                className="text-[11px] font-mono px-[8px] py-[6px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 w-20 flex-shrink-0"
              >
                {HTTP_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                value={ep.path}
                onChange={e => updateEndpoint(i, { path: e.target.value })}
                placeholder="/api/auth"
                className="flex-1 text-[11px] font-mono px-[8px] py-[6px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors min-w-0"
              />
              <button
                onClick={() => removeEndpoint(i)}
                className="w-6 h-6 flex items-center justify-center text-text-3 hover:text-brand-red transition-colors flex-shrink-0 mt-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addEndpoint}
            className="flex items-center gap-1 text-[11px] text-text-2 hover:text-text-1 transition-colors"
          >
            <Plus size={11} />
            Add endpoint
          </button>
        </div>
      </Field>

      {/* Notes */}
      <Field label="Architecture Notes">
        <textarea
          value={ctx.notes}
          onChange={e => update({ notes: e.target.value })}
          placeholder="Architecture decisions, patterns to follow…"
          rows={3}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors resize-none"
        />
      </Field>

      {/* Gen Rules */}
      <Field label="Generation Rules">
        <textarea
          value={ctx.genRules}
          onChange={e => update({ genRules: e.target.value })}
          placeholder="Use Server Action for form, prefer RSC…"
          rows={2}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors resize-none"
        />
      </Field>
    </div>
  )
}

// ── Node Properties ───────────────────────────────────────────────────────────

function NodeProperties({ node }: { node: MacroNode }) {
  const store      = useStore()
  const [tagsInput, setTagsInput] = useState(node.tags.join(', '))

  function updateNode(patch: Partial<MacroNode>) {
    store.updateNode(node.id, patch)
  }

  function commitTags(value: string) {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean)
    updateNode({ tags })
  }

  return (
    <div className="p-4 space-y-4">
      <Field label="Name">
        <input
          type="text"
          defaultValue={node.name}
          onBlur={e => updateNode({ name: e.target.value })}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
        />
      </Field>

      <Field label="Description">
        <textarea
          defaultValue={node.description}
          onBlur={e => updateNode({ description: e.target.value })}
          rows={2}
          className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors resize-none"
        />
      </Field>

      {node.type === 'ds' && (
        <>
          <Field label="Components (comma-separated)">
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              onBlur={e => commitTags(e.target.value)}
              placeholder="Button, Input, Card, Modal…"
              className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
            />
          </Field>
          <Field label="Figma File URL">
            <input
              type="text"
              defaultValue={node.figmaFileUrl ?? ''}
              onBlur={e => {
                const url = e.target.value.trim()
                updateNode({ figmaFileUrl: url || undefined, figmaFileKey: url ? extractFigmaKey(url) : undefined })
              }}
              placeholder="https://figma.com/design/…"
              className="w-full text-[12.5px] font-mono px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
            />
          </Field>
        </>
      )}

      {node.type === 'journey' && (
        <Field label="Status">
          <select
            value={node.status ?? 'draft'}
            onChange={e => updateNode({ status: e.target.value as MacroNode['status'] })}
            className="w-full text-[12.5px] px-[10px] py-[7px] rounded-[8px] border border-border bg-bg outline-none focus:border-text-1 transition-colors"
          >
            <option value="draft">Draft</option>
            <option value="in-progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="generated">Generated</option>
          </select>
        </Field>
      )}
    </div>
  )
}

// ── Entity Info ───────────────────────────────────────────────────────────────

function EntityInfo({
  id,
  createdAt,
  extra,
}: {
  id: string
  createdAt: string
  extra?: { label: string; value: string }[]
}) {
  return (
    <div className="p-4 space-y-3">
      <div>
        <div className="text-[10px] font-mono text-text-3 mb-0.5 uppercase tracking-wider">ID</div>
        <div className="text-[11px] font-mono text-text-2 break-all">{id}</div>
      </div>
      <div>
        <div className="text-[10px] font-mono text-text-3 mb-0.5 uppercase tracking-wider">Created</div>
        <div className="text-[11px] font-mono text-text-2">
          {new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString()}
        </div>
      </div>
      {extra?.map(({ label, value }) => (
        <div key={label}>
          <div className="text-[10px] font-mono text-text-3 mb-0.5 uppercase tracking-wider">{label}</div>
          <div className="text-[11px] font-mono text-text-2">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10.5px] font-medium text-text-3 mb-[6px] block uppercase tracking-[0.04em]">{label}</label>
      {children}
    </div>
  )
}

function extractFigmaKey(url: string): string | undefined {
  try {
    const parts = new URL(url).pathname.split('/')
    const idx = parts.indexOf('design')
    return idx >= 0 ? parts[idx + 1] : undefined
  } catch {
    return undefined
  }
}
