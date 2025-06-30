import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

export const Route = createFileRoute('/docs/api-global')({
  component: GlobalEndpoint,
})

function GlobalEndpoint() {
  return (
    <div className="prose prose-gray max-w-none">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-0">Global Deadlines Endpoint</h1>
        <Badge className="bg-green-100 text-green-800">Recommended</Badge>
      </div>
      
      <p className="text-lg text-gray-600 mb-8">
        The global endpoint allows you to query compliance deadlines across multiple countries in a single request. 
        This is the most flexible endpoint for retrieving deadline data.
      </p>

      {/* Endpoint Info */}
      <Card className="p-6 mb-8 bg-gray-50">
        <div className="space-y-4">
          <div>
            <span className="text-sm font-semibold text-gray-500">METHOD</span>
            <div className="mt-1">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">GET</Badge>
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-500">ENDPOINT</span>
            <div className="mt-1">
              <code className="text-sm bg-gray-900 text-gray-100 px-3 py-1 rounded">
                /v1/deadlines
              </code>
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-500">RATE LIMIT</span>
            <div className="mt-1 text-sm">10 requests/second, 10,000 requests/month</div>
          </div>
        </div>
      </Card>

      {/* Parameters */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Query Parameters</h2>
      
      <div className="space-y-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">country</code>
              <Badge variant="outline" className="ml-2 text-xs">string</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter by country code. Accepts: AU (Australia), NZ (New Zealand)
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: country=AU</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">countries</code>
              <Badge variant="outline" className="ml-2 text-xs">string</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter by multiple countries (comma-separated). Overrides 'country' parameter.
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: countries=AU,NZ</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">year</code>
              <Badge variant="outline" className="ml-2 text-xs">integer</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter by year (YYYY format). Returns all deadlines for the specified year.
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: year=2025</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">month</code>
              <Badge variant="outline" className="ml-2 text-xs">integer</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter by month (1-12). Must be used with 'year' parameter.
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: month=3</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">from_date</code>
              <Badge variant="outline" className="ml-2 text-xs">string</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter deadlines from this date (inclusive). Format: YYYY-MM-DD
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: from_date=2025-01-01</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">to_date</code>
              <Badge variant="outline" className="ml-2 text-xs">string</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter deadlines until this date (inclusive). Format: YYYY-MM-DD
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: to_date=2025-12-31</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">type</code>
              <Badge variant="outline" className="ml-2 text-xs">string</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter by specific deadline type. See the full list of types below.
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: type=BAS_QUARTERLY</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">category</code>
              <Badge variant="outline" className="ml-2 text-xs">string</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Filter by category. Options: Tax Returns, Employer Obligations, Excise & Levies, 
            Business Registrations, State Taxes, Industry Specific, Superannuation, Financial Reporting
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: category=Tax Returns</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">limit</code>
              <Badge variant="outline" className="ml-2 text-xs">integer</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Number of results per page (1-100). Default: 10
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: limit=25</code>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <code className="text-sm font-semibold">offset</code>
              <Badge variant="outline" className="ml-2 text-xs">integer</Badge>
            </div>
            <Badge variant="outline" className="text-xs">optional</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Number of results to skip. Used for pagination. Default: 0
          </p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">Example: offset=50</code>
        </div>
      </div>

      {/* Examples */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Examples</h2>
      
      <Tabs defaultValue="example1" className="mb-8">
        <TabsList>
          <TabsTrigger value="example1">Basic Query</TabsTrigger>
          <TabsTrigger value="example2">Date Range</TabsTrigger>
          <TabsTrigger value="example3">Multi-Country</TabsTrigger>
          <TabsTrigger value="example4">With Pagination</TabsTrigger>
        </TabsList>
        
        <TabsContent value="example1">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Get Australian deadlines for March 2025:</p>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU&year=2025&month=3" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="example2">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Get all deadlines for Q1 2025:</p>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?from_date=2025-01-01&to_date=2025-03-31" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="example3">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Get deadlines for both Australia and New Zealand:</p>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?countries=AU,NZ&category=Tax Returns" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="example4">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Get page 3 of results (25 per page):</p>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU&limit=25&offset=50" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Response */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Response Format</h2>
      
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
    "cache_key": "deadlines_AU_2025_3",
    "cached": false
  },
  "deadlines": [
    {
      "id": "DEADLINE#BAS_QUARTERLY#2025-04-28",
      "country": "AU",
      "jurisdiction": "Federal", 
      "agency": "ATO",
      "deadline_type": "BAS_QUARTERLY",
      "category": "Tax Returns",
      "title": "Quarterly BAS submission",
      "description": "Lodge and pay March 2025 quarter business activity statement",
      "due_date": "2025-04-28",
      "period_start": "2025-01-01",
      "period_end": "2025-03-31",
      "lodgment_method": "Online",
      "payment_required": true,
      "who_must_file": "Businesses registered for GST with quarterly reporting",
      "consequences": "Penalties and interest charges may apply for late lodgment",
      "source_url": "https://www.ato.gov.au/Business/Business-activity-statements-(BAS)/",
      "created_at": "2024-06-15T10:00:00Z",
      "updated_at": "2024-06-15T10:00:00Z"
    },
    {
      "id": "DEADLINE#PAYG_WITHHOLDING#2025-04-21", 
      "country": "AU",
      "jurisdiction": "Federal",
      "agency": "ATO", 
      "deadline_type": "PAYG_WITHHOLDING_MONTHLY",
      "category": "Employer Obligations",
      "title": "PAYG withholding monthly payment",
      "description": "Pay March 2025 PAYG withholding amounts to ATO",
      "due_date": "2025-04-21",
      "period_start": "2025-03-01",
      "period_end": "2025-03-31",
      "lodgment_method": "Online",
      "payment_required": true,
      "who_must_file": "Medium and large employers withholding tax from payments",
      "consequences": "General interest charge applies to late payments",
      "source_url": "https://www.ato.gov.au/Business/PAYG-withholding/",
      "created_at": "2024-06-15T10:00:00Z",
      "updated_at": "2024-06-15T10:00:00Z"
    }
  ]
}`}
      />

      {/* Response Fields */}
      <h3 className="text-xl font-semibold mt-6 mb-4">Response Fields</h3>
      
      <div className="space-y-4">
        <div>
          <code className="text-sm font-semibold">meta</code>
          <p className="text-sm text-gray-600 mt-1">Metadata about the request and pagination</p>
          <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-2">
            <li><code>count</code> - Number of results in this response</li>
            <li><code>total_count</code> - Total number of matching deadlines</li>
            <li><code>page</code> - Current page number (calculated from offset)</li>
            <li><code>total_pages</code> - Total number of pages available</li>
          </ul>
        </div>
        
        <div>
          <code className="text-sm font-semibold">deadlines</code>
          <p className="text-sm text-gray-600 mt-1">Array of deadline objects</p>
          <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-2">
            <li><code>id</code> - Unique identifier for the deadline</li>
            <li><code>country</code> - Country code (AU or NZ)</li>
            <li><code>jurisdiction</code> - Federal, State, or Territory</li>
            <li><code>agency</code> - Government agency responsible</li>
            <li><code>deadline_type</code> - Specific type identifier</li>
            <li><code>category</code> - High-level category grouping</li>
            <li><code>due_date</code> - The deadline date (YYYY-MM-DD)</li>
            <li><code>payment_required</code> - Whether payment is due</li>
          </ul>
        </div>
      </div>

      {/* Deadline Types */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Available Deadline Types</h2>
      
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Use the <code>type</code> parameter to filter for specific deadline types. 
          Types are case-sensitive and must match exactly.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="au" className="mb-8">
        <TabsList>
          <TabsTrigger value="au">Australia (120+ types)</TabsTrigger>
          <TabsTrigger value="nz">New Zealand (40+ types)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="au">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Federal Tax</h4>
              <ul className="space-y-1 text-sm">
                <li><code>BAS_MONTHLY</code> - Monthly BAS</li>
                <li><code>BAS_QUARTERLY</code> - Quarterly BAS</li>
                <li><code>PAYG_WITHHOLDING_MONTHLY</code> - PAYG withholding</li>
                <li><code>PAYG_INSTALMENTS</code> - PAYG instalments</li>
                <li><code>INCOME_TAX_INDIVIDUAL</code> - Individual tax return</li>
                <li><code>INCOME_TAX_COMPANY</code> - Company tax return</li>
                <li><code>FBT_RETURN</code> - Fringe benefits tax</li>
                <li><code>SUPER_GUARANTEE</code> - Super guarantee charge</li>
              </ul>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-semibold mb-3">State Taxes</h4>
              <ul className="space-y-1 text-sm">
                <li><code>PAYROLL_TAX_NSW</code> - NSW payroll tax</li>
                <li><code>PAYROLL_TAX_VIC</code> - VIC payroll tax</li>
                <li><code>PAYROLL_TAX_QLD</code> - QLD payroll tax</li>
                <li><code>LAND_TAX_*</code> - State land taxes</li>
                <li><code>STAMP_DUTY_*</code> - Stamp duties</li>
                <li><code>WORKERS_COMP_*</code> - Workers compensation</li>
              </ul>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Excise & Levies</h4>
              <ul className="space-y-1 text-sm">
                <li><code>FUEL_EXCISE</code> - Fuel excise</li>
                <li><code>TOBACCO_EXCISE</code> - Tobacco excise</li>
                <li><code>ALCOHOL_EXCISE</code> - Alcohol excise</li>
                <li><code>LUXURY_CAR_TAX</code> - Luxury car tax</li>
                <li><code>WINE_EQUALISATION_TAX</code> - WET</li>
                <li><code>PETROLEUM_RESOURCE_RENT</code> - PRRT</li>
              </ul>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Business Compliance</h4>
              <ul className="space-y-1 text-sm">
                <li><code>ASIC_ANNUAL_REVIEW</code> - Company annual review</li>
                <li><code>ASIC_ANNUAL_STATEMENT</code> - Annual statement</li>
                <li><code>WGEA_REPORT</code> - Gender equality report</li>
                <li><code>MODERN_AWARD_UPDATES</code> - Award updates</li>
                <li><code>VEHICLE_REGISTRATION_*</code> - Vehicle rego</li>
              </ul>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="nz">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Tax Returns</h4>
              <ul className="space-y-1 text-sm">
                <li><code>GST_RETURN_MONTHLY</code> - Monthly GST</li>
                <li><code>GST_RETURN_2MONTHLY</code> - 2-monthly GST</li>
                <li><code>GST_RETURN_6MONTHLY</code> - 6-monthly GST</li>
                <li><code>INCOME_TAX_RETURN</code> - IR3 income tax</li>
                <li><code>COMPANY_TAX_RETURN</code> - IR4 company tax</li>
                <li><code>PROVISIONAL_TAX_STANDARD</code> - Provisional tax</li>
              </ul>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Employer Obligations</h4>
              <ul className="space-y-1 text-sm">
                <li><code>PAYE_MONTHLY</code> - Monthly PAYE</li>
                <li><code>PAYE_TWICE_MONTHLY</code> - Twice-monthly PAYE</li>
                <li><code>EMPLOYMENT_INFORMATION</code> - Payday filing</li>
                <li><code>KIWISAVER_CONTRIBUTIONS</code> - KiwiSaver</li>
                <li><code>FBT_QUARTERLY</code> - Fringe benefit tax</li>
                <li><code>EMPLOYER_SUPERANNUATION</code> - ESCT</li>
              </ul>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Handling */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Responses</h2>
      
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">400 Bad Request</span>
            <Badge variant="outline" className="text-red-600">Client Error</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">Invalid parameters or malformed request</p>
          <CodeBlock 
            language="json"
            code={`{
  "error": "Invalid parameter",
  "message": "Month parameter requires year to be specified"
}`}
          />
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">401 Unauthorized</span>
            <Badge variant="outline" className="text-red-600">Auth Error</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">Missing or invalid API key</p>
          <CodeBlock 
            language="json"
            code={`{
  "error": "Unauthorized",
  "message": "Missing or invalid API key"
}`}
          />
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">429 Too Many Requests</span>
            <Badge variant="outline" className="text-red-600">Rate Limit</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">Rate limit exceeded</p>
          <CodeBlock 
            language="json"
            code={`{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please retry after 60 seconds"
}`}
          />
        </Card>
      </div>

      {/* Best Practices */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Best Practices</h2>
      
      <div className="space-y-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Use Efficient Queries</h3>
          <p className="text-sm text-gray-600">
            Filter by date ranges or specific types to reduce response size. For recurring queries, 
            consider using the <code>category</code> parameter to get broader results.
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Implement Pagination</h3>
          <p className="text-sm text-gray-600">
            For large result sets, use <code>limit</code> and <code>offset</code> to paginate through results. 
            The maximum limit is 100 items per request.
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Cache Responses</h3>
          <p className="text-sm text-gray-600">
            Deadline data doesn't change frequently. Implement client-side caching with a TTL of at least 
            1 hour to reduce API calls and improve performance.
          </p>
        </Card>
      </div>
    </div>
  )
}