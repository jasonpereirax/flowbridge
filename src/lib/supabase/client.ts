import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// Auth helpers
export const signInWithGithub = () =>
  supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback` },
  })

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback` },
  })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()
