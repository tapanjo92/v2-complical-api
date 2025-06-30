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
  const { user, refreshAuth } = useAuthStore()
  
  useEffect(() => {
    // Only refresh auth on initial app load, not on navigation
    const isInitialLoad = !sessionStorage.getItem('appInitialized')
    
    if (user && isInitialLoad) {
      sessionStorage.setItem('appInitialized', 'true')
      
      // Refresh auth in background without blocking
      refreshAuth()
        .then(() => {
          console.log('Auth refreshed successfully')
        })
        .catch(() => {
          // Don't do anything on refresh failure - user stays logged in
          console.log('Auth refresh failed, keeping existing session')
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