export interface ImportedFrame {
  nodeId:   string
  name:     string
  pageId:   string
  pageName: string
  order:    number
}

export interface ImportedPage {
  pageId:  string
  name:    string
  order:   number
  frames:  ImportedFrame[]
}

export interface FrameAIContext {
  purpose:       string
  userIntent:    string
  route:         string
  layoutPattern: string
  notes:         string
}

export interface ImportResult {
  fileKey:     string
  fileName:    string
  pages:       ImportedPage[]
  totalFrames: number
  thumbnails:  Record<string, string>
  aiContext:   Record<string, FrameAIContext>
}
