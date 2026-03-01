'use client'

import { useRef, useEffect, useCallback, RefObject } from 'react'
import { useStore } from '@/lib/store'
import { MACRO_NODE_W } from '@/components/nodes/MacroNode'

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
  x1: number
  y1: number
  x2: number
  y2: number
}

export const nodeDrag  = { current: null as NodeDragState | null }
export const connDrag  = { current: null as ConnDragState | null }

const DRAG_THRESHOLD = 4
const DBLCLICK_MS    = 300  // max ms between taps to count as double-click

export function useCanvasInteraction(
  canvasRef:       RefObject<HTMLDivElement>,
  onConnDragMove?: (state: ConnDragState) => void,
  onConnDragEnd?:  (fromId: string, toId: string | null) => void,
) {
  const store     = useStore()
  const isPanning = useRef(false)
  const panOrigin = useRef({ x: 0, y: 0 })

  // Double-click tracking: record last tap { id, time }
  const lastTap = useRef<{ id: string; t: number } | null>(null)

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

  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x, y, scale } = useStore.getState().transform
    return {
      x: (clientX - rect.left - x) / scale,
      y: (clientY - rect.top  - y) / scale,
    }
  }, [canvasRef])

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement

    // Connector handle
    if (target.closest('[data-conn-handle]')) {
      e.stopPropagation()
      if (useStore.getState().view !== 'macro') return
      const nodeEl = target.closest('[data-macro-id]') as HTMLElement | null
      const fromId = nodeEl?.dataset.macroId
      if (!fromId) return
      const node = useStore.getState().canvas()?.nodes.find(n => n.id === fromId)
      if (!node) return
      const anchor = { x: node.position.x + MACRO_NODE_W, y: node.position.y + 44 }
      const cursor = clientToCanvas(e.clientX, e.clientY)
      connDrag.current = { fromId, x1: anchor.x, y1: anchor.y, x2: cursor.x, y2: cursor.y }
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    // Node / screen body
    if (target.closest('[data-node],[data-screen]')) {
      e.stopPropagation()
      const nodeEl   = target.closest('[data-macro-id]') as HTMLElement | null
      const screenEl = target.closest('[data-screen-id]') as HTMLElement | null
      const id       = nodeEl?.dataset.macroId ?? screenEl?.dataset.screenId
      if (!id) return

      const state     = useStore.getState()
      const macroNode = state.canvas()?.nodes.find(n => n.id === id)
      const flow      = state.activeFlow()
      const screen    = flow?.screens.find(s => s.id === id)
      const orig      = macroNode
        ? { x: macroNode.position.x, y: macroNode.position.y }
        : screen ? { x: screen.position.x, y: screen.position.y } : null
      if (!orig) return

      nodeDrag.current = {
        id,
        kind:   macroNode ? 'node' : 'screen',
        startX: e.clientX,
        startY: e.clientY,
        origX:  orig.x,
        origY:  orig.y,
      }
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    if ((e.target as Element).closest('[data-conn-hit]')) return

    // Canvas background — pan
    isPanning.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)
    const t = useStore.getState().transform
    panOrigin.current = { x: e.clientX - t.x, y: e.clientY - t.y }
    if (!(e.target as HTMLElement).closest('[data-selectable]')) {
      store.clearSel()
    }
  }, [store, canvasRef, clientToCanvas])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (connDrag.current) {
      const cp = clientToCanvas(e.clientX, e.clientY)
      connDrag.current = { ...connDrag.current, x2: cp.x, y2: cp.y }
      onConnDragMove?.({ ...connDrag.current })
      return
    }

    if (nodeDrag.current) {
      const dx = e.clientX - nodeDrag.current.startX
      const dy = e.clientY - nodeDrag.current.startY
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

    if (isPanning.current) {
      store.setTransform({
        x: e.clientX - panOrigin.current.x,
        y: e.clientY - panOrigin.current.y,
      })
    }
  }, [store, clientToCanvas, onConnDragMove])

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (connDrag.current) {
      const el     = document.elementFromPoint(e.clientX, e.clientY)
      const toId   = (el?.closest('[data-macro-id]') as HTMLElement | null)?.dataset.macroId
      const fromId = connDrag.current.fromId
      connDrag.current = null
      onConnDragEnd?.(fromId, toId ?? null)
      canvasRef.current?.releasePointerCapture(e.pointerId)
      return
    }

    if (nodeDrag.current) {
      const dx   = Math.abs(e.clientX - nodeDrag.current.startX)
      const dy   = Math.abs(e.clientY - nodeDrag.current.startY)
      const id   = nodeDrag.current.id
      const kind = nodeDrag.current.kind
      nodeDrag.current = null
      canvasRef.current?.releasePointerCapture(e.pointerId)

      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        // ── Double-click detection via timing ──────────────────────────────
        const now  = Date.now()
        const last = lastTap.current

        if (last && last.id === id && now - last.t < DBLCLICK_MS) {
          // ✅ DOUBLE-CLICK
          lastTap.current = null
          const s    = useStore.getState()
          const node = s.canvas()?.nodes.find(n => n.id === id)

          if (node && kind === 'node') {
            if (node.type === 'journey') {
              // Enter micro view — openJourney already auto-selects first flow
              s.openJourney(node.id)
            } else {
              // DS node: open right panel
              s.selectNode(node.id)
            }
          } else if (kind === 'screen') {
            // Double-click on screen: select it
            s.selectScreen(id)
          }
        } else {
          // ✅ SINGLE-CLICK — register tap and select
          lastTap.current = { id, t: now }
          if (kind === 'screen') {
            store.selectScreen(id)
          } else {
            store.selectNode(id)
          }
        }
      }
      return
    }

    isPanning.current = false
  }, [store, canvasRef, onConnDragEnd])

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
    if (e.key === 'Escape') { s.clearSel(); s.closeRpanel(); s.closeFab() }
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

  return {
    startReconnect: useCallback(
      (_connId: string, _endpoint: string, _x: number, _y: number, _pointerId: number) => {},
      []
    ),
  }
}
