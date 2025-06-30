import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Zap, Globe, Shield, Code, FileText, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/')({
  component: DocsIndex,
})

function DocsIndex() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          CompliCal API Documentation
        </h1>
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          Enterprise-grade compliance deadline API for Australian and New Zealand businesses.
          Get real-time access to 469+ tax deadlines, regulatory dates, and filing requirements 
          with 99.9% uptime and sub-100ms response times.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <Link to="/docs/overview">
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
              <ArrowRight className="mr-2 h-5 w-5" />
              Start Here
            </Button>
          </Link>
          <Link to="/docs/quickstart">
            <Button size="lg" variant="outline" className="shadow hover:shadow-lg transition-shadow">
              <Zap className="mr-2 h-5 w-5" />
              Quick Start Guide
            </Button>
          </Link>
          <Link to="/docs/api-reference">
            <Button size="lg" variant="outline" className="shadow hover:shadow-lg transition-shadow">
              <Code className="mr-2 h-5 w-5" />
              API Reference
            </Button>
          </Link>
        </div>
      </div>

      {/* Coverage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deadlines</p>
              <p className="text-3xl font-bold text-gray-900">430+</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-3xl font-bold text-gray-900">2</p>
              <p className="text-sm text-gray-500">AU & NZ</p>
            </div>
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Agencies</p>
              <p className="text-3xl font-bold text-gray-900">30+</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <Globe className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Global Endpoint</h3>
            <p className="text-gray-600 mb-4">
              Query multiple countries in a single API call. Filter by country, year, month, or deadline type.
            </p>
            <Link to="/docs/api-global" className="text-blue-600 hover:text-blue-700 font-medium">
              View endpoint →
            </Link>
          </Card>

          <Card className="p-6">
            <Shield className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-gray-600 mb-4">
              SHA-256 hashed API keys, rate limiting, and comprehensive audit logs for compliance.
            </p>
            <Link to="/docs/authentication" className="text-blue-600 hover:text-blue-700 font-medium">
              Learn more →
            </Link>
          </Card>

          <Card className="p-6">
            <Zap className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
            <p className="text-gray-600 mb-4">
              Webhook notifications for deadline changes and new compliance requirements.
            </p>
            <span className="text-gray-500">
              Setup webhooks (Coming soon)
            </span>
          </Card>

          <Card className="p-6">
            <Code className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Developer Friendly</h3>
            <p className="text-gray-600 mb-4">
              RESTful API with predictable responses, comprehensive error codes, and SDKs.
            </p>
            <span className="text-gray-500">
              Browse SDKs (Coming soon)
            </span>
          </Card>
        </div>
      </div>

      {/* Coverage Details */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Coverage by Country</h2>
        
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  🇦🇺 Australia
                  <span className="text-sm font-normal text-gray-500">(421 deadlines)</span>
                </h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Federal (185)</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• ATO: BAS, PAYG, GST, Income Tax</li>
                  <li>• ASIC: Company compliance</li>
                  <li>• Fair Work: Super guarantee, WGEA</li>
                  <li>• Excise: Fuel, tobacco, alcohol</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">State & Territory (236)</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Payroll tax (all states)</li>
                  <li>• Land tax & stamp duty</li>
                  <li>• Workers compensation</li>
                  <li>• Vehicle registration</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  🇳🇿 New Zealand
                  <span className="text-sm font-normal text-gray-500">(48 deadlines)</span>
                </h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Tax Deadlines</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• GST returns</li>
                  <li>• PAYE & employer deductions</li>
                  <li>• Income tax & provisional tax</li>
                  <li>• FBT & withholding taxes</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Business Compliance</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• ACC levies</li>
                  <li>• Company annual returns</li>
                  <li>• KiwiSaver</li>
                  <li>• Trust & estate returns</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
        <p className="text-gray-600 mb-6">
          Get your API key and make your first request in under 5 minutes.
        </p>
        <div className="flex gap-4">
          <Link to="/dashboard">
            <Button>
              Get API Key
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/docs/quickstart">
            <Button variant="outline">
              View Quick Start Guide
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}