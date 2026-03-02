'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Zap, ChevronRight, FolderInput } from 'lucide-react'
import { useStore, useTransform, useView } from '@/lib/store'
import { useCanvasInteraction, ConnDragState } from '@/hooks/useCanvasInteraction'
import { makeConn } from '@/utils'
import type { MacroNode as MacroNodeType, Flow } from '@/types'

import { ConnectorLayer }  from '@/components/canvas/ConnectorLayer'
import { MacroNodeCard }   from '@/components/nodes/MacroNode'
import { ScreenNodeCard }  from '@/components/nodes/ScreenNode'
import { Ibar }            from '@/components/sidebar/Ibar'
import { Ebar }            from '@/components/sidebar/Ebar'
import { ContextHeader }   from '@/components/canvas/ContextHeader'
import { ImportWizard }    from '@/components/canvas/ImportWizard'
import { RightPanel }      from '@/components/panels/RightPanel'
import { FAB }             from '@/components/ui/FAB'

export function CanvasWorkspace({ projectId }: { projectId: string }) {
  const router    = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const store     = useStore()
  const transform = useTransform()
  const view      = useView()
  const project   = store.projects.find(p => p.id === projectId)

  const canvas      = useStore(s => s.canvas())
  const journey     = useStore(s => s.journey())
  const activeFlow  = useStore(s => s.activeFlow())
  const microMode   = useStore(s => s.microMode)
  const selConnId   = useStore(s => s.selConnId)
  const selNodeId   = useStore(s => s.selNodeId)
  const selScreenId = useStore(s => s.selScreenId)


  const [pendingConn, setPendingConn] = useState<{
    x1: number; y1: number; x2: number; y2: number
  } | null>(null)
  const [showImportWizard, setShowImportWizard] = useState(false)

  useEffect(() => {
    if (projectId !== store.curProjectId) store.openProject(projectId)
  }, [projectId, store])

  const macroNodes    = (canvas?.nodes ?? []) as MacroNodeType[]
  // Flows to render in micro view: all flows (mode=all) or just the active flow (mode=single)
  const allFlows      = (journey && canvas ? (canvas.flows[journey.id] ?? []) : []) as Flow[]
  const journeyFlows  = microMode === 'single' && activeFlow
    ? allFlows.filter(f => f.id === activeFlow.id)
    : allFlows

  // \u2500\u2500 Connector drag move \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const onConnDragMove = useCallback((state: ConnDragState) => {
    setPendingConn({ x1: state.x1, y1: state.y1, x2: state.x2, y2: state.y2 })
  }, [])

  // \u2500\u2500 Connector drag end \u2014 handles both new conns and reconnects \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const onConnDragEnd = useCallback((
    fromId: string,
    toId: string | null,
    reconnectConnId?: string,
  ) => {
    setPendingConn(null)
    if (useStore.getState().view !== 'macro') return
    if (!toId || fromId === toId || !store.curProjectId) return

    const s = useStore.getState()

    // If this was a reconnect drag, delete the original conn first
    if (reconnectConnId) {
      s.deleteConn(reconnectConnId)
    }

    // Determine actual fromId/toId based on node types
    // Rule: conn must go DS \u2192 Journey. Swap if needed.
    const nodes    = s.canvas()?.nodes ?? []
    const fromNode = nodes.find(n => n.id === fromId)
    const toNode   = nodes.find(n => n.id === toId)
    if (!fromNode || !toNode) return

    // Enforce DS \u2192 Journey direction
    const [dsId, journeyId] = fromNode.type === 'ds'
      ? [fromNode.id, toNode.id]
      : [toNode.id,   fromNode.id]

    const dsNode = nodes.find(n => n.id === dsId)
    const jNode  = nodes.find(n => n.id === journeyId)
    if (!dsNode || dsNode.type !== 'ds')      return
    if (!jNode  || jNode.type  !== 'journey') return

    if (!s.connExists(dsId, journeyId)) {
      s.addConn(makeConn(dsId, journeyId, store.curProjectId))
    }
  }, [store.curProjectId])

  const { startReconnect: _startReconnect } = useCanvasInteraction(
    canvasRef as React.RefObject<HTMLDivElement>,
    onConnDragMove,
    onConnDragEnd,
  )

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-text-2 text-[13px]">
        Project not found.
        <button onClick={() => router.push('/')} className="ml-2 underline hover:text-text-1 transition-colors">
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      <ProductHeader />
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <Ebar />

      <div className="flex flex-col flex-1 min-w-0">

        {/* \u2500\u2500 Header \u2500\u2500 */}
        <header className="h-[46px] bg-surface border-b border-border flex items-center justify-between z-30 flex-shrink-0 px-[16px] gap-[8px]">
          <nav className="flex items-center gap-[2px] min-w-0">
            <button
              onClick={() => store.goMacro()}
              className="flex items-center gap-[5px] px-[7px] py-[4px] rounded-[6px] hover:bg-bg transition-colors group flex-shrink-0"
            >
              <div className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ background: project.color ?? '#18181A' }} />
              <span className="text-[12px] font-medium text-text-2 group-hover:text-text-1 transition-colors">
                {project.name}
              </span>
            </button>

            {view === 'micro' && journey && (
              <>
                <ChevronRight size={12} className="text-text-3 flex-shrink-0" />
                <div className="flex items-center gap-[5px] px-[7px] py-[4px] rounded-[6px] bg-bg border border-border min-w-0">
                  <div className="w-[6px] h-[6px] rounded-full bg-brand-blue flex-shrink-0" />
                  <span className="text-[12px] font-medium text-text-1 truncate">{journey.name}</span>
                </div>
                {microMode === 'single' && activeFlow && (
                  <>
                    <ChevronRight size={12} className="text-text-3 flex-shrink-0" />
                    <span className="text-[11.5px] text-text-2 truncate font-mono">{activeFlow.name}</span>
                  </>
                )}
              </>
            )}
          </nav>

          <button className="flex items-center gap-[5px] px-[12px] h-[30px] bg-text-1 text-white text-[12px] font-medium rounded-[7px] hover:bg-neutral-800 active:scale-[.97] transition-all shadow-sm flex-shrink-0 group">
            <Zap size={11} className="group-hover:text-yellow-300 transition-colors" />
            Generate
          </button>
          {view === 'macro' && (
            <button
              onClick={() => setShowImportWizard(true)}
              className="flex items-center gap-[5px] px-[10px] h-[30px] border border-border text-text-2 text-[12px] font-medium rounded-[7px] hover:bg-bg hover:text-text-1 active:scale-[.97] transition-all flex-shrink-0"
              title="Importar arquivo Figma"
            >
              <FolderInput size={11} />
              Importar
            </button>
          )}
        </header>

        {/* \u2500\u2500 Canvas \u2500\u2500 */}
        <div className="flex-1 relative">
          <div
            ref={canvasRef}
            data-canvas
            className="canvas-root canvas-dots absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
                width: 8000, height: 8000,
              }}
            >
              <ConnectorLayer
                nodes={macroNodes}
                conns={view === 'macro' ? (canvas?.conns ?? []) : []}
                pendingConn={view === 'macro' ? pendingConn : null}
                selectedConnId={selConnId}
                onConnSelect={id => store.selectConn(id)}
                onConnDelete={id => store.deleteConn(id)}
              />

              {view === 'macro' && macroNodes.map(node => (
                <MacroNodeCard
                  key={node.id}
                  node={node}
                  isSelected={selNodeId === node.id}
                />
              ))}

              {/* ── Micro view: all flows rendered; screens use store positions (set by openJourney auto-layout) ── */}
              {view === 'micro' && journeyFlows.map((flow) => {
                // Flow label: positioned above the first screen in this flow
                const firstScreen = flow.screens[0]
                const labelX = firstScreen ? firstScreen.position.x : 0
                const labelY = firstScreen ? firstScreen.position.y - 36 : 24

                return (
                  <div key={flow.id}>
                    {/* Flow column label */}
                    <div
                      className={`absolute flex items-center gap-[6px] px-[10px] py-[4px] rounded-[7px] border cursor-pointer select-none transition-colors ${
                        activeFlow?.id === flow.id
                          ? 'bg-[#EFF6FF] border-[#BFDBFE] text-brand-blue'
                          : 'bg-surface border-border text-text-2 hover:bg-bg hover:text-text-1'
                      }`}
                      style={{ left: labelX, top: labelY }}
                      onClick={() => store.setActiveFlow(journey!.id, flow.id)}
                    >
                      <div className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${activeFlow?.id === flow.id ? 'bg-brand-blue' : 'bg-text-3'}`} />
                      <span className="text-[11.5px] font-semibold whitespace-nowrap">{flow.name}</span>
                      <span className="text-[10px] font-mono opacity-50">{flow.screens.length}s</span>
                    </div>

                    {/* Screens — ScreenNodeCard self-positions via screen.position.x/y */}
                    {flow.screens.map((screen) => (
                      <ScreenNodeCard
                        key={screen.id}
                        screen={screen}
                        isSelected={selScreenId === screen.id}
                      />
                    ))}

                    {/* Empty flow placeholder */}
                    {flow.screens.length === 0 && (
                      <div
                        className="absolute rounded-[10px] border border-dashed border-border flex items-center justify-center"
                        style={{ left: labelX, top: labelY + 36, width: 180, height: 80 }}
                      >
                        <span className="text-[11px] text-text-3 font-mono">no screens</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {view === 'micro' && journeyFlows.length === 0 && (
                <div className="absolute flex flex-col items-center gap-[8px] text-center select-none" style={{ left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }}>
                  <div className="text-[13px] text-text-3">No flows in this journey</div>
                  <div className="text-[11px] font-mono text-text-3 bg-surface border border-border px-[10px] py-[4px] rounded-[6px]">use the + button</div>
                </div>
              )}

              {view === 'macro' && macroNodes.length === 0 && (
                <div className="absolute flex flex-col items-center gap-[8px] text-center select-none" style={{ left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }}>
                  <div className="text-[13px] text-text-3">Add a DS and a Journey to start</div>
                  <div className="text-[11px] font-mono text-text-3 bg-surface border border-border px-[10px] py-[4px] rounded-[6px]">use the + button</div>
                </div>
              )}
            </div>
          </div>
        </div>


      </div>

      <RightPanel />

      {/* Zoom bar */}
      <div className="fixed bottom-4 right-4 bg-surface border border-border rounded-[9px] shadow-md flex items-center overflow-hidden z-40">
        <button onClick={() => store.setTransform({ scale: Math.max(0.15, transform.scale - 0.15) })} className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg hover:text-text-1 transition-colors text-[16px] leading-none select-none">\u2212</button>
        <button onClick={() => store.setTransform({ scale: 1 })} className="text-[11px] font-mono text-text-2 hover:text-text-1 px-2 hover:bg-bg transition-colors h-8 min-w-[44px] text-center tabular-nums">{Math.round(transform.scale * 100)}%</button>
        <button onClick={() => store.setTransform({ scale: Math.min(2.5, transform.scale + 0.15) })} className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg hover:text-text-1 transition-colors text-[16px] leading-none select-none">+</button>
        <div className="w-px h-4 bg-border mx-[1px]" />
        <button onClick={() => store.fitView()} title="Fit (F)" className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg hover:text-text-1 transition-colors">
          <Maximize2 size={12} />
        </button>
      </div>

      {showImportWizard && (
        <ImportWizard onClose={() => setShowImportWizard(false)} />
      )}

      <FAB />
      </div>   {/* flex flex-col flex-1 wrapper 2 */}
      </div>   {/* flex flex-col flex-1 wrapper 1 */}
      </div>   {/* main canvas area div */}
    </div>     {/* flex h-screen root */}
  )
}
