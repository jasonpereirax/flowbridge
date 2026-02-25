'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useStore } from '@/lib/store'
import { makeProject, relativeTime } from '@/utils'

interface Props {
  initialProjects: Array<{
    id: string; name: string; description: string; color: string
    settings: Record<string, unknown>; created_at: string; updated_at: string; owner_id: string
  }>
  user: User | null
}

const GRAD_PAIRS = [
  ['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'],['#fa709a','#fee140'],
]

export function DashboardClient({ initialProjects, user }: Props) {
  const router = useRouter()
  const store  = useStore()

  useEffect(() => {
    if (!initialProjects.length) return
    if (store.projects.length === 0) {
      initialProjects.forEach(p => {
        if (!store.projects.find(sp => sp.id === p.id)) {
          store.createProject({
            id: p.id, ownerId: p.owner_id, name: p.name,
            description: p.description, color: p.color,
            settings: p.settings as never,
            createdAt: p.created_at, updatedAt: p.updated_at,
          })
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openProject = (id: string) => { store.openProject(id); router.push(`/projects/${id}/canvas`) }

  const newProject = () => {
    const p = makeProject({ name: 'Untitled Project', description: '', color: '#2563EB' }, user?.id ?? 'local')
    store.createProject(p); openProject(p.id)
  }

  const projects = store.projects
  const emailChar = user?.email?.[0]?.toUpperCase() ?? 'U'
  const gradIdx   = emailChar.charCodeAt(0) % GRAD_PAIRS.length
  const [g1, g2]  = GRAD_PAIRS[gradIdx]

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Top bar ── */}
      <header className="h-[52px] bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-[10px]">
          <div className="w-[30px] h-[30px] bg-text-1 rounded-[8px] flex items-center justify-center text-white font-serif italic text-[16px] leading-none select-none">
            F
          </div>
          <span className="text-[15px] font-bold tracking-[-0.03em]">
            Flowbridge <span className="text-text-3 font-normal">Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-[9px]">
              <span className="text-[12px] text-text-2 hidden sm:block">{user.email}</span>
              <div
                className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0 select-none"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
              >
                {emailChar}
              </div>
            </div>
          )}
          <button
            onClick={newProject}
            className="flex items-center gap-[6px] px-[12px] py-[7px] bg-text-1 text-white text-[13px] font-medium rounded-[8px] hover:bg-neutral-800 active:scale-[.97] transition-all"
          >
            + New Project
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="text-[20px] font-bold tracking-[-0.03em] mb-[4px]">Projects</h1>
        <p className="text-[13px] text-text-2 mb-8">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {projects.map(p => {
            const canvas    = store.canvasData[p.id]
            const nodeCount = canvas?.nodes.length ?? 0
            const flowCount = Object.values(canvas?.flows ?? {}).flat().length

            return (
              <div
                key={p.id}
                onClick={() => openProject(p.id)}
                className="bg-surface border border-border rounded-[12px] overflow-hidden cursor-pointer transition-all duration-[170ms] hover:shadow-md hover:-translate-y-[2px] hover:border-border-strong group"
              >
                {/* colour band */}
                <div className="h-[120px] relative flex items-start p-[10px]" style={{ background: `${p.color}14` }}>
                  <div className="w-[18px] h-[18px] rounded-[5px]" style={{ background: p.color }} />
                  {/* hover arrow — visible on hover */}
                  <div className="absolute top-[10px] right-[10px] w-[24px] h-[24px] rounded-[6px] bg-white/90 border border-border flex items-center justify-center text-[12px] text-text-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    →
                  </div>
                </div>

                {/* meta */}
                <div className="px-[14px] py-[12px] border-t border-border">
                  <div className="text-[13.5px] font-semibold tracking-[-0.01em] leading-snug mb-[3px]">{p.name}</div>
                  {p.description && (
                    <div className="text-[11.5px] text-text-2 truncate mb-2">{p.description}</div>
                  )}
                  <div className="flex items-center justify-between mt-[8px]">
                    <span className="text-[11px] font-mono text-text-3">{nodeCount}n · {flowCount}f</span>
                    <span className="text-[11px] text-text-3">{relativeTime(p.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* new card */}
          <button
            onClick={newProject}
            className="border-[1.5px] border-dashed border-border-strong rounded-[12px] min-h-[190px] flex flex-col items-center justify-center gap-[9px] text-text-3 hover:border-text-1 hover:text-text-1 hover:bg-surface active:scale-[.98] transition-all duration-[170ms]"
          >
            <div className="w-[38px] h-[38px] rounded-[9px] border-[1.5px] border-dashed border-current flex items-center justify-center text-[20px] leading-none">+</div>
            <span className="text-[13px] font-medium">New Project</span>
          </button>
        </div>
      </main>
    </div>
  )
}
