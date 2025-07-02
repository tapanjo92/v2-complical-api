exports.handler = async (event) => {
  console.log('Health check invoked');
  
  // Security check - ensure request came through API Gateway
  if (!event.requestContext || !event.requestContext.apiId) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Forbidden - Direct Lambda invocation not allowed' })
    };
  }
  
  // Note: Health endpoint typically doesn't require authentication
  // so we're not checking for authorizer context
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      // Security headers
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CompliCal API V2',
      environment: process.env.ENVIRONMENT || 'test',
    }),
  };
};