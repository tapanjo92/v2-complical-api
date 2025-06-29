import React, { createContext, useContext, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api-client'

interface UsageContextType {
  prefetchUsage: () => Promise<void>
}

const UsageContext = createContext<UsageContextType | undefined>(undefined)

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  // Prefetch usage data when user logs in
  const prefetchUsage = async () => {
    if (!user) return
    
    try {
      await queryClient.prefetchQuery({
        queryKey: ['usage', 'dashboard', user.email],
        queryFn: async () => {
          const response = await api.usage.get()
          return response.data
        },
        staleTime: 5 * 1000,
      })
    } catch (error) {
      console.error('Failed to prefetch usage data:', error)
    }
  }
  
  // Prefetch on mount and when user changes
  useEffect(() => {
    if (user) {
      prefetchUsage()
    }
  }, [user?.email])
  
  return (
    <UsageContext.Provider value={{ prefetchUsage }}>
      {children}
    </UsageContext.Provider>
  )
}

export function useUsageContext() {
  const context = useContext(UsageContext)
  if (!context) {
    throw new Error('useUsageContext must be used within UsageProvider')
  }
  return context
}