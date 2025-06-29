import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { User, Mail, Building, Calendar, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator'

export const Route = createFileRoute('/_auth/dashboard/account')({
  component: AccountSettings,
})

function AccountSettings() {
  const { user } = useAuthStore()
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return api.auth.updatePassword(data)
    },
    onSuccess: () => {
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Password update failed',
        description: error.response?.data?.message || 'Failed to update password',
        variant: 'destructive',
      })
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both password fields match.',
        variant: 'destructive',
      })
      return
    }

    // Validate password strength
    const passwordValidation = {
      minLength: passwordForm.newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(passwordForm.newPassword),
      hasLowercase: /[a-z]/.test(passwordForm.newPassword),
      hasNumber: /[0-9]/.test(passwordForm.newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword),
    }

    if (!Object.values(passwordValidation).every(Boolean)) {
      toast({
        title: 'Weak password',
        description: 'Password must meet all strength requirements.',
        variant: 'destructive',
      })
      return
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account information and security settings
        </p>
      </div>

      {/* Profile Information */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input value={user?.email || ''} disabled />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company Name
              </Label>
              <Input value={user?.companyName || ''} disabled />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account ID
              </Label>
              <Input value={user?.userId || ''} disabled />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </Label>
              <Input 
                value={user?.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : ''} 
                disabled 
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> To update your email address or company name, please contact support at support@complical.com
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInput
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <PasswordInput
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
              <PasswordStrengthIndicator password={passwordForm.newPassword} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <PasswordInput
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={
                  updatePasswordMutation.isPending || 
                  !passwordForm.currentPassword || 
                  !passwordForm.newPassword || 
                  !passwordForm.confirmPassword ||
                  passwordForm.newPassword !== passwordForm.confirmPassword
                }
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="mt-8 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible account actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Delete Account</h4>
              <p className="text-sm text-gray-600 mb-4">
                Once you delete your account, there is no going back. All your API keys and data will be permanently deleted.
              </p>
              <Button variant="destructive" disabled>
                Delete Account (Contact Support)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}