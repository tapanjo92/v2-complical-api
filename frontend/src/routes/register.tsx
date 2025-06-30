import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { useAuthStore } from '@/lib/auth-store'
import { Link } from '@tanstack/react-router'
import { CalendarDays, Loader2 } from 'lucide-react'
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator'
import { PasswordInput } from '@/components/PasswordInput'
import { useState } from 'react'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  companyName: z.string().min(2, 'Company name is required'),
})

type RegisterForm = z.infer<typeof registerSchema>

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const register = useAuthStore((state) => state.register)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [password, setPassword] = useState('')

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register(data.email, data.password, data.companyName)
      toast({
        title: 'Account created!',
        description: 'Welcome to CompliCal. Let\'s get you set up.',
      })
      // Small delay to ensure localStorage is persisted before navigation
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.response?.data?.error || 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md px-4">
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CompliCal</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Start your 14-day free trial. No credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corp"
                  {...registerField('companyName')}
                  disabled={isLoading}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...registerField('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  {...registerField('password', {
                    onChange: (e) => setPassword(e.target.value)
                  })}
                  disabled={isLoading}
                />
                <PasswordStrengthIndicator password={password} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}