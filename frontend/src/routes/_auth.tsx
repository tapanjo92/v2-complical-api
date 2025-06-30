import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'
import { useAuthReady } from '@/hooks/use-auth-ready'
import { Loader2 } from 'lucide-react'

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
  
  // Show loading spinner while auth store is hydrating
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  // If not authenticated after hydration, redirect to login
  if (!isAuthenticated) {
    window.location.href = '/login'
    return null
  }
  
  return <Outlet />
}