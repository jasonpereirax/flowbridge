import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

// Server Component — fetches data before render, no loading spinners
export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: projectsRaw },
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  return (
    <DashboardClient
      initialProjects={projectsRaw ?? []}
      user={user}
    />
  )
}
