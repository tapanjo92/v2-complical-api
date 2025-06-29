#!/bin/bash

# Deploy monitoring and WAF infrastructure
set -e

echo "🔒 Deploying WAF and Monitoring for CompliCal API..."
echo ""

# Check if email is provided for alerts
if [ -z "$ALERT_EMAIL" ]; then
    echo "⚠️  Warning: No ALERT_EMAIL environment variable set."
    echo "   CloudWatch alarms will be created but no email notifications will be sent."
    echo "   To receive alerts, run: export ALERT_EMAIL=your-email@example.com"
    echo ""
fi

# Deploy WAF stack
echo "1️⃣  Deploying WAF protection..."
npm run cdk -- deploy CompliCal-WAF-test --require-approval never

# Deploy Monitoring stack
echo ""
echo "2️⃣  Deploying CloudWatch monitoring and alarms..."
npm run cdk -- deploy CompliCal-Monitoring-test --require-approval never

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=complical-test-dashboard"
echo ""
echo "🔔 To subscribe to alerts:"
echo "   1. Check your email for SNS subscription confirmation"
echo "   2. Click the confirmation link to start receiving alerts"
echo ""
echo "🛡️  WAF is now protecting your API with:"
echo "   - Rate limiting (2000 req/5min per IP)"
echo "   - SQL injection protection"
echo "   - XSS protection"
echo "   - Request size limits"
echo "   - Geographic restrictions"
echo "   - AWS managed rule sets"