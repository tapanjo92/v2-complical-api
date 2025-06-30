import { QueryClient } from '@tanstack/react-query'

// Create a shared query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // Reduced to 1 minute for sensitive data
      gcTime: 2 * 60 * 1000, // Reduced to 2 minutes to minimize cross-user cache persistence
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