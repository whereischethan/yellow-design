import { Redirect } from 'expo-router'
import { useDriverAuth } from '@/context/DriverAuthContext'
import { View, ActivityIndicator } from 'react-native'
import { YL } from '@/constants/theme'

export default function Index() {
  const { isLoggedIn, isLoading } = useDriverAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: YL.bg }}>
        <ActivityIndicator color={YL.ink} />
      </View>
    )
  }

  if (isLoggedIn) return <Redirect href="/(duty)/clock-in" />
  return <Redirect href="/(auth)/phone" />
}
