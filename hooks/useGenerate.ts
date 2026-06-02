'use client'

import { useState, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import type {
  GeneratedFile, GenerationStatus, GenerateRequest,
  StepLog, GenerationRun,
} from '@/types'
import {
  INPUT_PRICE_PER_MTOK, OUTPUT_PRICE_PER_MTOK, USD_BRL_RATE,
} from '@/types'

// ── Cost helper ───────────────────────────────────────────────────────────────

function calcCost(inputTok: number, outputTok: number) {
  const usd = (inputTok  / 1_000_000) * INPUT_PRICE_PER_MTOK
            + (outputTok / 1_000_000) * OUTPUT_PRICE_PER_MTOK
  return { costUsd: usd, costBrl: usd * USD_BRL_RATE }
}

// Extrai o array de arquivos do output do Claude, resiliente a:
// - blocos markdown (```json ... ```)
// - texto de preâmbulo/posfácio
// - JSON truncado (recupera objetos completos via contagem de chaves)
function extractFiles(raw: string): GeneratedFile[] | null {
  if (!raw) return null

  // Remove cercas markdown se existirem
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()

  const start = text.indexOf('[')
  if (start === -1) return null

  // Tentativa 1 — parse direto do array completo
  const fullMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (fullMatch) {
    try {
      const parsed = JSON.parse(fullMatch[0]) as GeneratedFile[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch { /* cai para recuperação */ }
  }

  // Tentativa 2 — scanner com contagem de chaves.
  // Extrai cada objeto de nível superior completo, ignorando chaves
  // dentro de strings e respeitando escapes. Para naturalmente quando
  // um objeto é truncado (depth nunca volta a zero).
  const objects: GeneratedFile[] = []
  let depth    = 0
  let objStart = -1
  let inStr    = false
  let escaped  = false

  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i]

    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue

    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      if (depth > 0) depth--
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(text.slice(objStart, i + 1)) as GeneratedFile
          if (obj.path && obj.content !== undefined) objects.push(obj)
        } catch { /* ignora objeto inválido */ }
        objStart = -1
      }
    } else if (ch === ']' && depth === 0) {
      break  // fim do array
    }
  }

  return objects.length > 0 ? objects : null
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveUsage {
  inputTokens:  number
  outputTokens: number
  costUsd:      number
  costBrl:      number
  isEstimate:   boolean
}

export type PreviewStatus = 'idle' | 'loading' | 'done' | 'error'

export interface UseGenerateReturn {
  status:   GenerationStatus
  files:    GeneratedFile[]
  progress: number
  steps:    StepLog[]
  usage:    LiveUsage | null
  error:    string | null
  generate: (screenIds?: string[]) => Promise<void>
  reset:    () => void
  // Build-free visual preview (self-contained HTML rendered in an iframe).
  previewHtml:   string | null
  previewStatus: PreviewStatus
  previewError:  string | null
  preview:       (screenIds?: string[]) => Promise<void>
}

// Timeout do cliente em ms — mais longo que o maxDuration do servidor
const CLIENT_TIMEOUT_MS = 270_000  // 4m30s

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGenerate(): UseGenerateReturn {
  const [status,   setStatus]   = useState<GenerationStatus>('pending')
  const [files,    setFiles]    = useState<GeneratedFile[]>([])
  const [progress, setProgress] = useState(0)
  const [steps,    setSteps]    = useState<StepLog[]>([])
  const [usage,    setUsage]    = useState<LiveUsage | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const [previewHtml,   setPreviewHtml]   = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle')
  const [previewError,  setPreviewError]  = useState<string | null>(null)

  // AbortController para cancelar requisição em voo
  const abortRef    = useRef<AbortController | null>(null)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const store   = useStore()
  const project = store.projects.find(p => p.id === store.curProjectId)

  const addStep = useCallback((text: string, percent: number) => {
    setSteps(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, text, ts: Date.now(), percent }])
    setProgress(percent)
  }, [])

  const reset = useCallback(() => {
    // Cancela requisição em voo
    abortRef.current?.abort()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('pending')
    setFiles([])
    setProgress(0)
    setSteps([])
    setUsage(null)
    setError(null)
    setPreviewHtml(null)
    setPreviewStatus('idle')
    setPreviewError(null)
  }, [])

  // Builds the GenerateRequest from the active project/flow/screens. Shared by
  // generate() and preview(). Sets `error` and returns null on invalid context.
  const buildBody = useCallback((screenIds?: string[]) => {
    if (!project) { setError('Nenhum projeto aberto'); return null }

    const canvas  = store.canvas()
    const journey = store.journey()
    const flow    = store.activeFlow()

    if (!canvas || !flow) { setError('Nenhum flow ativo selecionado'); return null }

    const screens = screenIds?.length
      ? flow.screens.filter(sc => screenIds.includes(sc.id))
      : flow.screens

    if (!screens.length) { setError('Nenhuma tela para gerar'); return null }

    const dsIds   = canvas.conns.filter(c => c.toId === journey?.id).map(c => c.fromId)
    const dsNodes = canvas.nodes
      .filter(n => dsIds.includes(n.id))
      .map(n => ({ id: n.id, name: n.name, description: n.description, tags: n.tags, figmaFileKey: n.figmaFileKey }))

    const body: GenerateRequest = { projectId: project.id, settings: project.settings, dsNodes, screens }
    return { body, flow, screens }
  }, [project, store])

  const preview = useCallback(async (screenIds?: string[]) => {
    const built = buildBody(screenIds)
    if (!built) { setPreviewStatus('error'); setPreviewError('Contexto inválido para preview'); return }

    setPreviewStatus('loading')
    setPreviewError(null)
    try {
      const resp = await fetch('/api/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(built.body),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => null)
        throw new Error(j?.error ?? `Erro do servidor (${resp.status})`)
      }
      const data = await resp.json() as { html: string }
      setPreviewHtml(data.html)
      setPreviewStatus('done')
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Falha ao gerar preview')
      setPreviewStatus('error')
    }
  }, [buildBody])

  const generate = useCallback(async (screenIds?: string[]) => {
    if (!project) { setError('Nenhum projeto aberto'); return }

    const built = buildBody(screenIds)
    if (!built) return
    const { body, flow, screens } = built
    const startedAt = Date.now()

    // Cancela qualquer geração anterior antes de começar
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setStatus('running')
    setFiles([])
    setProgress(0)
    setSteps([])
    setUsage(null)
    setError(null)

    // Timeout do cliente — se o servidor demorar demais, mostra erro claro
    timeoutRef.current = setTimeout(() => {
      abortRef.current?.abort()
      setError('Timeout: a geração ultrapassou o limite de tempo. Tente com menos telas ou contexto mais curto.')
      setStatus('error')
    }, CLIENT_TIMEOUT_MS)

    try {
      const resp = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  abortRef.current.signal,
      })

      if (!resp.ok || !resp.body) {
        throw new Error(
          resp.status === 400 ? 'Requisição inválida (400) — verifique o contexto das telas'
          : resp.status === 504 ? 'Timeout do servidor (504) — tente com menos telas'
          : `Erro do servidor (${resp.status})`
        )
      }

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   raw     = ''
      let   gotDone = false
      let   currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()

        // Stream encerrado — verifica se foi limpo ou cortado
        if (done) {
          if (!gotDone && status !== 'error') {
            // Stream morto sem evento 'done' — tenta recuperar o que foi acumulado
            const parsed = extractFiles(raw)
            if (parsed) {
              setFiles(parsed)
              setStatus('done')
              setProgress(100)
              addStep('Concluído (parcial)', 100)
            } else {
              setError('Conexão interrompida pelo servidor antes de concluir. Aumente o plano Vercel ou reduza o contexto.')
              setStatus('error')
            }
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            continue
          }
          if (!line.startsWith('data:')) continue

          // SÓ o parse da linha SSE fica no try/catch — linhas malformadas são ignoradas
          let payload: Record<string, unknown>
          try {
            payload = JSON.parse(line.slice(5).trim())
          } catch {
            currentEvent = ''
            continue
          }

          // ── Processamento dos eventos — FORA do try/catch ──
          // Falhas aqui (parse de arquivos) viram estado de erro visível, não travam.

          if (currentEvent === 'step') {
            addStep(payload.text as string, payload.percent as number)
          }

          if (payload.text !== undefined && currentEvent !== 'step') {
            raw += payload.text as string
            if (payload.estimatedOutputTokens) {
              const est = payload.estimatedOutputTokens as number
              const { costUsd, costBrl } = calcCost(0, est)
              setUsage({ inputTokens: 0, outputTokens: est, costUsd, costBrl, isEstimate: true })
            }
            if (payload.percent) setProgress(payload.percent as number)
          }

          if (currentEvent === 'done' || payload.stopReason) {
            gotDone = true
            if (timeoutRef.current) clearTimeout(timeoutRef.current)

            const tokIn  = (payload.tokensIn  as number) ?? 0
            const tokOut = (payload.tokensOut as number) ?? 0
            const dur    = (payload.durationMs as number) ?? (Date.now() - startedAt)
            const { costUsd, costBrl } = calcCost(tokIn, tokOut)

            setUsage({ inputTokens: tokIn, outputTokens: tokOut, costUsd, costBrl, isEstimate: false })
            setProgress(100)

            const parsed = extractFiles(raw)
            const wasTruncated = payload.stopReason === 'max_tokens'

            if (parsed) {
              addStep('Geração concluída', 100)
              setFiles(parsed)
              setStatus('done')
              store.addGenerationRun({
                id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                projectId:   project.id,
                projectName: project.name,
                flowId:      flow.id,
                flowName:    flow.name,
                screenCount: screens.length,
                status:      'done',
                usage: { inputTokens: tokIn, outputTokens: tokOut, totalTokens: tokIn + tokOut, costUsd, costBrl, durationMs: dur },
                filesCount:  parsed.length,
                createdAt:   new Date().toISOString(),
              })
            } else {
              const msg = wasTruncated
                ? 'Resposta truncada (limite de tokens atingido). Reduza o número de telas por geração.'
                : 'Não foi possível parsear os arquivos gerados. O modelo retornou um formato inesperado.'
              setError(msg)
              setStatus('error')
              store.addGenerationRun({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                projectId: project.id, projectName: project.name,
                flowId: flow.id, flowName: flow.name,
                screenCount: screens.length, status: 'error',
                usage: { inputTokens: tokIn, outputTokens: tokOut, totalTokens: tokIn + tokOut, costUsd, costBrl, durationMs: dur },
                filesCount: 0, error: msg, createdAt: new Date().toISOString(),
              })
            }
          }

          if (currentEvent === 'error') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            const msg = (payload.message as string) ?? 'Generation failed'
            setError(msg)
            setStatus('error')

            const dur = (payload.durationMs as number) ?? (Date.now() - startedAt)
            store.addGenerationRun({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              projectId: project.id, projectName: project.name,
              flowId: flow.id, flowName: flow.name,
              screenCount: screens.length, status: 'error',
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0, durationMs: dur },
              filesCount: 0, error: msg, createdAt: new Date().toISOString(),
            })
          }

          currentEvent = ''
        }
      }
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (err instanceof Error && err.name === 'AbortError') return  // cancelado pelo usuário
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }, [project, buildBody, store, addStep])

  return {
    status, files, progress, steps, usage, error, generate, reset,
    previewHtml, previewStatus, previewError, preview,
  }
}
