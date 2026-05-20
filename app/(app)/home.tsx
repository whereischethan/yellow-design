import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YBrand from '../../components/YBrand'
import BottomNav from '../../components/BottomNav'
import { useAuth } from '../../context/AuthContext'

// Airport illustration
function AirportIllustration() {
  return (
    <Svg width={72} height={64} viewBox="0 0 72 64" fill="none">
      {/* Dashed runway line */}
      <Path
        d="M6 50 H66"
        stroke={YL.ink}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      {/* Plane body */}
      <Path
        d="M10 32 L28 26 L44 14 L52 12 Q58 12 56 18 L46 30 L60 34 L64 36 L60 40 L44 38 L36 46 L32 46 L34 38 L20 34 L16 38 L12 38 L14 32 Z"
        fill={YL.ink}
      />
    </Svg>
  )
}

// Outstation illustration
function OutstationIllustration() {
  return (
    <Svg width={72} height={64} viewBox="0 0 72 64" fill="none">
      {/* Road curve */}
      <Path
        d="M4 48 Q20 42 36 44 T68 40"
        stroke={YL.ink}
        strokeWidth={1.5}
        fill="none"
      />
      {/* Dashed line */}
      <Path
        d="M4 56 H68"
        stroke={YL.ink}
        strokeWidth={1.5}
        strokeDasharray="2 4"
      />
      {/* Mountains */}
      <Path
        d="M14 36 L22 20 L34 22 L48 14 L58 22 L62 36 Z"
        fill={YL.leaf}
        opacity={0.6}
      />
      {/* Sun */}
      <Circle cx={54} cy={16} r={5} fill={YL.yellow} stroke={YL.ink} strokeWidth={1.3} />
    </Svg>
  )
}

// Hourly illustration
function HourlyIllustration() {
  return (
    <Svg width={72} height={64} viewBox="0 0 72 64" fill="none">
      {/* Clock circle */}
      <Circle cx={36} cy={32} r={22} stroke={YL.ink} strokeWidth={1.8} fill={YL.card} />
      {/* Hands */}
      <Path
        d="M36 18 V32 L46 40"
        stroke={YL.ink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center dot */}
      <Circle cx={36} cy={32} r={2} fill={YL.ink} />
      {/* Tick at 0 (top) */}
      <Rect x={35} y={11} width={2} height={4} rx={1} fill={YL.ink} />
      {/* Tick at 90 (right) */}
      <Rect x={35} y={11} width={2} height={4} rx={1} fill={YL.ink} transform="rotate(90, 36, 32)" />
      {/* Tick at 180 (bottom) */}
      <Rect x={35} y={11} width={2} height={4} rx={1} fill={YL.ink} transform="rotate(180, 36, 32)" />
      {/* Tick at 270 (left) */}
      <Rect x={35} y={11} width={2} height={4} rx={1} fill={YL.ink} transform="rotate(270, 36, 32)" />
    </Svg>
  )
}

type RideKind = 'airport' | 'outstation' | 'hourly'

interface RideTypeData {
  kind: RideKind
  title: string
  blurb: string
  featured?: boolean
}

const RIDE_TYPES: RideTypeData[] = [
  {
    kind: 'airport',
    title: 'Airport',
    blurb: 'Flight-aware, zero-cancel to BLR T1/T2',
    featured: true,
  },
  {
    kind: 'outstation',
    title: 'Outstation',
    blurb: 'Mysuru, Coorg, Ooty — 1-way or multi-day',
  },
  {
    kind: 'hourly',
    title: 'Hourly rental',
    blurb: 'Keep the car for 4, 8 or 12 hours',
  },
]

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M6 3L12 9L6 15"
        stroke={YL.ink}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function RideIllustration({ kind }: { kind: RideKind }) {
  switch (kind) {
    case 'airport':
      return <AirportIllustration />
    case 'outstation':
      return <OutstationIllustration />
    case 'hourly':
      return <HourlyIllustration />
  }
}

function RideTypeCard({
  data,
  onPress,
}: {
  data: RideTypeData
  onPress: () => void
}) {
  const featured = data.featured ?? false

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.rideCard,
        featured && styles.rideCardFeatured,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      {/* Illustration */}
      <View style={styles.rideIllustration}>
        <RideIllustration kind={data.kind} />
      </View>

      {/* Middle info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.rideTitle}>{data.title}</Text>
        <Text style={[styles.rideBlurb, { color: featured ? 'rgba(26,20,10,0.72)' : YL.ink2 }]}>
          {data.blurb}
        </Text>
      </View>

      {/* Chevron */}
      <ChevronRight />
    </Pressable>
  )
}

export default function ScreenHome() {
  const router = useRouter()
  const { user } = useAuth()
  const displayName = user?.name
    ? user.name.split(' ')[0].toUpperCase()
    : user?.phone?.slice(-4) || ''

  const handleCardPress = (kind: RideKind) => {
    switch (kind) {
      case 'airport':
        router.push('/(app)/airport')
        break
      case 'outstation':
        router.push('/(app)/outstation')
        break
      case 'hourly':
        router.push('/(app)/hourly')
        break
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <YBrand size={24} logoSource={require('../../assets/logo.png')} />
        <Pressable
          onPress={() => router.push('/(app)/profile')}
          style={({ pressed }) => [styles.avatar, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.avatarText}>{displayName.slice(0, 1) || '?'}</Text>
        </Pressable>
      </View>

      {/* Greeting */}
      <View style={styles.greeting}>
        {!!displayName && (
          <Text style={styles.greetingName}>{displayName}</Text>
        )}
        <Text style={styles.headline}>
          {'Where to, '}
          <Text style={[styles.headline, { fontStyle: 'italic' }]}>today?</Text>
        </Text>
      </View>

      {/* Card deck */}
      <View style={styles.cardDeck}>
        {RIDE_TYPES.map((item) => (
          <RideTypeCard
            key={item.kind}
            data={item}
            onPress={() => handleCardPress(item.kind)}
          />
        ))}
      </View>

      {/* Bottom Nav */}
      <BottomNav
        active="ride"
        onHistory={() => router.push('/(app)/history')}
        onRewards={() => router.push('/(app)/referral')}
        onAccount={() => router.push('/(app)/profile')}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: YL.yellow,
    borderWidth: 1.5,
    borderColor: YL.yellowDeep + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: YL.ink,
  },
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  greetingName: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    letterSpacing: 0.4,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 30,
    letterSpacing: -0.9,
    fontWeight: '500',
    color: YL.ink,
    marginTop: 6,
  },
  cardDeck: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  rideCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: YL.card,
    borderWidth: 1.5,
    borderColor: YL.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rideCardFeatured: {
    backgroundColor: YL.yellow,
    borderColor: YL.ink,
    shadowColor: YL.yellowDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  rideIllustration: {
    width: 72,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: YL.ink,
  },
  rideBlurb: {
    fontSize: 12.5,
    lineHeight: 12.5 * 1.35,
    marginTop: 3,
  },
})
