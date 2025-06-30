const { validateSession, getSessionIdFromCookie } = require('./session-manager')

/**
 * Session validation middleware for Lambda handlers
 * Supports both session-based auth AND JWT (for backward compatibility during migration)
 * 
 * @param {Object} event - Lambda event object
 * @returns {Object} { isValid, session, user, authType }
 */
async function validateAuth(event) {
  // 1. First check for session-based auth (new method)
  const sessionId = getSessionIdFromCookie(event.headers)
  
  if (sessionId) {
    const session = await validateSession(sessionId)
    if (session) {
      return {
        isValid: true,
        session,
        user: {
          id: session.userId,
          email: session.email,
          emailVerified: session.emailVerified
        },
        authType: 'session'
      }
    }
  }

  // 2. Fall back to JWT auth (for backward compatibility)
  // Check Authorization header
  const authHeader = event.headers?.Authorization || event.headers?.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // For now, just pass through - the existing JWT validation will handle this
    // This allows dual auth during migration
    return {
      isValid: false, // Let the original handler validate JWT
      session: null,
      user: null,
      authType: 'jwt',
      token
    }
  }

  // 3. Check for JWT in cookies (existing implementation)
  const cookies = parseCookies(event.headers)
  if (cookies.idToken) {
    return {
      isValid: false, // Let the original handler validate JWT
      session: null,
      user: null,
      authType: 'jwt-cookie',
      token: cookies.idToken
    }
  }

  // No valid auth found
  return {
    isValid: false,
    session: null,
    user: null,
    authType: null
  }
}

/**
 * Parse cookies from headers
 * @param {Object} headers - Request headers
 * @returns {Object} Parsed cookies
 */
function parseCookies(headers) {
  const cookieHeader = headers?.Cookie || headers?.cookie || ''
  const cookies = {}
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = value
    }
  })
  
  return cookies
}

/**
 * Create standard unauthorized response
 */
function unauthorizedResponse(message = 'Unauthorized') {
  return {
    statusCode: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    },
    body: JSON.stringify({ error: message })
  }
}

module.exports = {
  validateAuth,
  parseCookies,
  unauthorizedResponse
}