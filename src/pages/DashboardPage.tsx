// src/pages/DashboardPage.tsx
// Full implementation will mirror the v6 dashboard exactly.
// Connects to Zustand store + Supabase projects table.

import { useStore } from '@/lib/store'
import { relativeTime } from '@/utils'

export default function DashboardPage() {
  const { projects, openProject } = useStore()

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="h-[52px] bg-surface border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-text-1 rounded-lg flex items-center justify-center text-white font-serif italic text-base">
            F
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            Flowbridge <span className="opacity-35">Studio</span>
          </span>
        </div>
        <button
          className="px-3 py-1.5 bg-text-1 text-white text-[13px] font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          onClick={() => {/* open new project modal */}}
        >
          + New Project
        </button>
      </header>

      {/* Body — TODO: implement full sidebar + grid from prototype */}
      <main className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="text-xl font-bold tracking-tight mb-2">Projects</h1>
        <p className="text-sm text-text-2 mb-6">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-4">
          {projects.map(p => (
            <div
              key={p.id}
              className="bg-surface border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => openProject(p.id)}
            >
              <div className="h-[130px]" style={{ background: `${p.color}0D` }} />
              <div className="p-3.5 border-t border-border">
                <div className="text-[13.5px] font-semibold">{p.name}</div>
                <div className="text-[11.5px] text-text-2 mt-0.5">
                  {relativeTime(p.updatedAt)}
                </div>
              </div>
            </div>
          ))}
          <button className="border-[1.5px] border-dashed border-border-2 rounded-xl min-h-[190px] flex flex-col items-center justify-center gap-2 text-text-3 hover:border-text-1 hover:text-text-1 hover:bg-surface transition-all">
            <div className="w-10 h-10 rounded-lg border-[1.5px] border-dashed border-current flex items-center justify-center text-xl">+</div>
            <span className="text-[13px] font-medium">New Project</span>
          </button>
        </div>
      </main>
    </div>
  )
}
