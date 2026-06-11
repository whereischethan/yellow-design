import { Stack } from 'expo-router'
import { View, Text } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { YL, FONTS } from '../../constants/theme'

export default function AppLayout() {
  const { isImpersonating, user } = useAuth()
  return (
    <View style={{ flex: 1 }}>
      {isImpersonating && (
        <View style={{ backgroundColor: YL.ink, paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.yellow, letterSpacing: 0.4 }}>
            OPS VIEW · {user?.name ?? user?.phone ?? 'customer'} · expires in 1h
          </Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  )
}
