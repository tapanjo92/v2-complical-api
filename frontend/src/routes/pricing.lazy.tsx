import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, Check } from 'lucide-react'

export const Route = createLazyFileRoute('/pricing')({
  component: PricingPage,
})

const plans = [
  {
    name: 'Developer',
    price: '$0',
    period: 'forever',
    description: 'Perfect for testing and small projects',
    features: [
      '10,000 API calls/month',
      'All compliance data',
      'Community support',
      '99.9% uptime SLA',
      'API key authentication',
    ],
    cta: 'Start Free',
    href: '/register',
  },
  {
    name: 'Professional',
    price: '$49',
    period: 'per month',
    description: 'For growing businesses and applications',
    features: [
      '100,000 API calls/month',
      'All compliance data',
      'Priority email support',
      '99.99% uptime SLA',
      'OAuth 2.0 authentication',
      'Webhook notifications',
      'Custom rate limits',
    ],
    cta: 'Start Trial',
    href: '/register',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For large teams with custom needs',
    features: [
      'Unlimited API calls',
      'All compliance data',
      'Dedicated support',
      '99.99% uptime SLA',
      'SSO authentication',
      'Webhook notifications',
      'Custom integrations',
      'SLA guarantees',
      'Dedicated infrastructure',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@complical.com',
  },
]

function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CompliCal</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link to="/docs" className="text-sm font-medium hover:text-primary">
              Documentation
            </Link>
            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? 'border-primary shadow-lg' : ''}
            >
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-sm font-medium py-1 text-center">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">/{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={plan.href}>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What counts as an API call?</h3>
              <p className="text-muted-foreground">
                Each request to any of our endpoints counts as one API call, regardless of
                the number of results returned.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take
                effect immediately and we'll prorate any charges.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my limit?</h3>
              <p className="text-muted-foreground">
                We'll send you an email notification when you reach 80% of your limit.
                If you exceed it, API calls will return a 429 error until the next
                billing period or you upgrade.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 30-day money-back guarantee for all paid plans. If you're
                not satisfied, contact us for a full refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}