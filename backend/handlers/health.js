const { addSecurityHeaders } = require('../utils/security-headers');

exports.handler = async (event) => {
  console.log('Health check invoked');
  
  // Security check - ensure request came through API Gateway
  if (!event.requestContext || !event.requestContext.apiId) {
    return addSecurityHeaders({
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Forbidden - Direct Lambda invocation not allowed' })
    }, event, process.env.ENVIRONMENT);
  }
  
  // Note: Health endpoint typically doesn't require authentication
  // so we're not checking for authorizer context
  
  return addSecurityHeaders({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CompliCal API V2',
      environment: process.env.ENVIRONMENT || 'test',
    }),
  }, event, process.env.ENVIRONMENT);
};