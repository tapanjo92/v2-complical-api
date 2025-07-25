import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { CalendarDays, Key, Activity, LogOut, Menu, X, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: Activity },
    { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    { name: 'Webhooks', href: '/dashboard/webhooks', icon: Bell },
    { name: 'Account', href: '/dashboard/account', icon: User },
  ]

  const handleLogout = async () => {
    await logout()
    // Ensure all queries are invalidated and cache is fully cleared
    await queryClient.invalidateQueries()
    await queryClient.cancelQueries()
    // Small delay to ensure all cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100))
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span className="font-semibold">CompliCal</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 mt-8 px-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.companyName || 'Free Tier'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex h-16 items-center px-6 border-b">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <CalendarDays className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">CompliCal</span>
            </Link>
          </div>
          <nav className="flex-1 mt-8 px-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.companyName}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Universal header - shows on all screen sizes */}
        <header className="sticky top-0 z-40 bg-white border-b">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="lg:hidden flex items-center space-x-2">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  <span className="font-semibold hidden sm:inline">CompliCal</span>
                </Link>
                <span className="text-sm sm:text-base font-medium text-gray-600 lg:text-gray-900">
                  {navigation.find(item => location.pathname === item.href)?.name || 'Dashboard'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex items-center gap-2 text-right">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate hidden md:block">
                      {user?.companyName || 'Free Tier'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}