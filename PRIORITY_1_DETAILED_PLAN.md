# Priority 1: Port Canvas Components v6 → React

**Status:** Next immediate step  
**Esforço estimado:** 1 dia (8h)  
**Bloqueador:** Sem isso, visual não aparece  
**Output:** Componentes React funcionais que matcham v6 visualmente

---

## Sequência de Implementação

### Passo 1: MacroNode.tsx (2h)
**Arquivo:** `components/nodes/MacroNode.tsx`

O que é:
- Card visual de um node macro (DS ou Journey)
- Drag to move
- Double-click entry to micro view (if Journey)
- Drag handle na direita para criar conexões
- Status visual (badges)

```typescript
'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import type { MacroNode as MacroNodeType } from '@/types'

interface MacroNodeCardProps {
  node: MacroNodeType
  isSelected: boolean
  onSelect: (id: string) => void
  onDragStart: (id: string, x: number, y: number) => void
  onConnDragStart?: (fromId: string, x: number, y: number) => void
  onDoubleClick?: (id: string) => void
}

export function MacroNodeCard({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onConnDragStart,
  onDoubleClick,
}: MacroNodeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const store = useStore()

  const nodeTypeIcon = node.type === 'ds' ? '◈' : '⬡'
  const nodeTypeLabel = node.type === 'ds' ? 'Design System' : 'Journey'
  const nodeTypeBg = node.type === 'ds' 
    ? 'bg-purple-50 border-purple-200' 
    : 'bg-blue-50 border-blue-200'

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-conn-handle]')) return
    setIsDragging(true)
    onDragStart(node.id, e.clientX, e.clientY)
  }

  function handleConnHandleMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    onConnDragStart?.(node.id, e.clientX, e.clientY)
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (node.type === 'journey') {
      store.openJourney(node.id)
      onDoubleClick?.(node.id)
    }
  }

  const connCount = store.canvasData()[node.projectId]?.conns.filter(
    c => c.fromId === node.id || c.toId === node.id
  ).length ?? 0

  return (
    <div
      className={`
        absolute rounded-lg border-2 bg-white cursor-move
        transition-all duration-150
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 shadow-md'}
        hover:shadow-lg hover:border-gray-300
        w-56
      `}
      style={{ left: `${node.position.x}px`, top: `${node.position.y}px` }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={() => onSelect(node.id)}
      data-macro-id={node.id}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b border-gray-200 ${nodeTypeBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{nodeTypeIcon}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {nodeTypeLabel}
            </span>
          </div>
          {/* Connector handle */}
          {node.type === 'ds' && (
            <div
              data-conn-handle
              className={`
                w-3 h-3 rounded-full bg-blue-500 cursor-crosshair
                hover:scale-125 transition-transform
              `}
              onMouseDown={handleConnHandleMouseDown}
              title="Drag to connect to a Journey"
            />
          )}
        </div>
        <h3 className="text-sm font-bold text-gray-900">{node.name}</h3>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {node.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {node.description}
          </p>
        )}

        {/* Tags */}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {node.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 
                           rounded text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="inline-flex px-2 py-1 text-gray-500 text-xs">
                +{node.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {connCount} connection{connCount !== 1 ? 's' : ''}
          </span>
          {node.type === 'journey' && (
            <span className="text-blue-600 font-medium">Double-click to edit</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Passo 2: ScreenNode.tsx (2h)
**Arquivo:** `components/nodes/ScreenNode.tsx`

O que é:
- Card visual de uma tela no micro view
- Mais compacto que MacroNode
- Entry/Error badges
- Thumbnail Figma (quando bindado)
- Completeness score ring

```typescript
'use client'

import { useStore } from '@/lib/store'
import { screenCompleteness } from '@/utils'
import type { Screen } from '@/types'

interface ScreenNodeCardProps {
  screen: Screen
  isSelected: boolean
  onSelect: (id: string) => void
  onDragStart: (id: string, x: number, y: number) => void
  onDoubleClick?: (id: string) => void
}

export function ScreenNodeCard({
  screen,
  isSelected,
  onSelect,
  onDragStart,
  onDoubleClick,
}: ScreenNodeCardProps) {
  const completeness = screenCompleteness(screen)
  const completenessColor = 
    completeness >= 80 ? 'text-green-600' :
    completeness >= 50 ? 'text-yellow-600' :
    'text-red-600'

  function handleMouseDown(e: React.MouseEvent) {
    onDragStart(screen.id, e.clientX, e.clientY)
  }

  return (
    <div
      className={`
        absolute rounded-lg border-2 bg-white cursor-move
        transition-all duration-150 w-48
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 shadow-md'}
        hover:shadow-lg hover:border-gray-300
      `}
      style={{ left: `${screen.position.x}px`, top: `${screen.position.y}px` }}
      onMouseDown={handleMouseDown}
      onClick={() => onSelect(screen.id)}
      onDoubleClick={() => onDoubleClick?.(screen.id)}
      data-screen-id={screen.id}
    >
      {/* Thumbnail area */}
      <div className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 
                      border-b border-gray-200 flex items-center justify-center 
                      overflow-hidden">
        {screen.figma?.thumbnailUrl ? (
          <img
            src={screen.figma.thumbnailUrl}
            alt={screen.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-1 opacity-50">🎨</div>
            <div className="text-xs text-gray-400">No design linked</div>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 right-2 flex gap-1">
          {screen.isEntry && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs 
                             font-semibold rounded">Entry</span>
          )}
          {screen.isError && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs 
                             font-semibold rounded">Error</span>
          )}
        </div>

        {/* Completeness ring */}
        <div className="absolute bottom-2 left-2 flex flex-col items-center 
                        justify-center w-12 h-12 rounded-full bg-white 
                        border-2 border-gray-300 shadow">
          <div className={`text-sm font-bold ${completenessColor}`}>
            {completeness}%
          </div>
          <div className="text-xs text-gray-500">done</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <h4 className="text-xs font-bold text-gray-900 truncate mb-1">
          {screen.name}
        </h4>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="text-gray-600 font-medium">
            {screen.context.route || '(no route)'}
          </span>
          <span>
            {screen.status}
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

### Passo 3: ConnectorLayer.tsx (2h)
**Arquivo:** `components/canvas/ConnectorLayer.tsx`

O que é:
- SVG layer com Bezier paths entre nodes
- Arrowheads
- Selection highlight

```typescript
'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { MacroNode, Connection } from '@/types'

interface ConnectorLayerProps {
  nodes: MacroNode[]
  conns: Connection[]
  selectedConnId: string | null
  transform: { x: number; y: number; scale: number }
}

export function ConnectorLayer({
  nodes,
  conns,
  selectedConnId,
  transform,
}: ConnectorLayerProps) {
  const paths = useMemo(() => {
    return conns.map(conn => {
      const fromNode = nodes.find(n => n.id === conn.fromId)
      const toNode = nodes.find(n => n.id === conn.toId)

      if (!fromNode || !toNode) return null

      // Posições dos nodes (centrados)
      const x1 = fromNode.position.x + 224 / 2  // w-56 = 224px
      const y1 = fromNode.position.y + 100       // aprox height
      const x2 = toNode.position.x + 224 / 2
      const y2 = toNode.position.y

      // Quadratic Bezier curve
      const cp = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 60 }
      const pathData = `M ${x1} ${y1} Q ${cp.x} ${cp.y} ${x2} ${y2}`

      return {
        id: conn.id,
        path: pathData,
        x1,
        y1,
        x2,
        y2,
      }
    })
  }, [nodes, conns])

  const isSelected = (connId: string) => selectedConnId === connId

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}
    >
      {/* Defs for arrowhead */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#2563EB" />
        </marker>
      </defs>

      {/* Paths */}
      {paths.map(p => p && (
        <g key={p.id}>
          {/* Invisible thick path for easier clicking */}
          <path
            d={p.path}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            data-conn-id={p.id}
          />

          {/* Visible path */}
          <path
            d={p.path}
            stroke={isSelected(p.id) ? '#2563EB' : '#D1D5DB'}
            strokeWidth={isSelected(p.id) ? 3 : 2}
            fill="none"
            markerEnd="url(#arrowhead)"
            className="transition-all duration-150"
            pointerEvents="none"
          />
        </g>
      ))}
    </svg>
  )
}
```

---

### Passo 4: Ibar.tsx (1h)
**Arquivo:** `components/sidebar/Ibar.tsx`

Icon strip na esquerda — colapsável por seção

```typescript
'use client'

import { useStore } from '@/lib/store'
import { Grid3x3, Layers } from 'lucide-react'

export function Ibar() {
  const store = useStore()
  const ebarSection = useStore(s => s.ebarSection)

  return (
    <div className="w-14 bg-white border-r border-gray-200 flex flex-col 
                    items-center gap-3 py-4 flex-shrink-0">
      {/* Macro/DS section */}
      <button
        onClick={() => store.toggleEbarSection('macro')}
        className={`p-2 rounded-lg transition-all ${
          ebarSection === 'macro'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Nodes & Journeys"
      >
        <Grid3x3 size={20} />
      </button>

      {/* Components section */}
      <button
        onClick={() => store.toggleEbarSection('comp')}
        className={`p-2 rounded-lg transition-all ${
          ebarSection === 'comp'
            ? 'bg-purple-100 text-purple-600'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Components"
      >
        <Layers size={20} />
      </button>
    </div>
  )
}
```

---

### Passo 5: Ebar.tsx (2h)
**Arquivo:** `components/sidebar/Ebar.tsx`

Hierarchical tree expandível

```typescript
'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { ChevronRight, Trash2, Zap } from 'lucide-react'
import type { MacroNode, Flow, Screen } from '@/types'

export function Ebar() {
  const store = useStore()
  const ebarSection = useStore(s => s.ebarSection)
  const canvas = store.canvas()

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  if (!canvas) return null

  function toggleExpanded(nodeId: string) {
    const next = new Set(expandedNodes)
    if (next.has(nodeId)) next.delete(nodeId)
    else next.add(nodeId)
    setExpandedNodes(next)
  }

  if (ebarSection === 'macro') {
    return (
      <div className="w-60 bg-white border-r border-gray-200 overflow-y-auto 
                      flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-xs font-bold uppercase text-gray-500">Nodes</h3>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {canvas.nodes.map(node => (
            <div key={node.id}>
              {/* Node item */}
              <div
                className="px-4 py-2 flex items-center gap-2 cursor-pointer 
                           hover:bg-gray-50 border-l-2 border-transparent 
                           hover:border-gray-300 transition-all"
                onClick={() => store.selectNode(node.id)}
              >
                {node.type === 'journey' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(node.id)
                    }}
                    className="flex-shrink-0"
                  >
                    <ChevronRight
                      size={16}
                      className={`transition-transform ${
                        expandedNodes.has(node.id) ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                )}

                <span className="text-xs flex-shrink-0">
                  {node.type === 'ds' ? '◈' : '⬡'}
                </span>

                <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                  {node.name}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    store.deleteNode(node.id)
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-red-600 
                             opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Flows (if journey) */}
              {node.type === 'journey' && expandedNodes.has(node.id) && (
                <div className="pl-8 border-l-2 border-gray-200">
                  {(canvas.flows[node.id] || []).map(flow => (
                    <div key={flow.id}>
                      <div className="px-4 py-1.5 text-xs text-gray-600 
                                     hover:bg-gray-50 cursor-pointer">
                        {flow.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null // TODO: Components section
}
```

---

### Passo 6: RightPanel.tsx (2h)
**Arquivo:** `components/panels/RightPanel.tsx`

```typescript
'use client'

import { useStore } from '@/lib/store'
import { X } from 'lucide-react'

export function RightPanel() {
  const store = useStore()
  const rpanelOpen = useStore(s => s.rpanelOpen)
  const rpanelTab = useStore(s => s.rpanelTab)
  const selNodeId = useStore(s => s.selNodeId)
  const selScreenId = useStore(s => s.selScreenId)
  const canvas = store.canvas()

  if (!rpanelOpen) return null

  const node = canvas?.nodes.find(n => n.id === selNodeId)
  const journey = canvas?.nodes.find(n => n.id === store.curJourneyId)
  const activeFlow = canvas?.curFlow[store.curJourneyId!]
  const screen = activeFlow 
    ? (canvas?.flows[store.curJourneyId!] || [])
        .find(f => f.id === activeFlow)
        ?.screens.find(s => s.id === selScreenId)
    : undefined

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col 
                    flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center 
                      justify-between flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-900">
          {screen ? screen.name : node?.name || 'Properties'}
        </h3>
        <button
          onClick={() => store.togglePanels('rpanel')}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(['properties', 'context', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => store.setRpanelTab(tab)}
            className={`flex-1 py-3 px-4 text-xs font-medium uppercase 
                       transition-colors ${
              rpanelTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {rpanelTab === 'properties' && (
          <div className="space-y-4">
            {screen ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={screen.name}
                    onChange={(e) => {
                      store.updateScreen(
                        store.curJourneyId!,
                        activeFlow!,
                        screen.id,
                        { name: e.target.value }
                      )
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded 
                              text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Route
                  </label>
                  <input
                    type="text"
                    value={screen.context.route}
                    onChange={(e) => {
                      store.updateScreenContext(
                        store.curJourneyId!,
                        activeFlow!,
                        screen.id,
                        { route: e.target.value }
                      )
                    }}
                    placeholder="/path/to/page"
                    className="w-full px-3 py-2 border border-gray-300 rounded 
                              text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : node ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={node.name}
                    onChange={(e) => {
                      store.updateNode(node.id, { name: e.target.value })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded 
                              text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={node.description}
                    onChange={(e) => {
                      store.updateNode(node.id, { description: e.target.value })
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded 
                              text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a node or screen</p>
            )}
          </div>
        )}

        {rpanelTab === 'context' && screen && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Purpose
              </label>
              <textarea
                value={screen.context.purpose}
                onChange={(e) => {
                  store.updateScreenContext(
                    store.curJourneyId!,
                    activeFlow!,
                    screen.id,
                    { purpose: e.target.value }
                  )
                }}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded 
                          text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                User Intent
              </label>
              <textarea
                value={screen.context.userIntent}
                onChange={(e) => {
                  store.updateScreenContext(
                    store.curJourneyId!,
                    activeFlow!,
                    screen.id,
                    { userIntent: e.target.value }
                  )
                }}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded 
                          text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {rpanelTab === 'info' && (
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-gray-700">Type:</span>
              <span className="ml-2 text-gray-600">
                {screen ? 'Screen' : node?.type === 'ds' ? 'Design System' : 'Journey'}
              </span>
            </div>
            <div>
              <span className="font-bold text-gray-700">ID:</span>
              <span className="ml-2 font-mono text-gray-500">
                {(screen || node)?.id.slice(0, 8)}...
              </span>
            </div>
            <div>
              <span className="font-bold text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">
                {new Date((screen || node)?.createdAt || '').toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Checklist de Implementação

- [ ] **MacroNode.tsx** criado
  - [ ] Visual card com ícone + nome
  - [ ] Drag to move (handleMouseDown)
  - [ ] Double-click entry to micro (if Journey)
  - [ ] Connector handle (DS only)
  - [ ] Selection highlight
  - [ ] Tags display
  - [ ] Connection count

- [ ] **ScreenNode.tsx** criado
  - [ ] Visual card com thumbnail area
  - [ ] Entry/Error badges
  - [ ] Completeness ring
  - [ ] Route display
  - [ ] Status display

- [ ] **ConnectorLayer.tsx** criado
  - [ ] SVG with Bezier paths
  - [ ] Arrowhead marker
  - [ ] Selection highlight
  - [ ] Hover effects

- [ ] **Ibar.tsx** criado
  - [ ] Two icon buttons (macro, comp)
  - [ ] Active state styling
  - [ ] Toggle functionality

- [ ] **Ebar.tsx** criado
  - [ ] Hierarchical tree
  - [ ] Expand/collapse flows
  - [ ] Delete buttons
  - [ ] Selection click handler

- [ ] **RightPanel.tsx** criado
  - [ ] Three tabs (properties, context, info)
  - [ ] Name/description inputs (nodes)
  - [ ] Route/purpose inputs (screens)
  - [ ] Info tab metadata

- [ ] **CanvasWorkspace** refinado
  - [ ] Render MacroNodeCard + ScreenNodeCard
  - [ ] Render ConnectorLayer
  - [ ] Render Ibar + Ebar + RightPanel
  - [ ] Wire all event handlers
  - [ ] Zoom controls working
  - [ ] Pan working
  - [ ] F key fit view
  - [ ] Keyboard shortcuts (Del, Esc)

- [ ] **Visual matching v6.html**
  - [ ] Colors match design tokens
  - [ ] Spacing/padding correct
  - [ ] Hover states smooth
  - [ ] Selection styling clear

- [ ] **TypeScript strict**
  - [ ] No `any` types
  - [ ] All props typed
  - [ ] All event handlers typed
  - [ ] npm run typecheck passes

---

## Testes Manuais

1. **Canvas empty → click FAB → create DS node**
   - [ ] Node appears on canvas
   - [ ] Can drag to move
   - [ ] Right panel shows properties

2. **DS node → drag right side handle → drop on empty space**
   - [ ] No effect (need Journey)

3. **Create Journey node → DS node → drag handle → drop on Journey**
   - [ ] Connector appears
   - [ ] Line curves smoothly
   - [ ] Arrow visible

4. **Journey node → double-click**
   - [ ] Enters micro view
   - [ ] Breadcrumb shows
   - [ ] Can go back with Home

5. **Micro view → FAB → add Screen**
   - [ ] Screen card appears
   - [ ] Appears in Ebar tree
   - [ ] Can select + edit in RightPanel

6. **Keyboard**
   - [ ] F key fits view
   - [ ] Del key deletes selected
   - [ ] Esc clears selection

---

## Próximos Steps (após completar Priority 1)

1. **Priority 2:** Context form UI (route, purpose, components, APIs)
2. **Priority 3:** Figma URL binding + thumbnail fetch
3. **Priority 4:** Wire Generate button + code modal
4. **Priority 5:** Supabase sync

---

## Recursos

- **Referência visual:** `/tmp/flowbridge-v6-final/flowbridge-v6.html`
- **Store API:** `/tmp/flowbridge-v6-final/lib/store/index.ts`
- **Types:** `/tmp/flowbridge-v6-final/types/index.ts`
- **Design tokens:** `/tmp/flowbridge-v6-final/styles/globals.css`
- **Tailwind config:** `/tmp/flowbridge-v6-final/tailwind.config.ts`
