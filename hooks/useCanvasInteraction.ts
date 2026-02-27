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
  fromId:            string
  x1: number; y1: number
  x2: number; y2: number
  reconnectConnId?:   string
  reconnectEndpoint?: 'from' | 'to'
}

export const nodeDrag = { current: null as NodeDragState | null }
export const connDrag = { current: null as ConnDragState | null }

const DBLCLICK_MS    = 280   // max ms between clicks to count as double-click
const DRAG_THRESHOLD = 4     // px before drag starts

export function useCanvasInteraction(
  canvasRef:       RefObject<HTMLDivElement>,
  onConnDragMove?: (state: ConnDragState) => void,
  onConnDragEnd?:  (fromId: string, toId: string | null, reconnectConnId?: string) => void,
) {
  const store     = useStore()
  const isPanning = useRef(false)
  const panOrigin = useRef({ x: 0, y: 0 })

  // Double-click tracking — per node id
  const lastTap = useRef<{ id: string; t: number } | null>(null)

  const viewRef       = useRef(useStore.getState().view)
  const journeyRef    = useRef(useStore.getState().journey())
  const activeFlowRef = useRef(useStore.getState().activeFlow())

  useEffect(() => useStore.subscribe(s => {
    viewRef.current       = s.view
    journeyRef.current    = s.journey()
    activeFlowRef.current = s.activeFlow()
  }), [])

  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x, y, scale } = useStore.getState().transform
    return { x: (clientX - rect.left - x) / scale, y: (clientY - rect.top - y) / scale }
  }, [canvasRef])

  // ── Pointer down ─────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement

    // Connector handle on DS node
    if (target.closest('[data-conn-handle]')) {
      e.stopPropagation()
      if (useStore.getState().view !== 'macro') return
      const nodeEl = target.closest('[data-macro-id]') as HTMLElement | null
      const fromId = nodeEl?.dataset.macroId
      if (!fromId) return
      const node = useStore.getState().canvas()?.nodes.find(n => n.id === fromId)
      if (!node) return
      connDrag.current = {
        fromId,
        x1: node.position.x + MACRO_NODE_W,
        y1: node.position.y + 44,
        x2: clientToCanvas(e.clientX, e.clientY).x,
        y2: clientToCanvas(e.clientX, e.clientY).y,
      }
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    // Node body
    if (target.closest('[data-node],[data-screen]')) {
      e.stopPropagation()
      const nodeEl   = target.closest('[data-macro-id]') as HTMLElement | null
      const screenEl = target.closest('[data-screen-id]') as HTMLElement | null
      const id       = nodeEl?.dataset.macroId ?? screenEl?.dataset.screenId
      if (!id) return

      const state     = useStore.getState()
      const macroNode = state.canvas()?.nodes.find(n => n.id === id)
      const screen    = state.activeFlow()?.screens.find(s => s.id === id)
      const orig      = macroNode
        ? { x: macroNode.position.x, y: macroNode.position.y }
        : screen ? { x: screen.position.x, y: screen.position.y } : null
      if (!orig) return

      nodeDrag.current = {
        id, kind: macroNode ? 'node' : 'screen',
        startX: e.clientX, startY: e.clientY,
        origX: orig.x, origY: orig.y,
      }
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    if ((e.target as Element).closest('[data-conn-hit]')) return

    // Canvas background → pan
    isPanning.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)
    const t = useStore.getState().transform
    panOrigin.current = { x: e.clientX - t.x, y: e.clientY - t.y }
    if (!(e.target as HTMLElement).closest('[data-selectable]')) store.clearSel()
  }, [store, canvasRef, clientToCanvas])

  // ── Pointer move ─────────────────────────────────────────────────────────────
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
      nodeDrag.current.kind === 'node'
        ? store.moveNode(nodeDrag.current.id, pos)
        : (() => {
            const j = journeyRef.current; const af = activeFlowRef.current
            if (j && af) store.moveScreen(j.id, af.id, nodeDrag.current!.id, pos)
          })()
      return
    }

    if (isPanning.current) {
      store.setTransform({ x: e.clientX - panOrigin.current.x, y: e.clientY - panOrigin.current.y })
    }
  }, [store, clientToCanvas, onConnDragMove])

  // ── Pointer up ───────────────────────────────────────────────────────────────
  const onPointerUp = useCallback((e: PointerEvent) => {
    if (connDrag.current) {
      const el    = document.elementFromPoint(e.clientX, e.clientY)
      const toId  = (el?.closest('[data-macro-id]') as HTMLElement | null)?.dataset.macroId
      const { fromId, reconnectConnId } = connDrag.current
      connDrag.current = null
      onConnDragEnd?.(fromId, toId ?? null, reconnectConnId)
      canvasRef.current?.releasePointerCapture(e.pointerId)
      return
    }

    if (nodeDrag.current) {
      const dx = Math.abs(e.clientX - nodeDrag.current.startX)
      const dy = Math.abs(e.clientY - nodeDrag.current.startY)
      const id  = nodeDrag.current.id
      const kind = nodeDrag.current.kind
      nodeDrag.current = null
      canvasRef.current?.releasePointerCapture(e.pointerId)

      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        // ── Single vs double-click detection ─────────────────────────────────
        const now  = Date.now()
        const last = lastTap.current

        if (last && last.id === id && now - last.t < DBLCLICK_MS) {
          // DOUBLE-CLICK
          lastTap.current = null
          const s    = useStore.getState()
          const node = s.canvas()?.nodes.find(n => n.id === id)
          if (node && kind === 'node') {
            if (node.type === 'journey') {
              s.openJourney(node.id)
            } else {
              // DS node double-click → open right panel with properties
              s.selectNode(node.id)
              s.openRpanel()
            }
          }
        } else {
          // SINGLE-CLICK
          lastTap.current = { id, t: now }
          store.selectNode(id)
        }
      }
      return
    }

    isPanning.current = false
  }, [store, canvasRef, onConnDragEnd])

  // ── Reconnect handle (called from ConnectorLayer) ─────────────────────────
  const startReconnect = useCallback((
    connId: string,
    endpoint: 'from' | 'to',
    anchorX: number,
    anchorY: number,
    pointerId: number,
  ) => {
    const s    = useStore.getState()
    const conn = s.canvas()?.conns.find(c => c.id === connId)
    if (!conn) return
    const nodes    = s.canvas()?.nodes ?? []
    const fromNode = nodes.find(n => n.id === conn.fromId)
    const toNode   = nodes.find(n => n.id === conn.toId)
    if (!fromNode || !toNode) return

    const x1 = fromNode.position.x + MACRO_NODE_W
    const y1 = fromNode.position.y + 44
    const x2 = toNode.position.x
    const y2 = toNode.position.y + 116 / 2

    // Dragging TO endpoint → anchor stays at FROM side
    connDrag.current = {
      fromId:            endpoint === 'to' ? conn.fromId : conn.toId,
      x1:                endpoint === 'to' ? x1 : x2,
      y1:                endpoint === 'to' ? y1 : y2,
      x2:                anchorX,
      y2:                anchorY,
      reconnectConnId:   connId,
      reconnectEndpoint: endpoint,
    }
    canvasRef.current?.setPointerCapture(pointerId)
  }, [canvasRef])

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
    store.setTransform({ scale: ns, x: mx - (mx - x) * (ns / scale), y: my - (my - y) * (ns / scale) })
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
    if (e.key === 'Escape') { s.clearSel(); s.closeRpanel(); s.closeFab() }
    if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) s.fitView()
    if (e.key === '0' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); s.fitView() }
  }, [])

  // ── Register listeners ────────────────────────────────────────────────────
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

  return { startReconnect }
}
