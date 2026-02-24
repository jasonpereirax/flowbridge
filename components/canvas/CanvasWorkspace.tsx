'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, useTransform, useView } from '@/lib/store'
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction'
import { makeConn } from '@/utils'

import { MacroNodeCard } from '@/components/nodes/MacroNode'
import { ScreenNodeCard }  from '@/components/nodes/ScreenNode'
import { ConnectorLayer }  from '@/components/canvas/ConnectorLayer'
import { Ibar }            from '@/components/sidebar/Ibar'
import { Ebar }            from '@/components/sidebar/Ebar'
import { FlowPanel }       from '@/components/panels/FlowPanel'
import { RightPanel }      from '@/components/panels/RightPanel'
import { FAB }             from '@/components/ui/FAB'

interface PendingConn {
  fromId: string
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Props {
  projectId: string
}

export function CanvasWorkspace({ projectId }: Props) {
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

  useCanvasInteraction(canvasRef as React.RefObject<HTMLDivElement>)

  // Open project on mount
  useEffect(() => {
    if (projectId !== store.curProjectId) {
      store.openProject(projectId)
    }
  }, [projectId, store])

  // ── Connector drag → screen-space to canvas-space helper ─────────────────

  function screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x, y, scale } = useStore.getState().transform
    return {
      x: (clientX - rect.left - x) / scale,
      y: (clientY - rect.top - y) / scale,
    }
  }

  // Called by DS node handle pointerdown
  function handleConnDragStart(fromId: string, clientX: number, clientY: number) {
    const cp = screenToCanvas(clientX, clientY)
    setPendingConn({ fromId, x1: cp.x, y1: cp.y, x2: cp.x, y2: cp.y })
  }

  // Window-level pointer handlers for connector drag
  useEffect(() => {
    if (!pendingConn) return

    const onMove = (e: PointerEvent) => {
      const cp = screenToCanvas(e.clientX, e.clientY)
      setPendingConn(prev => prev ? { ...prev, x2: cp.x, y2: cp.y } : null)
    }

    const onUp = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const journeyEl = target?.closest('[data-journey-id]') as HTMLElement | null
      const toId = journeyEl?.dataset.journeyId

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
  }, [pendingConn?.fromId]) // re-run only when drag starts (fromId changes)

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-text-2 text-sm">
        Project not found.{' '}
        <button onClick={() => router.push('/')} className="ml-2 underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  const macroNodes  = canvas?.nodes ?? []
  const screenNodes = activeFlow?.screens ?? []

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <Ibar />
      <Ebar />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ── Nav bar ────────────────────────────────────────────────── */}
        <nav className="h-[46px] bg-surface border-b border-border flex items-center justify-between px-4 z-30 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Logo → dashboard */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors"
            >
              <div className="w-6 h-6 bg-text-1 rounded-md flex items-center justify-center text-white font-serif italic text-sm">
                F
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-text-2">
                {project.name}
              </span>
            </button>

            {/* Breadcrumb — micro view only */}
            {view === 'micro' && (
              <>
                <span className="text-text-3 text-xs">›</span>
                <button
                  onClick={() => store.goMacro()}
                  className="text-[12px] text-text-2 hover:text-text-1 px-2 py-1 rounded transition-colors"
                >
                  Workspace
                </button>
                {journey && (
                  <>
                    <span className="text-text-3 text-xs">›</span>
                    <span className="text-[12px] text-text-1 font-medium px-2">{journey.name}</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Generate button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-text-1 text-white text-[13px] font-medium rounded-lg hover:bg-neutral-800 transition-colors">
            <span>⚡</span> Generate
          </button>
        </nav>

        {/* ── Canvas ─────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <div
            ref={canvasRef}
            data-canvas
            className="canvas-root canvas-dots absolute inset-0 overflow-hidden cursor-grab"
          >
            {/* Scene — single transformed container */}
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
                width:  8000,
                height: 8000,
              }}
            >
              {/* Connector SVG layer — behind nodes */}
              <ConnectorLayer pendingConn={pendingConn} />

              {/* Macro view: DS + Journey nodes */}
              {view === 'macro' && macroNodes.map(node => (
                <MacroNodeCard
                  key={node.id}
                  node={node}
                  onConnDragStart={handleConnDragStart}
                />
              ))}

              {/* Micro view: Screen cards */}
              {view === 'micro' && activeFlow && journey && screenNodes.map(screen => (
                <ScreenNodeCard
                  key={screen.id}
                  screen={screen}
                  journeyId={journey.id}
                  flowId={activeFlow.id}
                />
              ))}

              {/* Empty-state hints */}
              {view === 'macro' && macroNodes.length === 0 && (
                <div
                  className="absolute flex flex-col items-center gap-2 text-center"
                  style={{ left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}
                >
                  <div className="text-[13px] text-text-3">Start by adding a DS node and Journey node</div>
                  <div className="text-[11px] text-text-3">Use the + button below</div>
                </div>
              )}

              {view === 'micro' && activeFlow && screenNodes.length === 0 && (
                <div
                  className="absolute flex flex-col items-center gap-2 text-center"
                  style={{ left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}
                >
                  <div className="text-[13px] text-text-3">No screens yet in this flow</div>
                  <div className="text-[11px] text-text-3">Use the + button below to add a screen</div>
                </div>
              )}
            </div>
          </div>

          {/* Flow panel — floating, micro view only */}
          {view === 'micro' && (
            <div className="absolute top-0 left-0 p-3 z-10 pointer-events-none">
              <div className="pointer-events-auto">
                <FlowPanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <RightPanel />

      {/* ── Zoom bar (fixed bottom-right) ────────────────────────────── */}
      <div className="fixed bottom-5 right-5 bg-surface border border-border rounded-xl shadow-md flex items-center overflow-hidden z-40">
        <button
          onClick={() => store.setTransform({ scale: Math.max(0.15, transform.scale - 0.15) })}
          className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg transition-colors text-base"
        >
          −
        </button>
        <button
          onClick={() => store.setTransform({ scale: 1 })}
          className="text-[11px] font-mono text-text-2 px-2 hover:bg-bg transition-colors h-8"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <button
          onClick={() => store.setTransform({ scale: Math.min(2.5, transform.scale + 0.15) })}
          className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg transition-colors text-base"
        >
          +
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={() => store.fitView()}
          className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg transition-colors text-base"
          title="Fit view (F)"
        >
          ⊞
        </button>
      </div>

      {/* ── FAB (fixed bottom-center) ─────────────────────────────────── */}
      <FAB />
    </div>
  )
}
