'use client'

import { useState, useCallback } from 'react'
import { X, Link2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Wand2, FileStack, Layers } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn, now, makeNode, makeFlow, makeScreen, parseFigmaUrl } from '@/utils'
import type { ImportResult } from '@/app/api/figma-import/route'

// ─────────────────────────────────────────────────────────────────────────────

type WizardStep = 'input' | 'preview' | 'importing' | 'done' | 'error'

interface Props {
  onClose: () => void
}

interface PageToggle {
  [pageId: string]: boolean
}

// ─────────────────────────────────────────────────────────────────────────────

export function ImportWizard({ onClose }: Props) {
  const store = useStore()

  const [step,       setStep]       = useState<WizardStep>('input')
  const [url,        setUrl]        = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [result,     setResult]     = useState<ImportResult | null>(null)
  const [expanded,   setExpanded]   = useState<PageToggle>({})
  const [pageToggle, setPageToggle] = useState<PageToggle>({})  // true = include page
  const [progress,   setProgress]   = useState({ step: 0, total: 0, label: '' })
  const [importedIds, setImportedIds] = useState<{ journeyId: string }[]>([])

  // ── Step 1: Fetch file structure ────────────────────────────────────────────
  const handleFetch = useCallback(async () => {
    const parsed = parseFigmaUrl(url.trim())
    if (!parsed?.fileKey) {
      setError('URL inválida — use uma URL do formato https://figma.com/design/:fileKey/...')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/figma-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey: parsed.fileKey, analyzeWithAI: true }),
      })

      const data = await res.json() as ImportResult & { error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao importar arquivo')
        setLoading(false)
        return
      }

      setResult(data)
      // Default: all pages included, all expanded
      const toggles: PageToggle = {}
      const exp: PageToggle = {}
      data.pages.forEach(p => { toggles[p.pageId] = true; exp[p.pageId] = true })
      setPageToggle(toggles)
      setExpanded(exp)
      setStep('preview')
    } catch (err) {
      setError('Falha na conexão — tente novamente')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [url])

  // ── Step 2: Import selected pages into canvas ───────────────────────────────
  const handleImport = useCallback(async () => {
    if (!result) return
    const projectId = store.curProjectId
    if (!projectId) return

    const selectedPages = result.pages.filter(p => pageToggle[p.pageId])
    if (selectedPages.length === 0) return

    const totalFrames = selectedPages.reduce((s, p) => s + p.frames.length, 0)
    setStep('importing')
    setProgress({ step: 0, total: totalFrames, label: 'Criando estrutura…' })

    const created: { journeyId: string }[] = []

    // Layout journeys in a cascade
    const JOURNEY_W = 220
      const GAP_X = 60
    const SCREEN_COLS = 4
    const SCREEN_W = 200
    const SCREEN_H = 160
    const SCREEN_GAP_X = 24
    const SCREEN_GAP_Y = 24

    let journeyX = 60
    const journeyY = 80

    let framesDone = 0

    for (const page of selectedPages) {
      setProgress({ step: framesDone, total: totalFrames, label: `Importando página "${page.name}"…` })

      // Create journey node for this page
      const journey = makeNode({
        projectId,
        type:    'journey',
        name:    page.name,
        position: { x: journeyX, y: journeyY },
      })
      store.addNode(journey)

      // Create one flow per page
      const flow = makeFlow({
        journeyId: journey.id,
        projectId,
        name:  page.name,
        order: 0,
      })
      store.addFlow(journey.id, flow)

      // Create screens for each frame in this page
      const rows = Math.ceil(page.frames.length / SCREEN_COLS)
      const microH = rows * (SCREEN_H + SCREEN_GAP_Y)

      // Position screens in a grid
      for (let i = 0; i < page.frames.length; i++) {
        const frame   = page.frames[i]
        const col     = i % SCREEN_COLS
        const row     = Math.floor(i / SCREEN_COLS)
        const screenX = col * (SCREEN_W + SCREEN_GAP_X) + 60
        const screenY = row * (SCREEN_H + SCREEN_GAP_Y) + 60

        const ai   = result.aiContext[frame.nodeId] ?? result.aiContext[frame.nodeId.replace(/:/g, '-')]
        const thumb = result.thumbnails[frame.nodeId] ?? result.thumbnails[frame.nodeId.replace(/:/g, '-')]

        const screen = makeScreen({
          flowId:    flow.id,
          projectId,
          name:      frame.name,
          position:  { x: screenX, y: screenY },
          order:     frame.order,
          isEntry:   frame.order === 0,
          context: {
            purpose:      ai?.purpose      ?? '',
            userIntent:   ai?.userIntent   ?? '',
            route:        ai?.route        ?? '',
            requiresAuth: false,
            apiEndpoints: [],
            components:   [],
            notes:        ai?.notes        ?? '',
            genRules:     '',
          },
          figma: thumb
            ? {
                url:          url.trim(),
                nodeId:       frame.nodeId,
                fileKey:      result.fileKey,
                thumbnailUrl: thumb,
                componentMap: [],
                fetchedAt:    now(),
              }
            : undefined,
        })

        store.addScreen(journey.id, flow.id, screen)
        framesDone++
        setProgress({ step: framesDone, total: totalFrames, label: `${framesDone}/${totalFrames} screens criadas…` })

        // Tiny yield to allow UI update
        await new Promise(r => setTimeout(r, 8))
      }

      created.push({ journeyId: journey.id })

      // Advance X for next journey block
      const blockW = Math.max(JOURNEY_W, SCREEN_COLS * (SCREEN_W + SCREEN_GAP_X))
      journeyX += blockW + GAP_X + 80
      void microH // used implicitly for layout planning
    }

    setImportedIds(created)
    setStep('done')
  }, [result, pageToggle, store, url])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const selectedCount = result
    ? result.pages.filter(p => pageToggle[p.pageId]).reduce((s, p) => s + p.frames.length, 0)
    : 0

  const totalSelected = result
    ? result.pages.filter(p => pageToggle[p.pageId]).length
    : 0

  function togglePage(pageId: string) {
    setPageToggle(prev => ({ ...prev, [pageId]: !prev[pageId] }))
  }

  function toggleExpand(pageId: string) {
    setExpanded(prev => ({ ...prev, [pageId]: !prev[pageId] }))
  }

  function handleOpenJourney() {
    if (importedIds.length > 0) {
      store.openJourney(importedIds[0].journeyId)
    }
    onClose()
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <FileStack size={16} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-gray-900">Importar arquivo Figma</h2>
            <p className="text-[12px] text-gray-400">
              {step === 'input'    && 'Cole a URL do arquivo para importar todas as páginas e frames'}
              {step === 'preview'  && `${result?.totalFrames} frames encontrados em ${result?.pages.length} páginas`}
              {step === 'importing' && 'Criando estrutura no canvas…'}
              {step === 'done'     && 'Import concluído com sucesso!'}
              {step === 'error'    && 'Algo deu errado'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Input ── */}
          {step === 'input' && (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  URL do arquivo Figma
                </label>
                <div className="relative">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(null) }}
                    onKeyDown={e => e.key === 'Enter' && !loading && handleFetch()}
                    placeholder="https://figma.com/design/abc123/MyFile"
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={12} />
                    {error}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
                  <Wand2 size={13} />
                  O que será importado automaticamente
                </div>
                <ul className="space-y-1.5 text-xs text-purple-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Cada página do Figma → um Journey node no canvas
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Cada frame top-level → uma Screen com thumbnail
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    AI analisa nome e contexto de cada frame para sugerir Purpose, Intent e Route
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && result && (
            <div className="divide-y divide-gray-50">
              {/* Summary bar */}
              <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    <span className="font-bold text-gray-800">{result.pages.length}</span> páginas
                  </span>
                  <span>
                    <span className="font-bold text-gray-800">{result.totalFrames}</span> frames
                  </span>
                  <span>
                    <span className="font-bold text-purple-700">{selectedCount}</span> selecionados
                  </span>
                </div>
                <button
                  onClick={() => {
                    const allOff = result.pages.every(p => !pageToggle[p.pageId])
                    const next: PageToggle = {}
                    result.pages.forEach(p => { next[p.pageId] = allOff })
                    setPageToggle(next)
                  }}
                  className="text-[11px] text-purple-600 hover:underline"
                >
                  {result.pages.every(p => !pageToggle[p.pageId]) ? 'Selecionar todos' : 'Limpar seleção'}
                </button>
              </div>

              {/* Pages list */}
              {result.pages.map(page => (
                <div key={page.pageId}>
                  {/* Page row */}
                  <div className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!pageToggle[page.pageId]}
                      onChange={() => togglePage(page.pageId)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 cursor-pointer"
                    />
                    <button
                      onClick={() => toggleExpand(page.pageId)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {expanded[page.pageId]
                        ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
                        : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                      }
                      <Layers size={13} className="text-purple-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">{page.name}</span>
                      <span className="text-xs text-gray-400 ml-1">
                        {page.frames.length} frames → 1 journey + 1 flow
                      </span>
                    </button>
                  </div>

                  {/* Frames grid */}
                  {expanded[page.pageId] && (
                    <div className="px-6 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {page.frames.map(frame => {
                          const thumb = result.thumbnails[frame.nodeId]
                            ?? result.thumbnails[frame.nodeId.replace(/:/g, '-')]
                          const ai    = result.aiContext[frame.nodeId]
                            ?? result.aiContext[frame.nodeId.replace(/:/g, '-')]
                          return (
                            <div
                              key={frame.nodeId}
                              className={cn(
                                'rounded-xl border overflow-hidden transition-all',
                                pageToggle[page.pageId]
                                  ? 'border-purple-100 bg-white'
                                  : 'border-gray-100 bg-gray-50 opacity-50'
                              )}
                            >
                              {/* Thumbnail */}
                              <div className="h-[72px] bg-gray-100 overflow-hidden relative">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={thumb} alt={frame.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-gray-300 text-[11px]">
                                    sem preview
                                  </div>
                                )}
                                {frame.order === 0 && (
                                  <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">
                                    Entry
                                  </span>
                                )}
                              </div>
                              {/* Info */}
                              <div className="px-2.5 py-2">
                                <div className="text-[11px] font-semibold text-gray-800 truncate">{frame.name}</div>
                                {ai?.route && (
                                  <div className="text-[10px] font-mono text-gray-400 truncate">{ai.route}</div>
                                )}
                                {ai?.purpose && (
                                  <div className="text-[10px] text-gray-400 truncate mt-0.5 italic">{ai.purpose}</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Importing ── */}
          {step === 'importing' && (
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <Loader2 size={28} className="text-purple-500 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-[15px] font-semibold text-gray-800">{progress.label}</div>
                <div className="text-xs text-gray-400">{progress.step} de {progress.total} screens</div>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.step / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-[15px] font-semibold text-gray-800">Import concluído!</div>
                <div className="text-xs text-gray-400">
                  {importedIds.length} journey{importedIds.length !== 1 ? 's' : ''} criados com {selectedCount} screens
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 w-full text-xs text-gray-600 space-y-1.5">
                <div className="font-semibold text-gray-700 mb-2">Próximos passos sugeridos:</div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Abra cada Journey e revise as screens importadas
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Use &ldquo;Analisar tela&rdquo; no RightPanel para enriquecer o contexto de cada screen
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Conecte um DS node às Journeys para completar o contexto de geração
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">

          {step === 'input' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleFetch}
                disabled={!url.trim() || loading}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  url.trim() && !loading
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {loading ? 'Analisando arquivo…' : 'Analisar arquivo'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Voltar
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {totalSelected} página{totalSelected !== 1 ? 's' : ''} • {selectedCount} screens
                </span>
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    selectedCount > 0
                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <FileStack size={14} />
                  Importar para o canvas
                </button>
              </div>
            </>
          )}

          {step === 'importing' && (
            <div className="flex-1 text-center text-xs text-gray-400">
              Aguarde — não feche esta janela
            </div>
          )}

          {step === 'done' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={handleOpenJourney}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow transition-all"
              >
                Abrir primeiro Journey →
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
