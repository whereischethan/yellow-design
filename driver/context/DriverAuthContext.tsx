import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getToken, setToken, clearToken } from '@/lib/api'

const DRIVER_KEY = 'yellow_driver_profile'

export interface DriverProfile {
  id: string
  name: string
  phone: string
  photoUrl?: string | null
  rating: number
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
  signIn: (token: string, profile: DriverProfile) => Promise<void>
  signOut: () => Promise<void>
  updateDriver: (profile: Partial<DriverProfile>) => void
}

const DriverAuthContext = createContext<DriverAuthContextType>({
  driver: null,
  isLoggedIn: false,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  updateDriver: () => {},
})

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [token, profileStr] = await Promise.all([
          getToken(),
          AsyncStorage.getItem(DRIVER_KEY),
        ])
        if (token && profileStr) {
          setDriver(JSON.parse(profileStr))
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
  }

  async function signOut() {
    await clearToken()
    await AsyncStorage.removeItem(DRIVER_KEY)
    setDriver(null)
  }

  function updateDriver(partial: Partial<DriverProfile>) {
    setDriver((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  return (
    <DriverAuthContext.Provider
      value={{ driver, isLoggedIn: !!driver, isLoading, signIn, signOut, updateDriver }}
    >
      {children}
    </DriverAuthContext.Provider>
  )
}

export function useDriverAuth() {
  return useContext(DriverAuthContext)
}
