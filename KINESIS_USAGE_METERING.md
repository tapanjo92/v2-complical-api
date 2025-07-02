# Kinesis-Based Usage Metering System

## Overview
The CompliCal API uses AWS Kinesis Data Streams as the primary metric counter for real-time usage tracking and analytics.

## Architecture

### 1. Data Flow
```
API Request → API Gateway → Custom Authorizer → Kinesis Stream → Stream Processor → DynamoDB/CloudWatch
                                    ↓
                              (Fire & Forget)
                                    ↓
                              API Response
```

### 2. Key Components

#### Custom Authorizer (`api-key-authorizer-production.js`)
- Validates API keys
- Sends usage events to Kinesis (fire-and-forget)
- Non-blocking: API continues even if Kinesis fails
- Events include: API_CALL, API_AUTH_FAILED, API_RATE_LIMITED

#### Kinesis Data Stream
- Stream Name: `complical-usage-stream-{environment}`
- Shards: 2 (auto-scalable)
- Retention: 7 days
- Encryption: AWS managed
- Partition Key: User email for even distribution

#### Stream Processor Lambda
- Processes batches of up to 100 records
- Parallelization factor: 10 (processes 10 batches per shard in parallel)
- Aggregates data by:
  - User (all-time stats)
  - Minute (real-time metrics)
  - Hour (usage tracking)
- Stores in Analytics DynamoDB table
- Publishes CloudWatch metrics

#### Analytics Table
- Real-time aggregations
- 90-day retention for raw events
- 7-day retention for aggregates
- Indexes for time-based queries

## Benefits of Kinesis

1. **Performance**
   - Decoupled from API response path
   - Sub-millisecond latency impact
   - Handles 10,000+ RPS

2. **Reliability**
   - 7-day replay capability
   - Automatic retry with exponential backoff
   - Dead letter queue for failed records

3. **Real-time Analytics**
   - Minute-level aggregations
   - Live dashboard updates
   - Instant threshold alerts

4. **Cost Efficiency**
   - Pay per shard hour (~$36/month per shard)
   - Batch processing reduces Lambda invocations
   - Efficient DynamoDB writes through aggregation

## Monitoring

### CloudWatch Dashboard
- Real-time API calls (5-min window)
- Active users (hourly)
- Kinesis stream performance
- Processing latency

### Alarms
- Stream throttling
- Processing failures
- High latency

## Usage Tracking Features

1. **Per-User Metrics**
   - Total API calls
   - Usage patterns
   - Rate limit tracking

2. **Security Analytics**
   - Auth failure patterns
   - Suspicious IPs
   - Rate limit violations

3. **Performance Metrics**
   - API latency
   - Method distribution
   - Popular endpoints

## Deployment Notes

When deploying with Kinesis enabled:
1. Set `ENABLE_KINESIS_ANALYTICS=true` in environment
2. Kinesis stack deploys automatically
3. Stream processor starts receiving events immediately
4. Analytics available in real-time

## Cost Breakdown (Estimated)

For 10 million API calls/month:
- Kinesis: ~$72/month (2 shards)
- Lambda Processing: ~$5/month
- DynamoDB Storage: ~$10/month
- CloudWatch Metrics: ~$3/month
- **Total: ~$90/month**

Compare to:
- Lambda@Edge: ~$400/month
- Direct DynamoDB writes: ~$200/month