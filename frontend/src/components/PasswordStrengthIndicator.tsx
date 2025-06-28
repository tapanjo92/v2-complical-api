import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contains lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contains number',
    test: (password) => /[0-9]/.test(password),
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
]

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = requirements.filter(req => req.test(password)).length
  const percentage = (strength / requirements.length) * 100

  const getStrengthColor = () => {
    if (strength === 0) return 'bg-gray-200'
    if (strength <= 2) return 'bg-red-500'
    if (strength <= 3) return 'bg-yellow-500'
    if (strength <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (strength === 0) return ''
    if (strength <= 2) return 'Weak'
    if (strength <= 3) return 'Fair'
    if (strength <= 4) return 'Good'
    return 'Strong'
  }

  if (!password) return null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password strength</span>
          <span className={cn(
            'text-sm font-medium',
            strength === 5 ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {getStrengthText()}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              getStrengthColor()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <ul className="space-y-1.5">
        {requirements.map((req, index) => {
          const isMet = req.test(password)
          return (
            <li
              key={index}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                isMet ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              {isMet ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span>{req.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}