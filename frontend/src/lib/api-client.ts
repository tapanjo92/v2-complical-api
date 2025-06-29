import axios, { AxiosError } from 'axios'
import { useAuthStore } from './auth-store'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Send cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add API key from local storage if available (for dev/testing)
    const devApiKey = localStorage.getItem('complical-dev-key')
    if (devApiKey) {
      config.headers['x-api-key'] = devApiKey
    }
    
    // Add Authorization header with ID token if available
    const idToken = useAuthStore.getState().idToken
    if (idToken) {
      config.headers['Authorization'] = `Bearer ${idToken}`
    }
    
    // Add CSRF token if available
    const csrfToken = useAuthStore.getState().csrfToken
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    
    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        await useAuthStore.getState().refreshAuth()
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      if (retryAfter && !originalRequest._retry) {
        originalRequest._retry = true
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000))
        return apiClient(originalRequest)
      }
    }
    
    return Promise.reject(error)
  }
)

// Type-safe API methods
export const api = {
  // Auth endpoints
  auth: {
    register: (data: { email: string; password: string; companyName?: string }) =>
      apiClient.post('/v1/auth/register', data),
    
    login: (data: { email: string; password: string }) =>
      apiClient.post('/v1/auth/login', data),
    
    logout: () =>
      apiClient.post('/v1/auth/logout'),
    
    refresh: () =>
      apiClient.post('/v1/auth/refresh'),
    
    updatePassword: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/v1/auth/change-password', data),
  },
  
  // API Keys
  apiKeys: {
    list: () =>
      apiClient.get('/v1/auth/api-keys'),
    
    create: (data: { name: string; description?: string; expiresIn?: number }) =>
      apiClient.post('/v1/auth/api-keys', data),
    
    delete: (keyId: string) =>
      apiClient.delete(`/v1/auth/api-keys/${keyId}`),
  },
  
  // Usage analytics
  usage: {
    get: () =>
      apiClient.get('/v1/auth/usage'),
  },
  
  // Deadlines
  deadlines: {
    getGlobal: (params: {
      countries?: string;
      country?: string;
      year?: string;
      month?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }) => apiClient.get('/v1/deadlines', { params }),
    
    getByCountry: (country: string, params?: {
      type?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
      nextToken?: string;
    }) => apiClient.get(`/v1/${country}/deadlines`, { params }),
    
    getByAgency: (country: string, agency: string, params?: {
      type?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
      nextToken?: string;
    }) => apiClient.get(`/v1/${country}/${agency}/deadlines`, { params }),
  },
  
  // Health check
  health: () => apiClient.get('/health'),
}

// Export types
export type ApiError = AxiosError<{
  error?: string;
  message?: string;
  details?: any;
}>