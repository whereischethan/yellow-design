import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { restoreAuthToken, restoreUserFromStorage, saveUserToStorage, setAuthToken, getUserProfile } from '../lib/api'

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
  login: (user: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await restoreAuthToken()
        if (token) {
          const savedUser = await restoreUserFromStorage()
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
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
