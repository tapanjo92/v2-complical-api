import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createLazyFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: January 2025</p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, use our API, or contact us for support.
        </p>

        <h3>Account Information</h3>
        <ul>
          <li>Email address</li>
          <li>Company name</li>
          <li>Password (stored securely using industry-standard encryption)</li>
        </ul>

        <h3>Usage Information</h3>
        <ul>
          <li>API requests and responses</li>
          <li>Request timestamps and IP addresses</li>
          <li>Error logs and debugging information</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Monitor and analyze trends and usage</li>
          <li>Detect and prevent fraudulent transactions</li>
        </ul>

        <h2>3. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2>4. Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide services. API logs are retained for 90 days for debugging and support purposes.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          We use trusted third-party services for payment processing (Stripe) and infrastructure (AWS). These services have their own privacy policies governing the use of your information.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
        </ul>

        <h2>7. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at privacy@complical.com.
        </p>
      </div>
    </div>
  )
}