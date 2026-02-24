'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useStore } from '@/lib/store'
import { makeProject } from '@/utils'
import { relativeTime } from '@/utils'

interface Props {
  initialProjects: Array<{
    id: string
    name: string
    description: string
    color: string
    settings: Record<string, unknown>
    created_at: string
    updated_at: string
    owner_id: string
  }>
  user: User | null
}

export function DashboardClient({ initialProjects, user }: Props) {
  const router  = useRouter()
  const store   = useStore()

  // Hydrate store with server-fetched projects on first render
  useEffect(() => {
    if (!initialProjects.length) return
    if (store.projects.length === 0) {
      // Only seed if store is empty (avoid duplicating on navigation)
      initialProjects.forEach(p => {
        if (!store.projects.find(sp => sp.id === p.id)) {
          store.createProject({
            id:          p.id,
            ownerId:     p.owner_id,
            name:        p.name,
            description: p.description,
            color:       p.color,
            settings:    p.settings as never,
            createdAt:   p.created_at,
            updatedAt:   p.updated_at,
          })
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openProject = (id: string) => {
    store.openProject(id)
    router.push(`/projects/${id}/canvas`)
  }

  const newProject = () => {
    const p = makeProject(
      { name: 'Untitled Project', description: '', color: '#2563EB' },
      user?.id ?? 'local'
    )
    store.createProject(p)
    openProject(p.id)
  }

  const projects = store.projects

  return (
    <div className="min-h-screen bg-bg">

      {/* Top bar */}
      <header className="h-[52px] bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-text-1 rounded-lg flex items-center justify-center text-white font-serif italic text-base">
            F
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            Flowbridge <span className="text-text-3 font-normal">Studio</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-[12px] text-text-2">{user.email}</span>
          )}
          <button
            onClick={newProject}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-text-1 text-white text-[13px] font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + New Project
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="text-xl font-bold tracking-tight mb-1">Projects</h1>
        <p className="text-sm text-text-2 mb-8">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {projects.map(p => {
            const canvas     = store.canvasData[p.id]
            const nodeCount  = canvas?.nodes.length ?? 0
            const flowCount  = Object.values(canvas?.flows ?? {}).flat().length

            return (
              <div
                key={p.id}
                onClick={() => openProject(p.id)}
                className="bg-surface border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                {/* Preview area */}
                <div
                  className="h-[120px] relative"
                  style={{ background: `${p.color}12` }}
                >
                  <div
                    className="absolute top-3 left-3 w-5 h-5 rounded-md"
                    style={{ background: p.color }}
                  />
                </div>

                {/* Meta */}
                <div className="p-3.5 border-t border-border">
                  <div className="text-[13.5px] font-semibold leading-snug">{p.name}</div>
                  {p.description && (
                    <div className="text-[11.5px] text-text-2 mt-0.5 truncate">{p.description}</div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] font-mono text-text-3">
                      {nodeCount}n · {flowCount}f
                    </span>
                    <span className="text-[11px] text-text-3">
                      {relativeTime(p.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* New project card */}
          <button
            onClick={newProject}
            className="border-[1.5px] border-dashed border-border-strong rounded-xl min-h-[188px] flex flex-col items-center justify-center gap-2 text-text-3 hover:border-text-1 hover:text-text-1 hover:bg-surface transition-all"
          >
            <div className="w-9 h-9 rounded-lg border-[1.5px] border-dashed border-current flex items-center justify-center text-lg">
              +
            </div>
            <span className="text-[13px] font-medium">New Project</span>
          </button>
        </div>
      </main>
    </div>
  )
}
