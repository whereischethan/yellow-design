import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
} from '@expo-google-fonts/bricolage-grotesque'
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { DriverAuthProvider } from '@/context/DriverAuthContext'
import { DutyProvider } from '@/context/DutyContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  })

  const ready = fontsLoaded || !!fontError

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <DriverAuthProvider>
      <DutyProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </DutyProvider>
    </DriverAuthProvider>
  )
}
