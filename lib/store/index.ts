'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Project, MacroNode, Connection, Flow, Screen,
  XY, CanvasTransform, CanvasView,
  ProjectId, NodeId, ConnId, FlowId, ScreenId,
  EbarSection, RpanelTab, ProjectSettings,
  ScreenContext, JourneyContext, FlowContext,
} from '@/types'

// ── Canvas data per project ───────────────────────────────────────────────────

interface CanvasData {
  nodes:    MacroNode[]
  conns:    Connection[]
  flows:    Record<NodeId, Flow[]>     // journeyId → flows[]
  curFlow:  Record<NodeId, FlowId>     // journeyId → active flowId
}

function emptyCanvas(): CanvasData {
  return { nodes: [], conns: [], flows: {}, curFlow: {} }
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface Store {
  // Auth
  userId: string | null
  setUserId: (id: string | null) => void

  // Projects
  projects:     Project[]
  curProjectId: ProjectId | null

  // Canvas data — isolated per project
  canvasData: Record<ProjectId, CanvasData>

  // View state
  view:         CanvasView
  curJourneyId: NodeId | null
  microMode:    'all' | 'single'   // all = show all flows; single = show only activeFlow
  transform:    CanvasTransform

  // Selection
  selNodeId:   NodeId   | null
  selConnId:   ConnId   | null
  selScreenId: ScreenId | null

  // Panels
  ibarOpen:    boolean
  ebarOpen:    boolean
  ebarSection: EbarSection
  rpanelOpen:  boolean
  rpanelTab:   RpanelTab
  fabOpen:     boolean

  // ── Project actions
  createProject:  (p: Project) => void
  updateProject:  (id: ProjectId, patch: Partial<Project>) => void
  deleteProject:  (id: ProjectId) => void
  openProject:    (id: ProjectId) => void
  updateSettings: (id: ProjectId, s: Partial<ProjectSettings>) => void

  // ── Node actions
  addNode:              (n: MacroNode) => void
  updateNode:           (id: NodeId, patch: Partial<MacroNode>) => void
  updateJourneyContext: (id: NodeId, ctx: Partial<JourneyContext>) => void
  moveNode:             (id: NodeId, pos: XY) => void
  deleteNode:           (id: NodeId) => void

  // ── Connection actions
  addConn:    (c: Connection) => void
  deleteConn: (id: ConnId) => void
  connExists: (fromId: NodeId, toId: NodeId) => boolean

  // ── Flow actions
  addFlow:             (journeyId: NodeId, f: Flow) => void
  updateFlow:          (journeyId: NodeId, flowId: FlowId, patch: Partial<Flow>) => void
  updateFlowContext:   (journeyId: NodeId, flowId: FlowId, ctx: Partial<FlowContext>) => void
  deleteFlow:          (journeyId: NodeId, flowId: FlowId) => void
  setActiveFlow:       (journeyId: NodeId, flowId: FlowId) => void

  // ── Screen actions
  addScreen:           (journeyId: NodeId, flowId: FlowId, s: Screen) => void
  updateScreen:        (journeyId: NodeId, flowId: FlowId, id: ScreenId, patch: Partial<Screen>) => void
  updateScreenContext: (journeyId: NodeId, flowId: FlowId, id: ScreenId, ctx: Partial<ScreenContext>) => void
  moveScreen:          (journeyId: NodeId, flowId: FlowId, id: ScreenId, pos: XY) => void
  deleteScreen:        (journeyId: NodeId, flowId: FlowId, id: ScreenId) => void

  // ── Navigation
  goMacro:      () => void
  openJourney:  (id: NodeId) => void
  setTransform: (t: Partial<CanvasTransform>) => void
  fitView:      () => void

  // ── Selection
  selectNode:   (id: NodeId   | null) => void
  selectConn:   (id: ConnId   | null) => void
  selectScreen: (id: ScreenId | null) => void
  clearSel:     () => void

  // ── Panel actions
  toggleIbar:   () => void
  toggleEbar:   (section?: EbarSection) => void
  closeEbar:    () => void
  setRpTab:     (tab: RpanelTab) => void
  closeRpanel:  () => void
  toggleFab:    () => void
  closeFab:     () => void

  // ── Derived selectors
  canvas:      () => CanvasData | null
  journey:     () => MacroNode | null
  activeFlow:  () => Flow | null
  nodeById:    (id: NodeId) => MacroNode | undefined
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCanvas(s: Store): CanvasData | null {
  if (!s.curProjectId) return null
  return s.canvasData[s.curProjectId] ?? null
}

// Auto-layout: distribute all screens of a journey into per-flow columns
function layoutFlowScreens(c: CanvasData, journeyId: string) {
  const SCREEN_W = 180, SCREEN_H = 160, SCREEN_VGAP = 28
  const COL_GAP  = 80, START_X = 60, START_Y = 60
  ;(c.flows[journeyId] ?? []).forEach((flow, fi) => {
    const colX = START_X + fi * (SCREEN_W + COL_GAP)
    flow.screens.forEach((screen, si) => {
      screen.position = { x: colX, y: START_Y + si * (SCREEN_H + SCREEN_VGAP) }
    })
  })
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<Store>()(
  devtools(
    persist(
      immer((set, get) => ({
        userId:       null,
        projects:     [],
        curProjectId: null,
        canvasData:   {},
        view:         'macro',
        curJourneyId: null,
        microMode:    'all',
        transform:    { x: 0, y: 0, scale: 1 },
        selNodeId:    null,
        selConnId:    null,
        selScreenId:  null,
        ibarOpen:     true,
        ebarOpen:     true,
        ebarSection:  'macro',
        rpanelOpen:   false,
        rpanelTab:    'context',
        fabOpen:      false,

        setUserId: (id) => set(s => { s.userId = id }),

        // ── Projects ──────────────────────────────────────────────────────────

        createProject: (p) => set(s => {
          s.projects.unshift(p)
          if (!s.canvasData[p.id]) s.canvasData[p.id] = emptyCanvas()
        }),

        updateProject: (id, patch) => set(s => {
          const p = s.projects.find(p => p.id === id)
          if (p) Object.assign(p, patch)
        }),

        deleteProject: (id) => set(s => {
          s.projects = s.projects.filter(p => p.id !== id)
          delete s.canvasData[id]
          if (s.curProjectId === id) s.curProjectId = null
        }),

        openProject: (id) => set(s => {
          s.curProjectId = id
          if (!s.canvasData[id]) s.canvasData[id] = emptyCanvas()
          // Reset view state
          s.view = 'macro'
          s.curJourneyId = null
          s.transform    = { x: 0, y: 0, scale: 1 }
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          s.rpanelOpen   = false
          s.fabOpen      = false
        }),

        updateSettings: (id, settings) => set(s => {
          const p = s.projects.find(p => p.id === id)
          if (p) p.settings = { ...p.settings, ...settings }
        }),

        // ── Nodes ─────────────────────────────────────────────────────────────

        addNode: (n) => set(s => {
          const c = s.canvasData[n.projectId]
          if (!c) return
          c.nodes.push(n)
          if (n.type === 'journey' && !c.flows[n.id]) c.flows[n.id] = []
        }),

        updateNode: (id, patch) => set(s => {
          const c = getCanvas(s); if (!c) return
          const n = c.nodes.find(n => n.id === id)
          if (n) Object.assign(n, patch)
        }),

        updateJourneyContext: (id, ctx) => set(s => {
          const c = getCanvas(s); if (!c) return
          const n = c.nodes.find(n => n.id === id)
          if (n && n.type === 'journey') {
            n.journeyCtx = { ...(n.journeyCtx ?? {
              goal: '', targetUser: '', platform: '',
              techNotes: '', designTokens: '', globalRules: '',
            }), ...ctx }
          }
        }),

        moveNode: (id, pos) => set(s => {
          const c = getCanvas(s); if (!c) return
          const n = c.nodes.find(n => n.id === id)
          if (n) n.position = pos
        }),

        deleteNode: (id) => set(s => {
          const c = getCanvas(s); if (!c) return
          c.nodes = c.nodes.filter(n => n.id !== id)
          c.conns = c.conns.filter(c => c.fromId !== id && c.toId !== id)
          delete c.flows[id]
          delete c.curFlow[id]
          if (s.selNodeId === id) { s.selNodeId = null; s.rpanelOpen = false }
        }),

        // ── Connections ───────────────────────────────────────────────────────

        addConn: (conn) => set(s => {
          const c = getCanvas(s); if (!c) return
          if (c.conns.some(c => c.fromId === conn.fromId && c.toId === conn.toId)) return
          c.conns.push(conn)
        }),

        deleteConn: (id) => set(s => {
          const c = getCanvas(s); if (!c) return
          c.conns = c.conns.filter(c => c.id !== id)
          if (s.selConnId === id) s.selConnId = null
        }),

        connExists: (fromId, toId) => {
          const c = getCanvas(get()); if (!c) return false
          return c.conns.some(c => c.fromId === fromId && c.toId === toId)
        },

        // ── Flows ─────────────────────────────────────────────────────────────

        addFlow: (journeyId, flow) => set(s => {
          const c = getCanvas(s); if (!c) return
          if (!c.flows[journeyId]) c.flows[journeyId] = []
          c.flows[journeyId].push(flow)
          c.curFlow[journeyId] = flow.id
        }),

        updateFlow: (journeyId, flowId, patch) => set(s => {
          const c = getCanvas(s); if (!c) return
          const f = c.flows[journeyId]?.find(f => f.id === flowId)
          if (f) Object.assign(f, patch)
        }),

        updateFlowContext: (journeyId, flowId, ctx) => set(s => {
          const c = getCanvas(s); if (!c) return
          const f = c.flows[journeyId]?.find(f => f.id === flowId)
          if (f) {
            f.flowCtx = { ...(f.flowCtx ?? {
              general: '', specific: '', entryPoint: '', exitPoints: '', stateNotes: '',
            }), ...ctx }
          }
        }),

        deleteFlow: (journeyId, flowId) => set(s => {
          const c = getCanvas(s); if (!c) return
          c.flows[journeyId] = c.flows[journeyId]?.filter(f => f.id !== flowId) ?? []
          if (c.curFlow[journeyId] === flowId) {
            c.curFlow[journeyId] = c.flows[journeyId][0]?.id ?? ''
          }
        }),

        setActiveFlow: (journeyId, flowId) => set(s => {
          const c = getCanvas(s); if (!c) return
          c.curFlow[journeyId] = flowId
          // Selecting a specific flow = single mode; also enter micro view
          s.curJourneyId = journeyId
          s.view         = 'micro'
          s.microMode    = 'single'
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          layoutFlowScreens(c, journeyId)
        }),

        // ── Screens ───────────────────────────────────────────────────────────

        addScreen: (journeyId, flowId, screen) => set(s => {
          const c = getCanvas(s); if (!c) return
          const f = c.flows[journeyId]?.find(f => f.id === flowId)
          if (f) f.screens.push(screen)
        }),

        updateScreen: (journeyId, flowId, id, patch) => set(s => {
          const c = getCanvas(s); if (!c) return
          const sc = c.flows[journeyId]?.find(f => f.id === flowId)?.screens.find(s => s.id === id)
          if (sc) Object.assign(sc, patch)
        }),

        updateScreenContext: (journeyId, flowId, id, ctx) => set(s => {
          const c = getCanvas(s); if (!c) return
          const sc = c.flows[journeyId]?.find(f => f.id === flowId)?.screens.find(s => s.id === id)
          if (sc) sc.context = { ...sc.context, ...ctx }
        }),

        moveScreen: (journeyId, flowId, id, pos) => set(s => {
          const c = getCanvas(s); if (!c) return
          const sc = c.flows[journeyId]?.find(f => f.id === flowId)?.screens.find(s => s.id === id)
          if (sc) sc.position = pos
        }),

        deleteScreen: (journeyId, flowId, id) => set(s => {
          const c = getCanvas(s); if (!c) return
          const f = c.flows[journeyId]?.find(f => f.id === flowId)
          if (f) f.screens = f.screens.filter(s => s.id !== id)
          if (s.selScreenId === id) { s.selScreenId = null; s.rpanelOpen = false }
        }),

        // ── Navigation ────────────────────────────────────────────────────────

        goMacro: () => set(s => {
          s.view = 'macro'
          s.curJourneyId = null
          s.transform    = { x: 0, y: 0, scale: 1 }
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          s.rpanelOpen   = false
        }),

        openJourney: (id) => set(s => {
          s.view         = 'micro'
          s.curJourneyId = id
          s.transform    = { x: 80, y: 80, scale: 1 }
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          s.rpanelOpen   = false
          s.microMode    = 'all'

          const c = getCanvas(s)
          if (!c) return

          // Auto-select first flow
          if (!c.curFlow[id]) {
            const firstFlow = c.flows[id]?.[0]
            if (firstFlow) c.curFlow[id] = firstFlow.id
          }

          layoutFlowScreens(c, id)
        }),

        setTransform: (t) => set(s => { Object.assign(s.transform, t) }),

        fitView: () => set(s => { s.transform = { x: 60, y: 60, scale: 0.85 } }),

        // ── Selection ─────────────────────────────────────────────────────────

        selectNode: (id) => set(s => {
          s.selNodeId   = id
          s.selConnId   = null
          s.selScreenId = null
          s.rpanelOpen  = id !== null
          if (id) s.rpanelTab = 'context'
        }),

        selectConn: (id) => set(s => {
          s.selConnId   = id
          s.selNodeId   = null
          s.selScreenId = null
          s.rpanelOpen  = false  // connectors use inline delete, no panel
        }),

        selectScreen: (id) => set(s => {
          s.selScreenId = id
          s.selNodeId   = null
          s.selConnId   = null
          s.rpanelOpen  = id !== null
          if (id) s.rpanelTab = 'context'
        }),

        clearSel: () => set(s => {
          s.selNodeId = null; s.selConnId = null; s.selScreenId = null
        }),

        // ── Panels ────────────────────────────────────────────────────────────

        toggleIbar: () => set(s => { s.ibarOpen = !s.ibarOpen }),

        toggleEbar: (section) => set(s => {
          const same = !section || section === s.ebarSection
          if (section) s.ebarSection = section
          s.ebarOpen = same ? !s.ebarOpen : true
        }),

        closeEbar:   () => set(s => { s.ebarOpen = false }),
        setRpTab:    (tab) => set(s => { s.rpanelTab = tab }),
        closeRpanel: () => set(s => {
          s.rpanelOpen  = false
          s.selNodeId   = null
          s.selScreenId = null
        }),
        toggleFab: () => set(s => { s.fabOpen = !s.fabOpen }),
        closeFab:  () => set(s => { s.fabOpen = false }),

        // ── Derived ───────────────────────────────────────────────────────────

        canvas: () => getCanvas(get()),

        journey: () => {
          const s = get()
          const c = getCanvas(s)
          return c?.nodes.find(n => n.id === s.curJourneyId) ?? null
        },

        activeFlow: () => {
          const s = get()
          const c = getCanvas(s)
          if (!c || !s.curJourneyId) return null
          const fid = c.curFlow[s.curJourneyId]
          return c.flows[s.curJourneyId]?.find(f => f.id === fid) ?? null
        },

        nodeById: (id) => getCanvas(get())?.nodes.find(n => n.id === id),
      })),
      {
        name: 'flowbridge-v1',
        // Only persist data — not ephemeral UI state
        partialize: (s) => ({
          projects:     s.projects,
          canvasData:   s.canvasData,
          curProjectId: s.curProjectId,
        }),
      }
    ),
    { name: 'Flowbridge' }
  )
)

// ── Convenience selector hooks ─────────────────────────────────────────────────

export const useProject    = () => useStore(s => s.projects.find(p => p.id === s.curProjectId))
export const useCanvas     = () => useStore(s => s.canvas())
export const useTransform  = () => useStore(s => s.transform)
export const useView       = () => useStore(s => s.view)
export const useSelection  = () => useStore(s => ({
  nodeId:   s.selNodeId,
  connId:   s.selConnId,
  screenId: s.selScreenId,
}))
export const useActiveFlow = () => useStore(s => s.activeFlow())
export const useJourney    = () => useStore(s => s.journey())
