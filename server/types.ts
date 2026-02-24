import type { Project, MacroNode, Screen } from '../src/types/index.js'

export interface GenerationRequest {
  project:  Project
  dsNodes:  MacroNode[]
  screens:  Screen[]
  journeyId?: string
  flowId?:    string
}
