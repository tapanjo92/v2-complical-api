import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, Shield, Zap, Globe2, Code2 } from 'lucide-react'
import { useAuthReady } from '@/hooks/use-auth-ready'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isAuthenticated, user } = useAuthReady()
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CompliCal</span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link to="/docs" className="text-sm font-medium hover:text-primary">
              Documentation
            </Link>
            <Link to="/pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
                <span className="text-sm text-gray-600">{user?.email}</span>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Government Compliance Deadlines API
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Never miss a compliance deadline again. Get real-time access to Australian and New Zealand 
            government filing dates through our simple REST API.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link to="/docs">
              <Button size="lg" variant="outline">View Documentation</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built for Developers, Trusted by Businesses
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  SHA-256 hashed API keys, httpOnly cookies, and CSRF protection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ OAuth 2.0 authentication</li>
                  <li>✓ Rate limiting & usage tracking</li>
                  <li>✓ AWS WAF protection</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  CloudFront edge caching with sub-100ms response times globally
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ 99.99% uptime SLA</li>
                  <li>✓ Auto-scaling infrastructure</li>
                  <li>✓ Real-time data updates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Globe2 className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Comprehensive Coverage</CardTitle>
                <CardDescription>
                  Complete federal and state compliance deadlines for AU & NZ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ 110+ Australian deadlines</li>
                  <li>✓ All states & territories</li>
                  <li>✓ Payroll, BAS, ASIC & more</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Simple Integration
          </h2>
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    Quick Start
                  </CardTitle>
                  <Badge variant="secondary">JavaScript</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
                  <code>{`// Get all Australian deadlines for 2025
const response = await fetch(
  'https://api.complical.com/v1/deadlines?country=AU&year=2025',
  {
    headers: {
      'x-api-key': 'your-api-key'
    }
  }
);

const data = await response.json();
console.log(data.deadlines);

// Output:
// [
//   {
//     "id": "au-ato-bas-2025-q1",
//     "title": "BAS Q1 2025",
//     "dueDate": "2025-04-28",
//     "agency": "Australian Taxation Office",
//     "type": "BAS_QUARTERLY"
//   },
//   ...
// ]`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to automate compliance tracking?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of businesses using CompliCal API
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span className="font-semibold">CompliCal</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 CompliCal. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant as keyof typeof variants] || variants.default}`}>
      {children}
    </span>
  )
}