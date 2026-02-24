'use client'

import { useAuth } from '@/hooks/useAuth'

export function LoginClient() {
  const { signInWithGithub, signInWithGoogle, loading } = useAuth()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="bg-surface border border-border rounded-2xl p-8 w-[360px] shadow-xl">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-11 h-11 bg-text-1 rounded-xl flex items-center justify-center text-white font-serif italic text-xl">
            F
          </div>
          <h1 className="text-[17px] font-bold tracking-tight">Flowbridge Studio</h1>
          <p className="text-[13px] text-text-2 text-center">
            Design-to-code pipeline
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={signInWithGithub}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-text-1 text-white text-[13px] font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Continue with GitHub
          </button>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-surface text-text-1 text-[13px] font-medium rounded-lg border border-border hover:bg-bg transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.3z"/>
              <path fill="#34A853" d="M24 48c6.5 0 12-2.2 16-5.9l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z"/>
              <path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5v-6.2H2.5C.9 16.7 0 20.2 0 24s.9 7.3 2.5 10.7l8.1-6.2z"/>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.4 30.4 0 24 0 14.7 0 6.5 5.4 2.5 13.3l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-[11.5px] text-text-3 mt-6">
          By signing in you agree to the Terms of Service
        </p>
      </div>
    </div>
  )
}
