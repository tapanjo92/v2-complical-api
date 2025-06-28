import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, Code2, FileJson, Zap } from 'lucide-react'

export const Route = createLazyFileRoute('/docs')({
  component: DocsPage,
})

function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CompliCal</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link to="/pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
        <p className="text-xl text-muted-foreground mb-12">
          Everything you need to integrate CompliCal into your applications
        </p>

        {/* Quick Start */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Get up and running with CompliCal in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h3>1. Get your API Key</h3>
            <p>Sign up for a free account and create an API key from your dashboard.</p>
            
            <h3>2. Make your first request</h3>
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
              <code>{`curl -X GET "https://api.complical.com/v1/deadlines?country=AU&year=2025" \\
  -H "x-api-key: your-api-key"`}</code>
            </pre>

            <h3>3. Handle the response</h3>
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
              <code>{`{
  "deadlines": [
    {
      "id": "au-ato-bas-2025-q1",
      "title": "BAS Q1 2025",
      "dueDate": "2025-04-28",
      "agency": "Australian Taxation Office",
      "type": "BAS_QUARTERLY"
    }
  ],
  "meta": {
    "count": 1,
    "totalCount": 110
  }
}`}</code>
            </pre>
          </CardContent>
        </Card>

        {/* API Reference */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              API Reference
            </CardTitle>
            <CardDescription>
              Complete reference for all available endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <code className="bg-muted px-2 py-1 rounded">
                  https://api.complical.com
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  All requests must include your API key in the header:
                </p>
                <code className="bg-muted px-2 py-1 rounded">
                  x-api-key: your-api-key
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Available Endpoints</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <code className="bg-muted px-2 py-1 rounded">GET /v1/deadlines</code>
                    - Get deadlines across multiple countries
                  </li>
                  <li>
                    <code className="bg-muted px-2 py-1 rounded">GET /v1/au/deadlines</code>
                    - Get Australian deadlines
                  </li>
                  <li>
                    <code className="bg-muted px-2 py-1 rounded">GET /v1/nz/deadlines</code>
                    - Get New Zealand deadlines
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDKs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              SDKs & Libraries
            </CardTitle>
            <CardDescription>
              Official and community SDKs for popular languages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">JavaScript/TypeScript</h4>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  npm install @complical/sdk
                </code>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Python</h4>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  pip install complical
                </code>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Ruby</h4>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  gem install complical
                </code>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">PHP</h4>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  composer require complical/sdk
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}