import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/docs/quickstart')({
  component: QuickStart,
})

function QuickStart() {

  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Quick Start Guide</h1>
      <p className="text-lg text-gray-600 mb-8">
        Get up and running with the CompliCal API in under 5 minutes. This guide will walk you through 
        authentication, making your first API call, and understanding the response format.
      </p>

      {/* Steps */}
      <div className="space-y-8 mb-12">
        {/* Step 1 */}
        <div>
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Get your API key</h2>
              <p className="text-gray-600 mb-4">
                First, you'll need to create an account and generate an API key from your dashboard.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
                <li>Sign up for a CompliCal account</li>
                <li>Navigate to the API Keys section in your dashboard</li>
                <li>Click "Create New Key" and give it a descriptive name</li>
                <li>Copy your API key immediately (it won't be shown again)</li>
              </ol>
              <Card className="p-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Keep your API key secure and never expose it in client-side code 
                  or public repositories.
                </p>
              </Card>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Make your first request</h2>
              <p className="text-gray-600 mb-4">
                Let's fetch some Australian tax deadlines. You can use curl, Postman, or any HTTP client.
              </p>
              
              <Tabs defaultValue="curl" className="mb-4">
                <TabsList>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="node">Node.js</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="php">PHP</TabsTrigger>
                </TabsList>
                
                <TabsContent value="curl">
                  <CodeBlock 
                    language="bash"
                    code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU&year=2025" \\
  -H "x-api-key: YOUR_API_KEY"`}
                  />
                </TabsContent>
                
                <TabsContent value="node">
                  <CodeBlock 
                    language="javascript"
                    code={`const axios = require('axios');

const response = await axios.get('https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines', {
  params: {
    country: 'AU',
    year: 2025
  },
  headers: {
    'x-api-key': 'YOUR_API_KEY'
  }
});

console.log(response.data);`}
                  />
                </TabsContent>
                
                <TabsContent value="python">
                  <CodeBlock 
                    language="python"
                    code={`import requests

response = requests.get(
    'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines',
    params={'country': 'AU', 'year': 2025},
    headers={'x-api-key': 'YOUR_API_KEY'}
)

print(response.json())`}
                  />
                </TabsContent>
                
                <TabsContent value="php">
                  <CodeBlock 
                    language="php"
                    code={`<?php
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU&year=2025');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: YOUR_API_KEY'
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);`}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Understand the response</h2>
              <p className="text-gray-600 mb-4">
                The API returns a JSON response with metadata and an array of deadline objects.
              </p>
              
              <CodeBlock 
                language="json"
                code={`{
  "meta": {
    "code": 200,
    "message": "Success",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "count": 3,
    "total_count": 421,
    "page": 1,
    "total_pages": 141
  },
  "deadlines": [
    {
      "id": "DEADLINE#BAS_MONTHLY#2025-01-21",
      "country": "AU",
      "jurisdiction": "Federal",
      "agency": "ATO",
      "deadline_type": "BAS_MONTHLY",
      "category": "Tax Returns",
      "title": "Monthly BAS submission",
      "description": "Lodge and pay December 2024 monthly business activity statement",
      "due_date": "2025-01-21",
      "period_start": "2024-12-01",
      "period_end": "2024-12-31",
      "lodgment_method": "Online",
      "who_must_file": "Businesses registered for GST with monthly reporting",
      "consequences": "Penalties and interest charges may apply for late lodgment",
      "source_url": "https://www.ato.gov.au/Business/Business-activity-statements-(BAS)/",
      "created_at": "2024-06-15T10:00:00Z",
      "updated_at": "2024-06-15T10:00:00Z"
    }
  ]
}`}
              />

              <h3 className="text-lg font-semibold mt-6 mb-3">Response Fields</h3>
              <div className="space-y-3">
                <div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">meta</code>
                  <p className="text-gray-600 mt-1">Contains pagination info and request metadata</p>
                </div>
                <div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">deadlines</code>
                  <p className="text-gray-600 mt-1">Array of deadline objects matching your query</p>
                </div>
                <div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">due_date</code>
                  <p className="text-gray-600 mt-1">The actual deadline date in YYYY-MM-DD format</p>
                </div>
                <div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">category</code>
                  <p className="text-gray-600 mt-1">High-level grouping (e.g., "Tax Returns", "Employer Obligations")</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Common Use Cases */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Use Cases</h2>
        
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Get upcoming deadlines for next month</h3>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU&from_date=2025-02-01&to_date=2025-02-28" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Filter by specific deadline type</h3>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU&type=BAS_QUARTERLY" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Get deadlines for multiple countries</h3>
            <CodeBlock 
              language="bash"
              code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?countries=AU,NZ&year=2025&month=3" \\
  -H "x-api-key: YOUR_API_KEY"`}
            />
          </Card>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Next Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/docs/api-global" className="block p-4 bg-white rounded-lg border hover:border-blue-500 transition-colors">
            <h3 className="font-semibold mb-2">Explore the API Reference</h3>
            <p className="text-sm text-gray-600">Deep dive into all available endpoints and parameters</p>
          </a>
          <a href="/docs/authentication" className="block p-4 bg-white rounded-lg border hover:border-blue-500 transition-colors">
            <h3 className="font-semibold mb-2">Authentication Guide</h3>
            <p className="text-sm text-gray-600">Learn about API key management and security best practices</p>
          </a>
          <a href="/docs/errors" className="block p-4 bg-white rounded-lg border hover:border-blue-500 transition-colors">
            <h3 className="font-semibold mb-2">Error Handling</h3>
            <p className="text-sm text-gray-600">Understand error codes and how to handle them gracefully</p>
          </a>
          <a href="/docs/sdks" className="block p-4 bg-white rounded-lg border hover:border-blue-500 transition-colors">
            <h3 className="font-semibold mb-2">Download SDKs</h3>
            <p className="text-sm text-gray-600">Get official client libraries for your programming language</p>
          </a>
        </div>
      </div>
    </div>
  )
}