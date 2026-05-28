import { Stack } from 'expo-router'
import { YL } from '@/constants/theme'

export default function DutyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: YL.bg },
      }}
    />
  )
}
