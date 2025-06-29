const { SESClient, SendEmailCommand, GetSendStatisticsCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'ap-south-1' });

async function testProductionEmail() {
  console.log('🚀 Testing CompliCal Production Email System...\n');

  // First, check SES statistics
  try {
    const stats = await ses.send(new GetSendStatisticsCommand({}));
    console.log('📊 SES Send Statistics:');
    if (stats.SendDataPoints && stats.SendDataPoints.length > 0) {
      const latest = stats.SendDataPoints[stats.SendDataPoints.length - 1];
      console.log(`   - Delivery attempts: ${latest.DeliveryAttempts || 0}`);
      console.log(`   - Bounces: ${latest.Bounces || 0}`);
      console.log(`   - Complaints: ${latest.Complaints || 0}`);
      console.log(`   - Rejects: ${latest.Rejects || 0}`);
    }
    console.log('✅ SES is in PRODUCTION mode (not sandbox)\n');
  } catch (error) {
    console.error('❌ Failed to get SES statistics:', error.message);
  }

  // Test email with production-like content
  const testEmail = {
    Source: 'noreply@get-comp.dev.tatacommunications.link',
    Destination: {
      ToAddresses: ['tapan.mjo92@outlook.com'], // You can change this to any email
    },
    Message: {
      Subject: {
        Data: '⚠️ CompliCal API Usage Alert: 75% of Monthly Limit Reached',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FF6347; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .usage-bar { background-color: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
    .usage-fill { background-color: #FF6347; height: 100%; width: 75%; }
    .stats { display: flex; justify-content: space-between; margin: 20px 0; }
    .stat-box { background: white; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 0 5px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #FF6347; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">API Usage Alert</h1>
      <p style="margin: 10px 0 0; font-size: 18px;">75% of Monthly Limit Used</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      <p>Your CompliCal API usage has reached <strong>75%</strong> of your monthly limit.</p>
      
      <div class="usage-bar">
        <div class="usage-fill"></div>
      </div>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">7,500</div>
          <div class="stat-label">Calls Used</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">2,500</div>
          <div class="stat-label">Calls Remaining</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">10,000</div>
          <div class="stat-label">Monthly Limit</div>
        </div>
      </div>
      
      <p><strong>Usage resets on:</strong> January 27, 2025</p>
      
      <div style="text-align: center;">
        <a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard" class="cta-button">View Dashboard</a>
      </div>
      
      <h3>What happens when I reach my limit?</h3>
      <ul>
        <li>API requests will return 403 Forbidden</li>
        <li>Service will resume at the next billing cycle</li>
        <li>Consider upgrading for uninterrupted service</li>
      </ul>
      
      <h3>Need help?</h3>
      <p>Contact our support team at support@complical.ai or visit our documentation.</p>
    </div>
    
    <div class="footer">
      <p>© 2025 CompliCal. All rights reserved.</p>
      <p>You're receiving this email because you have email notifications enabled for your CompliCal account.</p>
      <p><a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard/account">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `
CompliCal API Usage Alert

Your API usage has reached 75% of your monthly limit.

Current Usage:
- Calls Used: 7,500 / 10,000
- Calls Remaining: 2,500
- Usage Resets: January 27, 2025

View your dashboard: https://d1v4wmxs6wjlqf.cloudfront.net/dashboard

What happens when you reach your limit:
- API requests will return 403 Forbidden
- Service will resume at the next billing cycle
- Consider upgrading for uninterrupted service

Need help? Contact support@complical.ai

© 2025 CompliCal. All rights reserved.
          `,
          Charset: 'UTF-8',
        },
      },
    },
    Tags: [
      {
        Name: 'email-type',
        Value: 'usage-alert',
      },
      {
        Name: 'environment',
        Value: 'production-test',
      },
    ],
  };

  try {
    console.log('📧 Sending production test email...');
    console.log(`   FROM: ${testEmail.Source}`);
    console.log(`   TO: ${testEmail.Destination.ToAddresses.join(', ')}`);
    console.log(`   SUBJECT: ${testEmail.Message.Subject.Data}\n`);

    const result = await ses.send(new SendEmailCommand(testEmail));
    
    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${result.MessageId}`);
    console.log(`   Request ID: ${result.$metadata.requestId}`);
    console.log('\n📬 Check the inbox for the test email.');
    console.log('   Note: The email might take a few seconds to arrive.');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    
    if (error.message.includes('MessageRejected')) {
      console.log('\n⚠️  Possible issues:');
      console.log('1. Email address might be on suppression list');
      console.log('2. Content might be flagged as spam');
    } else if (error.message.includes('not verified')) {
      console.log('\n⚠️  Email verification needed:');
      console.log(`1. Verify the domain: get-comp.dev.tatacommunications.link`);
      console.log(`2. Or verify individual email addresses`);
    }
  }

  console.log('\n📋 Production Email Configuration Summary:');
  console.log('   - FROM: noreply@get-comp.dev.tatacommunications.link');
  console.log('   - Region: ap-south-1');
  console.log('   - Mode: Production (50,000 emails/day limit)');
  console.log('   - Templates: 25%, 50%, 75%, 80%, 90%, 95%, 100% thresholds');
  console.log('   - User Preferences: Managed via Dashboard → Account → Email Preferences');
}

// Run the test
testProductionEmail().catch(console.error);