import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { 
  Zap,
  Shield,
  Database,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Gauge
} from 'lucide-react'

export const Route = createFileRoute('/docs/best-practices')({
  component: BestPractices,
})

function BestPractices() {
  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Best Practices
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Optimize your CompliCal API integration for performance, reliability, and scalability. 
          These practices are based on patterns from successful enterprise implementations.
        </p>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Quick Win:</strong> Implementing these practices can reduce API calls by up to 80% 
            and improve response times by 10x through effective caching.
          </AlertDescription>
        </Alert>
      </div>

      {/* Performance Optimization */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Zap className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Optimization</h2>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Implement Smart Caching</h3>
            <p className="text-gray-600 mb-4">
              Deadline data doesn't change frequently. Cache responses to reduce API calls and improve performance.
            </p>
            
            <CodeBlock 
              language="javascript"
              code={`// Example: Redis caching with 24-hour TTL
const Redis = require('redis');
const redis = Redis.createClient();

async function getDeadlines(country, year) {
  const cacheKey = \`deadlines:\${country}:\${year}\`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from API
  const response = await fetch(\`/v1/deadlines?country=\${country}&year=\${year}\`, {
    headers: { 'x-api-key': API_KEY }
  });
  
  const data = await response.json();
  
  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify(data));
  
  return data;
}`}
            />

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Recommended Cache TTLs:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• Historical deadlines: 7 days</li>
                <li>• Current month deadlines: 24 hours</li>
                <li>• Future deadlines: 12 hours</li>
                <li>• Agency metadata: 30 days</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Batch Requests Efficiently</h3>
            <p className="text-gray-600 mb-4">
              Use the global endpoint to fetch data for multiple countries or time periods in a single request.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Badge variant="destructive" className="mb-2">Inefficient</Badge>
                <CodeBlock 
                  language="javascript"
                  code={`// 3 separate API calls
const au = await fetch('/v1/au/deadlines');
const nz = await fetch('/v1/nz/deadlines');
const sg = await fetch('/v1/sg/deadlines');`}
                />
              </div>
              
              <div>
                <Badge className="bg-green-100 text-green-800 mb-2">Efficient</Badge>
                <CodeBlock 
                  language="javascript"
                  code={`// 1 API call for all countries
const all = await fetch(
  '/v1/deadlines?countries=AU,NZ,SG'
);`}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Use Field Filtering</h3>
            <p className="text-gray-600 mb-4">
              Request only the fields you need to reduce payload size and improve response times.
            </p>
            
            <CodeBlock 
              language="bash"
              code={`# Request only essential fields
curl -X GET "https://api.complical.com/v1/deadlines?country=AU&fields=id,title,due_date,category" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </Card>
        </div>
      </div>

      {/* Rate Limit Management */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Gauge className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Rate Limit Management</h2>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Implement Intelligent Rate Limiting</h3>
          
          <CodeBlock 
            language="javascript"
            code={`class RateLimitManager {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAfter = null;
  }
  
  async request(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    // Wait if we hit rate limit
    if (this.retryAfter && this.retryAfter > Date.now()) {
      setTimeout(() => this.process(), this.retryAfter - Date.now());
      return;
    }
    
    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();
    
    try {
      const response = await fn();
      
      // Check rate limit headers
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
      const reset = parseInt(response.headers.get('X-RateLimit-Reset'));
      
      if (remaining === 0) {
        this.retryAfter = reset * 1000;
      }
      
      // Throttle if getting close to limit
      if (remaining < 10) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      resolve(response);
    } catch (error) {
      reject(error);
    } finally {
      this.processing = false;
      // Process next request
      setTimeout(() => this.process(), 100);
    }
  }
}

const rateLimiter = new RateLimitManager();

// Use it for all API calls
const response = await rateLimiter.request(() => 
  fetch('/v1/deadlines', { headers: { 'x-api-key': API_KEY } })
);`}
          />
        </Card>
      </div>

      {/* Error Handling */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Robust Error Handling</h2>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Implement Circuit Breaker Pattern</h3>
          <p className="text-gray-600 mb-4">
            Prevent cascading failures by implementing a circuit breaker that stops making requests when the API is down.
          </p>
          
          <CodeBlock 
            language="javascript"
            code={`class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log('Circuit breaker opened, will retry after', new Date(this.nextAttempt));
    }
  }
}

const breaker = new CircuitBreaker();

async function getDeadlinesWithBreaker(params) {
  return breaker.call(async () => {
    const response = await fetch('/v1/deadlines?' + new URLSearchParams(params));
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return response.json();
  });
}`}
          />
        </Card>
      </div>

      {/* Data Management */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Database className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Sync Strategy</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Sync upcoming 3 months of data daily</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Use webhooks for real-time updates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Store frequently accessed data locally</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Implement delta sync for efficiency</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Data Freshness</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Current month: Refresh every 6 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Next month: Refresh daily</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Future months: Refresh weekly</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Historical: Cache indefinitely</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Security Best Practices</h2>
        </div>

        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <strong className="text-gray-900">Never expose API keys in client-side code!</strong>
              <p className="text-gray-700 mt-1">
                Always make API calls from your backend server. Use environment variables to store keys securely.
              </p>
            </AlertDescription>
          </Alert>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">API Key Security Checklist</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-gray-300" disabled checked />
                <span className="text-sm text-gray-700">Store API keys in environment variables</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-gray-300" disabled checked />
                <span className="text-sm text-gray-700">Rotate keys every 90 days</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-gray-300" disabled checked />
                <span className="text-sm text-gray-700">Use different keys for dev/staging/prod</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-gray-300" disabled checked />
                <span className="text-sm text-gray-700">Implement IP allowlisting for production</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-gray-300" disabled checked />
                <span className="text-sm text-gray-700">Monitor key usage for anomalies</span>
              </label>
            </div>
          </Card>
        </div>
      </div>

      {/* Monitoring & Observability */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Monitoring & Observability</h2>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Key Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Response times (p50, p95, p99)</li>
                <li>• Cache hit rate</li>
                <li>• Data freshness</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Reliability</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Success rate</li>
                <li>• Error types and frequency</li>
                <li>• Circuit breaker state</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Usage</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• API calls per endpoint</li>
                <li>• Rate limit utilization</li>
                <li>• Cost per service</li>
              </ul>
            </div>
          </div>

          <CodeBlock 
            language="javascript"
            code={`// Example: Prometheus metrics
const promClient = require('prom-client');

const apiCallDuration = new promClient.Histogram({
  name: 'complical_api_duration_seconds',
  help: 'CompliCal API call duration',
  labelNames: ['endpoint', 'status']
});

const apiCallCounter = new promClient.Counter({
  name: 'complical_api_calls_total',
  help: 'Total CompliCal API calls',
  labelNames: ['endpoint', 'status']
});

// Wrap API calls with metrics
async function callApiWithMetrics(endpoint, params) {
  const timer = apiCallDuration.startTimer({ endpoint });
  
  try {
    const response = await fetch(endpoint, params);
    timer({ status: response.status });
    apiCallCounter.inc({ endpoint, status: response.status });
    return response;
  } catch (error) {
    timer({ status: 'error' });
    apiCallCounter.inc({ endpoint, status: 'error' });
    throw error;
  }
}`}
          />
        </Card>
      </div>
    </div>
  )
}