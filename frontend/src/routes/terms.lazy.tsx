import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createLazyFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CompliCal</span>
          </Link>
          <Link to="/dashboard">
            <Button size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-gray">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: January 2025</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using the CompliCal API service, you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h2>2. Use License</h2>
        <p>
          Permission is granted to use the CompliCal API for your personal or business applications, subject to the restrictions outlined in this agreement.
        </p>

        <h2>3. API Usage</h2>
        <ul>
          <li>You must not exceed the rate limits of your chosen plan</li>
          <li>API keys must be kept secure and not shared publicly</li>
          <li>You must not use the API for any illegal purposes</li>
          <li>Automated scraping or mass downloading is prohibited</li>
        </ul>

        <h2>4. Data Accuracy</h2>
        <p>
          While we strive to provide accurate compliance deadline information, CompliCal makes no warranties about the completeness, reliability, or accuracy of this information. Always verify critical deadlines with official government sources.
        </p>

        <h2>5. Limitation of Liability</h2>
        <p>
          In no event shall CompliCal be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our service.
        </p>

        <h2>6. Termination</h2>
        <p>
          We reserve the right to terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever.
        </p>

        <h2>7. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at legal@complical.com.
        </p>
      </div>
    </div>
  )
}