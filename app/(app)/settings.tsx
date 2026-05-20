import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Platform, Modal, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import { APP_VERSION, SUPPORT_WHATSAPP } from '../../constants/config'

const SETTINGS_KEY = 'yellow_settings'

const NOTIFICATIONS = [
  { label: 'Ride updates', sub: 'Partner assigned, arrived, trip changes', on: true },
  { label: 'Flight alerts', sub: 'Delays & gate changes auto-adjust pickup', on: true },
  { label: 'Offers & promos', sub: 'Weekly · unsubscribe anytime', on: false },
  { label: 'Weekly ride summary', sub: 'Every Monday · ₹ + CO₂ saved', on: true, last: true },
]

function ShieldIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 1.5L13.5 3.5V8C13.5 11 11 13.5 8 15C5 13.5 2.5 11 2.5 8V3.5L8 1.5Z"
        stroke={YL.ink}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 8L7 9.5L10.5 6"
        stroke={YL.ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function DownloadIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M8 2V10M8 10L5 7M8 10L11 7" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 12H14" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function XIcon({ danger = false }) {
  const color = danger ? '#C0392B' : YL.ink
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M4 4L12 12M12 4L4 12" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  )
}

function ChevronRight({ danger = false }) {
  const color = danger ? '#C0392B' : YL.ink3
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 3L11 8L6 13"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

interface ToggleRowProps {
  label: string
  sub: string
  on: boolean
  last?: boolean
  onToggle: () => void
}

function ToggleRow({ label, sub, on, last = false, onToggle }: ToggleRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: YL.lineSoft,
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>
          {label}
        </Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3, marginTop: 1 }}>
          {sub}
        </Text>
      </View>
      <Pressable
        onPress={onToggle}
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          backgroundColor: on ? YL.ink : YL.line,
          padding: 2,
          justifyContent: 'center',
          alignItems: on ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: 'white',
          }}
        />
      </Pressable>
    </View>
  )
}

interface LinkRowProps {
  icon: 'shield' | 'download' | 'x'
  label: string
  sub: string
  danger?: boolean
  last?: boolean
  comingSoon?: boolean
  onPress?: () => void
}

function LinkRow({ icon, label, sub, danger = false, last = false, comingSoon = false, onPress }: LinkRowProps) {
  return (
    <Pressable
      onPress={comingSoon ? undefined : onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: YL.lineSoft,
        gap: 12,
        opacity: comingSoon ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: danger ? '#FDECEA' : YL.bg2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon === 'shield' && <ShieldIcon />}
        {icon === 'download' && <DownloadIcon />}
        {icon === 'x' && <XIcon danger={danger} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: danger ? '#C0392B' : YL.ink }}>
            {label}
          </Text>
          {comingSoon && (
            <View style={{ backgroundColor: YL.bg2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 9, color: YL.ink3, letterSpacing: 0.3 }}>SOON</Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 12,
            color: danger ? '#E0726A' : YL.ink3,
          }}
        >
          {sub}
        </Text>
      </View>
      <ChevronRight danger={danger} />
    </Pressable>
  )
}

export default function ScreenSettings() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS.map((n) => ({ ...n })))
  const [maskedCallsModal, setMaskedCallsModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const stored = Platform.OS === 'web'
          ? localStorage.getItem(SETTINGS_KEY)
          : await AsyncStorage.getItem(SETTINGS_KEY)
        if (stored) {
          const saved: Record<string, boolean> = JSON.parse(stored)
          setNotifications(prev => prev.map(n => ({ ...n, on: saved[n.label] ?? n.on })))
        }
      } catch {}
    }
    load()
  }, [])

  const toggleNotification = async (idx: number) => {
    const next = notifications.map((n, i) => (i === idx ? { ...n, on: !n.on } : n))
    setNotifications(next)
    const toSave = Object.fromEntries(next.map(n => [n.label, n.on]))
    try {
      const json = JSON.stringify(toSave)
      if (Platform.OS === 'web') {
        localStorage.setItem(SETTINGS_KEY, json)
      } else {
        await AsyncStorage.setItem(SETTINGS_KEY, json)
      }
    } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden' }}>
      <YAppChrome
        title="Settings"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications section */}
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10.5,
            color: YL.ink3,
            letterSpacing: 0.3,
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          NOTIFICATIONS
        </Text>
        <View
          style={{
            backgroundColor: YL.card,
            borderWidth: 1,
            borderColor: YL.line,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {notifications.map((n, i) => (
            <ToggleRow
              key={n.label}
              label={n.label}
              sub={n.sub}
              on={n.on}
              last={n.last}
              onToggle={() => toggleNotification(i)}
            />
          ))}
        </View>

        {/* Privacy section */}
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10.5,
            color: YL.ink3,
            letterSpacing: 0.3,
            marginTop: 24,
            marginBottom: 10,
          }}
        >
          PRIVACY
        </Text>
        <View
          style={{
            backgroundColor: YL.card,
            borderWidth: 1,
            borderColor: YL.line,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <LinkRow icon="shield" label="Masked calls" sub="Driver never sees your number" comingSoon />
          <LinkRow icon="download" label="Download my data" sub="JSON + receipts" last onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi, I would like to request a copy of my Yellow account data.')}`)} />
        </View>

        {/* Version footer */}
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: YL.ink3,
            textAlign: 'center',
            marginTop: 28,
            letterSpacing: 0.4,
          }}
        >
          {`YELLOW v${APP_VERSION} · MADE IN BENGALURU`}
        </Text>
      </ScrollView>

      <Modal visible={maskedCallsModal} transparent animationType="fade" onRequestClose={() => setMaskedCallsModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(43,39,32,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: YL.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: '600', color: YL.ink, marginBottom: 8 }}>Coming soon</Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink2, lineHeight: 21, marginBottom: 24 }}>
              Masked calls will hide your number from drivers. Stay tuned — it's on the way.
            </Text>
            <Pressable
              onPress={() => setMaskedCallsModal(false)}
              style={({ pressed }) => ({
                backgroundColor: YL.ink, borderRadius: 12, paddingVertical: 13,
                alignItems: 'center', opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '600', color: YL.yellow }}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
