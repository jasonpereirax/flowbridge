import { LoginClient } from '@/components/dashboard/LoginClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already logged in — go to dashboard
  if (user) redirect('/')

  return <LoginClient />
}
