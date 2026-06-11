import { Stack } from 'expo-router'
import { View, Text } from 'react-native'
import { YL, FONTS } from '@/constants/theme'
import { useDriverAuth } from '@/context/DriverAuthContext'

export default function DutyLayout() {
  const { isImpersonating, driver } = useDriverAuth()
  return (
    <View style={{ flex: 1 }}>
      {isImpersonating && (
        <View style={{ backgroundColor: YL.ink, paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.yellow, letterSpacing: 0.4 }}>
            OPS VIEW · {driver?.name ?? 'driver'} · expires in 1h
          </Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: YL.bg },
        }}
      />
    </View>
  )
}
