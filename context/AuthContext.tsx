import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { restoreAuthToken, restoreUserFromStorage, saveUserToStorage, setAuthToken, getUserProfile } from '../lib/api'
import { registerPushToken } from '../lib/push'

type User = {
  phone: string
  email?: string
  name?: string
  role?: string
  referralCode?: string
  referralCredits?: number
  referredById?: string | null
  bookingCount?: number
}

type AuthContextType = {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  isImpersonating: boolean
  login: (user: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const IMPERSONATION_FLAG = 'yellow_impersonating'

// Ops entry: admin dashboards open the app with ?impersonate=<short-lived token>.
// Consumes the param, stores the token, and flags the session so the UI shows a banner.
function consumeImpersonationParam(): boolean {
  if (typeof window === 'undefined' || !window.location?.search) return false
  try {
    const sp = new URLSearchParams(window.location.search)
    const token = sp.get('impersonate')
    if (token) {
      setAuthToken(token)
      window.localStorage.setItem(IMPERSONATION_FLAG, '1')
      sp.delete('impersonate')
      const qs = sp.toString()
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
      return true
    }
    return window.localStorage.getItem(IMPERSONATION_FLAG) === '1'
  } catch {
    return false
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    async function restoreSession() {
      try {
        const impersonating = consumeImpersonationParam()
        setIsImpersonating(impersonating)
        const token = await restoreAuthToken()
        if (token) {
          // Never attach this device's push token to an impersonated account
          if (!impersonating) registerPushToken().catch(() => {})
          const savedUser = impersonating ? null : await restoreUserFromStorage()
          if (savedUser) setUser(savedUser)
          // Fetch fresh profile to get live bookingCount (enables milestone discounts)
          const profile = await getUserProfile().catch(() => null)
          if (profile) {
            const updated = { ...savedUser, ...profile }
            setUser(updated)
            saveUserToStorage(updated)
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  function login(userData: User) {
    setUser(userData)
    saveUserToStorage(userData)
    registerPushToken().catch(() => {})
  }

  function updateUser(updates: Partial<User>) {
    if (user) {
      const updated = { ...user, ...updates }
      setUser(updated)
      saveUserToStorage(updated)
    }
  }

  function logout() {
    setUser(null)
    setAuthToken(null)
    setIsImpersonating(false)
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(IMPERSONATION_FLAG) } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, isImpersonating, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
