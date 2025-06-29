import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { AlertCircle, Bell, Copy, Plus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_auth/dashboard/webhooks')({
  component: WebhooksPage,
})

interface Webhook {
  webhookId: string
  url: string
  events: string[]
  active: boolean
  description?: string
  createdAt: string
  lastTriggered?: string
  failureCount: number
  status: 'active' | 'suspended'
}

const eventOptions = [
  { value: 'usage.threshold.50', label: '50% Usage' },
  { value: 'usage.threshold.80', label: '80% Usage' },
  { value: 'usage.threshold.90', label: '90% Usage' },
  { value: 'usage.threshold.95', label: '95% Usage' },
  { value: 'usage.threshold.100', label: '100% Usage' },
]

function WebhooksPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
    description: '',
  })

  // Load webhooks
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks', user?.email],
    queryFn: async () => {
      const response = await api.webhooks.list()
      return response.data.webhooks
    },
    enabled: !!user,
  })

  // Create webhook mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.webhooks.create(data)
    },
    onSuccess: (response) => {
      setNewWebhookSecret(response.data.signingSecret)
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setIsCreateOpen(false)
      setFormData({ url: '', events: [], description: '' })
      toast({
        title: 'Webhook created',
        description: 'Your webhook has been created successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create webhook',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // Update webhook mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return api.webhooks.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setIsEditOpen(false)
      setSelectedWebhook(null)
      toast({
        title: 'Webhook updated',
        description: 'Your webhook has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update webhook',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.webhooks.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast({
        title: 'Webhook deleted',
        description: 'Your webhook has been deleted successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete webhook',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const handleCreate = () => {
    if (!formData.url || formData.events.length === 0) {
      toast({
        title: 'Invalid form',
        description: 'Please provide a URL and select at least one event.',
        variant: 'destructive',
      })
      return
    }
    createMutation.mutate(formData)
  }

  const handleUpdate = () => {
    if (!selectedWebhook) return
    updateMutation.mutate({
      id: selectedWebhook.webhookId,
      data: formData,
    })
  }

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setFormData({
      url: webhook.url,
      events: webhook.events,
      description: webhook.description || '',
    })
    setIsEditOpen(true)
  }

  const copySecret = () => {
    if (newWebhookSecret) {
      navigator.clipboard.writeText(newWebhookSecret)
      toast({
        title: 'Copied',
        description: 'Signing secret copied to clipboard',
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          <p className="mt-2 text-gray-600">
            Get real-time notifications when usage thresholds are reached
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Secret Display Dialog */}
      {newWebhookSecret && (
        <Dialog open={!!newWebhookSecret} onOpenChange={() => setNewWebhookSecret(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Webhook Created Successfully</DialogTitle>
              <DialogDescription>
                Save this signing secret - it won't be shown again
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Signing Secret</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={showSecret ? newWebhookSecret : '••••••••••••••••••••••••••••••••'}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={copySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important</p>
                    <p>Store this secret securely. You'll need it to verify webhook signatures.</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewWebhookSecret(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false)
          setIsEditOpen(false)
          setSelectedWebhook(null)
          setFormData({ url: '', events: [], description: '' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit' : 'Create'} Webhook</DialogTitle>
            <DialogDescription>
              Configure your webhook endpoint to receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-app.com/webhooks"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Production webhook"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Events</Label>
              <div className="space-y-2 mt-2">
                {eventOptions.map((event) => (
                  <div key={event.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.value}
                      checked={formData.events.includes(event.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, events: [...formData.events, event.value] })
                        } else {
                          setFormData({ ...formData, events: formData.events.filter(e => e !== event.value) })
                        }
                      }}
                    />
                    <label
                      htmlFor={event.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {event.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false)
              setIsEditOpen(false)
              setSelectedWebhook(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={isEditOpen ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditOpen ? 'Update' : 'Create'} Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="text-center py-12">Loading webhooks...</div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first webhook to get notified about usage thresholds
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook: Webhook) => (
            <Card key={webhook.webhookId}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {webhook.url}
                      {webhook.status === 'active' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </CardTitle>
                    {webhook.description && (
                      <CardDescription>{webhook.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(webhook)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(webhook.webhookId)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="secondary">
                        {eventOptions.find(e => e.value === event)?.label || event}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Created: {format(new Date(webhook.createdAt), 'PPp')}</p>
                    {webhook.lastTriggered && (
                      <p>Last triggered: {format(new Date(webhook.lastTriggered), 'PPp')}</p>
                    )}
                    {webhook.failureCount > 0 && (
                      <p className="text-amber-600">
                        Failed attempts: {webhook.failureCount}
                        {webhook.status === 'suspended' && ' (Suspended)'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documentation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Webhook Documentation</CardTitle>
          <CardDescription>
            How to verify webhook signatures and handle events
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h4 className="text-base font-medium mb-2">Signature Verification</h4>
          <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto text-xs">
{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const timestamp = signature.split(',')[0].split('=')[1];
  const receivedSig = signature.split(',')[1].split('=')[1];
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payload}\`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expectedSig)
  );
}`}
          </pre>
          
          <h4 className="text-base font-medium mb-2 mt-4">Event Payload</h4>
          <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto text-xs">
{`{
  "id": "evt_1234567890abcdef",
  "type": "usage.threshold.80",
  "created": 1640995200,
  "data": {
    "usage": 8000,
    "limit": 10000,
    "percentage": 80,
    "remainingCalls": 2000,
    "resetDate": "2024-01-01T00:00:00.000Z",
    "user_email": "user@example.com"
  }
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}