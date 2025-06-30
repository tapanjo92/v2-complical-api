import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { routeTree } from './routeTree.gen'
import { ErrorFallback } from '@/components/ErrorFallback'
import { useAuthStore } from '@/lib/auth-store'
import { queryClient } from '@/lib/query-client'
import { UsageProvider } from '@/providers/usage-provider'
import { EmailVerification } from '@/components/EmailVerification'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function AppContent() {
  const { user, idToken, refreshAuth } = useAuthStore()
  
  useEffect(() => {
    // Try to refresh auth on mount if we have a user but no token
    if (user && !idToken) {
      refreshAuth().catch(() => {
        // If refresh fails, user will be logged out automatically
      })
    }
  }, [])
  
  // Check if this is the email verification page
  if (window.location.pathname === '/verify-email') {
    return (
      <>
        <EmailVerification />
        <Toaster />
      </>
    )
  }
  
  return (
    <UsageProvider>
      <RouterProvider router={router} />
      <Toaster />
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </UsageProvider>
  )
}

export function App() {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.href = '/'}
    >
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}