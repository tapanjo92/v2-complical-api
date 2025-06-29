import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { useEffect } from 'react'

interface UsageData {
  current_period: {
    usage: number
    limit: number
    percentage: number
    remaining: number
    reset_date: string | null
    days_until_reset: number
    window_type: string
  }
  api_keys: {
    active: number
    total: number
  }
  usage_by_key: Array<{
    id: string
    name: string
    usage: number
    last_used: string
    status: string
  }>
  recent_requests: Array<{
    timestamp: string
    method: string
    path: string
    status: number
    key_used: string
  }>
}

export function useUsageData() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // Create a stable query key
  const queryKey = ['usage', 'dashboard', user?.email]
  
  const query = useQuery<UsageData>({
    queryKey,
    queryFn: async () => {
      const response = await api.usage.get()
      return response.data
    },
    // Keep data fresh but avoid excessive refetching
    staleTime: 5 * 1000, // Data is fresh for 5 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    enabled: !!user,
    // Critical: Return cached data immediately while fetching
    initialData: () => {
      // Try to get data from cache first
      const cachedData = queryClient.getQueryData<UsageData>(queryKey)
      return cachedData
    },
    // Keep showing stale data while refetching
    placeholderData: (previousData) => previousData,
    // Network mode to handle offline gracefully
    networkMode: 'online',
  })
  
  // Prefetch on mount if we have cached data
  useEffect(() => {
    if (user && !query.data) {
      query.refetch()
    }
  }, [user])
  
  // Provide default values to prevent UI showing 0
  const safeData = {
    activeKeys: query.data?.api_keys?.active ?? 0,
    totalUsage: query.data?.current_period?.usage ?? 0,
    usageLimit: query.data?.current_period?.limit ?? 10000,
    usagePercentage: query.data?.current_period?.percentage ?? 0,
    daysUntilReset: query.data?.current_period?.days_until_reset ?? 30,
    usageByKey: query.data?.usage_by_key ?? [],
    recentRequests: query.data?.recent_requests ?? [],
  }
  
  return {
    ...query,
    ...safeData,
    isLoading: query.isLoading && !query.data, // Only show loading if no cached data
  }
}