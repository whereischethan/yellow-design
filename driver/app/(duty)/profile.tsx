import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { YL, FONTS } from '@/constants/theme'
import { useDriverAuth } from '@/context/DriverAuthContext'
import { useDuty } from '@/context/DutyContext'
import DriverBottomNav from '@/components/DriverBottomNav'

export default function ProfileScreen() {
  const { driver, signOut } = useDriverAuth()
  const { clearDuty } = useDuty()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const initials = driver?.name
    ? driver.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleLogout() {
    if (!confirmLogout) {
      setConfirmLogout(true)
      return
    }
    setSigningOut(true)
    try {
      await clearDuty()
      await signOut()
      router.replace('/(auth)/phone')
    } finally {
      setSigningOut(false)
      setConfirmLogout(false)
    }
  }

  const vehicle = driver?.assignedVehicle

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Avatar + name card */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.nameCol}>
              <Text style={styles.driverName}>{driver?.name ?? '—'}</Text>
              <Text style={styles.driverPhone}>{driver?.phone ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{driver?.trips ?? 0}</Text>
              <Text style={styles.statLabel}>Trips completed</Text>
            </View>
          </View>
        </View>

        {/* Vehicle card */}
        {vehicle ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>ASSIGNED VEHICLE</Text>
            <View style={styles.vehicleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.vehicleName} numberOfLines={2}>
                  {vehicle.make} {vehicle.model}
                </Text>
                <Text style={styles.vehicleDetail}>{vehicle.color}</Text>
              </View>
              <View style={styles.platePill}>
                <Text style={styles.plateText}>{vehicle.licensePlate}</Text>
              </View>
            </View>
            {vehicle.soc != null && vehicle.soc > 0 && (
              <View style={styles.socRow}>
                <View style={styles.socBarBg}>
                  <View
                    style={[
                      styles.socBarFill,
                      {
                        width: `${vehicle.soc}%` as any,
                        backgroundColor: vehicle.soc < 20 ? YL.gulmohar : YL.leaf,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.socText}>{vehicle.soc}% battery</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* UPI card */}
        {driver?.bankUpi ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>PAYMENT UPI</Text>
            <Text style={styles.upiId}>{driver.bankUpi}</Text>
          </View>
        ) : null}

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, confirmLogout && styles.signOutBtnConfirm]}
          onPress={handleLogout}
          disabled={signingOut}
          activeOpacity={0.75}
        >
          <Text style={styles.signOutText}>
            {signingOut ? 'Signing out…' : confirmLogout ? 'Tap again to confirm' : 'Sign out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DriverBottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  pageTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
    marginBottom: 4,
  },
  card: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 20,
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: YL.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    color: YL.yellow,
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  driverName: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    color: YL.ink,
  },
  driverPhone: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink2,
  },
  divider: {
    height: 1,
    backgroundColor: YL.line,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.mono,
    fontSize: 24,
    color: YL.ink,
  },
  statLabel: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink3,
  },
  sectionEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleName: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 18,
    color: YL.ink,
  },
  vehicleDetail: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
    marginTop: 2,
  },
  platePill: {
    backgroundColor: YL.bg2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  plateText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.ink,
  },
  socRow: {
    gap: 6,
  },
  socBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.line,
    overflow: 'hidden',
  },
  socBarFill: {
    height: 6,
    borderRadius: 3,
  },
  socText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
  },
  upiId: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: YL.ink,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: YL.gulmohar,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutBtnConfirm: {
    backgroundColor: YL.gulmoharSoft,
  },
  signOutText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: YL.gulmohar,
  },
})
