'use client'

import { useRef, useEffect, useCallback, RefObject } from 'react'
import { useStore } from '@/lib/store'

export function useCanvasInteraction(canvasRef: RefObject<HTMLDivElement>) {
  const store     = useStore()
  const isPanning = useRef(false)
  const panOrigin = useRef({ x: 0, y: 0 })

  // ── Pointer ────────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: PointerEvent) => {
    const target = e.target as HTMLElement
    const onNode = target.closest('[data-node],[data-screen],[data-handle]')
    if (onNode || e.button !== 0) return

    isPanning.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)

    const t = useStore.getState().transform
    panOrigin.current = { x: e.clientX - t.x, y: e.clientY - t.y }

    // Click on canvas background → clear selection
    if (!target.closest('[data-selectable]')) {
      store.clearSel()
    }
  }, [store, canvasRef])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isPanning.current) return
    store.setTransform({
      x: e.clientX - panOrigin.current.x,
      y: e.clientY - panOrigin.current.y,
    })
  }, [store])

  const onPointerUp = useCallback(() => {
    isPanning.current = false
  }, [])

  // ── Wheel zoom (zoom toward cursor) ───────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const { x, y, scale } = useStore.getState().transform
    const delta = -e.deltaY * 0.0008 * scale
    const ns    = Math.min(2.5, Math.max(0.15, scale + delta))

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    store.setTransform({
      scale: ns,
      x: mx - (mx - x) * (ns / scale),
      y: my - (my - y) * (ns / scale),
    })
  }, [store, canvasRef])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    const s = useStore.getState()

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if      (s.selConnId)   s.deleteConn(s.selConnId)
      else if (s.selNodeId)   s.deleteNode(s.selNodeId)
      else if (s.selScreenId && s.curJourneyId) {
        const flow = s.activeFlow()
        if (flow) s.deleteScreen(s.curJourneyId, flow.id, s.selScreenId)
      }
    }

    if (e.key === 'Escape') {
      s.clearSel()
      s.closeRpanel()
      s.closeFab()
    }

    if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) s.fitView()
    if (e.key === '0' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); s.fitView() }
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup',   onPointerUp)
    el.addEventListener('wheel',       onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup',   onPointerUp)
      el.removeEventListener('wheel',       onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onPointerDown, onPointerMove, onPointerUp, onWheel, onKeyDown, canvasRef])
}
