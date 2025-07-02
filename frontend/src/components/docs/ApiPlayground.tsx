import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from './CodeBlock'
import { Play, Loader2 } from 'lucide-react'
// import { useAuth } from '@/stores/auth' // Not needed for API playground

interface ApiPlaygroundProps {
  endpoint: string
  method?: 'GET' | 'POST' | 'DELETE'
  parameters?: Array<{
    name: string
    type: string
    required?: boolean
    description: string
    default?: string
    options?: string[]
  }>
  requestBody?: object
}

export function ApiPlayground({ 
  endpoint, 
  method = 'GET', 
  parameters = [],
  requestBody
}: ApiPlaygroundProps) {
  // const { apiKeys } = useAuth()
  const [params, setParams] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState('')

  const baseUrl = 'https://5jhvtpw59k.execute-api.us-east-1.amazonaws.com/prod'

  const handleParamChange = (name: string, value: string) => {
    setParams(prev => ({ ...prev, [name]: value }))
  }

  const buildUrl = () => {
    let url = `${baseUrl}${endpoint}`
    const queryParams = Object.entries(params)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    if (queryParams && method === 'GET') {
      url += `?${queryParams}`
    }
    
    return url
  }

  const executeRequest = async () => {
    if (!selectedApiKey) {
      setResponse('Please select an API key first')
      return
    }

    setLoading(true)
    try {
      const url = buildUrl()
      const options: RequestInit = {
        method,
        headers: {
          'x-api-key': selectedApiKey,
          'Content-Type': 'application/json',
        },
      }

      if (method !== 'GET' && requestBody) {
        options.body = JSON.stringify(requestBody)
      }

      const res = await fetch(url, options)
      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const generateCurlCommand = () => {
    const url = buildUrl()
    let curl = `curl -X ${method} "${url}"`
    
    if (selectedApiKey) {
      curl += ` \\\n  -H "x-api-key: ${selectedApiKey}"`
    }
    
    if (method !== 'GET' && requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json"`
      curl += ` \\\n  -d '${JSON.stringify(requestBody, null, 2)}'`
    }
    
    return curl
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>API Playground</CardTitle>
          <Badge variant={method === 'GET' ? 'default' : method === 'POST' ? 'secondary' : 'destructive'}>
            {method}
          </Badge>
        </div>
        <CardDescription>
          Test this endpoint with your API key
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="playground" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="playground">Try it out</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="playground" className="space-y-4">
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={selectedApiKey}
                onChange={(e) => setSelectedApiKey(e.target.value)}
              />
            </div>

            {parameters.map(param => (
              <div key={param.name}>
                <Label htmlFor={param.name}>
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {param.options ? (
                  <Select 
                    value={params[param.name] || ''} 
                    onValueChange={(value: string) => handleParamChange(param.name, value)}
                  >
                    <SelectTrigger id={param.name}>
                      <SelectValue placeholder={`Select ${param.name}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {param.options.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={param.name}
                    type="text"
                    placeholder={param.default || param.description}
                    value={params[param.name] || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                  />
                )}
                <p className="text-sm text-muted-foreground mt-1">{param.description}</p>
              </div>
            ))}

            <div className="flex items-center space-x-2">
              <Button onClick={executeRequest} disabled={loading || !selectedApiKey}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {buildUrl()}
              </span>
            </div>

            {response && (
              <div className="mt-4">
                <Label>Response</Label>
                <CodeBlock code={response} language="json" className="mt-2" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="curl" className="mt-4">
            <CodeBlock code={generateCurlCommand()} language="bash" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}