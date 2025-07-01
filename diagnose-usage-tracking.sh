#!/bin/bash

# Diagnostic script for CompliCal usage tracking issues

echo "=== CompliCal Usage Tracking Diagnostics ==="
echo "Date: $(date)"
echo ""

# Check environment
ENVIRONMENT=${1:-test}
REGION=${2:-ap-south-1}

echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""

# 1. Check CloudWatch Logs for process-usage-logs function
echo "=== Recent Process Usage Logs Lambda Executions ==="
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/CompliCal-API-${ENVIRONMENT}-ProcessUsageLogsFunction-*" \
  --order-by LastEventTime \
  --descending \
  --limit 5 \
  --region $REGION 2>/dev/null || echo "Log group not found"

echo ""

# 2. Get recent log events from process-usage-logs
echo "=== Recent Process Usage Logs Events (last 30 minutes) ==="
LOG_GROUP=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/CompliCal-API-${ENVIRONMENT}-ProcessUsageLogsFunction" --region $REGION --query 'logGroups[0].logGroupName' --output text)

if [ "$LOG_GROUP" != "None" ]; then
  aws logs filter-log-events \
    --log-group-name "$LOG_GROUP" \
    --start-time $(($(date +%s) - 1800))000 \
    --filter-pattern "Processing" \
    --region $REGION \
    --query 'events[*].[timestamp,message]' \
    --output text | head -20
fi

echo ""

# 3. Check API Gateway access logs
echo "=== Recent API Gateway Access Logs (sample) ==="
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/complical-${ENVIRONMENT}" \
  --start-time $(($(date +%s) - 300))000 \
  --max-items 5 \
  --region $REGION \
  --query 'events[*].message' \
  --output text 2>/dev/null | while read -r line; do
    echo "$line" | jq '.' 2>/dev/null || echo "$line"
done

echo ""

# 4. Check subscription filter status
echo "=== CloudWatch Subscription Filter Status ==="
aws logs describe-subscription-filters \
  --log-group-name "/aws/apigateway/complical-${ENVIRONMENT}" \
  --region $REGION 2>/dev/null || echo "No subscription filters found"

echo ""

# 5. Check recent API key usage in DynamoDB
echo "=== Recent API Key Usage (Top 5) ==="
aws dynamodb scan \
  --table-name "complical-api-keys-${ENVIRONMENT}" \
  --projection-expression "id, userEmail, usageCount, lastUsed, #n" \
  --expression-attribute-names '{"#n":"name"}' \
  --region $REGION \
  --query 'Items[*]' \
  --output json 2>/dev/null | jq -r '.[] | "\(.userEmail.S) - \(.n.S // "unnamed") - Usage: \(.usageCount.N // "0") - Last: \(.lastUsed.S // "never")"' | sort -t: -k3 -nr | head -5

echo ""

# 6. Count total API calls in the last hour
echo "=== API Calls in Last Hour ==="
START_TIME=$(($(date +%s) - 3600))000
END_TIME=$(date +%s)000

CALL_COUNT=$(aws logs filter-log-events \
  --log-group-name "/aws/apigateway/complical-${ENVIRONMENT}" \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --filter-pattern '{ $.status = 200 }' \
  --region $REGION \
  --query 'events | length(@)' \
  --output text 2>/dev/null)

echo "Total API calls with status 200: ${CALL_COUNT:-0}"

# 7. Check for processing errors
echo ""
echo "=== Recent Processing Errors ==="
if [ "$LOG_GROUP" != "None" ]; then
  aws logs filter-log-events \
    --log-group-name "$LOG_GROUP" \
    --start-time $(($(date +%s) - 3600))000 \
    --filter-pattern "[ERROR]" \
    --region $REGION \
    --query 'events[*].message' \
    --output text | head -10
fi

echo ""
echo "=== Diagnostic Summary ==="
echo "1. Check if subscription filter is active and pointing to correct Lambda"
echo "2. Verify API Gateway logs contain authorizer context"
echo "3. Look for errors in process-usage-logs Lambda"
echo "4. Compare API call count with processed count in Lambda logs"