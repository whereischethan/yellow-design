import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getToken, setToken, clearToken, getDriverMe } from '@/lib/api'
import { registerPushToken } from '@/lib/push'

const DRIVER_KEY = 'yellow_driver_profile'
const IMPERSONATION_FLAG = 'yellow_driver_impersonating'

// Ops entry: admin dashboards open the app with ?impersonate=<short-lived token>.
function consumeImpersonationParam(): string | null {
  if (typeof window === 'undefined' || !window.location?.search) return null
  try {
    const sp = new URLSearchParams(window.location.search)
    const token = sp.get('impersonate')
    if (!token) return null
    sp.delete('impersonate')
    const qs = sp.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
    return token
  } catch {
    return null
  }
}

export interface DriverProfile {
  id: string
  name: string
  phone: string
  photoUrl?: string | null
  rating: number
  status?: string
  trips?: number
  vehicle?: string | null
  plate?: string | null
  bankUpi?: string | null
  assignedVehicle?: {
    id: string
    make: string
    model: string
    color: string
    licensePlate: string
    type: string
    soc: number
    odometer: number
    isEv: boolean
  } | null
}

interface DriverAuthContextType {
  driver: DriverProfile | null
  isLoggedIn: boolean
  isLoading: boolean
  isImpersonating: boolean
  signIn: (token: string, profile: DriverProfile) => Promise<void>
  signOut: () => Promise<void>
  updateDriver: (profile: Partial<DriverProfile>) => void
}

const DriverAuthContext = createContext<DriverAuthContextType>({
  driver: null,
  isLoggedIn: false,
  isLoading: true,
  isImpersonating: false,
  signIn: async () => {},
  signOut: async () => {},
  updateDriver: () => {},
})

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const impToken = consumeImpersonationParam()
        if (impToken) {
          await setToken(impToken)
          await AsyncStorage.setItem(IMPERSONATION_FLAG, '1')
          const me = await getDriverMe().catch(() => null)
          if (me?.driver) {
            await AsyncStorage.setItem(DRIVER_KEY, JSON.stringify(me.driver))
            setDriver(me.driver)
            setIsImpersonating(true)
          }
          return
        }

        const [token, profileStr, impFlag] = await Promise.all([
          getToken(),
          AsyncStorage.getItem(DRIVER_KEY),
          AsyncStorage.getItem(IMPERSONATION_FLAG),
        ])
        if (token && profileStr) {
          setDriver(JSON.parse(profileStr))
          setIsImpersonating(impFlag === '1')
          // Never attach this device's push token to an impersonated account
          if (impFlag !== '1') registerPushToken().catch(() => {})
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  async function signIn(token: string, profile: DriverProfile) {
    await setToken(token)
    await AsyncStorage.setItem(DRIVER_KEY, JSON.stringify(profile))
    setDriver(profile)
    registerPushToken().catch(() => {})
  }

  async function signOut() {
    await clearToken()
    await AsyncStorage.removeItem(DRIVER_KEY)
    await AsyncStorage.removeItem(IMPERSONATION_FLAG)
    setDriver(null)
    setIsImpersonating(false)
  }

  function updateDriver(partial: Partial<DriverProfile>) {
    setDriver((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  return (
    <DriverAuthContext.Provider
      value={{ driver, isLoggedIn: !!driver, isLoading, isImpersonating, signIn, signOut, updateDriver }}
    >
      {children}
    </DriverAuthContext.Provider>
  )
}

export function useDriverAuth() {
  return useContext(DriverAuthContext)
}
