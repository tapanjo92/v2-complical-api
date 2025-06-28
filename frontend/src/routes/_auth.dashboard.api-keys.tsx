import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_auth/dashboard/api-keys')({
  component: ApiKeysPage,
})

function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [newKeyInfo, setNewKeyInfo] = useState<{ key: string; id: string } | null>(null)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [keyName, setKeyName] = useState('')
  const [keyDescription, setKeyDescription] = useState('')

  // Fetch API keys
  const { data, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const response = await api.apiKeys.list()
      return response.data
    },
  })

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.apiKeys.create(data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
      setNewKeyInfo({ key: data.apiKey, id: data.id })
      setKeyName('')
      setKeyDescription('')
      setCreateDialogOpen(false)
      toast({
        title: 'API key created',
        description: 'Make sure to copy your key now. You won\'t be able to see it again!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create API key',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await api.apiKeys.delete(keyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
      setDeleteKeyId(null)
      toast({
        title: 'API key deleted',
        description: 'The API key has been permanently deleted.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete API key',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your API key',
        variant: 'destructive',
      })
      return
    }
    createMutation.mutate({ name: keyName, description: keyDescription })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The API key has been copied to your clipboard.',
    })
  }

  const activeKeys = data?.apiKeys?.filter((key: any) => key.status === 'active') || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-2 text-gray-600">
          Manage your API keys for accessing the CompliCal API
        </p>
      </div>

      {/* Create Key Button */}
      <div className="mb-6">
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          disabled={activeKeys.length >= 5}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Key
        </Button>
        {activeKeys.length >= 5 && (
          <p className="text-sm text-muted-foreground mt-2">
            You've reached the maximum of 5 active API keys
          </p>
        )}
      </div>

      {/* API Keys List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeKeys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first API key to start using the CompliCal API
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeKeys.map((key: any) => (
            <Card key={key.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{key.name}</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Active
                      </span>
                    </div>
                    {key.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {key.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Key: {key.keyPrefix}...</span>
                      <span>•</span>
                      <span>Created: {format(new Date(key.createdAt), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>Expires: {format(new Date(key.expiresAt), 'MMM d, yyyy')}</span>
                      {key.lastUsed && (
                        <>
                          <span>•</span>
                          <span>Last used: {format(new Date(key.lastUsed), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Usage: {key.usageCount || 0} requests
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteKeyId(key.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Give your API key a name to help you identify it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="Production API Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-description">Description (optional)</Label>
              <Input
                id="key-description"
                placeholder="Used for production environment"
                value={keyDescription}
                onChange={(e) => setKeyDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Info Dialog */}
      <Dialog open={!!newKeyInfo} onOpenChange={() => setNewKeyInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Make sure to copy your API key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is the only time you'll see this key. Store it securely.
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={showKey === newKeyInfo?.id ? newKeyInfo.key : '••••••••••••••••••••••••••••••••'}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(showKey === newKeyInfo?.id ? null : newKeyInfo?.id || null)}
                >
                  {showKey === newKeyInfo?.id ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => newKeyInfo && copyToClipboard(newKeyInfo.key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyInfo(null)}>
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKeyId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteKeyId && deleteMutation.mutate(deleteKeyId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}