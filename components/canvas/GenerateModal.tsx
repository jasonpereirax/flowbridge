'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Copy, Check, Zap, Loader2, AlertCircle,
  FileCode2, ChevronRight, RefreshCw, Clock,
} from 'lucide-react'
import { cn } from '@/utils'
import type { GeneratedFile, GenerationStatus, StepLog } from '@/types'
import type { LiveUsage } from '@/hooks/useGenerate'

interface Props {
  status:   GenerationStatus
  files:    GeneratedFile[]
  progress: number
  steps:    StepLog[]
  usage:    LiveUsage | null
  error:    string | null
  onClose:  () => void
  onRetry:  () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, d = 2) { return n.toFixed(d) }

function fmtMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function fmtBrl(brl: number) {
  if (brl < 0.01) return '< R$ 0,01'
  return `R$ ${brl.toFixed(2).replace('.', ',')}`
}

function fmtUsd(usd: number) {
  if (usd < 0.001) return '< $0,001'
  return `$${fmt(usd, 3)}`
}

function StepDot({ percent, current }: { percent: number; current: boolean }) {
  if (percent >= 100) return <div className="w-[6px] h-[6px] rounded-full bg-brand-green flex-shrink-0 mt-[5px]" />
  if (current) return (
    <div className="w-[6px] h-[6px] rounded-full flex-shrink-0 mt-[5px] relative">
      <div className="absolute inset-0 rounded-full bg-brand-blue animate-ping opacity-75" />
      <div className="absolute inset-0 rounded-full bg-brand-blue" />
    </div>
  )
  return <div className="w-[6px] h-[6px] rounded-full bg-border flex-shrink-0 mt-[5px]" />
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GenerateModal({ status, files, progress, steps, usage, error, onClose, onRetry }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copied,      setCopied]      = useState(false)
  const [elapsed,     setElapsed]     = useState(0)
  const startRef = useRef(Date.now())
  const logRef   = useRef<HTMLDivElement>(null)

  // Elapsed timer during generation
  useEffect(() => {
    if (status !== 'running') return
    startRef.current = Date.now()
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 100)
    return () => clearInterval(t)
  }, [status])

  // Auto-scroll step log
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [steps.length])

  const current      = files[selectedIdx]
  const totalLines   = files.reduce((a, f) => a + f.content.split('\n').length, 0)
  const isDone       = status === 'done'
  const isError      = status === 'error'
  const isRunning    = status === 'running'
  const hasFiles     = files.length > 0
  const lastStepIdx  = steps.length - 1

  function copyFile() {
    if (!current) return
    navigator.clipboard.writeText(current.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Elapsed from last step's ts
  const firstTs = steps[0]?.ts ?? Date.now()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-5">
      <div className="bg-surface w-full max-w-5xl h-[85vh] rounded-[14px] border border-border shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="h-[50px] px-5 border-b border-border flex items-center gap-3 flex-shrink-0">
          <Zap size={15} className={cn(isRunning ? 'text-amber-400 animate-pulse' : isDone ? 'text-brand-blue' : 'text-text-3')} />
          <span className="text-[14px] font-bold tracking-[-0.02em]">Generate</span>

          {isRunning && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-2">
              <Loader2 size={10} className="animate-spin" />
              <span className="font-mono">{fmtMs(elapsed)}</span>
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-brand-green bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                {files.length} arquivo{files.length !== 1 ? 's' : ''} · {totalLines} linhas
              </span>
              {usage && !usage.isEstimate && (
                <span className="text-[11px] font-mono text-text-3 bg-bg border border-border px-2 py-0.5 rounded-full">
                  {fmtBrl(usage.costBrl)} · {fmtMs((usage as unknown as { durationMs?: number }).durationMs ?? 0)}
                </span>
              )}
            </div>
          )}

          <button onClick={onClose} className="ml-auto w-7 h-7 flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg rounded-[6px] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* ── Progress Bar ── */}
        <div className="h-[3px] bg-border flex-shrink-0 relative overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-r-full',
              isDone  ? 'bg-brand-green' :
              isError ? 'bg-red-500' :
              'bg-brand-blue'
            )}
            style={{ width: `${progress}%` }}
          />
          {isRunning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left: Step Log + Cost ── */}
          <div className="w-[220px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden">

            {/* Step log */}
            <div className="px-3 py-2 border-b border-border flex-shrink-0">
              <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Execução</span>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto py-2 px-3 space-y-2.5 min-h-0">
              {steps.length === 0 && isRunning && (
                <div className="flex items-center gap-2 text-[11px] text-text-3">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Iniciando…</span>
                </div>
              )}
              {steps.map((step, i) => (
                <div key={step.id} className="flex gap-2">
                  <StepDot percent={step.percent} current={i === lastStepIdx && isRunning} />
                  <div className="min-w-0">
                    <p className={cn('text-[11px] leading-[1.4] break-words', step.percent >= 100 ? 'text-text-1' : 'text-text-2')}>
                      {step.text}
                    </p>
                    <p className="text-[10px] font-mono text-text-3 mt-0.5">
                      +{fmtMs(step.ts - firstTs)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost panel */}
            {usage && (
              <div className="border-t border-border px-3 py-3 flex-shrink-0 space-y-1.5">
                <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider mb-2">
                  Custo {usage.isEstimate ? '(estimativa)' : '(exato)'}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-3 font-mono">entrada</span>
                    <span className="text-text-2 font-mono">{usage.inputTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-3 font-mono">saída</span>
                    <span className="text-text-2 font-mono">{usage.outputTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-3 font-mono">total tok.</span>
                    <span className="text-text-2 font-mono">{(usage.inputTokens + usage.outputTokens).toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-border space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-3 font-mono">USD</span>
                    <span className="text-text-1 font-mono font-medium">{fmtUsd(usage.costUsd)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-text-3 font-mono">BRL</span>
                    <span className="text-text-1 font-mono font-bold">{fmtBrl(usage.costBrl)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Center: Loading / Error / Files ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">

            {/* Loading — no files yet */}
            {isRunning && !hasFiles && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-blue/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
                  <div className="absolute inset-[5px] flex items-center justify-center">
                    <Zap size={14} className="text-brand-blue" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[13px] font-medium text-text-1">Gerando código…</p>
                  <p className="text-[11px] font-mono text-text-3 max-w-[280px] text-center leading-relaxed">
                    {steps.at(-1)?.text ?? 'Claude está analisando o grafo de contexto'}
                  </p>
                  <p className="text-[11px] font-mono text-text-3">{progress}%</p>
                </div>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertCircle size={18} className="text-red-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[13px] font-semibold text-red-600">Geração falhou</p>
                  <p className="text-[11px] text-text-3 max-w-[300px] leading-relaxed">{error ?? 'Erro inesperado'}</p>
                </div>
                <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 bg-text-1 text-white text-[12px] font-medium rounded-[7px] hover:bg-neutral-800 transition-colors">
                  <RefreshCw size={11} /> Tentar novamente
                </button>
              </div>
            )}

            {/* Files */}
            {hasFiles && (
              <div className="flex flex-1 min-h-0">

                {/* File tree */}
                <div className="w-48 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex-shrink-0">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">
                      Arquivos ({files.length})
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto py-1">
                    {files.map((f, i) => {
                      const parts    = f.path.split('/')
                      const fileName = parts.pop() ?? f.path
                      const dir      = parts.join('/')
                      return (
                        <button
                          key={f.path}
                          onClick={() => setSelectedIdx(i)}
                          className={cn(
                            'w-full text-left px-3 py-2 transition-colors border-l-2',
                            selectedIdx === i
                              ? 'bg-bg border-brand-blue'
                              : 'hover:bg-bg border-transparent',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <FileCode2 size={11} className="text-text-3 flex-shrink-0" />
                            <span className={cn('text-[11px] font-mono truncate', selectedIdx === i ? 'text-text-1 font-semibold' : 'text-text-2')}>
                              {fileName}
                            </span>
                          </div>
                          {dir && (
                            <p className="text-[10px] font-mono text-text-3 truncate pl-4 mt-0.5">{dir}</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Code viewer */}
                {current && (
                  <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    <div className="h-[38px] px-4 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight size={10} className="text-[#555] flex-shrink-0" />
                        <span className="text-[11px] font-mono text-[#888] truncate">{current.path}</span>
                        <span className="text-[10px] font-mono text-[#555] flex-shrink-0">
                          · {current.content.split('\n').length} linhas
                        </span>
                      </div>
                      <button onClick={copyFile} className="flex items-center gap-1.5 text-[11px] text-[#888] hover:text-[#ddd] transition-colors flex-shrink-0">
                        {copied ? <><Check size={11} className="text-green-400" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                      </button>
                    </div>
                    <pre className="flex-1 overflow-auto bg-[#1e1e1e] px-4 py-3 text-[11.5px] font-mono leading-[1.7] text-[#d4d4d4] whitespace-pre">
                      {current.content.split('\n').map((line, i) => (
                        <div key={i} className="flex">
                          <span className="select-none text-[#444] w-8 flex-shrink-0 text-right mr-4">{i + 1}</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        {(isDone || isError) && (
          <div className="h-[46px] px-5 border-t border-border bg-bg flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 text-[11px] font-mono text-text-3">
              {isDone && usage && !usage.isEstimate && (
                <>
                  <span>{(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens</span>
                  <span>·</span>
                  <span className="text-text-2 font-semibold">{fmtBrl(usage.costBrl)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onRetry} className="flex items-center gap-1.5 text-[12px] text-text-2 hover:text-text-1 px-3 py-1.5 rounded-[6px] hover:bg-border transition-colors">
                <RefreshCw size={11} /> Regenerar
              </button>
              <button onClick={onClose} className="text-[12px] font-medium text-white bg-text-1 hover:bg-neutral-800 px-3 py-1.5 rounded-[6px] transition-colors">
                Feito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
