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
  GenerationRun,
} from '@/types'

interface CanvasData {
  nodes:    MacroNode[]
  conns:    Connection[]
  flows:    Record<NodeId, Flow[]>
  curFlow:  Record<NodeId, FlowId>
}

function emptyCanvas(): CanvasData {
  return { nodes: [], conns: [], flows: {}, curFlow: {} }
}

interface Store {
  userId: string | null
  setUserId: (id: string | null) => void
  projects:     Project[]
  curProjectId: ProjectId | null
  canvasData: Record<ProjectId, CanvasData>
  view:         CanvasView
  curJourneyId: NodeId | null
  microMode:    'all' | 'single'
  transform:    CanvasTransform
  selNodeId:   NodeId   | null
  selConnId:   ConnId   | null
  selScreenId: ScreenId | null
  selFlowId:   FlowId   | null
  ibarOpen:    boolean
  ebarOpen:    boolean
  ebarSection: EbarSection
  rpanelOpen:  boolean
  rpanelTab:   RpanelTab
  fabOpen:     boolean
  createProject:  (p: Project) => void
  updateProject:  (id: ProjectId, patch: Partial<Project>) => void
  deleteProject:  (id: ProjectId) => void
  openProject:    (id: ProjectId) => void
  updateSettings: (id: ProjectId, s: Partial<ProjectSettings>) => void
  addNode:              (n: MacroNode) => void
  updateNode:           (id: NodeId, patch: Partial<MacroNode>) => void
  updateJourneyContext: (id: NodeId, ctx: Partial<JourneyContext>) => void
  moveNode:             (id: NodeId, pos: XY) => void
  deleteNode:           (id: NodeId) => void
  addConn:    (c: Connection) => void
  deleteConn: (id: ConnId) => void
  connExists: (fromId: NodeId, toId: NodeId) => boolean
  addFlow:           (journeyId: NodeId, f: Flow) => void
  updateFlow:        (journeyId: NodeId, flowId: FlowId, patch: Partial<Flow>) => void
  updateFlowContext: (journeyId: NodeId, flowId: FlowId, ctx: Partial<FlowContext>) => void
  deleteFlow:        (journeyId: NodeId, flowId: FlowId) => void
  setActiveFlow:     (journeyId: NodeId, flowId: FlowId) => void
  addScreen:           (journeyId: NodeId, flowId: FlowId, s: Screen) => void
  updateScreen:        (journeyId: NodeId, flowId: FlowId, id: ScreenId, patch: Partial<Screen>) => void
  updateScreenContext: (journeyId: NodeId, flowId: FlowId, id: ScreenId, ctx: Partial<ScreenContext>) => void
  moveScreen:          (journeyId: NodeId, flowId: FlowId, id: ScreenId, pos: XY) => void
  deleteScreen:        (journeyId: NodeId, flowId: FlowId, id: ScreenId) => void
  goMacro:      () => void
  openJourney:  (id: NodeId) => void
  setTransform: (t: Partial<CanvasTransform>) => void
  fitView:      () => void
  selectNode:   (id: NodeId   | null) => void
  selectConn:   (id: ConnId   | null) => void
  selectScreen: (id: ScreenId | null) => void
  selectFlow:   (id: FlowId   | null) => void
  clearSel:     () => void
  toggleIbar:   () => void
  toggleEbar:   (section?: EbarSection) => void
  closeEbar:    () => void
  setRpTab:     (tab: RpanelTab) => void
  closeRpanel:  () => void
  toggleFab:    () => void
  closeFab:     () => void
  canvas:     () => CanvasData | null
  journey:    () => MacroNode | null
  activeFlow: () => Flow | null
  nodeById:   (id: NodeId) => MacroNode | undefined
  // ── Generation History ───────────────────────────────────────────────
  generationHistory: GenerationRun[]
  addGenerationRun:  (run: GenerationRun) => void
  setRunPreview:     (runId: string, html: string) => void
  clearHistory:      () => void
}

// How many recent runs keep their heavy artifacts (files + preview HTML) in
// localStorage. Older runs keep only metadata.
const RUNS_WITH_ARTIFACTS = 6

function getCanvas(s: Store): CanvasData | null {
  if (!s.curProjectId) return null
  return s.canvasData[s.curProjectId] ?? null
}

function layoutFlowScreens(c: CanvasData, journeyId: string) {
  const SCREEN_W = 180, SCREEN_H = 160, SCREEN_VGAP = 28
  const COL_GAP  = 80,  START_X  = 60,  START_Y     = 60
  ;(c.flows[journeyId] ?? []).forEach((flow, fi) => {
    const colX = START_X + fi * (SCREEN_W + COL_GAP)
    flow.screens.forEach((screen, si) => {
      screen.position = { x: colX, y: START_Y + si * (SCREEN_H + SCREEN_VGAP) }
    })
  })
}

export const useStore = create<Store>()(
  devtools(
    persist(
      immer((set, get) => ({
        userId:       null,
        projects:     [],
        curProjectId: null,
        canvasData:   {},
        generationHistory: [],
        view:         'macro',
        curJourneyId: null,
        microMode:    'all',
        transform:    { x: 0, y: 0, scale: 1 },
        selNodeId:    null,
        selConnId:    null,
        selScreenId:  null,
        selFlowId:    null,
        ibarOpen:     true,
        ebarOpen:     true,
        ebarSection:  'macro',
        rpanelOpen:   false,
        rpanelTab:    'context',
        fabOpen:      false,

        setUserId: (id) => set(s => { s.userId = id }),

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
          s.view         = 'macro'
          s.curJourneyId = null
          s.transform    = { x: 0, y: 0, scale: 1 }
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          s.selFlowId    = null
          s.rpanelOpen   = false
          s.fabOpen      = false
        }),

        updateSettings: (id, settings) => set(s => {
          const p = s.projects.find(p => p.id === id)
          if (p) p.settings = { ...p.settings, ...settings }
        }),

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
          if (s.selNodeId === id)  { s.selNodeId  = null; s.rpanelOpen = false }
          if (s.selFlowId !== null) s.selFlowId = null
        }),

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
          if (s.selFlowId === flowId) { s.selFlowId = null; s.rpanelOpen = false }
        }),

        setActiveFlow: (journeyId, flowId) => set(s => {
          const c = getCanvas(s); if (!c) return
          c.curFlow[journeyId] = flowId
          s.curJourneyId = journeyId
          s.view         = 'micro'
          s.microMode    = 'single'
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          layoutFlowScreens(c, journeyId)
        }),

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

        goMacro: () => set(s => {
          s.view         = 'macro'
          s.curJourneyId = null
          s.transform    = { x: 0, y: 0, scale: 1 }
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          s.selFlowId    = null
          s.rpanelOpen   = false
        }),

        openJourney: (id) => set(s => {
          s.view         = 'micro'
          s.curJourneyId = id
          s.transform    = { x: 80, y: 80, scale: 1 }
          s.selNodeId    = null
          s.selConnId    = null
          s.selScreenId  = null
          s.selFlowId    = null
          s.rpanelOpen   = false
          s.microMode    = 'all'
          const c = getCanvas(s)
          if (!c) return
          if (!c.curFlow[id]) {
            const firstFlow = c.flows[id]?.[0]
            if (firstFlow) c.curFlow[id] = firstFlow.id
          }
          layoutFlowScreens(c, id)
        }),

        setTransform: (t) => set(s => { Object.assign(s.transform, t) }),

        fitView: () => set(s => { s.transform = { x: 60, y: 60, scale: 0.85 } }),

        selectNode: (id) => set(s => {
          s.selNodeId   = id
          s.selConnId   = null
          s.selScreenId = null
          s.selFlowId   = null
          s.rpanelOpen  = id !== null
          if (id) s.rpanelTab = 'context'
        }),

        selectConn: (id) => set(s => {
          s.selConnId   = id
          s.selNodeId   = null
          s.selScreenId = null
          s.selFlowId   = null
          s.rpanelOpen  = false
        }),

        selectScreen: (id) => set(s => {
          s.selScreenId = id
          s.selNodeId   = null
          s.selConnId   = null
          s.selFlowId   = null
          s.rpanelOpen  = id !== null
          if (id) s.rpanelTab = 'context'
        }),

        selectFlow: (id) => set(s => {
          s.selFlowId   = id
          s.selNodeId   = null
          s.selConnId   = null
          s.selScreenId = null
          s.rpanelOpen  = id !== null
          if (id) s.rpanelTab = 'context'
        }),

        clearSel: () => set(s => {
          s.selNodeId   = null
          s.selConnId   = null
          s.selScreenId = null
          s.selFlowId   = null
        }),

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
          s.selFlowId   = null
        }),
        toggleFab: () => set(s => { s.fabOpen = !s.fabOpen }),
        closeFab:  () => set(s => { s.fabOpen = false }),

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

        addGenerationRun: (run) => set((s: Store) => {
          s.generationHistory.unshift(run)
          // Keep heavy artifacts only on the most recent runs.
          s.generationHistory.forEach((r, i) => {
            if (i >= RUNS_WITH_ARTIFACTS) { r.files = undefined; r.previewHtml = undefined }
          })
        }),
        setRunPreview: (runId, html) => set((s: Store) => {
          const run = s.generationHistory.find(r => r.id === runId)
          if (run) run.previewHtml = html.slice(0, 400_000)
        }),
        clearHistory:     ()    => set((s: Store) => { s.generationHistory = [] }),
      })),
      {
        name: 'flowbridge-v1',
        partialize: (s: Store) => ({
          projects:          s.projects,
          canvasData:        s.canvasData,
          curProjectId:      s.curProjectId,
          generationHistory: s.generationHistory,
        }),
      }
    ),
    { name: 'Flowbridge' }
  )
)

export const useProject    = () => useStore((s: Store) => s.projects.find((p: Store['projects'][number]) => p.id === s.curProjectId))
export const useCanvas     = () => useStore((s: Store) => s.canvas())
export const useTransform  = () => useStore((s: Store) => s.transform)
export const useView       = () => useStore((s: Store) => s.view)
export const useSelection  = () => useStore((s: Store) => ({
  nodeId:   s.selNodeId,
  connId:   s.selConnId,
  screenId: s.selScreenId,
  flowId:   s.selFlowId,
}))
export const useActiveFlow = () => useStore((s: Store) => s.activeFlow())
export const useJourney    = () => useStore((s: Store) => s.journey())
