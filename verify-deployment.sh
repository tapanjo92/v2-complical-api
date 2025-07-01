#!/bin/bash
# Verify API Usage Metering Deployment

ENVIRONMENT=${1:-test}
REGION="ap-south-1"

echo "🔍 Verifying Deployment for $ENVIRONMENT"
echo ""

# Get Lambda function name from CloudFormation
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?contains(OutputKey,'ApiKeyAuthorizerFunction')].OutputValue" \
  --output text 2>/dev/null)

# 1. Check Authorizer
HANDLER=$(aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --query 'Handler' --output text --region $REGION 2>/dev/null)

echo -n "✓ Production Authorizer: "
[[ "$HANDLER" == *"production"* ]] && echo "✅ Deployed" || echo "❌ Not found"

# 2. Check Usage Processor
echo -n "✓ Usage Processor: "
aws lambda get-function --function-name complical-usage-processor-$ENVIRONMENT \
  --region $REGION &>/dev/null && echo "✅ Deployed" || echo "❌ Not found"

# 3. Check Cache Invalidation
echo -n "✓ Cache Invalidation: "
TOPIC=$(aws sns list-topics --region $REGION \
  --query "Topics[?contains(TopicArn,'cache-invalidation-$ENVIRONMENT')].TopicArn" \
  --output text)
[ ! -z "$TOPIC" ] && echo "✅ Configured" || echo "❌ Not found"

# 4. Check Migration
echo -n "✓ Migration Status: "
SAMPLE=$(aws dynamodb scan --table-name complical-api-keys-$ENVIRONMENT \
  --limit 1 --region $REGION --query 'Items[0]' 2>/dev/null)
[[ "$SAMPLE" == *"successfulCalls"* ]] && echo "✅ Complete" || echo "⚠️  Pending"

# 5. Dashboard
echo -n "✓ Dashboard: "
aws cloudwatch get-dashboard --dashboard-name complical-api-usage-$ENVIRONMENT \
  --region $REGION &>/dev/null && echo "✅ Available" || echo "❌ Not found"

echo ""
echo "📊 Dashboard: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-api-usage-$ENVIRONMENT"