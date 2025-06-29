# AWS SES Email Setup Guide for CompliCal

## Overview
This guide will help you set up AWS SES (Simple Email Service) to send usage alert emails at 50%, 75%, and 90% thresholds.

## Step 1: Domain Verification (Recommended)

Using your own domain provides better deliverability and professional appearance.

### Option A: Verify Entire Domain (Best)

1. **Go to AWS SES Console**
   ```
   https://console.aws.amazon.com/ses/home?region=ap-south-1#/verified-identities
   ```

2. **Create Identity → Domain**
   - Enter your domain: `yourdomain.com`
   - Check "Use Easy DKIM"
   - Click "Create identity"

3. **Add DNS Records**
   AWS will show you records to add:
   ```
   Type: TXT
   Name: _amazonses.yourdomain.com
   Value: [AWS provides this]
   
   Type: CNAME (3 records for DKIM)
   Name: [AWS provides]._domainkey.yourdomain.com
   Value: [AWS provides].dkim.amazonses.com
   ```

4. **Wait for Verification** (5-72 hours)
   - Status will change from "Pending" to "Verified"
   - DKIM status will show "Successful"

### Option B: Verify Single Email (Quick Test)

1. **Create Identity → Email address**
2. Enter: `noreply@yourdomain.com`
3. Check your email and click verification link

## Step 2: Move Out of Sandbox (Production)

By default, SES is in sandbox mode (can only send to verified emails).

1. **Request Production Access**
   ```
   SES Console → Account dashboard → Request production access
   ```

2. **Fill out the form:**
   - Use case: Transactional emails
   - Website URL: https://complical.ai
   - Description: "API usage alerts for customers at 50%, 75%, 90% thresholds"
   - Expected volume: 1000 emails/month
   - How you handle bounces: "Monitor CloudWatch metrics"

3. **Wait 24-48 hours** for approval

## Step 3: Update CompliCal Configuration

### Update the FROM email in CDK:

```typescript
// infrastructure/lib/api-stack.ts
environment: {
  SES_FROM_EMAIL: 'noreply@yourdomain.com', // Your verified email
}
```

### Deploy the changes:
```bash
cd /home/ubuntu/v2-complical-api/infrastructure
npm run cdk -- deploy CompliCal-API-test --require-approval never
```

## Step 4: Test Email Notifications

### Quick Test (if still in sandbox):
1. Verify your personal email first
2. Make API calls to trigger 50% threshold
3. Check your email

### Production Test:
```bash
# Make enough API calls to hit 50% (5,000 calls)
./scripts/make-1000-calls.sh
# Run 5 times
```

## Email Examples

### 50% Alert (Orange)
Subject: ⚠️ CompliCal API Usage Alert: 50% of Monthly Limit Reached

### 75% Alert (Red-Orange)  
Subject: ⚠️ CompliCal API Usage Alert: 75% of Monthly Limit Reached

### 90% Alert (Dark Red)
Subject: 🚨 URGENT: CompliCal API Usage at 90% of Monthly Limit

## Monitoring Email Delivery

### CloudWatch Metrics
```bash
# Check email sending
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Send \
  --start-time 2025-06-29T00:00:00Z \
  --end-time 2025-06-30T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --dimensions Name=MessageTag,Value=event-type
```

### Check SES Reputation
```bash
# Bounce rate (should be <5%)
aws ses describe-configuration-set-reputation-dashboard-options \
  --configuration-set-name default

# View sending statistics
aws ses get-send-statistics --region ap-south-1
```

## Customization Options

### 1. Change Email Templates
Edit `/backend/services/email-service.js` to customize:
- Email design/colors
- Content/wording
- Add company logo

### 2. Add More Thresholds
Update `EMAIL_NOTIFICATION_THRESHOLDS` array:
```javascript
const EMAIL_NOTIFICATION_THRESHOLDS = [
  'usage.threshold.50',
  'usage.threshold.75', 
  'usage.threshold.80',  // Add 80%
  'usage.threshold.90',
  'usage.threshold.95'   // Add 95%
];
```

### 3. User Preferences
Future enhancement: Add email preferences to user profile:
```javascript
// In DynamoDB user record
{
  email: "user@example.com",
  emailNotifications: {
    enabled: true,
    thresholds: [50, 75, 90]
  }
}
```

## Troubleshooting

### Emails Not Sending
1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/ComplicalProcessWebhooksFunction --since 1h
   ```

2. Verify SES configuration:
   ```bash
   aws ses get-identity-verification-attributes \
     --identities noreply@yourdomain.com
   ```

3. Check IAM permissions

### Emails Going to Spam
1. Verify DKIM is enabled
2. Add SPF record to DNS
3. Use a subdomain like `mail.yourdomain.com`
4. Warm up sending reputation gradually

## Cost
- First 62,000 emails/month: Free
- After that: $0.10 per 1,000 emails
- Estimated cost for CompliCal: $0-$1/month

## Next Steps
1. Verify your domain in SES
2. Request production access
3. Deploy the updated code
4. Test with small batches first
5. Monitor delivery metrics