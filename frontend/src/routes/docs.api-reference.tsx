import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { 
  ChevronDown, 
  ChevronRight,
  Globe,
  Building,
  Hash,
  Clock,
  Search
} from 'lucide-react'

export const Route = createFileRoute('/docs/api-reference')({
  component: ApiReference,
})

interface EndpointSection {
  id: string
  title: string
  icon: React.ReactNode
  endpoints: {
    method: string
    path: string
    description: string
    rateLimit?: string
    authentication: boolean
  }[]
}

function ApiReference() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['global'])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const sections: EndpointSection[] = [
    {
      id: 'global',
      title: 'Global Endpoints',
      icon: <Globe className="h-5 w-5" />,
      endpoints: [
        {
          method: 'GET',
          path: '/v1/deadlines',
          description: 'Query deadlines across multiple countries with flexible filtering',
          rateLimit: '10 req/s',
          authentication: true
        },
        {
          method: 'GET',
          path: '/v1/deadlines/{country}/{year}/{month}',
          description: 'Get deadlines for a specific country and time period',
          rateLimit: '10 req/s',
          authentication: true
        }
      ]
    },
    {
      id: 'country',
      title: 'Country-Specific Endpoints',
      icon: <Building className="h-5 w-5" />,
      endpoints: [
        {
          method: 'GET',
          path: '/v1/{country}/deadlines',
          description: 'Get all deadlines for a specific country',
          authentication: true
        },
        {
          method: 'GET',
          path: '/v1/{country}/{agency}/deadlines',
          description: 'Get deadlines for a specific agency within a country',
          authentication: true
        }
      ]
    },
    {
      id: 'search',
      title: 'Search & Discovery',
      icon: <Search className="h-5 w-5" />,
      endpoints: [
        {
          method: 'GET',
          path: '/v1/search',
          description: 'Full-text search across all deadline data',
          authentication: true
        },
        {
          method: 'GET',
          path: '/v1/agencies',
          description: 'List all available agencies and their metadata',
          authentication: true
        },
        {
          method: 'GET',
          path: '/v1/deadline-types',
          description: 'Get all deadline types with descriptions',
          authentication: true
        }
      ]
    },
    {
      id: 'meta',
      title: 'Metadata & System',
      icon: <Hash className="h-5 w-5" />,
      endpoints: [
        {
          method: 'GET',
          path: '/health',
          description: 'Health check endpoint',
          authentication: false
        },
        {
          method: 'GET',
          path: '/v1/stats',
          description: 'Get API usage statistics and coverage data',
          authentication: true
        }
      ]
    }
  ]

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          API Reference
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Complete reference documentation for all CompliCal API endpoints. Each endpoint includes 
          request/response examples, parameter details, and error codes.
        </p>

        {/* Base URL */}
        <Card className="p-6 bg-gray-50">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-gray-500">BASE URL</span>
              <div className="mt-1">
                <code className="text-sm bg-gray-900 text-gray-100 px-3 py-1.5 rounded font-mono">
                  https://api.complical.com
                </code>
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-500">API VERSION</span>
              <div className="mt-1 flex items-center gap-2">
                <Badge>v1</Badge>
                <span className="text-sm text-gray-600">Stable</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Endpoints List */}
      <div className="space-y-6 mb-12">
        {sections.map((section) => (
          <Card key={section.id} className="overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {section.title}
                  </h2>
                  <Badge variant="outline" className="ml-2">
                    {section.endpoints.length} endpoints
                  </Badge>
                </div>
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            {expandedSections.includes(section.id) && (
              <div className="border-t bg-gray-50/50">
                {section.endpoints.map((endpoint, index) => (
                  <EndpointRow 
                    key={`${endpoint.method}-${endpoint.path}`}
                    endpoint={endpoint}
                    isLast={index === section.endpoints.length - 1}
                  />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Sample Response */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Response Format</h2>
        
        <Card className="p-6">
          <p className="text-gray-600 mb-4">
            All successful responses follow a consistent JSON structure:
          </p>
          
          <CodeBlock 
            language="json"
            code={`{
  "meta": {
    "code": 200,
    "message": "Success",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "count": 25,
    "total_count": 421,
    "page": 1,
    "total_pages": 17,
    "rate_limit": {
      "limit": 10000,
      "remaining": 9975,
      "reset": "2025-02-01T00:00:00Z"
    }
  },
  "data": {
    "deadlines": [
      {
        "id": "DEADLINE#BAS_QUARTERLY#2025-02-28",
        "country": "AU",
        "jurisdiction": "Federal",
        "agency": "ATO",
        "deadline_type": "BAS_QUARTERLY",
        "category": "Tax Returns",
        "title": "Quarterly BAS submission",
        "description": "Lodge and pay Q3 FY24-25 business activity statement",
        "due_date": "2025-02-28",
        "period_start": "2025-01-01",
        "period_end": "2025-01-31",
        "created_at": "2024-06-15T10:00:00Z",
        "updated_at": "2024-06-15T10:00:00Z"
      }
    ]
  }
}`}
          />
        </Card>
      </div>

      {/* Common Parameters */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Filtering</h3>
            <div className="space-y-3 text-sm">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">from_date</code>
                <p className="text-gray-600 mt-1">Start date (YYYY-MM-DD)</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">to_date</code>
                <p className="text-gray-600 mt-1">End date (YYYY-MM-DD)</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">type</code>
                <p className="text-gray-600 mt-1">Filter by deadline type</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">category</code>
                <p className="text-gray-600 mt-1">Filter by category</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Pagination</h3>
            <div className="space-y-3 text-sm">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">limit</code>
                <p className="text-gray-600 mt-1">Results per page (max: 100)</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">offset</code>
                <p className="text-gray-600 mt-1">Number of results to skip</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">page</code>
                <p className="text-gray-600 mt-1">Page number (alternative to offset)</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">sort</code>
                <p className="text-gray-600 mt-1">Sort by: due_date, created_at</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Rate Limiting */}
      <Card className="p-8 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Rate Limiting</h3>
            <p className="text-gray-700 mb-3">
              All API endpoints are rate limited to ensure fair usage and system stability.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Free Tier</span>
                <p className="text-gray-600">10 req/s, 10,000/month</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">Professional</span>
                <p className="text-gray-600">50 req/s, 100,000/month</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">Enterprise</span>
                <p className="text-gray-600">Custom limits available</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function EndpointRow({ 
  endpoint, 
  isLast 
}: { 
  endpoint: EndpointSection['endpoints'][0]
  isLast: boolean 
}) {
  const [expanded, setExpanded] = useState(false)

  const methodColors = {
    GET: 'bg-blue-100 text-blue-700 border-blue-300',
    POST: 'bg-green-100 text-green-700 border-green-300',
    PUT: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    DELETE: 'bg-red-100 text-red-700 border-red-300',
  }

  return (
    <div className={`${!isLast ? 'border-b' : ''}`}>
      <div 
        className="p-6 cursor-pointer hover:bg-gray-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge 
              variant="outline" 
              className={methodColors[endpoint.method as keyof typeof methodColors]}
            >
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono text-gray-900">{endpoint.path}</code>
            {endpoint.authentication && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Auth required
              </Badge>
            )}
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2 ml-16">{endpoint.description}</p>
      </div>

      {expanded && (
        <div className="px-6 pb-6 bg-white">
          <EndpointDetails endpoint={endpoint} />
        </div>
      )}
    </div>
  )
}

function EndpointDetails({ endpoint }: { endpoint: EndpointSection['endpoints'][0] }) {
  return (
    <div className="space-y-6 pt-4">
      {/* Request Example */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Request Example</h4>
        <Tabs defaultValue="curl" className="w-full">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          
          <TabsContent value="curl">
            <CodeBlock 
              language="bash"
              code={`curl -X ${endpoint.method} "${endpoint.path}" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Accept: application/json"`}
            />
          </TabsContent>
          
          <TabsContent value="javascript">
            <CodeBlock 
              language="javascript"
              code={`const response = await fetch('${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Accept': 'application/json'
  }
});

const data = await response.json();`}
            />
          </TabsContent>
          
          <TabsContent value="python">
            <CodeBlock 
              language="python"
              code={`import requests

response = requests.${endpoint.method.toLowerCase()}(
    '${endpoint.path}',
    headers={
        'x-api-key': 'YOUR_API_KEY',
        'Accept': 'application/json'
    }
)

data = response.json()`}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Response Codes */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Response Codes</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">200</Badge>
            <span className="text-gray-600">Success - Request completed successfully</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">400</Badge>
            <span className="text-gray-600">Bad Request - Invalid parameters</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">401</Badge>
            <span className="text-gray-600">Unauthorized - Invalid or missing API key</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">429</Badge>
            <span className="text-gray-600">Too Many Requests - Rate limit exceeded</span>
          </div>
        </div>
      </div>
    </div>
  )
}