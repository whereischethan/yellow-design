import React from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { YL, FONTS } from '../constants/theme'

type NavItem = 'ride' | 'history' | 'rewards' | 'account'

interface BottomNavProps {
  active: NavItem
  onRide?: () => void
  onHistory?: () => void
  onRewards?: () => void
  onAccount?: () => void
}

function IconCar({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M3 11L5.5 5.5H16.5L19 11V16H3V11Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx={6.5} cy={16} r={1.5} fill={color} />
      <Circle cx={15.5} cy={16} r={1.5} fill={color} />
      <Path
        d="M3 11H19"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M7 8.5H15"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconClock({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={1.6} />
      <Path
        d="M11 7V11L14 13"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconStarFilled({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Path
        d="M11 3L13.09 8.26L18.82 8.73L14.64 12.37L15.98 18L11 15.06L6.02 18L7.36 12.37L3.18 8.73L8.91 8.26L11 3Z"
        fill={color}
      />
    </Svg>
  )
}

function IconPerson({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={7.5} r={3.5} stroke={color} strokeWidth={1.6} />
      <Path
        d="M4 19C4 15.134 7.134 12 11 12C14.866 12 18 15.134 18 19"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  )
}

const items: { key: NavItem; label: string }[] = [
  { key: 'ride', label: 'Ride' },
  { key: 'history', label: 'History' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'account', label: 'Account' },
]

function NavIcon({ item, color }: { item: NavItem; color: string }) {
  switch (item) {
    case 'ride':
      return <IconCar color={color} size={22} />
    case 'history':
      return <IconClock color={color} size={22} />
    case 'rewards':
      return <IconStarFilled color={color} size={22} />
    case 'account':
      return <IconPerson color={color} size={22} />
  }
}

export default function BottomNav({
  active,
  onRide,
  onHistory,
  onRewards,
  onAccount,
}: BottomNavProps) {
  const handlers: Record<NavItem, (() => void) | undefined> = {
    ride: onRide,
    history: onHistory,
    rewards: onRewards,
    account: onAccount,
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: YL.card,
        borderTopWidth: 1,
        borderTopColor: YL.line,
      }}
    >
      {items.map(({ key, label }) => {
        const isActive = active === key
        const color = isActive ? YL.ink : YL.ink3

        return (
          <Pressable
            key={key}
            onPress={handlers[key]}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              paddingBottom: 6,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <NavIcon item={key} color={color} />
            <Text
              style={{
                fontFamily: isActive ? FONTS.displaySemiBold : FONTS.display,
                fontSize: 10.5,
                color,
                marginTop: 3,
                letterSpacing: 0.1,
              }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
