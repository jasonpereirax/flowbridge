'use client'

import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface UseAuthReturn {
  user:    User    | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user,    setUser]    = useState<User    | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const supabase = createClient()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return {
    user,
    session,
    loading,
    signOut: () => supabase.auth.signOut().then(),
    signInWithGithub: () =>
      supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${appUrl}/auth/callback` },
      }).then(),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${appUrl}/auth/callback` },
      }).then(),
  }
}
