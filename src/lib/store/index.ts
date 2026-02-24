import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Project, MacroNode, Connection, Flow, Screen,
  Position, CanvasTransform, CanvasView,
  NodeId, ConnId, FlowId, ScreenId, ProjectId,
  EbarSection, RpanelTab, MacroNodeType,
  ProjectSettings, ScreenContext,
} from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS STATE — per-project, persisted
// ─────────────────────────────────────────────────────────────────────────────
interface CanvasData {
  nodes:     MacroNode[]
  conns:     Connection[]
  flows:     Record<NodeId, Flow[]>     // journeyId → flows
  curFlow:   Record<NodeId, FlowId>     // journeyId → active flow id
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE SHAPE
// ─────────────────────────────────────────────────────────────────────────────
interface FlowbridgeState {
  // ── Auth
  userId: string | null

  // ── Projects
  projects:      Project[]
  curProjectId:  ProjectId | null

  // ── Canvas data (keyed by projectId for isolation)
  canvasData:    Record<ProjectId, CanvasData>

  // ── Canvas view state
  view:          CanvasView
  curJourneyId:  NodeId | null
  transform:     CanvasTransform

  // ── Selection
  selNodeId:     NodeId   | null
  selConnId:     ConnId   | null
  selScreenId:   ScreenId | null

  // ── UI panels
  ibarOpen:      boolean
  ebarOpen:      boolean
  ebarSection:   EbarSection
  rpanelOpen:    boolean
  rpanelTab:     RpanelTab
  fabOpen:       boolean

  // ── Actions: Projects
  createProject:  (project: Project) => void
  updateProject:  (id: ProjectId, patch: Partial<Project>) => void
  deleteProject:  (id: ProjectId) => void
  openProject:    (id: ProjectId) => void
  updateSettings: (id: ProjectId, settings: Partial<ProjectSettings>) => void

  // ── Actions: Nodes
  addNode:      (node: MacroNode) => void
  updateNode:   (id: NodeId, patch: Partial<MacroNode>) => void
  moveNode:     (id: NodeId, position: Position) => void
  deleteNode:   (id: NodeId) => void

  // ── Actions: Connections
  addConn:      (conn: Connection) => void
  deleteConn:   (id: ConnId) => void
  connExists:   (fromId: NodeId, toId: NodeId) => boolean

  // ── Actions: Flows
  addFlow:      (journeyId: NodeId, flow: Flow) => void
  updateFlow:   (journeyId: NodeId, flowId: FlowId, patch: Partial<Flow>) => void
  deleteFlow:   (journeyId: NodeId, flowId: FlowId) => void
  setActiveFlow:(journeyId: NodeId, flowId: FlowId) => void

  // ── Actions: Screens
  addScreen:    (journeyId: NodeId, flowId: FlowId, screen: Screen) => void
  updateScreen: (journeyId: NodeId, flowId: FlowId, screenId: ScreenId, patch: Partial<Screen>) => void
  updateScreenContext: (journeyId: NodeId, flowId: FlowId, screenId: ScreenId, ctx: Partial<ScreenContext>) => void
  moveScreen:   (journeyId: NodeId, flowId: FlowId, screenId: ScreenId, position: Position) => void
  deleteScreen: (journeyId: NodeId, flowId: FlowId, screenId: ScreenId) => void

  // ── Actions: Navigation
  goMacro:       () => void
  openJourney:   (journeyId: NodeId) => void
  setTransform:  (t: Partial<CanvasTransform>) => void
  fitView:       () => void

  // ── Actions: Selection
  selectNode:   (id: NodeId | null) => void
  selectConn:   (id: ConnId | null) => void
  selectScreen: (id: ScreenId | null) => void
  clearSelection: () => void

  // ── Actions: UI
  toggleIbar:     () => void
  toggleEbar:     (section?: EbarSection) => void
  closeEbar:      () => void
  setRpanelTab:   (tab: RpanelTab) => void
  closeRpanel:    () => void
  toggleFab:      () => void
  closeFab:       () => void

  // ── Selectors (derived)
  currentCanvas:  () => CanvasData | null
  currentJourney: () => MacroNode | null
  activeFlow:     () => Flow | null
  nodeById:       (id: NodeId) => MacroNode | undefined
  screenById:     (journeyId: NodeId, flowId: FlowId, screenId: ScreenId) => Screen | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function ensureCanvas(state: FlowbridgeState, pid: ProjectId): CanvasData {
  if (!state.canvasData[pid]) {
    state.canvasData[pid] = { nodes: [], conns: [], flows: {}, curFlow: {} }
  }
  return state.canvasData[pid]
}

function getCanvas(state: FlowbridgeState): CanvasData | null {
  if (!state.curProjectId) return null
  return state.canvasData[state.curProjectId] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────
export const useStore = create<FlowbridgeState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ── Initial state
        userId:        null,
        projects:      [],
        curProjectId:  null,
        canvasData:    {},
        view:          'macro',
        curJourneyId:  null,
        transform:     { x: 0, y: 0, scale: 1 },
        selNodeId:     null,
        selConnId:     null,
        selScreenId:   null,
        ibarOpen:      true,
        ebarOpen:      true,
        ebarSection:   'macro',
        rpanelOpen:    false,
        rpanelTab:     'properties',
        fabOpen:       false,

        // ── Projects ──────────────────────────────────────────────────────────
        createProject: (project) => set((s) => {
          s.projects.unshift(project)
          ensureCanvas(s, project.id)
        }),

        updateProject: (id, patch) => set((s) => {
          const p = s.projects.find(p => p.id === id)
          if (p) Object.assign(p, patch)
        }),

        deleteProject: (id) => set((s) => {
          s.projects = s.projects.filter(p => p.id !== id)
          delete s.canvasData[id]
          if (s.curProjectId === id) s.curProjectId = null
        }),

        openProject: (id) => set((s) => {
          s.curProjectId = id
          ensureCanvas(s, id)
          s.view = 'macro'
          s.curJourneyId = null
          s.transform = { x: 0, y: 0, scale: 1 }
          s.selNodeId = null
          s.selConnId = null
          s.selScreenId = null
          s.rpanelOpen = false
          s.fabOpen = false
        }),

        updateSettings: (id, settings) => set((s) => {
          const p = s.projects.find(p => p.id === id)
          if (p) p.settings = { ...p.settings, ...settings }
        }),

        // ── Nodes ─────────────────────────────────────────────────────────────
        addNode: (node) => set((s) => {
          const c = ensureCanvas(s, node.projectId)
          c.nodes.push(node)
          if (node.type === 'journey') {
            if (!c.flows[node.id]) c.flows[node.id] = []
          }
        }),

        updateNode: (id, patch) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const n = c.nodes.find(n => n.id === id)
          if (n) Object.assign(n, patch)
        }),

        moveNode: (id, position) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const n = c.nodes.find(n => n.id === id)
          if (n) n.position = position
        }),

        deleteNode: (id) => set((s) => {
          const c = getCanvas(s); if (!c) return
          c.nodes = c.nodes.filter(n => n.id !== id)
          c.conns = c.conns.filter(c => c.fromId !== id && c.toId !== id)
          delete c.flows[id]
          delete c.curFlow[id]
          if (s.selNodeId === id) { s.selNodeId = null; s.rpanelOpen = false }
        }),

        // ── Connections ───────────────────────────────────────────────────────
        addConn: (conn) => set((s) => {
          const c = getCanvas(s); if (!c) return
          // Prevent duplicates
          if (c.conns.some(c => c.fromId === conn.fromId && c.toId === conn.toId)) return
          c.conns.push(conn)
        }),

        deleteConn: (id) => set((s) => {
          const c = getCanvas(s); if (!c) return
          c.conns = c.conns.filter(c => c.id !== id)
          if (s.selConnId === id) s.selConnId = null
        }),

        connExists: (fromId, toId) => {
          const c = getCanvas(get()); if (!c) return false
          return c.conns.some(c => c.fromId === fromId && c.toId === toId)
        },

        // ── Flows ─────────────────────────────────────────────────────────────
        addFlow: (journeyId, flow) => set((s) => {
          const c = getCanvas(s); if (!c) return
          if (!c.flows[journeyId]) c.flows[journeyId] = []
          c.flows[journeyId].push(flow)
          c.curFlow[journeyId] = flow.id
        }),

        updateFlow: (journeyId, flowId, patch) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const flow = c.flows[journeyId]?.find(f => f.id === flowId)
          if (flow) Object.assign(flow, patch)
        }),

        deleteFlow: (journeyId, flowId) => set((s) => {
          const c = getCanvas(s); if (!c) return
          c.flows[journeyId] = c.flows[journeyId]?.filter(f => f.id !== flowId) ?? []
          if (c.curFlow[journeyId] === flowId) {
            c.curFlow[journeyId] = c.flows[journeyId][0]?.id ?? ''
          }
        }),

        setActiveFlow: (journeyId, flowId) => set((s) => {
          const c = getCanvas(s); if (!c) return
          c.curFlow[journeyId] = flowId
        }),

        // ── Screens ───────────────────────────────────────────────────────────
        addScreen: (journeyId, flowId, screen) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const flow = c.flows[journeyId]?.find(f => f.id === flowId)
          if (flow) flow.screens.push(screen)
        }),

        updateScreen: (journeyId, flowId, screenId, patch) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const flow = c.flows[journeyId]?.find(f => f.id === flowId)
          const screen = flow?.screens.find(sc => sc.id === screenId)
          if (screen) Object.assign(screen, patch)
        }),

        updateScreenContext: (journeyId, flowId, screenId, ctx) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const flow = c.flows[journeyId]?.find(f => f.id === flowId)
          const screen = flow?.screens.find(sc => sc.id === screenId)
          if (screen) screen.context = { ...screen.context, ...ctx }
        }),

        moveScreen: (journeyId, flowId, screenId, position) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const flow = c.flows[journeyId]?.find(f => f.id === flowId)
          const screen = flow?.screens.find(sc => sc.id === screenId)
          if (screen) screen.position = position
        }),

        deleteScreen: (journeyId, flowId, screenId) => set((s) => {
          const c = getCanvas(s); if (!c) return
          const flow = c.flows[journeyId]?.find(f => f.id === flowId)
          if (flow) flow.screens = flow.screens.filter(sc => sc.id !== screenId)
          if (s.selScreenId === screenId) { s.selScreenId = null; s.rpanelOpen = false }
        }),

        // ── Navigation ────────────────────────────────────────────────────────
        goMacro: () => set((s) => {
          s.view = 'macro'
          s.curJourneyId = null
          s.transform = { x: 0, y: 0, scale: 1 }
          s.selNodeId = null
          s.selConnId = null
          s.selScreenId = null
          s.rpanelOpen = false
        }),

        openJourney: (journeyId) => set((s) => {
          s.view = 'micro'
          s.curJourneyId = journeyId
          s.transform = { x: 80, y: 80, scale: 1 }
          s.selNodeId = null
          s.selConnId = null
          s.selScreenId = null
          s.rpanelOpen = false
        }),

        setTransform: (t) => set((s) => {
          Object.assign(s.transform, t)
        }),

        fitView: () => set((s) => {
          s.transform = { x: 60, y: 60, scale: 0.85 }
        }),

        // ── Selection ─────────────────────────────────────────────────────────
        selectNode: (id) => set((s) => {
          s.selNodeId = id
          s.selConnId = null
          s.selScreenId = null
          s.rpanelOpen = id !== null
          if (id !== null) s.rpanelTab = 'properties'
        }),

        selectConn: (id) => set((s) => {
          s.selConnId = id
          s.selNodeId = null
          s.selScreenId = null
          s.rpanelOpen = false   // conn: no panel, just inline delete button
        }),

        selectScreen: (id) => set((s) => {
          s.selScreenId = id
          s.selNodeId = null
          s.selConnId = null
          s.rpanelOpen = id !== null
          if (id !== null) s.rpanelTab = 'properties'
        }),

        clearSelection: () => set((s) => {
          s.selNodeId = null
          s.selConnId = null
          s.selScreenId = null
        }),

        // ── UI ────────────────────────────────────────────────────────────────
        toggleIbar: () => set((s) => { s.ibarOpen = !s.ibarOpen }),

        toggleEbar: (section) => set((s) => {
          const same = section === s.ebarSection
          if (section) s.ebarSection = section
          s.ebarOpen = same ? !s.ebarOpen : true
        }),

        closeEbar: () => set((s) => { s.ebarOpen = false }),

        setRpanelTab: (tab) => set((s) => { s.rpanelTab = tab }),

        closeRpanel: () => set((s) => {
          s.rpanelOpen = false
          s.selNodeId = null
          s.selScreenId = null
        }),

        toggleFab: () => set((s) => { s.fabOpen = !s.fabOpen }),
        closeFab:  () => set((s) => { s.fabOpen = false }),

        // ── Selectors ─────────────────────────────────────────────────────────
        currentCanvas: () => {
          const s = get()
          if (!s.curProjectId) return null
          return s.canvasData[s.curProjectId] ?? null
        },

        currentJourney: () => {
          const s = get()
          const c = s.currentCanvas()
          if (!c || !s.curJourneyId) return null
          return c.nodes.find(n => n.id === s.curJourneyId) ?? null
        },

        activeFlow: () => {
          const s = get()
          const c = s.currentCanvas()
          if (!c || !s.curJourneyId) return null
          const flowId = c.curFlow[s.curJourneyId]
          return c.flows[s.curJourneyId]?.find(f => f.id === flowId) ?? null
        },

        nodeById: (id) => {
          const c = getCanvas(get())
          return c?.nodes.find(n => n.id === id)
        },

        screenById: (journeyId, flowId, screenId) => {
          const c = getCanvas(get())
          return c?.flows[journeyId]?.find(f => f.id === flowId)
            ?.screens.find(sc => sc.id === screenId)
        },
      })),
      {
        name: 'flowbridge-storage',
        // Only persist data — not transient UI state
        partialize: (state) => ({
          projects:     state.projects,
          canvasData:   state.canvasData,
          curProjectId: state.curProjectId,
        }),
      }
    ),
    { name: 'Flowbridge' }
  )
)

// ── Convenience hooks ─────────────────────────────────────────────────────────
export const useProject  = () => useStore(s => s.projects.find(p => p.id === s.curProjectId))
export const useCanvas   = () => useStore(s => s.currentCanvas())
export const useTransform= () => useStore(s => s.transform)
export const useSelection= () => useStore(s => ({
  nodeId:   s.selNodeId,
  connId:   s.selConnId,
  screenId: s.selScreenId,
}))
