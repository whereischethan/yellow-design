import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, TextInput, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YButton from '../../components/YButton'
import { updateProfile } from '../../lib/api'
import { pixelCompleteRegistration } from '../../lib/pixel'
import { useAuth } from '../../context/AuthContext'

export default function ScreenName() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const inputRef = useRef<TextInput>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const pending = localStorage.getItem('pending_referral_code')
      if (pending) setReferralCode(pending)
    }
  }, [])

  const isReady = name.trim().length >= 2

  const handleContinue = async () => {
    if (!isReady || loading) return
    setLoading(true)
    setError('')
    try {
      const updates: Parameters<typeof updateProfile>[0] = { name: name.trim() }
      if (email.trim()) updates.email = email.trim()
      if (referralCode.trim()) updates.appliedReferralCode = referralCode.trim().toUpperCase()
      const updated = await updateProfile(updates)
      updateUser({ name: updated.name, email: updated.email, referralCode: updated.referralCode, referralCredits: updated.referralCredits, referredById: updated.referredById })
      // CompleteRegistration pixel — eventID matches the Conversions API event sent by the server
      pixelCompleteRegistration({ userId: updated.id })
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('pending_referral_code')
      }
      router.replace('/(app)/home')
    } catch (e: any) {
      setError(e.message || 'Could not save name')
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.chrome}>
        <View style={{ width: 36 }} />
        <View style={{ flex: 1 }} />
        <Text style={styles.stepIndicator}>2 / 2</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>{"Set up your\nprofile"}</Text>
        <Text style={styles.description}>
          Your chauffeur will greet you by name.
        </Text>

        {/* Phone (confirmed, read-only) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Phone</Text>
          <View style={[styles.fieldBox, { backgroundColor: YL.bg2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={[styles.nameInput, { color: YL.ink2 }]}>{user?.phone ?? ''}</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: YL.leaf, letterSpacing: 0.3 }}>VERIFIED</Text>
          </View>
        </View>

        <Pressable onPress={() => inputRef.current?.focus()} style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <View style={[styles.fieldBox, name.length > 0 && styles.fieldBoxActive]}>
            <TextInput
              ref={inputRef}
              value={name}
              onChangeText={(t) => { setName(t); if (error) setError('') }}
              style={[styles.nameInput, Platform.OS === 'web' && ({ outlineWidth: 0 } as any)]}
              placeholder="e.g. Aarushi Reddy"
              placeholderTextColor={YL.ink3}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </Pressable>

        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Email (optional)</Text>
          <View style={[styles.fieldBox, email.length > 0 && styles.fieldBoxActive]}>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); if (error) setError('') }}
              style={[styles.nameInput, Platform.OS === 'web' && ({ outlineWidth: 0 } as any)]}
              placeholder="e.g. aarushi@email.com"
              placeholderTextColor={YL.ink3}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Referral code (optional)</Text>
          <View style={[styles.fieldBox, referralCode.length > 0 && styles.fieldBoxActive]}>
            <TextInput
              value={referralCode}
              onChangeText={(t) => { setReferralCode(t.toUpperCase()); if (error) setError('') }}
              style={[styles.nameInput, Platform.OS === 'web' && ({ outlineWidth: 0 } as any)]}
              placeholder="e.g. AARUSHI5678"
              placeholderTextColor={YL.ink3}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={{ flex: 1 }} />

        <YButton variant="ink" size="lg" onPress={handleContinue} disabled={!isReady || loading}>
          {loading ? 'Saving…' : 'Continue →'}
        </YButton>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: YL.bg },
  chrome: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  stepIndicator: { fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, paddingRight: 4 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headline: {
    fontFamily: FONTS.display, fontSize: 34, letterSpacing: -1,
    fontWeight: '500', color: YL.ink, marginBottom: 6,
  },
  description: { fontSize: 14.5, color: YL.ink2, lineHeight: 14.5 * 1.45, marginBottom: 28 },
  fieldLabel: { fontFamily: FONTS.display, fontSize: 12, color: YL.ink2, marginBottom: 6, letterSpacing: 0.1 },
  fieldBox: {
    height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: YL.line,
    backgroundColor: YL.card, justifyContent: 'center', paddingHorizontal: 16,
  },
  fieldBoxActive: { borderColor: YL.ink },
  nameInput: { fontFamily: FONTS.display, fontSize: 17, color: YL.ink },
  errorText: { color: '#C0392B', fontSize: 13, marginBottom: 12 },
})
