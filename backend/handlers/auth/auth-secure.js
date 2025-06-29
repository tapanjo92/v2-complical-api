const { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  ChangePasswordCommand,
  MessageActionType,
  AuthFlowType
} = require('@aws-sdk/client-cognito-identity-provider');
const { z } = require('zod');
const crypto = require('crypto');

const cognito = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const API_KEYS_TABLE = process.env.API_KEYS_TABLE;
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

// Cookie configuration based on environment
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: ENVIRONMENT !== 'dev', // Only use secure in production
  sameSite: 'Strict',
  path: '/',
  maxAge: 3600, // 1 hour in seconds
};

const REFRESH_COOKIE_CONFIG = {
  ...COOKIE_CONFIG,
  maxAge: 30 * 24 * 3600, // 30 days
};

// Registration schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1).optional(),
});

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

// Helper function to create cookie string
function createCookie(name, value, options) {
  const parts = [`${name}=${value}`];
  
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  
  // Add domain for production
  if (ENVIRONMENT === 'prod') {
    parts.push('Domain=.complical.com'); // Allow subdomain access
  }
  
  return parts.join('; ');
}

// Helper function to get allowed origin
function getAllowedOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigins = [
    'https://complical.com',
    'https://www.complical.com',
    'https://app.complical.com',
    'https://d2xoxkdqlbm2pj.cloudfront.net',
    'https://d1v4wmxs6wjlqf.cloudfront.net', // V2 CloudFront
  ];
  
  // Allow localhost only in dev
  if (ENVIRONMENT === 'dev' || ENVIRONMENT === 'test') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3001');
  }
  
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

exports.handler = async (event) => {
  console.log('Auth handler invoked:', JSON.stringify({
    path: event.path,
    resource: event.resource,
    httpMethod: event.httpMethod,
    pathParameters: event.pathParameters,
  }));
  
  const allowedOrigin = getAllowedOrigin(event);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true', // Required for cookies
    // Security headers
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  const path = event.path || event.resource;

  try {
    // Handle registration
    if (path.endsWith('/register')) {
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        console.error('Failed to parse body:', event.body);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid request body',
            message: 'Request body must be valid JSON',
          }),
        };
      }
      const { email, password, companyName } = registerSchema.parse(body);

      // Create user in Cognito
      const userAttributes = [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:tier', Value: 'free' },
      ];
      
      if (companyName) {
        userAttributes.push({ Name: 'custom:company', Value: companyName });
      }
      
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: userAttributes,
        MessageAction: MessageActionType.SUPPRESS,
        TemporaryPassword: crypto.randomBytes(32).toString('base64'),
      });

      await cognito.send(createUserCommand);

      // Set permanent password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: password,
        Permanent: true,
      });

      await cognito.send(setPasswordCommand);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Registration successful',
          email,
        }),
      };
    }
    
    // Handle login
    if (path.endsWith('/login')) {
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        console.error('Failed to parse body:', event.body);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid request body',
            message: 'Request body must be valid JSON',
          }),
        };
      }
      const { email, password } = loginSchema.parse(body);

      // Authenticate user
      const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: USER_POOL_CLIENT_ID,
        AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const authResponse = await cognito.send(authCommand);
      
      if (!authResponse.AuthenticationResult?.IdToken) {
        throw new Error('Authentication failed');
      }

      // Get user attributes
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      });

      const userResponse = await cognito.send(getUserCommand);
      const companyName = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:company')?.Value || '';
      
      // Create secure httpOnly cookies
      const idTokenCookie = createCookie('id_token', authResponse.AuthenticationResult.IdToken, COOKIE_CONFIG);
      const accessTokenCookie = createCookie('access_token', authResponse.AuthenticationResult.AccessToken, COOKIE_CONFIG);
      const refreshTokenCookie = createCookie('refresh_token', authResponse.AuthenticationResult.RefreshToken, REFRESH_COOKIE_CONFIG);
      
      // Generate CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');
      const csrfCookie = createCookie('csrf_token', csrfToken, {
        ...COOKIE_CONFIG,
        httpOnly: false, // CSRF token needs to be readable by JS
      });
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': idTokenCookie,
        },
        multiValueHeaders: {
          'Set-Cookie': [
            idTokenCookie,
            accessTokenCookie,
            refreshTokenCookie,
            csrfCookie,
          ],
        },
        body: JSON.stringify({
          message: 'Login successful',
          email,
          companyName,
          csrfToken, // Send CSRF token in response for client to use
          // Also return ID token for Authorization header usage
          // Note: This is still secure as the refresh token remains in httpOnly cookie
          idToken: authResponse.AuthenticationResult.IdToken,
        }),
      };
    }
    
    // Handle logout
    if (path.endsWith('/logout')) {
      // Clear all cookies by setting them with past expiration
      const clearCookieConfig = { ...COOKIE_CONFIG, maxAge: 0 };
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': createCookie('id_token', '', clearCookieConfig),
        },
        multiValueHeaders: {
          'Set-Cookie': [
            createCookie('id_token', '', clearCookieConfig),
            createCookie('access_token', '', clearCookieConfig),
            createCookie('refresh_token', '', clearCookieConfig),
            createCookie('csrf_token', '', clearCookieConfig),
          ],
        },
        body: JSON.stringify({
          message: 'Logout successful',
        }),
      };
    }
    
    // Handle token refresh
    if (path.endsWith('/refresh')) {
      // Get refresh token from cookie
      const cookies = event.headers.Cookie || event.headers.cookie || '';
      const refreshToken = cookies
        .split(';')
        .find(c => c.trim().startsWith('refresh_token='))
        ?.split('=')[1];
        
      if (!refreshToken) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'No refresh token',
            message: 'Please login again',
          }),
        };
      }
      
      // Use refresh token to get new tokens
      const refreshCommand = new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: USER_POOL_CLIENT_ID,
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });
      
      const refreshResponse = await cognito.send(refreshCommand);
      
      if (!refreshResponse.AuthenticationResult?.IdToken) {
        throw new Error('Token refresh failed');
      }
      
      // Create new secure cookies
      const idTokenCookie = createCookie('id_token', refreshResponse.AuthenticationResult.IdToken, COOKIE_CONFIG);
      const accessTokenCookie = createCookie('access_token', refreshResponse.AuthenticationResult.AccessToken, COOKIE_CONFIG);
      
      // Get user info from the ID token
      const idTokenPayload = JSON.parse(Buffer.from(refreshResponse.AuthenticationResult.IdToken.split('.')[1], 'base64').toString());
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': idTokenCookie,
        },
        multiValueHeaders: {
          'Set-Cookie': [
            idTokenCookie,
            accessTokenCookie,
          ],
        },
        body: JSON.stringify({
          message: 'Token refreshed successfully',
          email: idTokenPayload.email,
          companyName: idTokenPayload['custom:companyName'],
          csrfToken: crypto.randomBytes(32).toString('hex'),
          idToken: refreshResponse.AuthenticationResult.IdToken,
        }),
      };
    }

    // Handle change password
    if (path.endsWith('/change-password')) {
      // Get token from cookie or Authorization header
      const cookies = event.headers.Cookie || event.headers.cookie || '';
      const authHeader = event.headers.Authorization || event.headers.authorization || '';
      
      let token = null;
      let tokenType = null;
      
      // Try to get from Authorization header first
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        // Check if it's an ID token (has email claim) or access token
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          tokenType = payload.email ? 'id' : 'access';
        } catch (e) {
          tokenType = 'access'; // Default to access token
        }
      } else {
        // Fallback to cookie
        token = cookies
          .split(';')
          .find(c => c.trim().startsWith('access_token='))
          ?.split('=')[1];
        tokenType = 'access';
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Please login to change password',
          }),
        };
      }
      
      // Parse request body
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid request body',
            message: 'Request body must be valid JSON',
          }),
        };
      }
      
      const { currentPassword, newPassword } = changePasswordSchema.parse(body);
      
      // If we have an ID token, we need to get the user's email and use admin commands
      if (tokenType === 'id') {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          const userEmail = payload.email;
          
          if (!userEmail) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                error: 'Invalid token',
                message: 'Token does not contain user email',
              }),
            };
          }
          
          // First, verify the current password by attempting to authenticate
          const authCommand = new AdminInitiateAuthCommand({
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID,
            AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
            AuthParameters: {
              USERNAME: userEmail,
              PASSWORD: currentPassword,
            },
          });
          
          try {
            await cognito.send(authCommand);
          } catch (authError) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                error: 'Invalid password',
                message: 'Current password is incorrect',
              }),
            };
          }
          
          // If authentication succeeded, set the new password
          const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username: userEmail,
            Password: newPassword,
            Permanent: true,
          });
          
          await cognito.send(setPasswordCommand);
        } catch (error) {
          console.error('Error changing password with ID token:', error);
          throw error;
        }
      } else {
        // Use the regular change password flow with access token
        const changePasswordCommand = new ChangePasswordCommand({
          AccessToken: token,
          PreviousPassword: currentPassword,
          ProposedPassword: newPassword,
        });
        
        await cognito.send(changePasswordCommand);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Password updated successfully',
        }),
      };
    }

    // Handle email preferences update
    if (path.endsWith('/email-preferences')) {
      // Get token from Authorization header
      const authHeader = event.headers.Authorization || event.headers.authorization || '';
      
      if (!authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Authorization header required',
          }),
        };
      }
      
      const token = authHeader.substring(7);
      
      // Parse the JWT token to get user email
      let userEmail;
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        userEmail = payload.email;
        
        if (!userEmail) {
          throw new Error('Token does not contain email');
        }
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Invalid token',
            message: 'Could not parse authentication token',
          }),
        };
      }

      // Parse request body
      const body = JSON.parse(event.body || '{}');
      const { enabled, thresholds, customEmail } = body;

      // Validate email format
      if (customEmail && !customEmail.includes('@')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid email',
            message: 'Please provide a valid email address',
          }),
        };
      }

      // Store preferences in DynamoDB (using API keys table for now)
      // In production, you might want a dedicated user preferences table
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
      
      const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
      const API_KEYS_TABLE = process.env.API_KEYS_TABLE;

      // Convert thresholds object to array of enabled thresholds
      const enabledThresholds = Object.entries(thresholds || {})
        .filter(([_, enabled]) => enabled)
        .map(([threshold, _]) => `usage.threshold.${threshold}`);

      // Store user email preferences
      await dynamodb.send(new UpdateCommand({
        TableName: API_KEYS_TABLE,
        Key: {
          id: `USER#${userEmail}`,
        },
        UpdateExpression: 'SET emailPreferences = :prefs, notificationEmail = :email',
        ExpressionAttributeValues: {
          ':prefs': {
            enabled: enabled || false,
            thresholds: enabledThresholds,
          },
          ':email': customEmail || userEmail,
        },
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Email preferences updated successfully',
          preferences: {
            enabled,
            thresholds: enabledThresholds,
            notificationEmail: customEmail || userEmail,
          },
        }),
      };
    }

    // Unknown endpoint
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Not found',
      }),
    };

  } catch (error) {
    console.error('Auth error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation error',
          details: error.errors,
        }),
      };
    }

    if (error.name === 'UsernameExistsException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'User already exists',
          message: 'An account with this email already exists',
        }),
      };
    }

    if (error.name === 'InvalidPasswordException' || error.__type === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid password',
          message: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters',
        }),
      };
    }

    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        }),
      };
    }

    if (error.name === 'UserNotFoundException' || error.__type === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found',
          message: 'No account exists with this email. Please register first.',
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      }),
    };
  }
};