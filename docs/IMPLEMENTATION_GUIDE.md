# Implementation Guide: Integrar Componentes Canvas

**Arquivos prontos:** 6 componentes completos  
**Tempo estimado:** 2-3 horas para integração + testes  
**Pré-requisitos:** Projeto Next.js v6 rodando localmente

---

## Passo 1: Copiar Arquivos para o Projeto

```bash
# A partir da raiz do seu projeto flowbridge-v6-final/

# Criar/atualizar components/nodes/
cp MacroNode.tsx components/nodes/MacroNode.tsx
cp ScreenNode.tsx components/nodes/ScreenNode.tsx

# Criar/atualizar components/canvas/
cp ConnectorLayer.tsx components/canvas/ConnectorLayer.tsx

# Criar/atualizar components/sidebar/
cp Ibar.tsx components/sidebar/Ibar.tsx
cp Ebar.tsx components/sidebar/Ebar.tsx

# Criar/atualizar components/panels/
cp RightPanel.tsx components/panels/RightPanel.tsx
```

Ou manualmente:
1. Abra cada arquivo `.tsx` recebido
2. Copie o conteúdo
3. Crie/substitua no projeto nos caminhos acima

---

## Passo 2: Verificar Exports (types/index.ts)

Certifique-se de que os tipos abaixo existem em `types/index.ts`:

```typescript
// Deve existir:
export type RpanelTab = 'properties' | 'context' | 'info'
export type EbarSection = 'macro' | 'comp'
```

Se não existir, adicione ao final do arquivo.

---

## Passo 3: Verificar Store Actions (lib/store/index.ts)

O Zustand store deve ter estas ações. Se não tiver, adicione:

```typescript
interface Store {
  // ... existing fields

  // Essencial para RightPanel
  togglePanels: (panel: 'rpanel' | 'ibar' | 'ebar' | 'fab') => void
  setRpanelTab: (tab: RpanelTab) => void
  toggleEbarSection: (section: EbarSection) => void

  // Para seleção
  selectNode: (id: NodeId | null) => void
  selectConn: (id: ConnId | null) => void
  selectScreen: (id: ScreenId | null) => void
  clearSel: () => void

  // Para navegação
  openJourney: (id: NodeId) => void
  goMacro: () => void

  // Para atualizar nodes
  updateNode: (id: NodeId, patch: Partial<MacroNode>) => void
  updateScreen: (
    journeyId: NodeId,
    flowId: FlowId,
    id: ScreenId,
    patch: Partial<Screen>
  ) => void
  updateScreenContext: (
    journeyId: NodeId,
    flowId: FlowId,
    id: ScreenId,
    ctx: Partial<ScreenContext>
  ) => void
}
```

**Todas essas ações já estão implementadas** no store atual. Se alguma estiver faltando, edite `lib/store/index.ts` para adicionar.

---

## Passo 4: Atualizar CanvasWorkspace.tsx

Atualize `components/canvas/CanvasWorkspace.tsx` para usar os novos componentes.

### 4.1 Imports

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Maximize2, Zap } from 'lucide-react'

import { useStore } from '@/lib/store'
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction'
import { useGenerate } from '@/hooks/useGenerate'
import { makeConn, cn } from '@/utils'

// ← Add these imports:
import { MacroNodeCard } from '@/components/nodes/MacroNode'
import { ScreenNodeCard } from '@/components/nodes/ScreenNode'
import { ConnectorLayer } from '@/components/canvas/ConnectorLayer'
import { Ibar } from '@/components/sidebar/Ibar'
import { Ebar } from '@/components/sidebar/Ebar'
import { RightPanel } from '@/components/panels/RightPanel'
import { FlowPanel } from '@/components/panels/FlowPanel'
import { FAB } from '@/components/ui/FAB'
```

### 4.2 Dentro da função CanvasWorkspace

```typescript
export function CanvasWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const store = useStore()
  const project = store.projects.find(p => p.id === projectId)

  // Current state
  const canvas = store.canvas()
  const journey = store.journey()
  const activeFlow = store.activeFlow()
  const view = useStore(s => s.view)
  const transform = useStore(s => s.transform)
  const selNodeId = useStore(s => s.selNodeId)
  const selConnId = useStore(s => s.selConnId)
  const selScreenId = useStore(s => s.selScreenId)
  const ibarOpen = useStore(s => s.ibarOpen)
  const ebarOpen = useStore(s => s.ebarOpen)
  const rpanelOpen = useStore(s => s.rpanelOpen)
  const fabOpen = useStore(s => s.fabOpen)

  const [pendingConn, setPendingConn] = useState<{
    fromId: string
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null)

  useCanvasInteraction(canvasRef)

  // Ensure project is open
  useEffect(() => {
    if (projectId !== store.curProjectId) {
      store.openProject(projectId)
    }
  }, [projectId, store])

  // Convert client coords to canvas coords
  function screenToCanvas(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x, y, scale } = transform
    return {
      x: (clientX - rect.left - x) / scale,
      y: (clientY - rect.top - y) / scale,
    }
  }

  // Handle connector drag start
  const handleConnDragStart = useCallback(
    (fromId: string, clientX: number, clientY: number) => {
      const cp = screenToCanvas(clientX, clientY)
      setPendingConn({ fromId, x1: cp.x, y1: cp.y, x2: cp.x, y2: cp.y })
    },
    [screenToCanvas]
  )

  // Handle connector drag
  useEffect(() => {
    if (!pendingConn) return

    const onMove = (e: PointerEvent) => {
      const cp = screenToCanvas(e.clientX, e.clientY)
      setPendingConn(prev =>
        prev ? { ...prev, x2: cp.x, y2: cp.y } : null
      )
    }

    const onUp = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const toId = (el?.closest('[data-macro-id]') as HTMLElement | null)
        ?.dataset.macroId

      if (toId && pendingConn.fromId && store.curProjectId) {
        const s = useStore.getState()
        if (!s.connExists(pendingConn.fromId, toId)) {
          s.addConn(makeConn(pendingConn.fromId, toId, store.curProjectId))
        }
      }
      setPendingConn(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [pendingConn])

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Project not found.
        <button
          onClick={() => router.push('/')}
          className="ml-2 underline hover:text-gray-900"
        >
          Back
        </button>
      </div>
    )
  }

  if (view === 'macro' && !canvas) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Loading canvas...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Icon sidebar */}
      {ibarOpen && <Ibar />}

      {/* Expandable tree sidebar */}
      {ebarOpen && <Ebar />}

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Canvas top bar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center 
                        justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">
              {view === 'macro'
                ? 'Macro View'
                : journey?.name || 'Micro View'}
            </span>
            {view === 'micro' && (
              <button
                onClick={() => store.goMacro()}
                className="text-blue-600 hover:text-blue-700 underline text-xs"
              >
                ← Back to Macro
              </button>
            )}
          </div>

          <button
            onClick={() => store.fitView()}
            className="text-gray-600 hover:text-gray-900 p-1 rounded"
            title="Fit view (F)"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 
                     overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            backgroundPosition: `${transform.x}px ${transform.y}px`,
            backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
          }}
        >
          {/* SVG Connector layer */}
          {canvas && (
            <ConnectorLayer
              nodes={canvas.nodes}
              conns={canvas.conns}
              selectedConnId={selConnId}
              transform={transform}
              onConnSelect={(connId) => store.selectConn(connId)}
            />
          )}

          {/* Macro view: nodes */}
          {view === 'macro' && canvas && (
            <>
              {canvas.nodes.map(node => (
                <MacroNodeCard
                  key={node.id}
                  node={node}
                  isSelected={selNodeId === node.id}
                  onSelect={(id) => store.selectNode(id)}
                  onDragStart={(id, x, y) => {
                    const startPos = screenToCanvas(x, y)
                    const startNodePos = node.position
                    const onMove = (e: PointerEvent) => {
                      const currentPos = screenToCanvas(e.clientX, e.clientY)
                      const delta = {
                        x: currentPos.x - startPos.x,
                        y: currentPos.y - startPos.y,
                      }
                      store.moveNode(id, {
                        x: startNodePos.x + delta.x,
                        y: startNodePos.y + delta.y,
                      })
                    }
                    const onUp = () => {
                      window.removeEventListener('pointermove', onMove)
                      window.removeEventListener('pointerup', onUp)
                    }
                    window.addEventListener('pointermove', onMove)
                    window.addEventListener('pointerup', onUp)
                  }}
                  onConnDragStart={handleConnDragStart}
                />
              ))}

              {/* Pending connector preview */}
              {pendingConn && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                  }}
                >
                  <line
                    x1={pendingConn.x1}
                    y1={pendingConn.y1}
                    x2={pendingConn.x2}
                    y2={pendingConn.y2}
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                </svg>
              )}
            </>
          )}

          {/* Micro view: screens */}
          {view === 'micro' && activeFlow && (
            <>
              {activeFlow.screens.map(screen => (
                <ScreenNodeCard
                  key={screen.id}
                  screen={screen}
                  isSelected={selScreenId === screen.id}
                  onSelect={(id) => store.selectScreen(id)}
                  onDragStart={(id, x, y) => {
                    const startPos = screenToCanvas(x, y)
                    const startScreenPos = screen.position
                    const onMove = (e: PointerEvent) => {
                      const currentPos = screenToCanvas(e.clientX, e.clientY)
                      const delta = {
                        x: currentPos.x - startPos.x,
                        y: currentPos.y - startPos.y,
                      }
                      store.moveScreen(store.curJourneyId!, activeFlow.id, id, {
                        x: startScreenPos.x + delta.x,
                        y: startScreenPos.y + delta.y,
                      })
                    }
                    const onUp = () => {
                      window.removeEventListener('pointermove', onMove)
                      window.removeEventListener('pointerup', onUp)
                    }
                    window.addEventListener('pointermove', onMove)
                    window.addEventListener('pointerup', onUp)
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Flow panel (micro view only) */}
        {view === 'micro' && journey && (
          <FlowPanel journeyId={journey.id} />
        )}
      </div>

      {/* Right panel */}
      {rpanelOpen && <RightPanel />}

      {/* FAB */}
      {fabOpen && <FAB />}
    </div>
  )
}
```

---

## Passo 5: Verificar/Completar Store

Se alguma ação estiver faltando no store, adicione ao final da função `create`:

```typescript
// lib/store/index.ts

// Dentro de create({ ... }):

setRpanelTab: (tab: RpanelTab) => set({ rpanelTab: tab }),

toggleEbarSection: (section: EbarSection) =>
  set(state => ({
    ebarSection: section === 'macro' ? 'macro' : 'comp',
  })),

togglePanels: (panel: 'rpanel' | 'ibar' | 'ebar' | 'fab') =>
  set(state => {
    switch (panel) {
      case 'rpanel':
        return { rpanelOpen: !state.rpanelOpen }
      case 'ibar':
        return { ibarOpen: !state.ibarOpen }
      case 'ebar':
        return { ebarOpen: !state.ebarOpen }
      case 'fab':
        return { fabOpen: !state.fabOpen }
    }
  }),
```

---

## Passo 6: TypeScript Validation

```bash
npm run typecheck
```

Se houver erros:
- Verifique que todos os tipos estão em `types/index.ts`
- Use `// @ts-ignore` temporariamente se houver conflito com tipos antigos

---

## Passo 7: Teste Visual

### 7.1 Canvas vazio

```bash
npm run dev
# Acesse http://localhost:3000
# Crie um projeto novo
```

✓ Deve ver:
- Canvas vazio (fundo cinza)
- Ibar (icon strip esquerda)
- Ebar colapsado
- FAB no canto inferior

### 7.2 Criar DS node

Clique em FAB → "Design System" → Nome

✓ Deve ver:
- Card roxo aparecer no canvas
- Ebar mostra node na tree
- Pode arrastar para mover
- Handle azul na direita

### 7.3 Criar Journey

FAB → "Journey" → Nome

✓ Deve ver:
- Card azul aparecer
- Pode double-click para entrar em micro view
- RightPanel pode editar

### 7.4 Conectar

DS node → drag handle azul → drop em Journey

✓ Deve ver:
- Linha curva com seta
- Selection pode mudar cor

### 7.5 Entrar em Journey

Double-click em Journey node

✓ Deve ver:
- Micro view ativa
- Breadcrumb "Back to Macro"
- Canvas vazio (sem screens ainda)

### 7.6 Criar Screen

Micro view → FAB → "Screen" → Nome

✓ Deve ver:
- Card menor com thumbnail placeholder
- Completeness ring (0%)
- Entry/Error badges se marcado

---

## Passo 8: Integrar com Projeto

Se tinha CanvasWorkspace antigo:
1. Backup do arquivo atual: `cp components/canvas/CanvasWorkspace.tsx components/canvas/CanvasWorkspace.tsx.backup`
2. Atualize conforme Passo 4.2
3. Teste tudo novamente

---

## Checklist de Integração

- [ ] 6 arquivos `.tsx` copiados para seus diretórios
- [ ] Imports adicionados no CanvasWorkspace
- [ ] Store actions verificadas/adicionadas
- [ ] `npm run typecheck` passa
- [ ] Canvas vazio aparece
- [ ] FAB funciona e cria nodes
- [ ] Nodes podem ser arrastados
- [ ] Double-click em Journey entra em micro
- [ ] RightPanel abre e edita
- [ ] Ebar mostra tree
- [ ] Connectors desenham (após conectar DS → Journey)

---

## Troubleshooting

### Erro: "Cannot find module '@/components/nodes/MacroNode'"
→ Verifique se arquivo está em `components/nodes/MacroNode.tsx`

### Erro: "Property 'toggleEbarSection' does not exist"
→ Adicione ação ao store (Passo 5)

### Componentes não aparecem
→ Verifique `view` state (deve ser 'macro' ou 'micro')
→ Verifique `ibarOpen`, `ebarOpen` (deve ser true para aparecer)

### RightPanel fica em branco
→ Clique em um node/screen para selecionar
→ Verifique `rpanelOpen` (clique botão para abrir)

### Connectors não aparecem
→ Crie um DS node e um Journey node
→ Drag handle azul do DS node
→ Drop em Journey node
→ Deve aparecer linha curva com seta

---

## Próximos Passos (Priority 2)

Com esta base pronta:
1. **Context form UI** — adicionar campos estruturados (route, purpose, components, APIs)
2. **FlowPanel.tsx** — completar a lista de flows
3. **FAB.tsx** — completar o menu de criação
4. **Figma integration** — bind URLs e fetch thumbnails

---

## Documentação de Referência

- `types/index.ts` — Domain model
- `lib/store/index.ts` — State machine
- `utils/index.ts` — Factories e helpers
- v6.html — Visual reference

---

## Suporte

Se houver problemas:
1. Verifique os arquivos estão nos caminhos certos
2. Rode `npm run typecheck` para erros TypeScript
3. Verifique browser console para erros de runtime
4. Teste cada função de forma isolada
