'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, useTransform, useView } from '@/lib/store'
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction'

interface Props {
  projectId: string
}

// Entry point for the canvas — sets up the project and delegates to sub-components.
// Everything here is client-side; no server data fetching.
export function CanvasWorkspace({ projectId }: Props) {
  const router     = useRouter()
  const canvasRef  = useRef<HTMLDivElement>(null)
  const store      = useStore()
  const transform  = useTransform()
  const view       = useView()
  const project    = store.projects.find(p => p.id === projectId)

  useCanvasInteraction(canvasRef as React.RefObject<HTMLDivElement>)

  // Open project on mount if not already open
  useEffect(() => {
    if (projectId !== store.curProjectId) {
      store.openProject(projectId)
    }
  }, [projectId, store])

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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <nav className="h-[46px] bg-surface border-b border-border flex items-center justify-between px-4 z-50 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Logo → dashboard */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors"
          >
            <div className="w-6 h-6 bg-text-1 rounded-md flex items-center justify-center text-white font-serif italic text-sm">F</div>
            <span className="text-[13px] font-semibold tracking-tight text-text-2">{project.name}</span>
          </button>

          {/* Breadcrumb — only in micro view */}
          {view === 'micro' && (
            <>
              <span className="text-text-3 text-xs">›</span>
              <button
                onClick={() => store.goMacro()}
                className="text-[12px] text-text-2 hover:text-text-1 px-2 py-1 rounded transition-colors"
              >
                Workspace
              </button>
              {store.journey() && (
                <>
                  <span className="text-text-3 text-xs">›</span>
                  <span className="text-[12px] text-text-1 font-medium px-2">
                    {store.journey()?.name}
                  </span>
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

      {/* ── Canvas ──────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="canvas-root canvas-dots flex-1 relative overflow-hidden cursor-grab"
        data-canvas
      >
        {/* Scene — single transformed container */}
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
            width: 8000,
            height: 8000,
          }}
        >
          {/* SVG layer for connectors — sits below nodes */}
          <svg
            className="absolute inset-0 overflow-visible pointer-events-none"
            width={8000}
            height={8000}
          />

          {/* TODO: <MacroLayer /> or <MicroLayer /> depending on view */}
          {/* Placeholder node to confirm canvas is working */}
          <div
            className="absolute bg-surface border border-border rounded-xl shadow-sm p-4 w-52 text-sm text-text-2"
            style={{ left: 200, top: 180 }}
          >
            <div className="text-[11px] font-mono text-text-3 mb-1">Journey node</div>
            <div className="font-medium text-text-1">Auth Flow</div>
          </div>
          <div
            className="absolute bg-surface border border-border rounded-xl shadow-sm p-4 w-52 text-sm text-text-2"
            style={{ left: 520, top: 180 }}
          >
            <div className="text-[11px] font-mono text-text-3 mb-1">DS node</div>
            <div className="font-medium text-text-1">Design System</div>
          </div>
        </div>
      </div>

      {/* ── Zoom bar ────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 bg-surface border border-border rounded-xl shadow-md flex items-center overflow-hidden z-50">
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

    </div>
  )
}
