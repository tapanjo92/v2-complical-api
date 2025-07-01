# 🚀 Deploying Kinesis Real-Time Analytics

This guide walks you through deploying the enterprise-grade Kinesis Data Streams analytics solution for CompliCal API usage tracking.

## Overview

The Kinesis solution provides:
- **Real-time processing** of every API call
- **Sub-second analytics** updates
- **Scalable architecture** handling millions of events
- **Rich dashboards** with CloudWatch integration
- **Historical analysis** with 90-day retention

## Architecture

```
API Gateway → Kinesis Authorizer → Kinesis Data Streams
                                          ↓
                                   Stream Processor Lambda
                                          ↓
                        ┌─────────────────┴─────────────────┐
                        ↓                                   ↓
                  Analytics Table                    Usage Table
                        ↓                                   
                 Real-time Aggregator                       
                        ↓                                   
                CloudWatch Dashboard                        
```

## Pre-Deployment Checklist

- [ ] AWS CLI configured with appropriate credentials
- [ ] Node.js 20.x installed
- [ ] CDK CLI installed (`npm install -g aws-cdk`)
- [ ] Sufficient AWS limits for Kinesis streams
- [ ] Budget approval for ~$100-500/month cost

## Step 1: Build the Backend

```bash
cd /home/ubuntu/v2-complical-api/backend
npm install
```

## Step 2: Deploy Kinesis Infrastructure

```bash
cd /home/ubuntu/v2-complical-api/infrastructure

# Enable Kinesis analytics
export ENABLE_KINESIS_ANALYTICS=true

# Deploy all stacks
npm run deploy
```

This will deploy:
1. Kinesis Data Stream (2 shards)
2. Analytics DynamoDB table
3. Stream processor Lambda
4. Real-time aggregator Lambda
5. CloudWatch Dashboard

## Step 3: Verify Deployment

Check that all resources were created:

```bash
# Check Kinesis stream
aws kinesis describe-stream --stream-name complical-usage-stream-test

# Check Analytics table
aws dynamodb describe-table --table-name complical-analytics-test

# Check Lambda functions
aws lambda list-functions | grep -E "(StreamProcessor|RealtimeAggregator|AnalyticsApi)"
```

## Step 4: Update API Gateway

The API authorizer will automatically switch to Kinesis mode when the stream is available. Verify:

```bash
aws lambda get-function --function-name CompliCal-API-test-ApiKeyAuthorizerFunction* \
  --query 'Configuration.[Handler,Description]'
```

Should show:
- Handler: `handlers/auth/api-key-authorizer-kinesis.handler`
- Description: "Kinesis-enabled authorizer for real-time analytics"

## Step 5: Test the System

Make a test API call:

```bash
curl -X GET https://api.complical.com/test/v1/deadlines?country=AU \
  -H "x-api-key: YOUR_API_KEY"
```

Then check the CloudWatch Dashboard:

```bash
echo "Dashboard URL: https://console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=complical-usage-analytics-test"
```

## Step 6: Monitor Initial Performance

### Check Stream Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name IncomingRecords \
  --dimensions Name=StreamName,Value=complical-usage-stream-test \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Check Processing Latency
```bash
aws cloudwatch get-metric-statistics \
  --namespace CompliCal/Kinesis \
  --metric-name ProcessingLatency \
  --dimensions Name=Environment,Value=test \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Analytics API Endpoints

Once deployed, you can query analytics via:

### Real-time Stats
```bash
curl https://api.complical.com/test/v1/analytics/realtime \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Time Series Data
```bash
curl "https://api.complical.com/test/v1/analytics/timeseries?granularity=hour&duration=24h" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### User Analytics
```bash
curl "https://api.complical.com/test/v1/analytics/user-stats?email=user@example.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Cost Optimization

### Current Configuration (2 shards)
- **Capacity**: 2,000 records/second write, 4 MB/second
- **Cost**: ~$100/month base
- **Good for**: Up to 5M API calls/month

### Scaling Options

1. **Auto-scaling** (recommended):
   ```bash
   aws application-autoscaling register-scalable-target \
     --service-namespace kinesis \
     --resource-id stream/complical-usage-stream-test \
     --scalable-dimension kinesis:stream:shard:count \
     --min-capacity 2 \
     --max-capacity 10
   ```

2. **On-Demand Mode** (for variable traffic):
   Update stack to use `StreamMode.ON_DEMAND`
   - No capacity planning needed
   - Pay per GB of data
   - Good for unpredictable workloads

## Monitoring & Alerts

Key metrics to monitor:

1. **Stream Health**
   - `WriteProvisionedThroughputExceeded` - Add shards if > 0
   - `IteratorAgeMilliseconds` - Processing lag

2. **Processing Performance**
   - `ProcessedRecords` - Should match IncomingRecords
   - `ProcessingLatency` - Should be < 1000ms

3. **Business Metrics**
   - `TotalAPICalls` - Track growth
   - `UniqueUsers` - Active users
   - `AuthFailures` - Security monitoring

## Troubleshooting

### High Iterator Age
```bash
# Check Lambda errors
aws logs tail /aws/lambda/CompliCal-Kinesis-test-StreamProcessor --follow
```

### Missing Data
```bash
# Check authorizer logs
aws logs tail /aws/lambda/CompliCal-API-test-ApiKeyAuthorizerFunction --follow | grep Kinesis
```

### Processing Errors
```bash
# View failed records
aws dynamodb query \
  --table-name complical-analytics-test \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk": {"S": "ERRORS"}}' \
  --limit 10
```

## Rollback Plan

To disable Kinesis and revert to synchronous tracking:

```bash
# Remove Kinesis stack
unset ENABLE_KINESIS_ANALYTICS
cdk destroy CompliCal-Kinesis-test

# Redeploy API stack
cdk deploy CompliCal-API-test
```

The authorizer will automatically revert to the enhanced synchronous mode.

## Success Metrics

After 24 hours, you should see:
- ✅ Zero missed API calls
- ✅ Real-time dashboard updating every minute
- ✅ Processing latency < 500ms average
- ✅ Zero data loss or processing errors
- ✅ Rich analytics available via API

## Next Steps

1. Set up automated reports
2. Create custom dashboards for different user segments
3. Implement predictive analytics on usage patterns
4. Add machine learning for anomaly detection

Congratulations! You now have enterprise-grade real-time analytics for your API usage tracking! 🎉