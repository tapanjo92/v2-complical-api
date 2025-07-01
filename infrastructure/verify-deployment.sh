#!/bin/bash

# Verify production usage metering deployment
ENVIRONMENT=${1:-test}
REGION="ap-south-1"

echo "🔍 Verifying Production Usage Metering Deployment"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check Authorizer Configuration
echo "1. Checking Authorizer Configuration..."
# Get the actual function name from CloudFormation
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ExportsOutputRefApiKeyAuthorizerFunction06E0AA0998E0D037'].OutputValue" \
  --output text 2>/dev/null)

if [ -z "$FUNCTION_NAME" ]; then
  FUNCTION_NAME="CompliCal-API-$ENVIRONMENT-ApiKeyAuthorizerFunction06E0AA0-WDeesSbzmoFR"
fi

HANDLER=$(aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --query 'Handler' --output text \
  --region $REGION 2>/dev/null)

if [[ "$HANDLER" == *"production"* ]]; then
  echo -e "${GREEN}✅ Production authorizer deployed${NC}"
  echo "   Handler: $HANDLER"
else
  echo -e "${RED}❌ Production authorizer NOT deployed${NC}"
  echo "   Current handler: $HANDLER"
fi

# Check DEBUG flag
DEBUG_VAR=$(aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --query 'Environment.Variables.DEBUG' --output text \
  --region $REGION 2>/dev/null)

if [[ "$DEBUG_VAR" == "false" ]] || [[ "$DEBUG_VAR" == "None" ]]; then
  echo -e "${GREEN}✅ Debug logging disabled${NC}"
else
  echo -e "${RED}❌ Debug logging is ON: $DEBUG_VAR${NC}"
fi
echo ""

# 2. Check Usage Processor
echo "2. Checking Usage Processor..."
PROCESSOR_EXISTS=$(aws lambda get-function \
  --function-name complical-usage-processor-$ENVIRONMENT \
  --region $REGION &>/dev/null && echo "yes" || echo "no")

if [ "$PROCESSOR_EXISTS" = "yes" ]; then
  echo -e "${GREEN}✅ Usage processor deployed${NC}"
  
  # Check subscription filter
  FILTER_EXISTS=$(aws logs describe-subscription-filters \
    --log-group-name /aws/apigateway/complical-$ENVIRONMENT \
    --filter-name-prefix UsageMetering \
    --region $REGION \
    --query 'subscriptionFilters[0].filterName' \
    --output text 2>/dev/null)
  
  if [[ ! -z "$FILTER_EXISTS" ]] && [[ "$FILTER_EXISTS" != "None" ]]; then
    echo -e "${GREEN}✅ CloudWatch Logs subscription active${NC}"
  else
    echo -e "${YELLOW}⚠️  CloudWatch Logs subscription not found${NC}"
  fi
else
  echo -e "${RED}❌ Usage processor NOT deployed${NC}"
fi
echo ""

# 3. Check Cache Invalidation
echo "3. Checking Cache Invalidation..."
CACHE_TOPIC=$(aws sns list-topics \
  --region $REGION \
  --query "Topics[?contains(TopicArn, 'cache-invalidation-$ENVIRONMENT')].TopicArn" \
  --output text 2>/dev/null)

if [[ ! -z "$CACHE_TOPIC" ]] && [[ "$CACHE_TOPIC" != "None" ]]; then
  echo -e "${GREEN}✅ Cache invalidation topic exists${NC}"
  echo "   Topic: $CACHE_TOPIC"
  
  # Check subscriptions
  SUBS=$(aws sns list-subscriptions-by-topic \
    --topic-arn $CACHE_TOPIC \
    --region $REGION \
    --query 'Subscriptions[?Protocol==`lambda`].Endpoint' \
    --output text 2>/dev/null)
  
  if [[ ! -z "$SUBS" ]]; then
    echo -e "${GREEN}✅ Lambda subscription configured${NC}"
  else
    echo -e "${YELLOW}⚠️  No Lambda subscriptions found${NC}"
  fi
else
  echo -e "${RED}❌ Cache invalidation topic NOT found${NC}"
fi
echo ""

# 4. Check DynamoDB Migration
echo "4. Checking DynamoDB Migration..."
# Sample one API key to check if successfulCalls field exists
SAMPLE_KEY=$(aws dynamodb scan \
  --table-name complical-api-keys-$ENVIRONMENT \
  --limit 1 \
  --region $REGION \
  --query 'Items[0]' 2>/dev/null)

if [[ "$SAMPLE_KEY" == *"successfulCalls"* ]]; then
  echo -e "${GREEN}✅ Migration completed - successfulCalls field exists${NC}"
else
  echo -e "${YELLOW}⚠️  Migration may not be complete${NC}"
fi
echo ""

# 5. Check CloudWatch Dashboard
echo "5. Checking CloudWatch Dashboard..."
DASHBOARD_EXISTS=$(aws cloudwatch get-dashboard \
  --dashboard-name complical-api-usage-$ENVIRONMENT \
  --region $REGION &>/dev/null && echo "yes" || echo "no")

if [ "$DASHBOARD_EXISTS" = "yes" ]; then
  echo -e "${GREEN}✅ Usage dashboard exists${NC}"
  echo "   URL: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-api-usage-$ENVIRONMENT"
else
  echo -e "${YELLOW}⚠️  Dashboard not found${NC}"
fi
echo ""

# Summary
echo "📊 Deployment Summary:"
echo "===================="
if [[ "$HANDLER" == *"production"* ]] && \
   [[ "$DEBUG_VAR" == "false" ]] && \
   [ "$PROCESSOR_EXISTS" = "yes" ] && \
   [[ ! -z "$CACHE_TOPIC" ]]; then
  echo -e "${GREEN}✅ All core components deployed successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Make a test API call and check response headers"
  echo "2. Delete a test key and verify it stops working immediately"
  echo "3. Monitor the dashboard for usage metrics"
else
  echo -e "${YELLOW}⚠️  Some components may need attention${NC}"
fi