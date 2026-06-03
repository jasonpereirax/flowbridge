'use client'

import { X, Trash2, Zap, AlertCircle, Clock, Eye } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/utils'
import type { GenerationRun } from '@/types'

interface Props { onClose: () => void; onOpen: (run: GenerationRun) => void }

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtBrl(brl: number) {
  if (brl < 0.01) return '< R$0,01'
  return `R$${brl.toFixed(2).replace('.', ',')}`
}

function fmtMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function RunRow({ run, onOpen }: { run: GenerationRun; onOpen: (run: GenerationRun) => void }) {
  const isDone  = run.status === 'done'
  const canOpen = !!run.files?.length
  return (
    <div
      onClick={canOpen ? () => onOpen(run) : undefined}
      className={cn(
        'px-4 py-3 border-b border-border last:border-0 grid gap-x-4 items-center',
        'grid-cols-[auto_1fr_auto_auto_auto_auto]',
        canOpen && 'cursor-pointer hover:bg-bg transition-colors',
      )}
    >
      {/* status icon */}
      <div className="flex items-center justify-center w-6 h-6">
        {isDone
          ? <Zap size={12} className="text-brand-blue" />
          : <AlertCircle size={12} className="text-red-400" />
        }
      </div>

      {/* project / flow */}
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-text-1 truncate">{run.flowName}</p>
        <p className="text-[10.5px] text-text-3 font-mono truncate">
          {run.projectName} · {run.screenCount} tela{run.screenCount !== 1 ? 's' : ''}
          {run.filesCount > 0 && ` · ${run.filesCount} arq.`}
        </p>
      </div>

      {/* tokens */}
      <div className="text-right">
        <p className="text-[11px] font-mono text-text-2">{(run.usage.totalTokens).toLocaleString()}</p>
        <p className="text-[10px] font-mono text-text-3">tokens</p>
      </div>

      {/* cost */}
      <div className="text-right">
        <p className="text-[12px] font-mono font-semibold text-text-1">{fmtBrl(run.usage.costBrl)}</p>
        <p className="text-[10px] font-mono text-text-3">{fmtMs(run.usage.durationMs)}</p>
      </div>

      {/* date */}
      <div className="text-right">
        <p className="text-[10.5px] font-mono text-text-3 whitespace-nowrap">{fmtDate(run.createdAt)}</p>
      </div>

      {/* open */}
      <div className="flex items-center justify-center w-6" title={canOpen ? 'Reabrir código e preview' : undefined}>
        {canOpen ? <Eye size={13} className="text-text-3" /> : null}
      </div>
    </div>
  )
}

export function HistoryPanel({ onClose, onOpen }: Props) {
  const history     = useStore(s => s.generationHistory)
  const clearHistory = useStore(s => s.clearHistory)

  const totalCostBrl   = history.reduce((a, r) => a + r.usage.costBrl, 0)
  const totalTokens    = history.reduce((a, r) => a + r.usage.totalTokens, 0)
  const successCount   = history.filter(r => r.status === 'done').length

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-5">
      <div className="bg-surface w-full max-w-3xl h-[75vh] rounded-[14px] border border-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="h-[50px] px-5 border-b border-border flex items-center gap-3 flex-shrink-0">
          <Clock size={14} className="text-text-2" />
          <span className="text-[14px] font-bold tracking-[-0.02em]">Histórico de Geração</span>
          <span className="text-[11px] font-mono text-text-3 bg-bg border border-border px-2 py-0.5 rounded-full ml-1">
            {history.length} run{history.length !== 1 ? 's' : ''}
          </span>
          <button onClick={onClose} className="ml-auto w-7 h-7 flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg rounded-[6px] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Summary bar */}
        {history.length > 0 && (
          <div className="px-5 py-3 border-b border-border bg-bg flex items-center gap-6 flex-shrink-0">
            <div>
              <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider mb-0.5">Total runs</p>
              <p className="text-[14px] font-bold font-mono text-text-1">{history.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider mb-0.5">Sucesso</p>
              <p className="text-[14px] font-bold font-mono text-brand-green">{successCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider mb-0.5">Total tokens</p>
              <p className="text-[14px] font-bold font-mono text-text-1">{totalTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider mb-0.5">Custo total</p>
              <p className="text-[14px] font-bold font-mono text-text-1">
                {totalCostBrl < 0.01 ? '< R$0,01' : `R$${totalCostBrl.toFixed(2).replace('.', ',')}`}
              </p>
            </div>
            <button
              onClick={clearHistory}
              className="ml-auto flex items-center gap-1.5 text-[11px] text-text-3 hover:text-red-500 transition-colors px-2 py-1.5 rounded-[6px] hover:bg-red-50"
            >
              <Trash2 size={11} /> Limpar histórico
            </button>
          </div>
        )}

        {/* Table header */}
        {history.length > 0 && (
          <div className="px-4 py-2 bg-bg border-b border-border flex-shrink-0 grid gap-x-4 grid-cols-[auto_1fr_auto_auto_auto_auto]">
            <div />
            <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Flow / Projeto</p>
            <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Tokens</p>
            <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Custo</p>
            <p className="text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Data</p>
            <div />
          </div>
        )}

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-text-3">
              <Clock size={28} className="opacity-30" />
              <p className="text-[13px]">Nenhuma geração ainda</p>
              <p className="text-[11px] font-mono opacity-70">Execute o Generate para ver o histórico aqui</p>
            </div>
          ) : (
            history.map(run => <RunRow key={run.id} run={run} onOpen={onOpen} />)
          )}
        </div>
      </div>
    </div>
  )
}
