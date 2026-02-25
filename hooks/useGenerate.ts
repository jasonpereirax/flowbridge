'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type { GeneratedFile, GenerationStatus, GenerateRequest } from '@/types'

interface UseGenerateReturn {
  status:   GenerationStatus
  files:    GeneratedFile[]
  progress: string
  error:    string | null
  generate: (screenIds?: string[]) => Promise<void>
  reset:    () => void
}

export function useGenerate(): UseGenerateReturn {
  const [status,   setStatus]   = useState<GenerationStatus>('pending')
  const [files,    setFiles]    = useState<GeneratedFile[]>([])
  const [progress, setProgress] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const store   = useStore()
  const project = store.projects.find(p => p.id === store.curProjectId)

  const reset = useCallback(() => {
    setStatus('pending')
    setFiles([])
    setProgress('')
    setError(null)
  }, [])

  const generate = useCallback(async (screenIds?: string[]) => {
    if (!project) { setError('No project open'); return }

    const canvas  = store.canvas()
    const journey = store.journey()
    const flow    = store.activeFlow()

    if (!canvas || !flow) { setError('No active flow selected'); return }

    const screens = screenIds?.length
      ? flow.screens.filter(sc => screenIds.includes(sc.id))
      : flow.screens

    if (!screens.length) { setError('No screens to generate'); return }

    // DS nodes wired to this journey
    const dsIds  = canvas.conns.filter(c => c.toId === journey?.id).map(c => c.fromId)
    const dsNodes = canvas.nodes
      .filter(n => dsIds.includes(n.id))
      .map(n => ({
        id:          n.id,
        name:        n.name,
        description: n.description,
        tags:        n.tags,
        figmaFileKey: n.figmaFileKey,
      }))

    const body: GenerateRequest = {
      projectId: project.id,
      settings:  project.settings,
      dsNodes,
      screens,
    }

    setStatus('running')
    setFiles([])
    setProgress('')
    setError(null)

    try {
      const resp = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!resp.ok || !resp.body) {
        throw new Error(`Server error ${resp.status}`)
      }

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   raw     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''  // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const payload = JSON.parse(line.slice(5).trim())

            if (payload.text) {
              raw += payload.text
              // Show last meaningful line as progress indicator
              const lastLine = raw.split('\n').filter(Boolean).at(-1) ?? ''
              setProgress(lastLine.slice(0, 80))
            }

            if (payload.stopReason) {
              // Extract JSON from accumulated text
              const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/)
              if (!jsonMatch) throw new Error('Could not parse generated files from response')
              const parsed = JSON.parse(jsonMatch[0]) as GeneratedFile[]
              setFiles(parsed)
              setStatus('done')
              setProgress('')
            }
          } catch {
            // ignore malformed SSE lines
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
  }, [project, store])

  return { status, files, progress, error, generate, reset }
}
