/**
 * Cache key factory for user-scoped data isolation
 * Uses a session identifier to prevent data bleeding between users
 */

// Generate a unique session ID on login
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get or create session ID
export function getSessionId(): string {
  // Store in memory only, not localStorage to prevent persistence
  if (!(window as any).__complical_session_id) {
    (window as any).__complical_session_id = generateSessionId()
  }
  return (window as any).__complical_session_id
}

// Clear session ID on logout
export function clearSessionId(): void {
  delete (window as any).__complical_session_id
}

// Cache key factories with session isolation
export const cacheKeys = {
  usage: (email: string) => ['usage', getSessionId(), email],
  apiKeys: (email: string) => ['apiKeys', getSessionId(), email],
  webhooks: (email: string) => ['webhooks', getSessionId(), email],
  emailPreferences: (email: string) => ['emailPreferences', getSessionId(), email],
}