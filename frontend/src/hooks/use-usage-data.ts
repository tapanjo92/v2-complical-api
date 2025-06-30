import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useAuthReady } from '@/hooks/use-auth-ready'
import { cacheKeys } from '@/lib/cache-keys'

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
  _metadata?: {
    authenticated_user: string
    data_owner: string
    validation_timestamp: string
  }
}

export function useUsageData() {
  const { user, isAuthenticated } = useAuthReady()
  
  // Use session-isolated cache key
  const queryKey = user?.email ? cacheKeys.usage(user.email) : []
  
  const query = useQuery<UsageData>({
    queryKey,
    queryFn: async () => {
      const response = await api.usage.get()
      const data = response.data
      
      // Validate that the data belongs to the current user
      if (data._metadata && data._metadata.data_owner !== user?.email) {
        console.error('Data validation failed: response data does not belong to current user')
        throw new Error('Invalid user data received')
      }
      
      return data
    },
    // Keep data fresh but avoid excessive refetching
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 60 * 1000, // CRITICAL: Only keep in cache for 1 minute to prevent data bleeding
    refetchOnWindowFocus: true,
    refetchInterval: false, // Disable auto-refresh to prevent continuous polling
    enabled: !!user?.email && isAuthenticated, // Only enable with valid user
    // REMOVED initialData - it was causing stale data to persist across users
    // REMOVED placeholderData - we want fresh data for each user
    networkMode: 'online',
  })
  
  // Remove the useEffect - data will be fetched via the query when enabled
  
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