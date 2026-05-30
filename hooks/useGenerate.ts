'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type {
  GeneratedFile, GenerationStatus, GenerateRequest,
  StepLog, UsageStats, GenerationRun,
} from '@/types'
import {
  INPUT_PRICE_PER_MTOK, OUTPUT_PRICE_PER_MTOK, USD_BRL_RATE,
} from '@/types'

// ── Cost helpers ──────────────────────────────────────────────────────────────

function calcCost(inputTok: number, outputTok: number): Pick<UsageStats, 'costUsd' | 'costBrl'> {
  const usd = (inputTok / 1_000_000) * INPUT_PRICE_PER_MTOK
            + (outputTok / 1_000_000) * OUTPUT_PRICE_PER_MTOK
  return { costUsd: usd, costBrl: usd * USD_BRL_RATE }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveUsage {
  inputTokens:  number   // estimated or exact
  outputTokens: number   // estimated or exact
  costUsd:      number
  costBrl:      number
  isEstimate:   boolean
}

export interface UseGenerateReturn {
  status:   GenerationStatus
  files:    GeneratedFile[]
  progress: number          // 0–100
  steps:    StepLog[]
  usage:    LiveUsage | null
  error:    string | null
  generate: (screenIds?: string[]) => Promise<void>
  reset:    () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGenerate(): UseGenerateReturn {
  const [status,   setStatus]   = useState<GenerationStatus>('pending')
  const [files,    setFiles]    = useState<GeneratedFile[]>([])
  const [progress, setProgress] = useState(0)
  const [steps,    setSteps]    = useState<StepLog[]>([])
  const [usage,    setUsage]    = useState<LiveUsage | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const store   = useStore()
  const project = store.projects.find(p => p.id === store.curProjectId)

  const reset = useCallback(() => {
    setStatus('pending')
    setFiles([])
    setProgress(0)
    setSteps([])
    setUsage(null)
    setError(null)
  }, [])

  const addStep = useCallback((text: string, percent: number) => {
    setSteps(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, text, ts: Date.now(), percent },
    ])
    setProgress(percent)
  }, [])

  const generate = useCallback(async (screenIds?: string[]) => {
    if (!project) { setError('Nenhum projeto aberto'); return }

    const canvas  = store.canvas()
    const journey = store.journey()
    const flow    = store.activeFlow()

    if (!canvas || !flow) { setError('Nenhum flow ativo selecionado'); return }

    const screens = screenIds?.length
      ? flow.screens.filter(sc => screenIds.includes(sc.id))
      : flow.screens

    if (!screens.length) { setError('Nenhuma tela para gerar'); return }

    const dsIds   = canvas.conns.filter(c => c.toId === journey?.id).map(c => c.fromId)
    const dsNodes = canvas.nodes
      .filter(n => dsIds.includes(n.id))
      .map(n => ({ id: n.id, name: n.name, description: n.description, tags: n.tags, figmaFileKey: n.figmaFileKey }))

    const body: GenerateRequest = {
      projectId: project.id,
      settings:  project.settings,
      dsNodes,
      screens,
    }

    const startedAt = Date.now()

    setStatus('running')
    setFiles([])
    setProgress(0)
    setSteps([])
    setUsage(null)
    setError(null)

    try {
      const resp = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!resp.ok || !resp.body) throw new Error(`Server error ${resp.status}`)

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   raw     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            continue
          }
          if (!line.startsWith('data:')) continue

          try {
            const payload = JSON.parse(line.slice(5).trim())

            // ── step ──────────────────────────────────────────────
            if (currentEvent === 'step') {
              addStep(payload.text, payload.percent)
            }

            // ── delta (streaming chunks) ──────────────────────────
            if (payload.text !== undefined && currentEvent !== 'step') {
              raw += payload.text
              if (payload.estimatedOutputTokens) {
                const { costUsd, costBrl } = calcCost(0, payload.estimatedOutputTokens)
                setUsage({
                  inputTokens:  0,
                  outputTokens: payload.estimatedOutputTokens,
                  costUsd, costBrl,
                  isEstimate: true,
                })
              }
              if (payload.percent) setProgress(payload.percent)
            }

            // ── done ──────────────────────────────────────────────
            if (currentEvent === 'done' || payload.stopReason) {
              const tokIn  = payload.tokensIn  ?? 0
              const tokOut = payload.tokensOut ?? 0
              const dur    = payload.durationMs ?? (Date.now() - startedAt)
              const { costUsd, costBrl } = calcCost(tokIn, tokOut)

              setUsage({
                inputTokens:  tokIn,
                outputTokens: tokOut,
                costUsd, costBrl,
                isEstimate: false,
              })
              setProgress(100)
              addStep('Geração concluída', 100)

              // Parse JSON file array from raw output
              const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/)
              if (!jsonMatch) throw new Error('Não foi possível parsear os arquivos gerados')
              const parsed = JSON.parse(jsonMatch[0]) as GeneratedFile[]
              setFiles(parsed)
              setStatus('done')

              // ── Save to history ────────────────────────────────
              const run: GenerationRun = {
                id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                projectId:   project.id,
                projectName: project.name,
                flowId:      flow.id,
                flowName:    flow.name,
                screenCount: screens.length,
                status:      'done',
                usage: {
                  inputTokens:  tokIn,
                  outputTokens: tokOut,
                  totalTokens:  tokIn + tokOut,
                  costUsd, costBrl,
                  durationMs:   dur,
                },
                filesCount: parsed.length,
                createdAt:  new Date().toISOString(),
              }
              store.addGenerationRun(run)
            }

            // ── error ─────────────────────────────────────────────
            if (currentEvent === 'error') {
              const msg = payload.message ?? 'Generation failed'
              setError(msg)
              setStatus('error')

              const dur = payload.durationMs ?? (Date.now() - startedAt)
              const run: GenerationRun = {
                id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                projectId:   project.id,
                projectName: project.name,
                flowId:      flow.id,
                flowName:    flow.name,
                screenCount: screens.length,
                status:      'error',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0, durationMs: dur },
                filesCount: 0,
                error:      msg,
                createdAt:  new Date().toISOString(),
              }
              store.addGenerationRun(run)
            }

          } catch {
            // ignore malformed lines
          }
          currentEvent = ''
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }, [project, store, addStep])

  return { status, files, progress, steps, usage, error, generate, reset }
}
