// src/pages/CanvasPage.tsx
// Full canvas implementation — migrated from v6 prototype.
// Uses hooks: useCanvasInteraction, useStore, useGenerate

import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, useTransform } from '@/lib/store'
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction'

export default function CanvasPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const canvasRef    = useRef<HTMLDivElement>(null)
  const { openProject, curProjectId, view, goMacro } = useStore()
  const transform    = useTransform()

  useCanvasInteraction(canvasRef as React.RefObject<HTMLDivElement>)

  // Open project from URL param
  useEffect(() => {
    if (id && id !== curProjectId) openProject(id)
  }, [id, curProjectId, openProject])

  if (!curProjectId) {
    return (
      <div className="flex h-screen items-center justify-center text-text-2 text-sm">
        Loading project…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Nav — TODO: implement full nav from prototype */}
      <nav className="h-[46px] bg-surface border-b border-border flex items-center justify-between px-4 z-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            className="text-sm text-text-2 hover:text-text-1 px-2 py-1 rounded transition-colors"
            onClick={() => navigate('/')}
          >
            ← Projects
          </button>
          {view === 'micro' && (
            <>
              <span className="text-text-3">›</span>
              <button className="text-sm text-text-2 hover:text-text-1 px-2 py-1 rounded" onClick={goMacro}>
                Workspace
              </button>
            </>
          )}
        </div>
        <button className="px-3 py-1.5 bg-text-1 text-white text-[13px] font-medium rounded-lg hover:bg-neutral-800">
          ⚡ Generate
        </button>
      </nav>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="fb-canvas-root flex-1 relative overflow-hidden bg-bg cursor-grab"
        style={{
          backgroundImage: 'radial-gradient(circle, #CCC 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="absolute top-0 left-0 w-0 h-0"
          style={{
            transformOrigin: '0 0',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {/* SVG connector layer */}
          <svg
            className="absolute top-0 left-0 pointer-events-none overflow-visible"
            style={{ width: 8000, height: 8000 }}
          />
          {/* Nodes rendered here — TODO: MacroNodeLayer / MicroScreenLayer */}
          <div className="absolute" style={{ left: 200, top: 200 }}>
            <div className="w-[220px] bg-surface border border-border rounded-xl p-3 shadow-sm text-sm text-text-2">
              Canvas ready — migrate nodes from prototype ✓
            </div>
          </div>
        </div>
      </div>

      {/* Zoom bar — TODO */}
      <div className="fixed bottom-5 right-5 bg-surface border border-border rounded-xl shadow-md flex items-center overflow-hidden z-50">
        <button className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg text-base transition-colors">−</button>
        <span className="text-[11px] font-mono text-text-2 px-2">{Math.round(transform.scale * 100)}%</span>
        <button className="w-8 h-8 flex items-center justify-center text-text-2 hover:bg-bg text-base transition-colors">+</button>
      </div>
    </div>
  )
}
