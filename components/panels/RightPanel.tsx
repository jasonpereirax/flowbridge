'use client'

import { useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import { X } from 'lucide-react'
import type { RpanelTab } from '@/types'

/**
 * RightPanel
 * 
 * Right sidebar with tabbed interface for editing node/screen properties.
 * 
 * Tabs:
 * - Properties: Name, description, tags (nodes); Name, route (screens)
 * - Context: Purpose, userIntent, components, APIs (screens only)
 * - Info: Metadata, timestamps, status
 */
export function RightPanel() {
  const store = useStore()
  const rpanelOpen = useStore(s => s.rpanelOpen)
  const rpanelTab = useStore(s => s.rpanelTab)
  const selNodeId = useStore(s => s.selNodeId)
  const selScreenId = useStore(s => s.selScreenId)
  const curProjectId = store.curProjectId

  const canvas = curProjectId ? store.canvasData[curProjectId] : null
  const node = canvas?.nodes.find(n => n.id === selNodeId)
  const activeFlow = store.curJourneyId ? canvas?.curFlow[store.curJourneyId] : null

  const screen = activeFlow
    ? (canvas?.flows[store.curJourneyId!] || [])
      .find(f => f.id === activeFlow)
      ?.screens.find(s => s.id === selScreenId)
    : undefined

  const selectedItem = screen || node

  // Event handlers
  const handleTabClick = useCallback(
    (tab: RpanelTab) => {
      store.setRpTab(tab)
    },
    [store]
  )

  const handleClose = useCallback(() => {
    store.closeRpanel()
  }, [store])

  const handleNodeNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (node) {
        store.updateNode(node.id, { name: e.target.value })
      }
    },
    [node, store]
  )

  const handleNodeDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (node) {
        store.updateNode(node.id, { description: e.target.value })
      }
    },
    [node, store]
  )

  const handleScreenNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (screen && store.curJourneyId && activeFlow) {
        store.updateScreen(store.curJourneyId, activeFlow, screen.id, {
          name: e.target.value,
        })
      }
    },
    [screen, store, activeFlow]
  )

  const handleScreenRouteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (screen && store.curJourneyId && activeFlow) {
        store.updateScreenContext(store.curJourneyId, activeFlow, screen.id, {
          route: e.target.value,
        })
      }
    },
    [screen, store, activeFlow]
  )

  const handleScreenPurposeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (screen && store.curJourneyId && activeFlow) {
        store.updateScreenContext(store.curJourneyId, activeFlow, screen.id, {
          purpose: e.target.value,
        })
      }
    },
    [screen, store, activeFlow]
  )

  const handleScreenIntentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (screen && store.curJourneyId && activeFlow) {
        store.updateScreenContext(store.curJourneyId, activeFlow, screen.id, {
          userIntent: e.target.value,
        })
      }
    },
    [screen, store, activeFlow]
  )

  if (!rpanelOpen) return null

  return (
    <div className={cn(
      'w-80 bg-white border-l border-gray-200',
      'flex flex-col flex-shrink-0',
      'overflow-hidden',
      'shadow-lg'
    )}>
      {/* Header */}
      <div className={cn(
        'px-6 py-4 border-b border-gray-200',
        'flex items-center justify-between',
        'flex-shrink-0',
        'bg-gray-50'
      )}>
        <h3 className="text-sm font-bold text-gray-900 truncate">
          {selectedItem?.name || 'No selection'}
        </h3>
        <button
          onClick={handleClose}
          className={cn(
            'text-gray-400 hover:text-gray-600 hover:bg-gray-200',
            'p-1 rounded transition-colors'
          )}
          title="Close panel"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className={cn(
        'flex border-b border-gray-200',
        'flex-shrink-0',
        'bg-white'
      )}>
        {(['properties', 'context', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={cn(
              'flex-1 py-3 px-4 text-xs font-medium uppercase',
              'transition-all duration-150',
              'tracking-wide',
              rpanelTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
            )}
            role="tab"
            aria-selected={rpanelTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedItem ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 text-center">
              Select a node or screen to edit
            </p>
          </div>
        ) : rpanelTab === 'properties' ? (
          <PropertiesTab
            node={node}
            screen={screen}
            onNodeNameChange={handleNodeNameChange}
            onNodeDescriptionChange={handleNodeDescriptionChange}
            onScreenNameChange={handleScreenNameChange}
            onScreenRouteChange={handleScreenRouteChange}
          />
        ) : rpanelTab === 'context' ? (
          <ContextTab
            screen={screen}
            onPurposeChange={handleScreenPurposeChange}
            onIntentChange={handleScreenIntentChange}
          />
        ) : (
          <InfoTab item={selectedItem} />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Components
// ─────────────────────────────────────────────────────────────────────────────

interface PropertiesTabProps {
  node: MacroNode | undefined
  screen: Screen | undefined
  onNodeNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onNodeDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onScreenNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onScreenRouteChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function PropertiesTab({
  node,
  screen,
  onNodeNameChange,
  onNodeDescriptionChange,
  onScreenNameChange,
  onScreenRouteChange,
}: PropertiesTabProps) {
  return (
    <div className="space-y-4">
      {screen ? (
        <>
          <FormGroup label="Screen Name">
            <input
              type="text"
              value={screen.name}
              onChange={onScreenNameChange}
              className={cn(
                'w-full px-3 py-2 border border-gray-300 rounded',
                'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                'transition-colors'
              )}
              placeholder="e.g., Login Form"
            />
          </FormGroup>

          <FormGroup label="Route">
            <input
              type="text"
              value={screen.context.route}
              onChange={onScreenRouteChange}
              className={cn(
                'w-full px-3 py-2 border border-gray-300 rounded',
                'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                'transition-colors'
              )}
              placeholder="/path/to/page"
            />
          </FormGroup>

          <div className="text-xs text-gray-500">
            💡 Switch to <strong>Context</strong> tab to add purpose, components, APIs
          </div>
        </>
      ) : node ? (
        <>
          <FormGroup label="Name">
            <input
              type="text"
              value={node.name}
              onChange={onNodeNameChange}
              className={cn(
                'w-full px-3 py-2 border border-gray-300 rounded',
                'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                'transition-colors'
              )}
              placeholder="e.g., Design System v1"
            />
          </FormGroup>

          <FormGroup label="Description">
            <textarea
              value={node.description}
              onChange={onNodeDescriptionChange}
              rows={3}
              className={cn(
                'w-full px-3 py-2 border border-gray-300 rounded',
                'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                'transition-colors resize-none'
              )}
              placeholder="Describe this node..."
            />
          </FormGroup>

          {node.tags.length > 0 && (
            <FormGroup label="Tags">
              <div className="flex flex-wrap gap-1">
                {node.tags.map(tag => (
                  <span
                    key={tag}
                    className={cn(
                      'px-2 py-1 bg-gray-100 text-gray-700',
                      'rounded text-xs font-medium'
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </FormGroup>
          )}
        </>
      ) : null}
    </div>
  )
}

interface ContextTabProps {
  screen: Screen | undefined
  onPurposeChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onIntentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

function ContextTab({
  screen,
  onPurposeChange,
  onIntentChange,
}: ContextTabProps) {
  if (!screen) {
    return (
      <p className="text-sm text-gray-500">
        Context is available for screens only.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <FormGroup label="Purpose">
        <textarea
          value={screen.context.purpose}
          onChange={onPurposeChange}
          rows={2}
          className={cn(
            'w-full px-3 py-2 border border-gray-300 rounded',
            'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors resize-none'
          )}
          placeholder="What is this screen for? E.g., 'Allow user to sign in with email + password'"
        />
      </FormGroup>

      <FormGroup label="User Intent">
        <textarea
          value={screen.context.userIntent}
          onChange={onIntentChange}
          rows={2}
          className={cn(
            'w-full px-3 py-2 border border-gray-300 rounded',
            'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors resize-none'
          )}
          placeholder="What does the user want to accomplish? E.g., 'User wants to access their account'"
        />
      </FormGroup>

      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
        🔜 Priority 2: Form fields for components, APIs, auth toggle
      </div>
    </div>
  )
}

interface InfoTabProps {
  item: MacroNode | Screen | undefined
}

function InfoTab({ item }: InfoTabProps) {
  return (
    <div className="space-y-3 text-sm">
      <InfoRow label="Type" value={item.type} />
      <InfoRow
        label="ID"
        value={item.id.slice(0, 8) + '...'}
        mono
      />
      <InfoRow
        label="Created"
        value={new Date(item.createdAt || '').toLocaleDateString()}
      />
      {item.context?.route && (
        <InfoRow label="Route" value={item.context.route} />
      )}
      {item.status && (
        <InfoRow label="Status" value={item.status} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Primitives
// ─────────────────────────────────────────────────────────────────────────────

interface FormGroupProps {
  label: string
  children: React.ReactNode
}

function FormGroup({ label, children }: FormGroupProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
  mono?: boolean
}

function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-bold text-gray-700 flex-shrink-0">{label}:</span>
      <span className={cn('text-gray-600', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}
