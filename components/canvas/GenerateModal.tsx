'use client'

import { useState } from 'react'
import {
  X, Copy, Check, Zap, Loader2, AlertCircle,
  FileCode2, ChevronRight, RefreshCw,
} from 'lucide-react'
import { cn } from '@/utils'
import type { GeneratedFile, GenerationStatus } from '@/types'

interface Props {
  status:   GenerationStatus
  files:    GeneratedFile[]
  progress: string
  error:    string | null
  onClose:  () => void
  onRetry:  () => void
}

// Simple token-level syntax tinting (no external dep)
function tintLine(line: string): React.ReactNode {
  if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
    return <span className="text-[#6a9955]">{line}</span>
  }
  if (/^import |^export /.test(line.trim())) {
    return <span className="text-[#c586c0]">{line}</span>
  }
  if (/^\s*(const|let|function|return|interface|type|async|await|default)/.test(line)) {
    return <span className="text-[#569cd6]">{line}</span>
  }
  return <span>{line}</span>
}

const LANG_LABEL: Record<string, string> = {
  tsx: 'TypeScript React',
  ts:  'TypeScript',
  css: 'CSS',
  json: 'JSON',
  md:  'Markdown',
}

export function GenerateModal({ status, files, progress, error, onClose, onRetry }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copied,      setCopied]      = useState(false)

  const current = files[selectedIdx]

  function copyFile() {
    if (!current) return
    navigator.clipboard.writeText(current.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const totalLines = files.reduce((a, f) => a + f.content.split('\n').length, 0)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-5">
      <div className="bg-surface w-full max-w-5xl h-[82vh] rounded-[14px] border border-border shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="h-[50px] px-5 border-b border-border flex items-center gap-3 flex-shrink-0">
          <Zap
            size={15}
            className={cn(
              status === 'running' ? 'text-amber-400 animate-pulse' : 'text-brand-blue'
            )}
          />
          <span className="text-[14px] font-bold tracking-[-0.02em]">Generate</span>

          {status === 'running' && (
            <div className="flex items-center gap-2 text-[11px] text-text-2 min-w-0">
              <Loader2 size={11} className="animate-spin flex-shrink-0" />
              <span className="font-mono truncate">{progress || 'Starting…'}</span>
            </div>
          )}

          {status === 'done' && (
            <span className="text-[11px] font-mono text-brand-green bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              {files.length} file{files.length !== 1 ? 's' : ''} · {totalLines} lines
            </span>
          )}

          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg rounded-[6px] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* Loading — no files yet */}
          {status === 'running' && files.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-text-2">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-brand-blue/20" />
                <div className="absolute inset-0 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
                <div className="absolute inset-[5px] flex items-center justify-center">
                  <Zap size={14} className="text-brand-blue" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[13px] font-medium text-text-1">Generating code…</p>
                <p className="text-[11px] font-mono text-text-3 max-w-[380px] leading-relaxed text-center">
                  {progress || 'Claude is analyzing your context graph'}
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[13px] font-semibold text-red-600">Generation failed</p>
                <p className="text-[11px] text-text-3 max-w-[360px] leading-relaxed">{error ?? 'Unexpected error'}</p>
              </div>
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-text-1 text-white text-[12px] font-medium rounded-[7px] hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Files — file tree + code viewer */}
          {files.length > 0 && (
            <>
              {/* File tree */}
              <div className="w-52 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex-shrink-0">
                  <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">
                    Files ({files.length})
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
                          'w-full text-left px-3 py-2 transition-colors group',
                          selectedIdx === i
                            ? 'bg-bg border-l-2 border-brand-blue'
                            : 'hover:bg-bg border-l-2 border-transparent',
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileCode2 size={11} className="text-text-3 flex-shrink-0" />
                          <span className={cn(
                            'text-[11.5px] font-mono truncate',
                            selectedIdx === i ? 'text-text-1 font-semibold' : 'text-text-2',
                          )}>
                            {fileName}
                          </span>
                        </div>
                        {dir && (
                          <p className="text-[10px] font-mono text-text-3 truncate pl-4 mt-0.5">
                            {dir}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Code viewer */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                {current && (
                  <>
                    {/* Code toolbar */}
                    <div className="h-[38px] px-4 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight size={10} className="text-[#555] flex-shrink-0" />
                        <span className="text-[11px] font-mono text-[#888] truncate">{current.path}</span>
                        <span className="text-[10px] font-mono text-[#555] flex-shrink-0 hidden sm:block">
                          · {LANG_LABEL[current.lang] ?? current.lang}
                        </span>
                      </div>
                      <button
                        onClick={copyFile}
                        className="flex items-center gap-1.5 text-[11px] text-[#888] hover:text-[#ddd] transition-colors flex-shrink-0"
                      >
                        {copied
                          ? <><Check size={11} className="text-green-400" /> Copied</>
                          : <><Copy size={11} /> Copy</>
                        }
                      </button>
                    </div>

                    {/* Code */}
                    <pre className="flex-1 overflow-auto bg-[#1e1e1e] px-5 py-4 text-[12px] font-mono leading-[1.7] text-[#d4d4d4] whitespace-pre">
                      {current.content.split('\n').map((line, i) => (
                        <div key={i} className="flex">
                          <span className="select-none text-[#444] w-8 flex-shrink-0 text-right mr-4 leading-[1.7]">
                            {i + 1}
                          </span>
                          {tintLine(line)}
                        </div>
                      ))}
                    </pre>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer (done state only) ── */}
        {status === 'done' && files.length > 0 && (
          <div className="h-[46px] px-5 border-t border-border bg-bg flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] font-mono text-text-3">
              {totalLines} lines · {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-[12px] text-text-2 hover:text-text-1 px-3 py-1.5 rounded-[6px] hover:bg-border transition-colors"
              >
                <RefreshCw size={11} /> Regenerate
              </button>
              <button
                onClick={onClose}
                className="text-[12px] font-medium text-white bg-text-1 hover:bg-neutral-800 px-3 py-1.5 rounded-[6px] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
