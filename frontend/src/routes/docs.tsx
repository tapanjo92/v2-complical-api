import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Code, 
  Book, 
  Key, 
  Zap, 
  Globe, 
  FileText, 
  Terminal,
  Shield,
  Webhook,
  AlertCircle,
  Clock,
  Search,
  Menu,
  X,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/docs')({
  component: DocsLayout,
})

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Introduction', href: '/docs', icon: Book },
      { name: 'Quick Start', href: '/docs/quickstart', icon: Zap },
      { name: 'Authentication', href: '/docs/authentication', icon: Key },
      { name: 'Rate Limits', href: '/docs/rate-limits', icon: Clock },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { name: 'Global Endpoint', href: '/docs/api/global', icon: Globe },
      { name: 'Australia (AU)', href: '/docs/api/australia', icon: FileText },
      { name: 'New Zealand (NZ)', href: '/docs/api/new-zealand', icon: FileText },
      { name: 'API Keys', href: '/docs/api/keys', icon: Key },
    ],
  },
  {
    title: 'Guides',
    items: [
      { name: 'Error Handling', href: '/docs/guides/errors', icon: AlertCircle },
      { name: 'Webhooks', href: '/docs/guides/webhooks', icon: Webhook },
      { name: 'Best Practices', href: '/docs/guides/best-practices', icon: Shield },
      { name: 'Migration Guide', href: '/docs/guides/migration', icon: ChevronRight },
    ],
  },
  {
    title: 'Resources',
    items: [
      { name: 'SDKs & Libraries', href: '/docs/sdks', icon: Code },
      { name: 'Postman Collection', href: '/docs/postman', icon: Terminal },
      { name: 'OpenAPI Spec', href: '/docs/openapi', icon: FileText },
      { name: 'Changelog', href: '/docs/changelog', icon: Clock },
    ],
  },
]

function DocsLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <Link to="/" className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-lg">CompliCal</span>
              <span className="text-sm text-gray-500">Docs</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 pb-4">
            {navigation.map((section) => (
              <div key={section.title} className="mb-6">
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                        activeProps={{
                          className: "bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>API v1.0</span>
              <a 
                href="https://status.complical.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-gray-700"
              >
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                All systems operational
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-40 lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Main content */}
      <main className="flex-1 lg:pl-0">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}