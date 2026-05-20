import Constants from 'expo-constants'

export const SUPPORT_WHATSAPP: string =
  (process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP as string) || '918628062808'

export const APP_VERSION: string =
  Constants.expoConfig?.version ?? '1.0.0'
