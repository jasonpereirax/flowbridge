import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/globals.css'

// Pages (lazy-loaded)
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CanvasPage    = lazy(() => import('./pages/CanvasPage'))
const AuthPage      = lazy(() => import('./pages/AuthPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          60_000,
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('#root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-text-2 text-sm">Loading…</div>}>
          <Routes>
            <Route path="/"                          element={<DashboardPage />} />
            <Route path="/projects/:id/canvas"       element={<CanvasPage />} />
            <Route path="/auth"                      element={<AuthPage />} />
            <Route path="*"                          element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
