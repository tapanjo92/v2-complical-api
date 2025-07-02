#!/bin/bash
# Verify Deployment in us-east-1

set -e

# Configuration
REGION="us-east-1"
ENVIRONMENT=${1:-prod}

echo "=================================================="
echo "🔍 Verifying Deployment in us-east-1"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to check stack status
check_stack() {
  local stack_name=$1
  local description=$2
  
  STATUS=$(aws cloudformation describe-stacks \
    --stack-name $stack_name \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")
  
  if [[ "$STATUS" == "CREATE_COMPLETE" ]] || [[ "$STATUS" == "UPDATE_COMPLETE" ]]; then
    echo -e "${GREEN}✅ $description: $STATUS${NC}"
  else
    echo -e "${RED}❌ $description: $STATUS${NC}"
    OVERALL_STATUS=1
  fi
}

echo ""
echo "1️⃣ Checking CloudFormation Stacks..."
echo "-----------------------------------"
check_stack "CompliCal-DynamoDB-$ENVIRONMENT" "DynamoDB Tables"
check_stack "CompliCal-Auth-$ENVIRONMENT" "Cognito Auth"
check_stack "CompliCal-Kinesis-$ENVIRONMENT" "Kinesis Analytics"
check_stack "CompliCal-API-$ENVIRONMENT" "API Gateway"
check_stack "CompliCal-Frontend-$ENVIRONMENT" "Frontend (S3/CloudFront)"
check_stack "CompliCal-WAF-$ENVIRONMENT" "WAF Security"
check_stack "CompliCal-Monitoring-$ENVIRONMENT" "CloudWatch Monitoring"

echo ""
echo "2️⃣ Checking API Health..."
echo "------------------------"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text 2>/dev/null)

if [ ! -z "$API_URL" ]; then
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}health)
  if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API Health Check: OK${NC}"
    echo "   URL: $API_URL"
  else
    echo -e "${RED}❌ API Health Check: Failed (HTTP $HEALTH_STATUS)${NC}"
    OVERALL_STATUS=1
  fi
else
  echo -e "${RED}❌ API URL not found${NC}"
  OVERALL_STATUS=1
fi

echo ""
echo "3️⃣ Checking Kinesis Stream..."
echo "----------------------------"
STREAM_NAME="complical-usage-stream-$ENVIRONMENT"
STREAM_STATUS=$(aws kinesis describe-stream \
  --stream-name $STREAM_NAME \
  --region $REGION \
  --query 'StreamDescription.StreamStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STREAM_STATUS" = "ACTIVE" ]; then
  echo -e "${GREEN}✅ Kinesis Stream: ACTIVE${NC}"
  SHARD_COUNT=$(aws kinesis describe-stream \
    --stream-name $STREAM_NAME \
    --region $REGION \
    --query 'StreamDescription.Shards | length(@)' \
    --output text)
  echo "   Shards: $SHARD_COUNT"
else
  echo -e "${YELLOW}⚠️  Kinesis Stream: $STREAM_STATUS${NC}"
fi

echo ""
echo "4️⃣ Checking DynamoDB Tables..."
echo "-----------------------------"
for table in "deadlines" "api-keys" "api-usage" "sessions" "webhooks" "analytics"; do
  TABLE_NAME="complical-${table}-$ENVIRONMENT"
  TABLE_STATUS=$(aws dynamodb describe-table \
    --table-name $TABLE_NAME \
    --region $REGION \
    --query 'Table.TableStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")
  
  if [ "$TABLE_STATUS" = "ACTIVE" ]; then
    echo -e "${GREEN}✅ Table $table: ACTIVE${NC}"
  else
    echo -e "${RED}❌ Table $table: $TABLE_STATUS${NC}"
    OVERALL_STATUS=1
  fi
done

echo ""
echo "5️⃣ Checking CloudFront Distribution..."
echo "-------------------------------------"
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-Frontend-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text 2>/dev/null)

if [ ! -z "$CLOUDFRONT_DOMAIN" ]; then
  echo -e "${GREEN}✅ CloudFront: https://$CLOUDFRONT_DOMAIN${NC}"
else
  echo -e "${YELLOW}⚠️  CloudFront not deployed${NC}"
fi

echo ""
echo "6️⃣ Checking Sample Data..."
echo "-------------------------"
ITEM_COUNT=$(aws dynamodb scan \
  --table-name complical-deadlines-$ENVIRONMENT \
  --region $REGION \
  --select COUNT \
  --query 'Count' \
  --output text 2>/dev/null || echo "0")

if [ "$ITEM_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✅ Deadline Data: $ITEM_COUNT items loaded${NC}"
else
  echo -e "${YELLOW}⚠️  No deadline data loaded yet${NC}"
  echo "   Run: AWS_REGION=$REGION TABLE_NAME=complical-deadlines-$ENVIRONMENT node scripts/load-data.js"
fi

echo ""
echo "7️⃣ Checking Dashboards..."
echo "------------------------"
echo "📊 Kinesis Analytics: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-usage-analytics-$ENVIRONMENT"
echo "📊 API Monitoring: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-monitoring-$ENVIRONMENT"
echo "📊 Usage Metering: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-api-usage-$ENVIRONMENT"

echo ""
echo "=================================================="
if [ $OVERALL_STATUS -eq 0 ]; then
  echo -e "${GREEN}✅ Deployment Verification: PASSED${NC}"
else
  echo -e "${RED}❌ Deployment Verification: FAILED${NC}"
  echo "   Please check the failed components above"
fi
echo "=================================================="

exit $OVERALL_STATUS