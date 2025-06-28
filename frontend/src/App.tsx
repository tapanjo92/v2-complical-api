import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { routeTree } from './routeTree.gen'
import { ErrorFallback } from '@/components/ErrorFallback'
import { useAuthStore } from '@/lib/auth-store'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
  },
})

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
  
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </>
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