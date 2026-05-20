import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, Share, Platform, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Rect } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import GulmoharSpray from '../../components/GulmoharSpray'
import BottomNav from '../../components/BottomNav'
import { useAuth } from '../../context/AuthContext'
import { fetchReferrals, getUserProfile } from '../../lib/api'

function CopyIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={6} y={6} width={9} height={9} rx={2} stroke={YL.yellow} strokeWidth={1.5} />
      <Path
        d="M6 12H4C3.448 12 3 11.552 3 11V4C3 3.448 3.448 3 4 3H11C11.552 3 12 3.448 12 4V6"
        stroke={YL.yellow}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

async function copyToClipboard(text: string) {
  if (Platform.OS === 'web') {
    try {
      await (navigator as any).clipboard?.writeText(text)
    } catch {}
  } else {
    await Share.share({ message: text })
  }
}

export default function ScreenReferral() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [referralCode, setReferralCode] = useState(user?.referralCode ?? '')
  const [earnedCredits, setEarnedCredits] = useState(user?.referralCredits ?? 0)
  const [invited, setInvited] = useState<{ name: string; date: string }[]>([])
  const joinedCount = invited.length

  useEffect(() => {
    fetchReferrals()
      .then(data => {
        setEarnedCredits(data.earned)
        setInvited(data.invited)
      })
      .catch(() => {})
    // Fetch profile to get referralCode for users who logged in before it was included
    if (!user?.referralCode) {
      getUserProfile()
        .then((profile: any) => {
          if (profile.referralCode) {
            setReferralCode(profile.referralCode)
            updateUser({ referralCode: profile.referralCode, referralCredits: profile.referralCredits })
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleWhatsApp = async () => {
    const msg = `Use my Yellow referral code ${referralCode} to get ₹100 off your first ride! 🚖`
    if (Platform.OS === 'web') {
      (window as any).open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
      return
    }
    await Share.share({ message: msg })
  }

  const handleSMS = async () => {
    const msg = `Yellow ride app — use code ${referralCode} for ₹100 off.`
    if (Platform.OS === 'web') {
      (window as any).open(`sms:?body=${encodeURIComponent(msg)}`)
      return
    }
    await Share.share({ message: msg })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden', position: 'relative' }}>
      <GulmoharSpray
        style={{ position: 'absolute', right: -80, top: 40, width: 220, height: 220 }}
        color={YL.gulmohar}
        opacity={0.08}
      />

      <YAppChrome title="Refer a friend" />

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        data={invited}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={
          <>
            {/* Headline */}
            <Text style={{ fontFamily: FONTS.display, fontSize: 34, fontWeight: '500', color: YL.ink, letterSpacing: -1 }}>
              Give ₹100.{'\n'}Get{' '}
              <Text style={{ fontStyle: 'italic' }}>₹100</Text>
              {' back.'}
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: YL.ink2, marginTop: 6 }}>
              Share the ride. Both of you earn.
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink2, marginTop: 10, lineHeight: 22, maxWidth: 310 }}>
              Each friend gets ₹100 off their first ride. You get ₹100 in Yellow credits after they ride.
            </Text>

            {/* Code card */}
            <View style={{
              marginTop: 22,
              paddingHorizontal: 20, paddingVertical: 22,
              backgroundColor: YL.yellow, borderRadius: 22,
              borderWidth: 1.5, borderColor: YL.ink,
            }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink, opacity: 0.7, letterSpacing: 0.5 }}>
                YOUR CODE
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 26, fontWeight: '500', color: YL.ink, letterSpacing: 2, flexShrink: 1 }}>
                  {referralCode}
                </Text>
                <Pressable
                  onPress={() => copyToClipboard(referralCode)}
                  style={({ pressed }) => ({
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: YL.ink, alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1, marginLeft: 10,
                  })}
                >
                  <CopyIcon />
                </Pressable>
              </View>
            </View>

            {/* Share row */}
            <View style={{ flexDirection: 'row', gap: 8, paddingTop: 16 }}>
              <Pressable
                onPress={handleWhatsApp}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 11, borderRadius: 14,
                  backgroundColor: '#25D366', alignItems: 'center', opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '600', color: 'white' }}>
                  WhatsApp
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSMS}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 11, borderRadius: 14,
                  backgroundColor: YL.ink, alignItems: 'center', opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '600', color: 'white' }}>
                  SMS
                </Text>
              </Pressable>
              <Pressable
                onPress={() => copyToClipboard(referralCode)}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 11, borderRadius: 14,
                  backgroundColor: YL.card, borderWidth: 1.5, borderColor: YL.ink,
                  alignItems: 'center', opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '600', color: YL.ink }}>
                  Copy
                </Text>
              </Pressable>
            </View>

            {/* Stats card */}
            <View style={{
              marginTop: 22, padding: 16,
              backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line, borderRadius: 18,
            }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginBottom: 10 }}>
                YOUR REFERRALS · ಶಿಫಾರಸುಗಳು
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {[
                  { value: String(joinedCount), label: 'Invited' },
                  { value: String(joinedCount), label: 'Joined' },
                  { value: `₹${earnedCredits}`, label: 'Earned' },
                ].map((stat, i, arr) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1, paddingLeft: 4,
                      borderRightWidth: i < arr.length - 1 ? 1 : 0,
                      borderRightColor: YL.lineSoft,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: '500', color: YL.ink, letterSpacing: -0.4 }}>
                      {stat.value}
                    </Text>
                    <Text style={{ fontFamily: FONTS.display, fontSize: 11.5, color: YL.ink3, marginTop: 4 }}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Friends list header */}
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3, letterSpacing: 0.3, marginTop: 20, marginBottom: 10 }}>
              PEOPLE WHO JOINED
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={{
            paddingVertical: 24, alignItems: 'center',
            backgroundColor: YL.card, borderRadius: 16,
            borderWidth: 1, borderColor: YL.line,
          }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink3 }}>
              No one yet — be the first to share!
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3, marginTop: 4 }}>
              Friends who join through your code appear here.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{
            flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
            backgroundColor: YL.card,
            borderTopLeftRadius: index === 0 ? 16 : 0,
            borderTopRightRadius: index === 0 ? 16 : 0,
            borderBottomLeftRadius: index === invited.length - 1 ? 16 : 0,
            borderBottomRightRadius: index === invited.length - 1 ? 16 : 0,
            borderWidth: 1, borderColor: YL.line,
            borderTopWidth: index === 0 ? 1 : 0,
          }}>
            <View style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: YL.bg2, alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '600', color: YL.ink }}>
                {item.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>{item.name}</Text>
              <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3 }}>{item.date}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: YL.leafSoft }}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 11, color: YL.leaf, fontWeight: '500' }}>Joined</Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3, textAlign: 'center', marginTop: 24, lineHeight: 18 }}>
            Credits auto-apply on your next booking. No limit on invites.
          </Text>
        }
      />
      <BottomNav
        active="rewards"
        onRide={() => router.push('/(app)/home')}
        onHistory={() => router.push('/(app)/history')}
        onAccount={() => router.push('/(app)/profile')}
      />
    </SafeAreaView>
  )
}
