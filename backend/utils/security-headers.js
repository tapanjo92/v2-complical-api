/**
 * Security headers utility for all API responses
 * Following OWASP security best practices
 */

const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS filter in browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Control Referer header
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Enforce HTTPS
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Content Security Policy
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  
  // Prevent caching of sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Get CORS origin based on environment
 */
function getAllowedOrigin(origin, environment) {
  const allowedOrigins = [
    'https://getcomplical.com',
    'https://www.getcomplical.com',
    'https://app.getcomplical.com',
    'https://complical.com', // Legacy support
    'https://www.complical.com',
  ];
  
  // Allow localhost only in dev/test environments
  if (environment === 'dev' || environment === 'test') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3001');
    allowedOrigins.push('http://localhost:5173'); // Vite default
  }
  
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response, event = {}, environment = 'prod') {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigin = getAllowedOrigin(origin, environment);
  
  return {
    ...response,
    headers: {
      ...response.headers,
      ...SECURITY_HEADERS,
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
  };
}

module.exports = {
  SECURITY_HEADERS,
  getAllowedOrigin,
  addSecurityHeaders,
};