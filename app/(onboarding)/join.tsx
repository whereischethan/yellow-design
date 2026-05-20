import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Platform } from 'react-native'
import { YL } from '../../constants/theme'

export default function JoinScreen() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      localStorage.setItem('pending_referral_code', ref.toUpperCase().trim())
    }
    window.location.href = '/phone'
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: YL.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={YL.ink} />
    </View>
  )
}
