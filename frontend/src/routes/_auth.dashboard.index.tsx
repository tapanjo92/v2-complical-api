import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { Link } from '@tanstack/react-router'
import { Activity, Key, Zap, ArrowRight, TrendingUp, RefreshCw } from 'lucide-react'
export const Route = createFileRoute('/_auth/dashboard/')({
  component: DashboardOverview,
})

function DashboardOverview() {
  const { user } = useAuthStore()
  
  // Load usage data from dedicated endpoint
  const { data: usageData, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['usage', user?.email], // Include user email to prevent cross-user caching
    queryFn: async () => {
      const response = await api.usage.get()
      return response.data
    },
    staleTime: 0, // Always consider data stale to force refetch
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    enabled: !!user, // Only fetch if user is logged in
  })

  const activeKeys = usageData?.api_keys?.active || 0
  const totalUsage = usageData?.current_period?.usage || 0
  const usageLimit = usageData?.current_period?.limit || 10000
  const usagePercentage = usageData?.current_period?.percentage || 0

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back{user?.companyName ? `, ${user.companyName}` : ''}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's an overview of your CompliCal API usage
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Usage Tracking Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Activity className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Usage tracking system update in progress</p>
            <p>We're currently updating our usage tracking infrastructure. API calls are working normally, but usage counts may be delayed. The system will be fully operational shortly.</p>
            {dataUpdatedAt && (
              <p className="text-xs mt-1 text-blue-600">
                Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeys}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of 5 maximum allowed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total API Calls
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {usagePercentage}% of {(usageLimit/1000).toFixed(0)}k limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Plan
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Free Tier</div>
            <p className="text-xs text-muted-foreground mt-1">
              10,000 requests/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Get Started with the API</CardTitle>
            <CardDescription>
              Create your first API key and start integrating CompliCal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/api-keys">
              <Button className="w-full">
                <Key className="h-4 w-4 mr-2" />
                Manage API Keys
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explore Documentation</CardTitle>
            <CardDescription>
              Learn how to integrate CompliCal into your applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/docs">
              <Button variant="outline" className="w-full">
                View API Documentation
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Usage Trends</CardTitle>
              <CardDescription>
                Your API usage over the last 30 days
              </CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/10 rounded-lg">
            <p className="text-muted-foreground text-sm">
              Usage analytics coming soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}