const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const API_KEYS_TABLE = process.env.API_KEYS_TABLE;

exports.handler = async (event) => {
  console.log('Email verification handler invoked:', JSON.stringify({
    queryStringParameters: event.queryStringParameters,
  }));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { token, email } = event.queryStringParameters || {};
    
    if (!token || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing parameters',
          message: 'Verification token and email are required',
        }),
      };
    }
    
    // Fetch verification token
    console.log('Fetching token:', `VERIFY#${token}`);
    const tokenResult = await dynamodb.send(new GetCommand({
      TableName: API_KEYS_TABLE,
      Key: { id: `VERIFY#${token}` },
    }));
    
    console.log('Token result:', JSON.stringify(tokenResult));
    
    if (!tokenResult.Item) {
      console.log('Token not found in database');
      // Return HTML error page instead of JSON
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Failed - CompliCal</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f3f4f6;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
              }
              .error-icon {
                color: #ef4444;
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: #111827;
                margin-bottom: 0.5rem;
              }
              p {
                color: #6b7280;
                margin-bottom: 2rem;
              }
              .button {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background-color: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: background-color 0.2s;
              }
              .button:hover {
                background-color: #2563eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✗</div>
              <h1>Verification Failed</h1>
              <p>The verification link is invalid or has expired. Please request a new verification email.</p>
              <a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard/account" class="button">
                Back to Account Settings
              </a>
            </div>
          </body>
          </html>
        `,
      };
    }
    
    // Safely extract token data
    let userEmail, targetEmail, expiresAt;
    try {
      userEmail = tokenResult.Item.userEmail;
      targetEmail = tokenResult.Item.targetEmail;
      expiresAt = tokenResult.Item.expiresAt;
    } catch (extractError) {
      console.error('Failed to extract token data:', extractError);
      console.error('Token Item:', JSON.stringify(tokenResult.Item));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Failed to process verification token',
        }),
      };
    }
    
    console.log('Token data:', { userEmail, targetEmail, expiresAt, providedEmail: email });
    
    // Check if token is expired
    if (new Date(expiresAt) < new Date()) {
      console.log('Token expired, cleaning up');
      // Clean up expired token
      await dynamodb.send(new DeleteCommand({
        TableName: API_KEYS_TABLE,
        Key: { id: `VERIFY#${token}` },
      }));
      
      // Return HTML error page
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Expired - CompliCal</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f3f4f6;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
              }
              .error-icon {
                color: #f59e0b;
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: #111827;
                margin-bottom: 0.5rem;
              }
              p {
                color: #6b7280;
                margin-bottom: 2rem;
              }
              .button {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background-color: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: background-color 0.2s;
              }
              .button:hover {
                background-color: #2563eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">⏱</div>
              <h1>Verification Link Expired</h1>
              <p>This verification link has expired. Please request a new verification email from your account settings.</p>
              <a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard/account" class="button">
                Back to Account Settings
              </a>
            </div>
          </body>
          </html>
        `,
      };
    }
    
    // Verify email matches
    if (targetEmail !== email) {
      console.log('Email mismatch:', { targetEmail, providedEmail: email });
      // Return HTML error page
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Failed - CompliCal</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f3f4f6;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
              }
              .error-icon {
                color: #ef4444;
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: #111827;
                margin-bottom: 0.5rem;
              }
              p {
                color: #6b7280;
                margin-bottom: 2rem;
              }
              .button {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background-color: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: background-color 0.2s;
              }
              .button:hover {
                background-color: #2563eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✗</div>
              <h1>Verification Failed</h1>
              <p>The email address does not match the verification request. Please check your link and try again.</p>
              <a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard/account" class="button">
                Back to Account Settings
              </a>
            </div>
          </body>
          </html>
        `,
      };
    }
    
    // Update user's email verification status
    try {
      console.log('Updating user email verification status for:', `USER#${userEmail}`);
      await dynamodb.send(new UpdateCommand({
        TableName: API_KEYS_TABLE,
        Key: { id: `USER#${userEmail}` },
        UpdateExpression: 'SET emailVerified = :verified',
        ExpressionAttributeValues: {
          ':verified': true,
        },
      }));
      console.log('Successfully updated email verification status');
    } catch (updateError) {
      console.error('Failed to update user verification status:', updateError);
      throw updateError;
    }
    
    // Clean up verification token
    try {
      console.log('Deleting verification token');
      await dynamodb.send(new DeleteCommand({
        TableName: API_KEYS_TABLE,
        Key: { id: `VERIFY#${token}` },
      }));
      console.log('Successfully deleted verification token');
    } catch (deleteError) {
      console.error('Failed to delete verification token:', deleteError);
      // Continue even if delete fails
    }
    
    // Return HTML page for better UX
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verified - CompliCal</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f3f4f6;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              text-align: center;
              max-width: 400px;
            }
            .success-icon {
              color: #10b981;
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #111827;
              margin-bottom: 0.5rem;
            }
            p {
              color: #6b7280;
              margin-bottom: 2rem;
            }
            .button {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background-color: #3b82f6;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p>Your email address has been successfully verified. You'll now receive API usage notifications at ${email}.</p>
            <a href="https://d1v4wmxs6wjlqf.cloudfront.net/dashboard/account?verified=true" class="button">
              Back to Dashboard
            </a>
          </div>
        </body>
        </html>
      `,
    };
    
  } catch (error) {
    console.error('Email verification error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to verify email address',
      }),
    };
  }
};