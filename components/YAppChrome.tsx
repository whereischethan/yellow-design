import React from 'react'
import { View, Text, Pressable, Image, ViewStyle } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../constants/theme'
import { useAuth } from '../context/AuthContext'

const LOGO_ASPECT = 781 / 312

interface YAppChromeProps {
  title?: string
  right?: React.ReactNode
  style?: ViewStyle
}

function PersonIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
      <Circle cx={8.5} cy={5.5} r={3} stroke={YL.ink} strokeWidth={1.5} />
      <Path d="M2 15c0-3.314 2.91-5.5 6.5-5.5S15 11.686 15 15" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function getInitials(name?: string, phone?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (phone) return phone.slice(-2)
  return ''
}

export default function YAppChrome({ title, right, style }: YAppChromeProps) {
  const router = useRouter()
  const { user } = useAuth()
  const initials = getInitials(user?.name, user?.phone)

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
        style,
      ]}
    >
      {/* Logo — navigates home */}
      <Pressable
        onPress={() => router.push('/(app)/home')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 30 * LOGO_ASPECT, height: 30 }}
          resizeMode="contain"
        />
      </Pressable>

      {/* Title */}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '500', color: YL.ink, letterSpacing: -0.1 }}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right: custom content OR user avatar */}
      {right ? (
        <View>{right}</View>
      ) : (
        <Pressable
          onPress={() => router.push('/(app)/profile')}
          style={({ pressed }) => ({
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: initials ? YL.yellow : YL.bg2,
            borderWidth: 1.5,
            borderColor: initials ? YL.yellowDeep + '66' : YL.line,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {initials ? (
            <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '600', color: YL.ink }}>
              {initials.slice(0, 1)}
            </Text>
          ) : (
            <PersonIcon />
          )}
        </Pressable>
      )}
    </View>
  )
}
