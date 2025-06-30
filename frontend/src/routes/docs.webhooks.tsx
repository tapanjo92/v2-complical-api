import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Webhook,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Bell
} from 'lucide-react'

export const Route = createFileRoute('/docs/webhooks')({
  component: Webhooks,
})

function Webhooks() {
  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Webhook className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Webhooks
          </h1>
          <Badge className="bg-green-100 text-green-800">Available</Badge>
        </div>
        
        <p className="text-xl text-gray-600 mb-6">
          Receive real-time notifications when compliance deadlines change or when your API usage 
          reaches specified thresholds. Webhooks provide a reliable way to stay updated without polling.
        </p>

        <Alert className="border-purple-200 bg-purple-50">
          <Bell className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            <strong>Pro Tip:</strong> Webhooks are included in all plans. Professional and Enterprise 
            plans support multiple webhook endpoints and custom retry policies.
          </AlertDescription>
        </Alert>
      </div>

      {/* Quick Start */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                1
              </div>
              <h3 className="font-semibold">Create Endpoint</h3>
            </div>
            <p className="text-sm text-gray-600">
              Set up an HTTPS endpoint on your server to receive webhook events.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                2
              </div>
              <h3 className="font-semibold">Register Webhook</h3>
            </div>
            <p className="text-sm text-gray-600">
              Configure your webhook URL and select events in the dashboard.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                3
              </div>
              <h3 className="font-semibold">Handle Events</h3>
            </div>
            <p className="text-sm text-gray-600">
              Process incoming events and verify signatures for security.
            </p>
          </Card>
        </div>
      </div>

      {/* Event Types */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Types</h2>
        
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Deadline Events
                </h3>
                <p className="text-gray-600">
                  Notifications about changes to compliance deadlines
                </p>
              </div>
              <Badge variant="outline">5 events</Badge>
            </div>
            
            <div className="space-y-3">
              <EventType 
                name="deadline.created"
                description="New deadline added to the system"
              />
              <EventType 
                name="deadline.updated"
                description="Existing deadline details changed (date, description, etc.)"
              />
              <EventType 
                name="deadline.deleted"
                description="Deadline removed from the system"
              />
              <EventType 
                name="deadline.approaching"
                description="Deadline is approaching (7 days before due date)"
              />
              <EventType 
                name="deadline.imminent"
                description="Deadline is imminent (24 hours before due date)"
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Usage Events
                </h3>
                <p className="text-gray-600">
                  Notifications about API usage thresholds
                </p>
              </div>
              <Badge variant="outline">6 events</Badge>
            </div>
            
            <div className="space-y-3">
              <EventType 
                name="usage.threshold.25"
                description="API usage reached 25% of monthly limit"
              />
              <EventType 
                name="usage.threshold.50"
                description="API usage reached 50% of monthly limit"
              />
              <EventType 
                name="usage.threshold.75"
                description="API usage reached 75% of monthly limit"
              />
              <EventType 
                name="usage.threshold.90"
                description="API usage reached 90% of monthly limit"
              />
              <EventType 
                name="usage.threshold.95"
                description="API usage reached 95% of monthly limit"
              />
              <EventType 
                name="usage.threshold.100"
                description="API usage limit reached"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Webhook Payload */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Webhook Payload</h2>
        
        <Card className="p-6">
          <p className="text-gray-600 mb-4">
            All webhook events are delivered as POST requests with a JSON payload:
          </p>
          
          <CodeBlock 
            language="json"
            code={`{
  "id": "evt_1234567890",
  "type": "deadline.updated",
  "created": "2025-01-15T10:30:00Z",
  "data": {
    "object": {
      "id": "DEADLINE#BAS_QUARTERLY#2025-02-28",
      "country": "AU",
      "agency": "ATO",
      "deadline_type": "BAS_QUARTERLY",
      "title": "Quarterly BAS submission",
      "due_date": "2025-02-28",
      "previous_due_date": "2025-02-21",
      "change_reason": "Public holiday adjustment"
    }
  },
  "metadata": {
    "webhook_id": "whk_abc123",
    "delivery_attempt": 1,
    "api_version": "v1"
  }
}`}
          />

          <div className="mt-6 space-y-3">
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">id</code>
              <span className="text-sm text-gray-600 ml-2">Unique event identifier</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">type</code>
              <span className="text-sm text-gray-600 ml-2">Event type (e.g., deadline.updated)</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">data.object</code>
              <span className="text-sm text-gray-600 ml-2">The affected resource</span>
            </div>
            <div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">metadata</code>
              <span className="text-sm text-gray-600 ml-2">Delivery information</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Signature Verification */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Signature Verification</h2>
        
        <Card className="p-6 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Always Verify Webhook Signatures
              </h3>
              <p className="text-gray-700 mb-4">
                CompliCal signs all webhook payloads using HMAC-SHA256. Always verify the signature 
                to ensure the webhook is authentic and hasn't been tampered with.
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <Tabs defaultValue="node" className="w-full">
            <TabsList>
              <TabsTrigger value="node">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="ruby">Ruby</TabsTrigger>
            </TabsList>
            
            <TabsContent value="node">
              <CodeBlock 
                language="javascript"
                code={`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-complical-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(req.body);
  
  // Process the event
  console.log('Received event:', event.type);
  
  // Return 200 to acknowledge receipt
  res.status(200).send('OK');
});`}
              />
            </TabsContent>
            
            <TabsContent value="python">
              <CodeBlock 
                language="python"
                code={`import hmac
import hashlib
from flask import Flask, request, abort

app = Flask(__name__)

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-CompliCal-Signature')
    secret = os.environ.get('WEBHOOK_SECRET')
    
    if not verify_webhook_signature(request.data, signature, secret):
        abort(401)
    
    event = request.json
    
    # Process the event
    print(f"Received event: {event['type']}")
    
    return 'OK', 200`}
              />
            </TabsContent>
            
            <TabsContent value="php">
              <CodeBlock 
                language="php"
                code={`<?php
function verifyWebhookSignature($payload, $signature, $secret) {
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

// Get the raw POST data
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_COMPLICAL_SIGNATURE'] ?? '';
$secret = $_ENV['WEBHOOK_SECRET'];

if (!verifyWebhookSignature($payload, $signature, $secret)) {
    http_response_code(401);
    die('Invalid signature');
}

$event = json_decode($payload, true);

// Process the event
error_log('Received event: ' . $event['type']);

// Return 200 to acknowledge receipt
http_response_code(200);
echo 'OK';`}
              />
            </TabsContent>
            
            <TabsContent value="ruby">
              <CodeBlock 
                language="ruby"
                code={`require 'openssl'
require 'json'

class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token
  
  def receive
    signature = request.headers['X-CompliCal-Signature']
    secret = ENV['WEBHOOK_SECRET']
    
    unless verify_webhook_signature(request.raw_post, signature, secret)
      head :unauthorized
      return
    end
    
    event = JSON.parse(request.raw_post)
    
    # Process the event
    Rails.logger.info "Received event: #{event['type']}"
    
    head :ok
  end
  
  private
  
  def verify_webhook_signature(payload, signature, secret)
    expected_signature = OpenSSL::HMAC.hexdigest(
      'SHA256',
      secret,
      payload
    )
    
    ActiveSupport::SecurityUtils.secure_compare(
      signature,
      expected_signature
    )
  end
end`}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Retry Policy */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Retry Policy</h2>
        
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <RefreshCw className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Automatic Retry with Exponential Backoff
              </h3>
              <p className="text-gray-600">
                CompliCal automatically retries failed webhook deliveries with exponential backoff. 
                We'll attempt delivery up to 5 times over 24 hours.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium text-gray-700">Attempt 1</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" style={{width: '5%'}}></div>
              </div>
              <div className="text-sm text-gray-600">Immediate</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium text-gray-700">Attempt 2</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" style={{width: '10%'}}></div>
              </div>
              <div className="text-sm text-gray-600">5 minutes</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium text-gray-700">Attempt 3</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" style={{width: '25%'}}></div>
              </div>
              <div className="text-sm text-gray-600">1 hour</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium text-gray-700">Attempt 4</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" style={{width: '50%'}}></div>
              </div>
              <div className="text-sm text-gray-600">6 hours</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium text-gray-700">Attempt 5</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" style={{width: '100%'}}></div>
              </div>
              <div className="text-sm text-gray-600">24 hours</div>
            </div>
          </div>

          <Alert className="mt-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              After 5 failed attempts, the webhook will be automatically suspended. 
              You can reactivate it from your dashboard.
            </AlertDescription>
          </Alert>
        </Card>
      </div>

      {/* Best Practices */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Practices</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <CheckCircle className="h-5 w-5 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Respond Quickly</h3>
            <p className="text-sm text-gray-600">
              Return a 2xx status code immediately after receiving the webhook. 
              Process events asynchronously to avoid timeouts.
            </p>
          </Card>

          <Card className="p-6">
            <Zap className="h-5 w-5 text-yellow-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Handle Duplicates</h3>
            <p className="text-sm text-gray-600">
              Use the event ID to ensure idempotency. Network issues may cause 
              duplicate deliveries.
            </p>
          </Card>

          <Card className="p-6">
            <Shield className="h-5 w-5 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Secure Your Endpoint</h3>
            <p className="text-sm text-gray-600">
              Always verify signatures and use HTTPS. Consider IP allowlisting 
              for additional security.
            </p>
          </Card>

          <Card className="p-6">
            <Clock className="h-5 w-5 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Monitor Webhook Health</h3>
            <p className="text-sm text-gray-600">
              Check your webhook status regularly. We'll notify you via email 
              if webhooks are failing.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function EventType({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <Badge variant="outline" className="font-mono text-xs mt-0.5">
        {name}
      </Badge>
      <span className="text-sm text-gray-600">{description}</span>
    </div>
  )
}