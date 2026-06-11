// Expo push registration. No-ops on web and simulators; tolerates missing EAS
// projectId (Expo Go) — real delivery needs a dev/production build.

import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { postPushToken } from './api'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return
    const projectId = (Constants?.expoConfig?.extra as any)?.eas?.projectId
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data
    await postPushToken(token, Platform.OS)
  } catch {
    // Expo Go / missing projectId — registration unavailable, fail silently
  }
}
