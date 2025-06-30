import { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { CalendarDays, Menu, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DocsLayoutProps {
  children: ReactNode
}

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
      { title: 'Rate Limiting', href: '/docs/rate-limiting' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/docs/api' },
      { title: 'Deadlines', href: '/docs/api/deadlines' },
      { title: 'Authentication', href: '/docs/api/auth' },
      { title: 'API Keys', href: '/docs/api/keys' },
    ],
  },
  {
    title: 'Countries',
    items: [
      { title: 'Australia', href: '/docs/countries/au' },
      { title: 'New Zealand', href: '/docs/countries/nz' },
    ],
  },
  {
    title: 'SDKs & Tools',
    items: [
      { title: 'JavaScript/TypeScript', href: '/docs/sdks/javascript' },
      { title: 'Python', href: '/docs/sdks/python' },
      { title: 'cURL Examples', href: '/docs/sdks/curl' },
      { title: 'Postman Collection', href: '/docs/sdks/postman' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { title: 'Error Handling', href: '/docs/errors' },
      { title: 'Webhooks', href: '/docs/webhooks' },
      { title: 'Changelog', href: '/docs/changelog' },
      { title: 'API Status', href: '/docs/status' },
    ],
  },
]

export function DocsLayout({ children }: DocsLayoutProps) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <CalendarDays className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">CompliCal</span>
            </Link>
            <nav className="hidden lg:flex items-center space-x-6">
              <Link to="/docs" className="text-sm font-medium text-primary">
                Documentation
              </Link>
              <Link to="/pricing" className="text-sm font-medium hover:text-primary">
                Pricing
              </Link>
              <a 
                href="https://status.complical.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary"
              >
                API Status
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documentation..."
                className="pl-10 pr-4 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:sticky top-16 h-[calc(100vh-4rem)] w-64 bg-gray-50 border-r overflow-y-auto",
          "lg:block",
          mobileMenuOpen ? "block" : "hidden"
        )}>
          <nav className="p-4 space-y-6">
            {navigation.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold text-sm text-gray-900 mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={cn(
                          "block px-3 py-2 text-sm rounded-md transition-colors",
                          location.pathname === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="container max-w-4xl mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}