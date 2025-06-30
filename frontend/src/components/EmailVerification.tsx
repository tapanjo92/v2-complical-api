import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'

export function EmailVerification() {
  const searchParams = new URLSearchParams(window.location.search)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setErrorMessage('Invalid verification link')
      return
    }

    // Call backend to verify email
    const verifyEmail = async () => {
      try {
        await api.auth.verifyEmail({ token, email })
        setStatus('success')
      } catch (error: any) {
        setStatus('error')
        setErrorMessage(
          error.response?.data?.message || 'Failed to verify email address'
        )
      }
    }

    verifyEmail()
  }, [token, email])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
              <CardTitle>Verifying Email</CardTitle>
              <CardDescription>Please wait while we verify your email address...</CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>
                Your email address has been successfully verified. You'll now receive API usage 
                notifications at {email}.
              </CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="text-center">
          {status !== 'loading' && (
            <Button
              onClick={() => window.location.href = '/dashboard/account'}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}