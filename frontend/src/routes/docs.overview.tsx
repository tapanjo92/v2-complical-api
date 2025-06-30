import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Code2, 
  Gauge, 
  Globe2, 
  Lock, 
  Zap,
  ArrowRight,
  BookOpen,
  Sparkles
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/overview')({
  component: Overview,
})

function Overview() {
  return (
    <div className="max-w-6xl">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">v1.0</Badge>
          <Badge variant="outline" className="border-green-600 text-green-700">Stable</Badge>
          <Badge variant="outline">REST API</Badge>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          CompliCal API Overview
        </h1>
        
        <p className="text-xl text-gray-600 mb-6 leading-relaxed">
          CompliCal provides real-time access to compliance deadlines for Australian and New Zealand businesses. 
          Our REST API delivers comprehensive tax, regulatory, and filing deadline data with enterprise-grade reliability.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link to="/docs/quickstart">
            <Button size="lg">
              <Zap className="mr-2 h-5 w-5" />
              Start Building
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/docs/api-reference">
            <Button size="lg" variant="outline">
              <BookOpen className="mr-2 h-5 w-5" />
              API Reference
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Multi-Country Support</h3>
              <p className="text-sm text-gray-600">
                Query deadlines for Australia and New Zealand in a single API call with unified response format.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Gauge className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">High Performance</h3>
              <p className="text-sm text-gray-600">
                Sub-100ms response times with 99.9% uptime SLA. Cached via CloudFront for global edge delivery.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Enterprise Security</h3>
              <p className="text-sm text-gray-600">
                SHA-256 hashed API keys, TLS 1.3 encryption, and comprehensive audit logging for compliance.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Code2 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Developer Experience</h3>
              <p className="text-sm text-gray-600">
                RESTful design, predictable responses, comprehensive SDKs, and interactive documentation.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Always Current</h3>
              <p className="text-sm text-gray-600">
                Automated monitoring of government sources ensures deadline data is always up-to-date.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Compliance Ready</h3>
              <p className="text-sm text-gray-600">
                Full audit trails, data provenance tracking, and SOC 2 Type II compliant infrastructure.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* API Design Principles */}
      <Card className="p-8 mb-12 bg-gradient-to-br from-gray-50 to-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">API Design Principles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">RESTful Architecture</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Resource-based URLs with logical hierarchy</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Standard HTTP methods and status codes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Stateless requests with complete context</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Consistent Responses</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Predictable JSON structure across all endpoints</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Comprehensive error messages with resolution hints</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>ISO 8601 date formats and UTC timestamps</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Coverage Statistics */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Coverage Statistics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">469</div>
            <div className="text-sm text-gray-600">Total Deadlines</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">2</div>
            <div className="text-sm text-gray-600">Countries</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">37</div>
            <div className="text-sm text-gray-600">Agencies</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">120+</div>
            <div className="text-sm text-gray-600">Deadline Types</div>
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Resources</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/docs/authentication">
            <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-500 cursor-pointer">
              <h3 className="font-semibold text-gray-900 mb-2">Authentication Guide</h3>
              <p className="text-sm text-gray-600 mb-3">
                Learn how to authenticate requests and manage API keys securely.
              </p>
              <span className="text-sm text-blue-600 font-medium">
                Read guide →
              </span>
            </Card>
          </Link>

          <Link to="/docs/errors">
            <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-500 cursor-pointer">
              <h3 className="font-semibold text-gray-900 mb-2">Error Handling</h3>
              <p className="text-sm text-gray-600 mb-3">
                Understand error codes and implement proper retry logic.
              </p>
              <span className="text-sm text-blue-600 font-medium">
                View errors →
              </span>
            </Card>
          </Link>

          <Link to="/docs/webhooks">
            <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-500 cursor-pointer">
              <h3 className="font-semibold text-gray-900 mb-2">Webhooks</h3>
              <p className="text-sm text-gray-600 mb-3">
                Set up real-time notifications for deadline changes and updates.
              </p>
              <span className="text-sm text-blue-600 font-medium">
                Configure webhooks →
              </span>
            </Card>
          </Link>

          <Link to="/docs/best-practices">
            <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-500 cursor-pointer">
              <h3 className="font-semibold text-gray-900 mb-2">Best Practices</h3>
              <p className="text-sm text-gray-600 mb-3">
                Optimize your integration with caching, pagination, and more.
              </p>
              <span className="text-sm text-blue-600 font-medium">
                Learn more →
              </span>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}