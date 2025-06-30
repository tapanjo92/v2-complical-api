import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Key, AlertCircle, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/docs/authentication')({
  component: AuthenticationGuide,
})

function AuthenticationGuide() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Authentication</h1>
      <p className="text-lg text-gray-600 mb-8">
        The CompliCal API uses API keys to authenticate requests. API keys are tied to your account 
        and can be managed through your dashboard. All API requests must include a valid API key.
      </p>

      {/* Security Alert */}
      <Alert className="mb-8 border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Security Notice:</strong> Never expose your API keys in client-side code, public repositories, 
          or any place where unauthorized users might access them. Treat them like passwords.
        </AlertDescription>
      </Alert>

      {/* How it Works */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How Authentication Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h3 className="text-lg font-semibold">Create API Key</h3>
            </div>
            <p className="text-sm text-gray-600">
              Generate API keys from your dashboard. Each key can be named for easy identification.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">2</span>
              </div>
              <h3 className="text-lg font-semibold">Include in Requests</h3>
            </div>
            <p className="text-sm text-gray-600">
              Add your API key to the <code>x-api-key</code> header in all API requests.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <h3 className="text-lg font-semibold">Secure & Monitor</h3>
            </div>
            <p className="text-sm text-gray-600">
              Keys are hashed using SHA-256. Monitor usage and rotate keys regularly.
            </p>
          </Card>
        </div>
      </div>

      {/* Making Authenticated Requests */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Making Authenticated Requests</h2>
      
      <p className="text-gray-600 mb-6">
        Include your API key in the <code>x-api-key</code> header for all requests:
      </p>

      <Tabs defaultValue="curl" className="mb-8">
        <TabsList>
          <TabsTrigger value="curl">cURL</TabsTrigger>
          <TabsTrigger value="node">Node.js</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
          <TabsTrigger value="go">Go</TabsTrigger>
          <TabsTrigger value="ruby">Ruby</TabsTrigger>
        </TabsList>
        
        <TabsContent value="curl">
          <CodeBlock 
            language="bash"
            code={`curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU" \\
  -H "x-api-key: YOUR_API_KEY"`}
          />
        </TabsContent>
        
        <TabsContent value="node">
          <CodeBlock 
            language="javascript"
            code={`const axios = require('axios');

// Store your API key securely (e.g., environment variables)
const API_KEY = process.env.COMPLICAL_API_KEY;

const client = axios.create({
  baseURL: 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test',
  headers: {
    'x-api-key': API_KEY
  }
});

// Make authenticated requests
const response = await client.get('/v1/deadlines', {
  params: { country: 'AU' }
});`}
          />
        </TabsContent>
        
        <TabsContent value="python">
          <CodeBlock 
            language="python"
            code={`import requests
import os

# Store your API key securely
API_KEY = os.environ.get('COMPLICAL_API_KEY')
BASE_URL = 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test'

# Create a session with authentication
session = requests.Session()
session.headers.update({'x-api-key': API_KEY})

# Make authenticated requests
response = session.get(f'{BASE_URL}/v1/deadlines', params={'country': 'AU'})
data = response.json()`}
          />
        </TabsContent>
        
        <TabsContent value="go">
          <CodeBlock 
            language="go"
            code={`package main

import (
    "net/http"
    "os"
)

func main() {
    apiKey := os.Getenv("COMPLICAL_API_KEY")
    
    client := &http.Client{}
    req, _ := http.NewRequest("GET", 
        "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU", 
        nil)
    
    req.Header.Add("x-api-key", apiKey)
    
    resp, err := client.Do(req)
    // Handle response...
}`}
          />
        </TabsContent>
        
        <TabsContent value="ruby">
          <CodeBlock 
            language="ruby"
            code={`require 'net/http'
require 'uri'
require 'json'

api_key = ENV['COMPLICAL_API_KEY']
uri = URI('https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU')

http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Get.new(uri)
request['x-api-key'] = api_key

response = http.request(request)
data = JSON.parse(response.body)`}
          />
        </TabsContent>
      </Tabs>

      {/* API Key Management */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">API Key Management</h2>
      
      <div className="space-y-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Creating API Keys</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Log in to your CompliCal dashboard</li>
            <li>Navigate to the "API Keys" section</li>
            <li>Click "Create New Key"</li>
            <li>Give your key a descriptive name (e.g., "Production Server", "Development")</li>
            <li>Copy the key immediately - it won't be shown again</li>
          </ol>
          
          <Alert className="mt-4">
            <Key className="h-4 w-4" />
            <AlertDescription>
              You can create up to 5 active API keys per account. Each key has independent usage tracking.
            </AlertDescription>
          </Alert>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Key Format</h3>
          <p className="text-sm text-gray-600 mb-3">
            API keys follow a specific format for easy identification:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            <span className="text-blue-400">ck_live_</span>
            <span className="text-green-400">a1b2c3d4e5f6</span>
            <span className="text-gray-500">...</span>
            <span className="text-orange-400">xyz789</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li><code className="text-blue-600">ck_live_</code> - Prefix indicating a live API key</li>
            <li><code className="text-green-600">a1b2c3d4...</code> - First 12 characters (shown in dashboard)</li>
            <li><code className="text-orange-600">...xyz789</code> - Last 6 characters (shown in dashboard)</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Key Rotation</h3>
          <p className="text-sm text-gray-600 mb-3">
            We recommend rotating your API keys regularly for security:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Create a new API key from your dashboard</li>
            <li>Update your application to use the new key</li>
            <li>Monitor the old key's usage to ensure migration is complete</li>
            <li>Revoke the old key once it's no longer in use</li>
          </ol>
        </Card>
      </div>

      {/* Security Best Practices */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Best Practices</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <Shield className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold mb-3">Do's</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Store API keys in environment variables</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Use different keys for different environments</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Rotate keys regularly (every 90 days)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Monitor key usage for anomalies</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Revoke compromised keys immediately</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <AlertCircle className="h-8 w-8 text-red-600 mb-3" />
          <h3 className="text-lg font-semibold mb-3">Don'ts</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>Never commit keys to version control</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>Don't embed keys in client-side code</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>Avoid sharing keys between team members</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>Don't use production keys in development</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>Never send keys via email or chat</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Environment Variables */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Using Environment Variables</h2>
      
      <p className="text-gray-600 mb-6">
        The recommended way to store API keys is using environment variables. Here's how to set them up:
      </p>

      <Tabs defaultValue="bash" className="mb-8">
        <TabsList>
          <TabsTrigger value="bash">Linux/Mac</TabsTrigger>
          <TabsTrigger value="windows">Windows</TabsTrigger>
          <TabsTrigger value="docker">Docker</TabsTrigger>
          <TabsTrigger value="dotenv">.env File</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bash">
          <CodeBlock 
            language="bash"
            code={`# Set environment variable
export COMPLICAL_API_KEY="ck_live_your_api_key_here"

# Verify it's set
echo $COMPLICAL_API_KEY

# Make it permanent by adding to ~/.bashrc or ~/.zshrc
echo 'export COMPLICAL_API_KEY="ck_live_your_api_key_here"' >> ~/.bashrc`}
          />
        </TabsContent>
        
        <TabsContent value="windows">
          <CodeBlock 
            language="batch"
            code={`# Command Prompt
set COMPLICAL_API_KEY=ck_live_your_api_key_here

# PowerShell
$env:COMPLICAL_API_KEY = "ck_live_your_api_key_here"

# Set permanently via System Properties
# Control Panel > System > Advanced System Settings > Environment Variables`}
          />
        </TabsContent>
        
        <TabsContent value="docker">
          <CodeBlock 
            language="dockerfile"
            code={`# In Dockerfile
ENV COMPLICAL_API_KEY=ck_live_your_api_key_here

# Or pass at runtime
docker run -e COMPLICAL_API_KEY=ck_live_your_api_key_here myapp

# In docker-compose.yml
services:
  app:
    environment:
      - COMPLICAL_API_KEY=ck_live_your_api_key_here`}
          />
        </TabsContent>
        
        <TabsContent value="dotenv">
          <CodeBlock 
            language="bash"
            code={`# Create .env file in your project root
COMPLICAL_API_KEY=ck_live_your_api_key_here

# Add to .gitignore
echo ".env" >> .gitignore

# Load in Node.js using dotenv
require('dotenv').config()
const apiKey = process.env.COMPLICAL_API_KEY`}
          />
        </TabsContent>
      </Tabs>

      {/* Error Responses */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Errors</h2>
      
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Missing API Key</span>
            <Badge variant="outline" className="text-red-600">401 Unauthorized</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Returned when no API key is provided in the request.
          </p>
          <CodeBlock 
            language="json"
            code={`{
  "error": "Unauthorized",
  "message": "Missing API key. Include your API key in the x-api-key header."
}`}
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Invalid API Key</span>
            <Badge variant="outline" className="text-red-600">403 Forbidden</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Returned when the provided API key is invalid or has been revoked.
          </p>
          <CodeBlock 
            language="json"
            code={`{
  "error": "Forbidden",
  "message": "Invalid API key. Check your key or generate a new one from the dashboard."
}`}
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Expired API Key</span>
            <Badge variant="outline" className="text-red-600">403 Forbidden</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Returned when the API key has expired (after 90 days).
          </p>
          <CodeBlock 
            language="json"
            code={`{
  "error": "Forbidden", 
  "message": "API key has expired. Please generate a new key from your dashboard."
}`}
          />
        </Card>
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 rounded-lg p-8 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to authenticate?</h2>
        <p className="text-gray-600 mb-6">
          Get your API key and start making authenticated requests.
        </p>
        <div className="flex gap-4">
          <a href="/dashboard/api-keys" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Get API Key
            <Key className="ml-2 h-4 w-4" />
          </a>
          <a href="/docs/quickstart" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400">
            View Quick Start
          </a>
        </div>
      </div>
    </div>
  )
}