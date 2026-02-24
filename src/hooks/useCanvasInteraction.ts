import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLDivElement>) {
  const { transform, setTransform, clearSelection, selConnId, selNodeId, selScreenId } = useStore()
  const isPanning  = useRef(false)
  const panStart   = useRef({ x: 0, y: 0 })

  // ── Pan ───────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    // Only pan on canvas background — not on nodes, buttons, handles
    if (target.closest('.fb-node, .fb-screen, .fb-handle, button, input, textarea')) return
    if (e.button !== 0) return

    isPanning.current = true
    panStart.current  = {
      x: e.clientX - transform.x,
      y: e.clientY - transform.y,
    }
    canvasRef.current?.classList.add('cursor-grabbing')

    // Click on empty canvas → clear selection
    if (target === canvasRef.current || target.classList.contains('fb-dots')) {
      clearSelection()
    }
  }, [transform, clearSelection, canvasRef])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return
    setTransform({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    })
  }, [setTransform])

  const onMouseUp = useCallback(() => {
    isPanning.current = false
    canvasRef.current?.classList.remove('cursor-grabbing')
  }, [canvasRef])

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const { x, y, scale } = transform
    const delta = -e.deltaY * 0.0008 * scale
    const ns    = Math.min(2.5, Math.max(0.15, scale + delta))

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    setTransform({
      scale: ns,
      x: mx - (mx - x) * (ns / scale),
      y: my - (my - y) * (ns / scale),
    })
  }, [transform, setTransform, canvasRef])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    const store = useStore.getState()

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (store.selConnId)   store.deleteConn(store.selConnId)
      else if (store.selNodeId)   store.deleteNode(store.selNodeId)
      else if (store.selScreenId && store.curJourneyId) {
        const flow = store.activeFlow()
        if (flow) store.deleteScreen(store.curJourneyId, flow.id, store.selScreenId)
      }
    }

    if (e.key === 'Escape') {
      store.clearSelection()
      store.closeRpanel()
      store.closeFab()
    }

    if (e.key.toLowerCase() === 'f') store.fitView()
    if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      store.fitView()
    }
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    el.addEventListener('mousedown',  onMouseDown)
    el.addEventListener('wheel',      onWheel, { passive: false })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    window.addEventListener('keydown',   onKeyDown)

    return () => {
      el.removeEventListener('mousedown',  onMouseDown)
      el.removeEventListener('wheel',      onWheel)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      window.removeEventListener('keydown',   onKeyDown)
    }
  }, [onMouseDown, onMouseMove, onMouseUp, onWheel, onKeyDown, canvasRef])

  return { transform }
}
