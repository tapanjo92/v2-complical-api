import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'

/**
 * Hook that ensures auth store is fully hydrated before returning ready state
 * This prevents race conditions where API calls are made before auth tokens are available
 */
export function useAuthReady() {
  const [isReady, setIsReady] = useState(false)
  const user = useAuthStore((state) => state.user)
  
  
  useEffect(() => {
    // Give the store a moment to hydrate from localStorage
    const timeout = setTimeout(() => {
      setIsReady(true)
    }, 100)
    
    return () => clearTimeout(timeout)
  }, [])
  
  return {
    isReady,
    isAuthenticated: isReady && !!user,
    user,
  }
}