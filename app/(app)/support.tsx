import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import * as Linking from 'expo-linking'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import { SUPPORT_WHATSAPP } from '../../constants/config'

const TOPICS = [
  'Partner is late',
  'Lost item',
  'Fare issue',
  'Change pickup',
  'Cancel ride',
  'Other',
]

function WhatsAppIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z"
        fill="#25D366"
      />
      <Path
        d="M16.75 14.47c-.246-.123-1.456-.718-1.682-.8-.226-.082-.39-.123-.554.123-.164.246-.635.8-.778.964-.143.164-.287.185-.533.062-.246-.123-1.038-.383-1.977-1.22-.73-.653-1.222-1.459-1.366-1.705-.144-.246-.015-.379.108-.501.11-.11.246-.287.369-.43.123-.144.164-.246.246-.41.082-.164.041-.308-.02-.43-.062-.123-.554-1.334-.759-1.827-.2-.48-.403-.415-.554-.423l-.472-.008c-.164 0-.43.062-.656.308-.226.246-.86.84-.86 2.05 0 1.21.88 2.379 1.003 2.543.123.164 1.732 2.644 4.197 3.709.587.253 1.045.404 1.402.517.589.187 1.125.16 1.549.097.472-.07 1.456-.595 1.66-1.17.206-.574.206-1.067.144-1.17-.062-.1-.226-.16-.472-.283Z"
        fill="white"
      />
    </Svg>
  )
}

export default function ScreenSupport() {
  const openWhatsApp = (topic?: string) => {
    const msg = topic ? `Hi, I need help with: ${topic}` : 'Hi, I need support with my Yellow ride.'
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg }}>
      <YAppChrome title="Support" />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable
          onPress={() => openWhatsApp()}
          style={({ pressed }) => ({
            paddingHorizontal: 20,
            paddingVertical: 18,
            backgroundColor: YL.card,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: '#25D366',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginBottom: 24,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <WhatsAppIcon />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '600', color: YL.ink }}>
              Chat with Yellow care
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink3, marginTop: 2 }}>
              Opens WhatsApp · typically replies in minutes
            </Text>
          </View>
        </Pressable>

        <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 12 }}>
          QUICK TOPICS
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TOPICS.map(topic => (
            <Pressable
              key={topic}
              onPress={() => openWhatsApp(topic)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: YL.card,
                borderWidth: 1,
                borderColor: YL.line,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: YL.ink }}>{topic}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}
