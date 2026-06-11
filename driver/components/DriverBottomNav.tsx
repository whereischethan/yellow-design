import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, usePathname } from 'expo-router'
import { YL, FONTS } from '@/constants/theme'

export default function DriverBottomNav() {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()

  const isRoster = pathname.includes('roster')
  const isProfile = pathname.includes('profile')

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/(duty)/roster')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, isRoster && styles.tabIconActive]}>☰</Text>
        <Text style={[styles.tabLabel, isRoster && styles.tabLabelActive]}>Roster</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/(duty)/profile')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, isProfile && styles.tabIconActive]}>◎</Text>
        <Text style={[styles.tabLabel, isProfile && styles.tabLabelActive]}>Profile</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: YL.card,
    borderTopWidth: 1,
    borderTopColor: YL.line,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  tabIcon: {
    fontSize: 20,
    color: YL.ink3,
  },
  tabIconActive: {
    color: YL.ink,
  },
  tabLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.ink3,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: YL.ink,
  },
})
