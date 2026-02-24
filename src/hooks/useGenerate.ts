import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type { GeneratedFile, GenerationStatus, Screen } from '@/types'

interface UseGenerateReturn {
  status:   GenerationStatus
  files:    GeneratedFile[]
  error:    string | null
  generate: (screenIds?: string[]) => Promise<void>
  reset:    () => void
}

export function useGenerate(): UseGenerateReturn {
  const [status, setStatus] = useState<GenerationStatus>('pending')
  const [files,  setFiles]  = useState<GeneratedFile[]>([])
  const [error,  setError]  = useState<string | null>(null)
  const [buffer, setBuffer] = useState('')

  const store   = useStore()
  const project = store.projects.find(p => p.id === store.curProjectId)
  const canvas  = store.currentCanvas()

  const reset = useCallback(() => {
    setStatus('pending')
    setFiles([])
    setError(null)
    setBuffer('')
  }, [])

  const generate = useCallback(async (screenIds?: string[]) => {
    if (!project || !canvas) {
      setError('No project open'); return
    }

    // Collect screens to generate
    const journey = store.currentJourney()
    const flow    = store.activeFlow()

    let screens: Screen[] = []
    if (screenIds?.length) {
      // Specific screens
      screens = flow?.screens.filter(sc => screenIds.includes(sc.id)) ?? []
    } else if (flow) {
      // All screens in active flow
      screens = flow.screens
    } else {
      setError('No active flow selected'); return
    }

    if (!screens.length) {
      setError('No screens to generate'); return
    }

    // DS nodes connected to this journey
    const dsNodeIds = canvas.conns
      .filter(c => c.toId === journey?.id)
      .map(c => c.fromId)
    const dsNodes = canvas.nodes.filter(n => dsNodeIds.includes(n.id))

    setStatus('running')
    setFiles([])
    setError(null)
    setBuffer('')

    try {
      const resp = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, dsNodes, screens }),
      })

      if (!resp.ok || !resp.body) {
        throw new Error(`Server error: ${resp.status}`)
      }

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   raw     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const payload = JSON.parse(line.slice(5).trim())

              if (payload.text) {
                raw += payload.text
                setBuffer(raw)
              }

              if (payload.stopReason) {
                // Parse the final JSON array of files from the accumulated buffer
                const jsonMatch = raw.match(/```json\n?([\s\S]*?)```/)
                const jsonStr   = jsonMatch?.[1] ?? raw
                try {
                  const parsed = JSON.parse(jsonStr) as GeneratedFile[]
                  setFiles(parsed)
                  setStatus('done')
                } catch {
                  setError('Failed to parse generated code')
                  setStatus('error')
                }
              }
            } catch {
              // ignore malformed SSE lines
            }
          }

          if (line.startsWith('event: error')) {
            setStatus('error')
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }, [project, canvas, store])

  return { status, files, error, generate, reset }
}
