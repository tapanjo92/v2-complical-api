const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

// Initialize DynamoDB client
const client = new DynamoDBClient({})
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
})

const SESSIONS_TABLE = process.env.SESSIONS_TABLE

// Session configuration
const SESSION_DURATION = 24 * 60 * 60 // 24 hours in seconds
const SESSION_COOKIE_NAME = 'sessionId'

/**
 * Create a new session for a user
 * @param {Object} user - User object with id, email, emailVerified
 * @returns {Object} Session object with sessionId and cookie string
 */
async function createSession(user) {
  const sessionId = crypto.randomUUID()
  const now = Date.now()
  const ttl = Math.floor(now / 1000) + SESSION_DURATION

  const session = {
    sessionId,
    userId: user.id,
    email: user.email,
    emailVerified: user.emailVerified || false,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(ttl * 1000).toISOString(),
    ttl, // DynamoDB TTL in seconds
    userAgent: null, // Can be populated from request headers
    ipAddress: null, // Can be populated from request context
  }

  await ddb.send(new PutCommand({
    TableName: SESSIONS_TABLE,
    Item: session
  }))

  // Create secure cookie string
  // Use SameSite=None for cross-origin requests (CloudFront -> API Gateway)
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    'HttpOnly',
    'Secure',
    'SameSite=None', // Changed from Strict to None for cross-origin
    `Max-Age=${SESSION_DURATION}`,
    'Path=/'
  ]

  return {
    session,
    cookie: cookieOptions.join('; ')
  }
}

/**
 * Validate a session by ID
 * @param {string} sessionId - Session ID to validate
 * @returns {Object|null} Session object if valid, null if invalid/expired
 */
async function validateSession(sessionId) {
  if (!sessionId) return null

  try {
    const result = await ddb.send(new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId }
    }))

    if (!result.Item) return null

    // Check if session is expired (TTL may not have triggered yet)
    const now = Date.now() / 1000
    if (result.Item.ttl && result.Item.ttl < now) {
      // Session is expired, delete it
      await deleteSession(sessionId)
      return null
    }

    return result.Item
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

/**
 * Refresh session expiration (sliding expiration)
 * @param {string} sessionId - Session ID to refresh
 * @returns {Object|null} Updated session with new cookie
 */
async function refreshSession(sessionId) {
  const session = await validateSession(sessionId)
  if (!session) return null

  const now = Date.now()
  const ttl = Math.floor(now / 1000) + SESSION_DURATION

  const updatedSession = {
    ...session,
    lastActivity: new Date(now).toISOString(),
    expiresAt: new Date(ttl * 1000).toISOString(),
    ttl
  }

  await ddb.send(new PutCommand({
    TableName: SESSIONS_TABLE,
    Item: updatedSession
  }))

  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    'HttpOnly',
    'Secure',
    'SameSite=None', // Changed from Strict to None for cross-origin
    `Max-Age=${SESSION_DURATION}`,
    'Path=/'
  ]

  return {
    session: updatedSession,
    cookie: cookieOptions.join('; ')
  }
}

/**
 * Delete a session
 * @param {string} sessionId - Session ID to delete
 */
async function deleteSession(sessionId) {
  if (!sessionId) return

  try {
    await ddb.send(new DeleteCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId }
    }))
  } catch (error) {
    console.error('Session deletion error:', error)
  }
}

/**
 * Delete all sessions for a user (logout from all devices)
 * @param {string} userId - User ID
 */
async function deleteAllUserSessions(userId) {
  try {
    // Query all sessions for the user using GSI
    const result = await ddb.send(new QueryCommand({
      TableName: SESSIONS_TABLE,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }))

    // Delete each session
    const deletePromises = (result.Items || []).map(session =>
      deleteSession(session.sessionId)
    )

    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Delete all sessions error:', error)
  }
}

/**
 * Parse session ID from cookie header
 * @param {Object} headers - Request headers
 * @returns {string|null} Session ID or null
 */
function getSessionIdFromCookie(headers) {
  const cookieHeader = headers?.Cookie || headers?.cookie || ''
  const cookies = cookieHeader.split(';').map(c => c.trim())
  
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=')
    if (name === SESSION_COOKIE_NAME) {
      return value
    }
  }
  
  return null
}

/**
 * Create logout cookie (expired session cookie)
 * @returns {string} Cookie string to clear session
 */
function createLogoutCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/`
}

module.exports = {
  createSession,
  validateSession,
  refreshSession,
  deleteSession,
  deleteAllUserSessions,
  getSessionIdFromCookie,
  createLogoutCookie,
  SESSION_COOKIE_NAME
}