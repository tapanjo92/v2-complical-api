const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'ap-south-1' });

async function testEmail() {
  const params = {
    Source: 'noreply@get-comp.dev.tatacommunications.link',
    Destination: {
      ToAddresses: ['tapan.mjo92@outlook.com'], // Must be verified in sandbox
    },
    Message: {
      Subject: {
        Data: '🧪 CompliCal Email Test',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>CompliCal Email System Test</h2>
                <p>Hello! This is a test email from your CompliCal API usage notification system.</p>
                <p>If you're receiving this, your AWS SES setup is working correctly! ✅</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                  This test was sent from: get-comp.dev.tatacommunications.link<br>
                  Powered by CompliCal API
                </p>
              </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: 'CompliCal Email Test - If you can read this, SES is working!',
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const result = await ses.send(new SendEmailCommand(params));
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.MessageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    if (error.message.includes('not verified')) {
      console.log('\n⚠️  Make sure to verify both:');
      console.log('1. Your FROM address: noreply@get-comp.dev.tatacommunications.link');
      console.log('2. Your TO address: tapan.mjo92@outlook.com');
    }
  }
}

// Run the test
testEmail();