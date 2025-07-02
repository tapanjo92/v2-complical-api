const { SESClient, SendEmailCommand, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Email templates for different threshold alerts
const EMAIL_TEMPLATES = {
  'usage.threshold.50': {
    subject: '⚠️ CompliCal API Usage Alert: 50% of Monthly Limit Reached',
    template: 'UsageAlert50',
    color: '#FFA500', // Orange
  },
  'usage.threshold.75': {
    subject: '⚠️ CompliCal API Usage Alert: 75% of Monthly Limit Reached',
    template: 'UsageAlert75',
    color: '#FF6347', // Tomato
  },
  'usage.threshold.80': {
    subject: '🚨 CompliCal API Usage Alert: 80% of Monthly Limit Reached',
    template: 'UsageAlert80',
    color: '#DC143C', // Crimson
  },
  'usage.threshold.90': {
    subject: '🚨 URGENT: CompliCal API Usage at 90% of Monthly Limit',
    template: 'UsageAlert90',
    color: '#8B0000', // Dark Red
  },
  'usage.threshold.95': {
    subject: '🚨 CRITICAL: CompliCal API Usage at 95% - Action Required',
    template: 'UsageAlert95',
    color: '#8B0000', // Dark Red
  },
  'usage.threshold.100': {
    subject: '❌ CompliCal API Limit Reached - Service Suspended',
    template: 'UsageAlert100',
    color: '#000000', // Black
  },
};

// Send usage alert email
async function sendUsageAlertEmail(userEmail, eventType, usageData) {
  const template = EMAIL_TEMPLATES[eventType];
  if (!template) {
    console.error(`No email template found for event: ${eventType}`);
    return;
  }

  // For now, send a formatted HTML email
  // In production, you'd create SES email templates
  const htmlBody = generateHtmlEmail(eventType, usageData, template);
  const textBody = generateTextEmail(eventType, usageData);

  const params = {
    Source: process.env.SES_FROM_EMAIL || 'noreply@getcomplical.com',
    Destination: {
      ToAddresses: [userEmail],
    },
    Message: {
      Subject: {
        Data: template.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
    // Add tags for tracking
    Tags: [
      {
        Name: 'event-type',
        Value: eventType,
      },
      {
        Name: 'usage-percentage',
        Value: String(usageData.percentage),
      },
    ],
  };

  try {
    const result = await ses.send(new SendEmailCommand(params));
    console.log(`Email sent successfully to ${userEmail}:`, result.MessageId);
    return result;
  } catch (error) {
    console.error(`Failed to send email to ${userEmail}:`, error);
    throw error;
  }
}

// Generate HTML email body
function generateHtmlEmail(eventType, usageData, template) {
  const { usage, limit, percentage, remainingCalls, resetDate } = usageData;
  const resetDateFormatted = new Date(resetDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${template.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .usage-bar { background-color: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
    .usage-fill { background-color: ${template.color}; height: 100%; width: ${percentage}%; transition: width 0.3s; }
    .stats { display: flex; justify-content: space-between; margin: 20px 0; }
    .stat-box { background: white; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 0 5px; }
    .stat-value { font-size: 24px; font-weight: bold; color: ${template.color}; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">API Usage Alert</h1>
      <p style="margin: 10px 0 0; font-size: 18px;">${percentage.toFixed(1)}% of Monthly Limit Used</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      <p>Your CompliCal API usage has reached <strong>${percentage.toFixed(1)}%</strong> of your monthly limit.</p>
      
      <div class="usage-bar">
        <div class="usage-fill"></div>
      </div>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">${usage.toLocaleString()}</div>
          <div class="stat-label">Calls Used</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${remainingCalls.toLocaleString()}</div>
          <div class="stat-label">Calls Remaining</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${limit.toLocaleString()}</div>
          <div class="stat-label">Monthly Limit</div>
        </div>
      </div>
      
      <p><strong>Usage resets on:</strong> ${resetDateFormatted}</p>
      
      ${percentage >= 90 ? `
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>⚠️ Action Required:</strong> You're approaching your API limit. Consider upgrading your plan to avoid service interruption.
      </div>
      ` : ''}
      
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
      <p>Contact our support team at support@getcomplical.com or visit our documentation.</p>
    </div>
    
    <div class="footer">
      <p>© 2025 CompliCal. All rights reserved.</p>
      <p>You're receiving this email because you have email notifications enabled for your CompliCal account.</p>
      <p><a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard/account">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate plain text email body
function generateTextEmail(eventType, usageData) {
  const { usage, limit, percentage, remainingCalls, resetDate } = usageData;
  const resetDateFormatted = new Date(resetDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
CompliCal API Usage Alert

Your API usage has reached ${percentage.toFixed(1)}% of your monthly limit.

Current Usage:
- Calls Used: ${usage.toLocaleString()} / ${limit.toLocaleString()}
- Calls Remaining: ${remainingCalls.toLocaleString()}
- Usage Resets: ${resetDateFormatted}

${percentage >= 90 ? 'ACTION REQUIRED: You\'re approaching your API limit. Consider upgrading your plan to avoid service interruption.\n\n' : ''}

View your dashboard: https://d1v4wmxs6wjlqf.cloudfront.net/dashboard

What happens when you reach your limit:
- API requests will return 403 Forbidden
- Service will resume at the next billing cycle
- Consider upgrading for uninterrupted service

Need help? Contact support@getcomplical.com

© 2025 CompliCal. All rights reserved.
  `;
}

// Verify email address in SES (for your domain)
async function verifyEmailAddress(email) {
  // This is typically done once during setup
  // Your domain should be verified in SES
  console.log(`Email ${email} should be verified in SES`);
}

module.exports = {
  sendUsageAlertEmail,
  verifyEmailAddress,
  EMAIL_TEMPLATES,
};