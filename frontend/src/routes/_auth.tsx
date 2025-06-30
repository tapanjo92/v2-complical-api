import { createFileRoute, redirect, Outlet, useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'
import { useAuthReady } from '@/hooks/use-auth-ready'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    const user = useAuthStore.getState().user
    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { isReady, isAuthenticated } = useAuthReady()
  const router = useRouter()
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  
  
  useEffect(() => {
    // After component mounts, give auth state time to settle
    if (isReady && !isAuthenticated) {
      const timer = setTimeout(() => {
        // Double-check auth state after delay
        const currentUser = useAuthStore.getState().user
        
        if (!currentUser) {
          setAuthCheckComplete(true)
          router.navigate({ to: '/login' })
        } else {
          setAuthCheckComplete(true)
        }
      }, 1000) // 1 second grace period for auth hydration
      
      return () => clearTimeout(timer)
    } else if (isReady && isAuthenticated) {
      setAuthCheckComplete(true)
    }
  }, [isReady, isAuthenticated, router])
  
  // Show loading spinner while auth store is hydrating or checking
  if (!isReady || (!isAuthenticated && !authCheckComplete)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  // Only redirect if auth check is complete and still not authenticated
  if (!isAuthenticated && authCheckComplete) {
    return null // Router will handle navigation
  }
  
  return <Outlet />
}