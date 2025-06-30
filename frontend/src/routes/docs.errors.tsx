import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Shield,
  Clock,
  Zap
} from 'lucide-react'

export const Route = createFileRoute('/docs/errors')({
  component: ErrorHandling,
})

interface ErrorCode {
  code: number
  name: string
  description: string
  userMessage: string
  resolution: string
  retryable: boolean
  icon: React.ReactNode
  color: string
}

function ErrorHandling() {
  const errorCodes: ErrorCode[] = [
    {
      code: 400,
      name: 'Bad Request',
      description: 'The request was invalid or cannot be processed.',
      userMessage: 'Check your request parameters and try again.',
      resolution: 'Validate request parameters match the API documentation. Common issues include invalid date formats, unsupported country codes, or missing required fields.',
      retryable: false,
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'yellow'
    },
    {
      code: 401,
      name: 'Unauthorized',
      description: 'Authentication credentials are missing or invalid.',
      userMessage: 'Please check your API key.',
      resolution: 'Ensure your API key is included in the x-api-key header and is still active. Generate a new key from your dashboard if needed.',
      retryable: false,
      icon: <Shield className="h-5 w-5" />,
      color: 'red'
    },
    {
      code: 403,
      name: 'Forbidden',
      description: 'The API key doesn\'t have permission for this resource.',
      userMessage: 'Access denied for this resource.',
      resolution: 'Check your subscription plan limits. Some endpoints may require a higher tier plan.',
      retryable: false,
      icon: <XCircle className="h-5 w-5" />,
      color: 'red'
    },
    {
      code: 404,
      name: 'Not Found',
      description: 'The requested resource doesn\'t exist.',
      userMessage: 'Resource not found.',
      resolution: 'Verify the endpoint URL and resource identifiers. Check for typos in country codes or deadline IDs.',
      retryable: false,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'orange'
    },
    {
      code: 429,
      name: 'Too Many Requests',
      description: 'Rate limit exceeded for your API key.',
      userMessage: 'Please slow down your requests.',
      resolution: 'Implement exponential backoff and respect the Retry-After header. Consider upgrading your plan for higher limits.',
      retryable: true,
      icon: <Clock className="h-5 w-5" />,
      color: 'orange'
    },
    {
      code: 500,
      name: 'Internal Server Error',
      description: 'An unexpected error occurred on our servers.',
      userMessage: 'Something went wrong on our end.',
      resolution: 'These errors are usually temporary. Retry with exponential backoff. If the issue persists, contact support.',
      retryable: true,
      icon: <XCircle className="h-5 w-5" />,
      color: 'red'
    },
    {
      code: 502,
      name: 'Bad Gateway',
      description: 'Invalid response from an upstream server.',
      userMessage: 'Service temporarily unavailable.',
      resolution: 'This is usually a temporary issue. Wait a few seconds and retry your request.',
      retryable: true,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'orange'
    },
    {
      code: 503,
      name: 'Service Unavailable',
      description: 'The service is temporarily unavailable.',
      userMessage: 'Service under maintenance.',
      resolution: 'Check our status page for maintenance windows. Implement retry logic with exponential backoff.',
      retryable: true,
      icon: <Zap className="h-5 w-5" />,
      color: 'orange'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return colors[color as keyof typeof colors] || colors.yellow
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Error Handling
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          CompliCal API uses standard HTTP response codes to indicate the success or failure of requests. 
          This guide helps you handle errors gracefully in your application.
        </p>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Best Practice:</strong> Always implement proper error handling and retry logic with 
            exponential backoff for retryable errors.
          </AlertDescription>
        </Alert>
      </div>

      {/* Error Response Format */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Error Response Format</h2>
        
        <Card className="p-6">
          <p className="text-gray-600 mb-4">
            All error responses follow a consistent JSON structure:
          </p>
          
          <CodeBlock 
            language="json"
            code={`{
  "error": {
    "code": 400,
    "type": "invalid_request_error",
    "message": "Invalid date format provided",
    "detail": "The 'from_date' parameter must be in YYYY-MM-DD format",
    "request_id": "req_1234567890",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}`}
          />

          <div className="mt-6 space-y-3">
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">code</code>
              <span className="text-sm text-gray-600 ml-2">HTTP status code</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">type</code>
              <span className="text-sm text-gray-600 ml-2">Error category for programmatic handling</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">message</code>
              <span className="text-sm text-gray-600 ml-2">Human-readable error description</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">detail</code>
              <span className="text-sm text-gray-600 ml-2">Additional context and resolution hints</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">request_id</code>
              <span className="text-sm text-gray-600 ml-2">Unique identifier for support requests</span>
            </div>
          </div>
        </Card>
      </div>

      {/* HTTP Status Codes */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">HTTP Status Codes</h2>
        
        <div className="space-y-4">
          {errorCodes.map((error) => (
            <Card key={error.code} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getColorClasses(error.color)}`}>
                    {error.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {error.code} {error.name}
                      </h3>
                      {error.retryable && (
                        <Badge variant="outline" className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retryable
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{error.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">User Message: </span>
                        <span className="text-gray-600">{error.userMessage}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Resolution: </span>
                        <span className="text-gray-600">{error.resolution}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Error Types */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Error Types</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Client Errors (4xx)</h3>
            <div className="space-y-3 text-sm">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">invalid_request_error</code>
                <p className="text-gray-600 mt-1">Invalid parameters or request format</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">authentication_error</code>
                <p className="text-gray-600 mt-1">Invalid or missing API key</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">permission_error</code>
                <p className="text-gray-600 mt-1">Insufficient permissions</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">rate_limit_error</code>
                <p className="text-gray-600 mt-1">Too many requests</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Server Errors (5xx)</h3>
            <div className="space-y-3 text-sm">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">api_error</code>
                <p className="text-gray-600 mt-1">Temporary server issues</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">connection_error</code>
                <p className="text-gray-600 mt-1">Network connectivity issues</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">timeout_error</code>
                <p className="text-gray-600 mt-1">Request timeout</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Retry Strategy */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Retry Strategy</h2>
        
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Exponential Backoff Implementation</h3>
          
          <CodeBlock 
            language="javascript"
            code={`async function apiRequestWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(\`Client error: \${response.status}\`);
      }
      
      // Check for rate limit
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      lastError = new Error(\`Server error: \${response.status}\`);
      
    } catch (error) {
      lastError = error;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}`}
          />
        </Card>
      </div>

      {/* Rate Limit Headers */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Rate Limit Headers</h2>
        
        <Card className="p-6">
          <p className="text-gray-600 mb-4">
            Every API response includes headers to help you track your rate limit status:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">X-RateLimit-Limit</code>
                <p className="text-sm text-gray-600 mt-1">Maximum requests allowed in the current window</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">X-RateLimit-Remaining</code>
                <p className="text-sm text-gray-600 mt-1">Number of requests remaining in the current window</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">X-RateLimit-Reset</code>
                <p className="text-sm text-gray-600 mt-1">Unix timestamp when the rate limit window resets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">Retry-After</code>
                <p className="text-sm text-gray-600 mt-1">Seconds to wait before retrying (only on 429 responses)</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Common Issues */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Issues & Solutions</h2>
        
        <div className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <strong className="text-gray-900">Invalid Date Format:</strong>
              <p className="text-gray-700 mt-1">
                Always use ISO 8601 format (YYYY-MM-DD) for date parameters. 
                Example: <code className="bg-yellow-100 px-1">2025-01-15</code>
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong className="text-gray-900">Missing API Key:</strong>
              <p className="text-gray-700 mt-1">
                Include your API key in the <code className="bg-blue-100 px-1">x-api-key</code> header, 
                not in the URL or request body.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong className="text-gray-900">Handling Timeouts:</strong>
              <p className="text-gray-700 mt-1">
                Set client timeout to 30 seconds. Our API typically responds within 100ms, 
                but complex queries may take longer.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}