import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from './api-client'

interface User {
  email: string
  companyName?: string
  tier?: string
}

interface ApiKey {
  id: string
  name: string
  description?: string
  keyPrefix: string
  createdAt: string
  expiresAt: string
  lastUsed?: string
  status: string
  usageCount: number
}

interface AuthState {
  user: User | null
  csrfToken: string | null
  apiKeys: ApiKey[]
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, companyName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  loadApiKeys: () => Promise<void>
  createApiKey: (name: string, description?: string) => Promise<ApiKey>
  deleteApiKey: (keyId: string) => Promise<void>
  setDevApiKey: (key: string | null) => void
  getDevApiKey: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      csrfToken: null,
      apiKeys: [],
      isLoading: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.auth.login({ email, password })
          const { email: userEmail, companyName, csrfToken } = response.data
          
          set({
            user: { email: userEmail, companyName },
            csrfToken,
            isLoading: false,
          })
          
          // Load API keys after login
          await get().loadApiKeys()
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
      
      register: async (email: string, password: string, companyName?: string) => {
        set({ isLoading: true })
        try {
          await api.auth.register({ email, password, companyName })
          // Auto-login after registration
          await get().login(email, password)
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
      
      logout: async () => {
        try {
          await api.auth.logout()
        } finally {
          set({ user: null, csrfToken: null, apiKeys: [] })
          // Clear any stored dev API key
          localStorage.removeItem('complical-dev-key')
        }
      },
      
      refreshAuth: async () => {
        try {
          const response = await api.auth.refresh()
          const { email, companyName, csrfToken } = response.data
          
          set({
            user: { email, companyName },
            csrfToken,
          })
        } catch (error) {
          // If refresh fails, clear auth state
          set({ user: null, csrfToken: null, apiKeys: [] })
          throw error
        }
      },
      
      loadApiKeys: async () => {
        try {
          const response = await api.apiKeys.list()
          set({ apiKeys: response.data.apiKeys })
        } catch (error) {
          console.error('Failed to load API keys:', error)
        }
      },
      
      createApiKey: async (name: string, description?: string) => {
        const response = await api.apiKeys.create({ name, description })
        const newKey = response.data
        
        // Add to local state
        set((state) => ({
          apiKeys: [...state.apiKeys, {
            id: newKey.id,
            name: newKey.name,
            description: newKey.description,
            keyPrefix: newKey.keyPrefix,
            createdAt: newKey.createdAt,
            expiresAt: newKey.expiresAt,
            status: 'active',
            usageCount: 0,
            lastUsed: undefined,
          }]
        }))
        
        return newKey
      },
      
      deleteApiKey: async (keyId: string) => {
        await api.apiKeys.delete(keyId)
        
        // Remove from local state
        set((state) => ({
          apiKeys: state.apiKeys.filter(key => key.id !== keyId)
        }))
      },
      
      setDevApiKey: (key: string | null) => {
        if (key) {
          localStorage.setItem('complical-dev-key', key)
        } else {
          localStorage.removeItem('complical-dev-key')
        }
      },
      
      getDevApiKey: () => {
        return localStorage.getItem('complical-dev-key')
      },
    }),
    {
      name: 'complical-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user,
        // Don't persist CSRF token or API keys for security
      }),
    }
  )
)