'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Zap } from 'lucide-react'
import { useStore, useTransform, useView } from '@/lib/store'
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction'
import { makeConn } from '@/utils'

import { ConnectorLayer }  from '@/components/canvas/ConnectorLayer'
import { MacroNodeCard }   from '@/components/nodes/MacroNode'
import { ScreenNodeCard }  from '@/components/nodes/ScreenNode'
import { Ibar }            from '@/components/sidebar/Ibar'
import { Ebar }           from '@/components/sidebar/Ebar'
import { FlowPanel }      from '@/components/panels/FlowPanel'
import { RightPanel }     from '@/components/panels/RightPanel'
import { FAB }            from '@/components/ui/FAB'

interface PendingConn { fromId: string; x1: number; y1: number; x2: number; y2: number }

export function CanvasWorkspace({ projectId }: { projectId: string }) {
  const router    = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const store     = useStore()
  const transform = useTransform()
  const view      = useView()
  const project   = store.projects.find(p => p.id === projectId)

  const canvas     = useStore(s => s.canvas())
  const journey    = useStore(s => s.journey())
  const activeFlow = useStore(s => s.activeFlow())

  const [pendingConn, setPendingConn] = useState<PendingConn | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const draggingNode = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  useCanvasInteraction(canvasRef as React.RefObject<HTMLDivElement>)

  useEffect(() => {
    if (projectId !== store.curProjectId) store.openProject(projectId)
  }, [projectId, store])

  const macroNodes  = canvas?.nodes ?? []
  const screenNodes = activeFlow?.screens ?? []

  function screenToCanvas(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x, y, scale } = useStore.getState().transform
    return { x: (clientX - rect.left - x) / scale, y: (clientY - rect.top - y) / scale }
  }

  function handleConnDragStart(fromId: string, clientX: number, clientY: number) {
    const cp = screenToCanvas(clientX, clientY)
    setPendingConn({ fromId, x1: cp.x, y1: cp.y, x2: cp.x, y2: cp.y })
  }

  function handleNodeDragStart(id: string, clientX: number, clientY: number) {
    const node = macroNodes.find(n => n.id === id)
    if (!node) return
    draggingNode.current = { id, startX: clientX, startY: clientY, origX: node.position.x, origY: node.position.y }
  }

  function handleScreenDragStart(id: string, clientX: number, clientY: number) {
    const screen = screenNodes.find(s => s.id === id)
    if (!screen || !journey || !activeFlow) return
    draggingNode.current = {
      id,
      startX: clientX, startY: clientY,
      origX: screen.position.x, origY: screen.position.y,
    }
  }

  // Global pointermove: node has setPointerCapture so events come here via bubbling
  // We handle the actual position update here to keep nodes and screens in sync
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingNode.current) return
      const { scale } = useStore.getState().transform
      const dx = (e.clientX - draggingNode.current.startX) / scale
      const dy = (e.clientY - draggingNode.current.startY) / scale
      const newPos = { x: draggingNode.current.origX + dx, y: draggingNode.current.origY + dy }

      if (view === 'macro') {
        store.moveNode(draggingNode.current.id, newPos)
      } else if (journey && activeFlow) {
        store.moveScreen(journey.id, activeFlow.id, draggingNode.current.id, newPos)
      }
    }
    const onUp = () => { draggingNode.current = null }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [view, journey, activeFlow, store])

  useEffect(() => {
    if (!pendingConn) return
    const onMove = (e: PointerEvent) => {
      const cp = screenToCanvas(e.clientX, e.clientY)
      setPendingConn(prev => prev ? { ...prev, x2: cp.x, y2: cp.y } : null)
    }
    const onUp = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const toId = (el?.closest('[data-macro-id]') as HTMLElement | null)?.dataset.macroId
      if (toId && store.curProjectId) {
        const s = useStore.getState()
        const currentPendingConn = pendingConn
        if (currentPendingConn && !s.connExists(currentPendingConn.fromId, toId)) {
          s.addConn(makeConn(currentPendingConn.fromId, toId, store.curProjectId))
        }
      }
      setPendingConn(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [pendingConn, store.curProjectId])

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-text-2 text-[13px]">
        Project not found.
        <button onClick={() => router.push('/')} className="ml-2 underline hover:text-text-1 transition-colors">Back</button>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Ibar />
      <Ebar />

      <div className="flex flex-col flex-1 min-w-0">

        {/* ── Navbar ── */}
        <nav className="h-[46px] bg-surface border-b border-border flex items-center justify-between z-30 flex-shrink-0 px-[14px]">
          <div className="flex items-center h-full gap-[4px]">

            {/* breadcrumb — always show workspace, then journey if in micro view */}
            <button
              onClick={() => store.goMacro()}
              className="text-[12px] text-text-2 hover:text-text-1 transition-colors px-[6px] py-[3px] rounded-[5px] hover:bg-bg"
            >
              Workspace
            </button>

            {view === 'micro' && journey && (
              <>
                <span className="text-text-3 text-[13px]">›</span>
                <div className="flex items-center gap-[5px] px-[6px] py-[3px] rounded-[5px] bg-bg border border-border">
                  <div className="w-[12px] h-[12px] rounded-[3px] bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <svg width="6" height="8" viewBox="0 0 6 8" fill="none"><path d="M1 1L5 4L1 7" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <span className="text-[12px] font-medium text-text-1">{journey.name}</span>
                </div>
              </>
            )}
          </div>

          {/* generate */}
          <button className="flex items-center gap-[5px] px-[12px] py-[6px] bg-text-1 text-white text-[12px] font-medium rounded-[8px] hover:bg-neutral-800 active:scale-95 transition-all shadow-sm">
            <Zap size={12} />
            Generate
          </button>
        </nav>

        {/* ── Canvas ── */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'micro' && <FlowPanel />}

          <div className="flex-1 relative">
            <div
              ref={canvasRef}
              data-canvas
              className="canvas-root canvas-dots absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`, width: 8000, height: 8000 }}
              >
                <ConnectorLayer 
                  nodes={macroNodes} 
                  conns={canvas?.conns ?? []} 
                  selectedConnId={null}
                  transform={transform}
                  onConnSelect={(connId) => store.selectConn(connId)}
                />

                {/* Macro nodes */}
                {view === 'macro' && macroNodes.map(node => (
                  <MacroNodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onSelect={(id) => { setSelectedNodeId(id); store.selectNode(id) }}
                    onDragStart={handleNodeDragStart}
                    onConnDragStart={handleConnDragStart}
                  />
                ))}

                {/* Screen nodes (micro view) */}
                {view === 'micro' && screenNodes.map(screen => (
                  <ScreenNodeCard
                    key={screen.id}
                    screen={screen}
                    isSelected={selectedScreenId === screen.id}
                    onSelect={(id) => { setSelectedScreenId(id); store.selectScreen(id) }}
                    onDragStart={handleScreenDragStart}
                  />
                ))}

                {view === 'macro' && macroNodes.length === 0 && (
                  <div className="absolute flex flex-col items-center gap-[6px] text-center" style={{ left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}>
                    <div className="text-[13px] text-text-3">Add a DS node and a Journey node to start</div>
                    <div className="text-[11px] font-mono text-text-3">use the + button below</div>
                  </div>
                )}

                {view === 'micro' && activeFlow && screenNodes.length === 0 && (
                  <div className="absolute flex flex-col items-center gap-[6px] text-center" style={{ left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}>
                    <div className="text-[13px] text-text-3">No screens in this flow</div>
                    <div className="text-[11px] font-mono text-text-3">use the + button below</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RightPanel />

      {/* ── Zoom bar ── */}
      <div className="fixed bottom-5 right-5 bg-surface border border-border rounded-[10px] shadow-md flex items-center overflow-hidden z-40">
        <button onClick={() => store.setTransform({ scale: Math.max(0.15, transform.scale - 0.15) })} className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg transition-colors text-[16px] leading-none select-none">−</button>
        <button onClick={() => store.setTransform({ scale: 1 })} className="text-[11px] font-mono text-text-2 px-2 hover:bg-bg transition-colors h-8 min-w-[46px] text-center">
          {Math.round(transform.scale * 100)}%
        </button>
        <button onClick={() => store.setTransform({ scale: Math.min(2.5, transform.scale + 0.15) })} className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg transition-colors text-[16px] leading-none select-none">+</button>
        <div className="w-px h-4 bg-border mx-px" />
        <button onClick={() => store.fitView()} title="Fit (F)" className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg transition-colors">
          <Maximize2 size={12} />
        </button>
      </div>

      <FAB />
    </div>
  )
}
