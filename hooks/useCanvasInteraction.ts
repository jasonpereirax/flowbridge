'use client'

import { useRef, useEffect, useCallback, RefObject } from 'react'
import { useStore } from '@/lib/store'
import { MACRO_NODE_W } from '@/components/nodes/MacroNode'

// Shared drag state — exported so CanvasWorkspace can register drag starts
export interface NodeDragState {
  id:     string
  kind:   'node' | 'screen'
  startX: number
  startY: number
  origX:  number
  origY:  number
}

export interface ConnDragState {
  fromId: string
  x1: number   // canvas coords — fixed anchor at handle
  y1: number
  x2: number   // canvas coords — follows cursor
  y2: number
}

// Module-level refs — shared between hook instances in the same render tree
// (safe because there's only ever one CanvasWorkspace mounted at a time)
export const nodeDrag  = { current: null as NodeDragState | null }
export const connDrag  = { current: null as ConnDragState | null }

export function useCanvasInteraction(
  canvasRef:          RefObject<HTMLDivElement>,
  onConnDragMove?:    (state: ConnDragState) => void,
  onConnDragEnd?:     (fromId: string, toId: string | null) => void,
  onNodeDoubleClick?: (id: string) => void,
) {
  const store     = useStore()
  const isPanning = useRef(false)
  const panOrigin = useRef({ x: 0, y: 0 })

  // Double-click detection: track last pointerdown per node id
  const lastTap = useRef<{ id: string; time: number } | null>(null)

  // Keep store-derived values in refs so listeners never go stale
  const viewRef       = useRef(useStore.getState().view)
  const journeyRef    = useRef(useStore.getState().journey())
  const activeFlowRef = useRef(useStore.getState().activeFlow())

  useEffect(() => {
    return useStore.subscribe(s => {
      viewRef.current       = s.view
      journeyRef.current    = s.journey()
      activeFlowRef.current = s.activeFlow()
    })
  }, [])

  // ── Coord helper — always reads fresh transform ───────────────────────────
  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x, y, scale } = useStore.getState().transform
    return {
      x: (clientX - rect.left - x) / scale,
      y: (clientY - rect.top  - y) / scale,
    }
  }, [canvasRef])

  // ── Unified pointer down on canvas element ────────────────────────────────
  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement

    // Connector handle — start a conn drag (macro view only)
    if (target.closest('[data-conn-handle]')) {
      e.stopPropagation()
      // Only valid in macro view
      if (useStore.getState().view !== 'macro') return
      // The handle's data-macro-id is on the ancestor node
      const nodeEl = target.closest('[data-macro-id]') as HTMLElement | null
      const fromId = nodeEl?.dataset.macroId
      if (!fromId) return

      // Anchor = right edge of the node header (canvas coords)
      // We compute it from the node's position in the store, not from clientX/Y
      // so the line always starts exactly at the handle regardless of where in
      // the handle the user clicks.
      const node = useStore.getState().canvas()?.nodes.find(n => n.id === fromId)
      if (!node) return

      const HEADER_H = 44  // matches ConnectorLayer's y1 offset
      const anchor = {
        x: node.position.x + MACRO_NODE_W,
        y: node.position.y + HEADER_H,
      }

      // cursor start = actual cursor position in canvas coords
      const cursor = clientToCanvas(e.clientX, e.clientY)

      connDrag.current = { fromId, x1: anchor.x, y1: anchor.y, x2: cursor.x, y2: cursor.y }
      // Capture on the canvas so we keep receiving events even if cursor leaves nodes
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    // Node body — start a node drag (with threshold handled in pointermove)
    if (target.closest('[data-node],[data-screen]')) {
      e.stopPropagation()
      // Don't start drag yet — wait for threshold in onPointerMove.
      // Record the pointerdown position so we can compute delta later.
      const nodeEl   = (target.closest('[data-macro-id]') as HTMLElement | null)
      const screenEl = (target.closest('[data-screen-id]') as HTMLElement | null)
      const id       = nodeEl?.dataset.macroId ?? screenEl?.dataset.screenId
      if (!id) return

      // Double-click detection — two pointerdowns on same id within 300ms
      const now = Date.now()
      if (lastTap.current?.id === id && now - lastTap.current.time < 300) {
        lastTap.current = null
        onNodeDoubleClick?.(id)
        return
      }
      lastTap.current = { id, time: now }

      // Find starting position from store (not stale closures)
      const state = useStore.getState()
      const macroNode = state.canvas()?.nodes.find(n => n.id === id)
      const flow      = state.activeFlow()
      const screen    = flow?.screens.find(s => s.id === id)

      const orig = macroNode
        ? { x: macroNode.position.x, y: macroNode.position.y }
        : screen
          ? { x: screen.position.x, y: screen.position.y }
          : null

      if (!orig) return

      nodeDrag.current = {
        id,
        kind:   macroNode ? 'node' : 'screen',
        startX: e.clientX,
        startY: e.clientY,
        origX:  orig.x,
        origY:  orig.y,
      }

      // Capture on canvas so events keep coming even as pointer leaves the node
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    // Canvas background — start pan
    // If clicking on a connector hit area, don't pan and don't clear selection.
    // The SVG path's onClick will fire after and call selectConn.
    if ((e.target as Element).closest('[data-conn-hit]')) return

    isPanning.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)
    const t = useStore.getState().transform
    panOrigin.current = { x: e.clientX - t.x, y: e.clientY - t.y }

    if (!(e.target as HTMLElement).closest('[data-selectable]')) {
      store.clearSel()
    }
  }, [store, canvasRef, clientToCanvas])

  const DRAG_THRESHOLD = 4

  const onPointerMove = useCallback((e: PointerEvent) => {
    // ── Connector drag ──────────────────────────────────────────────────────
    if (connDrag.current) {
      const cp = clientToCanvas(e.clientX, e.clientY)
      connDrag.current = { ...connDrag.current, x2: cp.x, y2: cp.y }
      onConnDragMove?.({ ...connDrag.current })
      return
    }

    // ── Node/screen drag ────────────────────────────────────────────────────
    if (nodeDrag.current) {
      const dx = e.clientX - nodeDrag.current.startX
      const dy = e.clientY - nodeDrag.current.startY

      // Enforce threshold before committing to drag
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return

      const { scale } = useStore.getState().transform
      const pos = {
        x: nodeDrag.current.origX + dx / scale,
        y: nodeDrag.current.origY + dy / scale,
      }

      if (nodeDrag.current.kind === 'node') {
        store.moveNode(nodeDrag.current.id, pos)
      } else {
        const j  = journeyRef.current
        const af = activeFlowRef.current
        if (j && af) store.moveScreen(j.id, af.id, nodeDrag.current.id, pos)
      }
      return
    }

    // ── Pan ─────────────────────────────────────────────────────────────────
    if (isPanning.current) {
      store.setTransform({
        x: e.clientX - panOrigin.current.x,
        y: e.clientY - panOrigin.current.y,
      })
    }
  }, [store, clientToCanvas, onConnDragMove])

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (connDrag.current) {
      const el    = document.elementFromPoint(e.clientX, e.clientY)
      const toId  = (el?.closest('[data-macro-id]') as HTMLElement | null)?.dataset.macroId
      const fromId = connDrag.current.fromId
      connDrag.current = null
      onConnDragEnd?.(fromId, toId ?? null)
      canvasRef.current?.releasePointerCapture(e.pointerId)
      return
    }

    if (nodeDrag.current) {
      // If pointer barely moved — treat as a click → select
      const dx = Math.abs(e.clientX - nodeDrag.current.startX)
      const dy = Math.abs(e.clientY - nodeDrag.current.startY)
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        store.selectNode(nodeDrag.current.id)
      }
      nodeDrag.current = null
      canvasRef.current?.releasePointerCapture(e.pointerId)
      return
    }

    isPanning.current = false
  }, [store, canvasRef, onConnDragEnd])

  // ── Wheel zoom ────────────────────────────────────────────────────────────
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

  // ── Register on canvas element (not window) ────────────────────────────────
  // All pointer events are captured on the canvas element via setPointerCapture,
  // so we never need window listeners. This avoids conflicts with other handlers.
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
