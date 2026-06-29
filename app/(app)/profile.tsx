import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Platform, Linking, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import BottomNav from '../../components/BottomNav'
import GulmoharSpray from '../../components/GulmoharSpray'
import { IconChevronRight } from '../../components/icons'
import { useAuth } from '../../context/AuthContext'
import { updateProfile, getBookings, getSavedPlaces, createSavedPlace, updateSavedPlace, deleteSavedPlace, type SavedPlace as SavedPlaceType } from '../../lib/api'
import LocationAutocomplete from '../../components/location/LocationAutocomplete'

function openWhatsApp(number: string) {
  const url = `https://wa.me/${number}`
  if (Platform.OS === 'web') {
    (window as any).open(url, '_blank')
  } else {
    Linking.openURL(url)
  }
}

function showAlert(title: string, message: string, onConfirm?: () => void) {
  if (Platform.OS === 'web') {
    if (onConfirm) {
      if ((window as any).confirm(`${title}\n\n${message}`)) onConfirm()
    } else {
      (window as any).alert(`${title}\n\n${message}`)
    }
  } else {
    Alert.alert(title, message, onConfirm
      ? [{ text: 'Cancel', style: 'cancel' }, { text: title, style: 'destructive', onPress: onConfirm }]
      : [{ text: 'OK' }]
    )
  }
}

function getInitials(name?: string, phone?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (phone) return phone.slice(-2)
  return '?'
}

function formatPhone(phone?: string): string {
  if (!phone) return '—'
  if (phone.startsWith('91') && phone.length === 12) {
    return `+91 ${phone.slice(2, 7)} ${phone.slice(7)}`
  }
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
  }
  return phone
}

function ChevronRight() {
  return <IconChevronRight size={16} color={YL.ink3} />
}

interface SavedPlaceProps {
  icon: 'home' | 'work' | 'add'
  name: string
  addr: string
  last?: boolean
  onPress?: () => void
}

function PlaceIcon({ icon }: { icon: 'home' | 'work' | 'add' }) {
  if (icon === 'home') {
    return (
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M2 7L8 2L14 7V14H10V10H6V14H2V7Z" stroke={YL.ink} strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
    )
  }
  if (icon === 'work') {
    return (
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M5 5V3.5C5 2.672 5.672 2 6.5 2H9.5C10.328 2 11 2.672 11 3.5V5" stroke={YL.ink} strokeWidth={1.5} />
        <Path d="M1 5H15V13C15 13.552 14.552 14 14 14H2C1.448 14 1 13.552 1 13V5Z" stroke={YL.ink} strokeWidth={1.5} />
      </Svg>
    )
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M8 3V13M3 8H13" stroke={YL.ink} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  )
}

function SavedPlace({ icon, name, addr, last = false, onPress }: SavedPlaceProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: YL.lineSoft,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: YL.bg2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PlaceIcon icon={icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>
          {name}
        </Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3 }}>{addr}</Text>
      </View>
      {icon !== 'add' && <ChevronRight />}
    </Pressable>
  )
}

function MenuIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'clock':
      return (
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Circle cx={8} cy={8} r={6} stroke={YL.ink} strokeWidth={1.5} />
          <Path d="M8 5V8L10 10" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'card':
      return (
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M1 4H15V12C15 12.552 14.552 13 14 13H2C1.448 13 1 12.552 1 12V4Z" stroke={YL.ink} strokeWidth={1.5} />
          <Path d="M1 7H15" stroke={YL.ink} strokeWidth={1.5} />
        </Svg>
      )
    case 'gift':
      return (
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path d="M1 6H15V9H1V6Z" stroke={YL.ink} strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="M2 9V14H14V9" stroke={YL.ink} strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="M8 6V14M8 6C8 6 6 4 6 3C6 2.448 6.448 2 7 2C7.552 2 8 2.672 8 3.5" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M8 6C8 6 10 4 10 3C10 2.448 9.552 2 9 2C8.448 2 8 2.672 8 3.5" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      )
    case 'help':
      return (
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Circle cx={8} cy={8} r={6} stroke={YL.ink} strokeWidth={1.5} />
          <Path d="M6 6.5C6 5.395 6.895 4.5 8 4.5C9.105 4.5 10 5.395 10 6.5C10 7.5 8 8.5 8 8.5" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx={8} cy={11} r={0.75} fill={YL.ink} />
        </Svg>
      )
    case 'gear':
    default:
      return (
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Circle cx={8} cy={8} r={2.5} stroke={YL.ink} strokeWidth={1.5} />
          <Path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.05 3.05L4.46 4.46M11.54 11.54L12.95 12.95M12.95 3.05L11.54 4.46M4.46 11.54L3.05 12.95" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      )
  }
}

interface MenuRowProps {
  icon: string
  label: string
  sub: string
  accent?: boolean
  last?: boolean
  onPress?: () => void
}

function MenuRow({ icon, label, sub, accent = false, last = false, onPress }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: YL.lineSoft,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: accent ? YL.yellow : YL.bg2,
          borderWidth: accent ? 1.5 : 0,
          borderColor: accent ? YL.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MenuIcon icon={icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '500', color: YL.ink }}>
          {label}
        </Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3 }}>{sub}</Text>
      </View>
      <ChevronRight />
    </Pressable>
  )
}

export default function ScreenProfile() {
  const router = useRouter()
  const { user, logout, updateUser } = useAuth()

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [rideCount, setRideCount] = useState<number | null>(null)
  const [showBizInfo, setShowBizInfo] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceType[]>([])
  const [editingPlace, setEditingPlace] = useState<SavedPlaceType | null>(null)
  const [addingPlace, setAddingPlace] = useState(false)
  const [placeLabel, setPlaceLabel] = useState('')
  const [placeAddress, setPlaceAddress] = useState('')
  const [placeData, setPlaceData] = useState<{ placeId?: string; lat?: number; lng?: number } | null>(null)
  const [placeSaving, setPlaceSaving] = useState(false)

  React.useEffect(() => {
    if (!user) return
    getBookings()
      .then(({ bookings }) => setRideCount(bookings.filter(b => b.status === 'completed').length))
      .catch(() => {})
    getSavedPlaces().then(setSavedPlaces).catch(() => {})
  }, [user?.phone])

  const openEditPlace = (place: SavedPlaceType) => {
    setEditingPlace(place)
    setPlaceLabel(place.label)
    setPlaceAddress(place.address)
    setPlaceData({ placeId: place.placeId ?? undefined, lat: place.lat ?? undefined, lng: place.lng ?? undefined })
    setAddingPlace(false)
  }

  const openAddPlace = () => {
    setEditingPlace(null)
    setPlaceLabel('')
    setPlaceAddress('')
    setPlaceData(null)
    setAddingPlace(true)
  }

  const closePlaceModal = () => { setEditingPlace(null); setAddingPlace(false) }

  const handleSavePlace = async () => {
    if (!placeLabel.trim() || !placeAddress.trim()) return
    setPlaceSaving(true)
    try {
      if (editingPlace) {
        const updated = await updateSavedPlace(editingPlace.id, {
          label: placeLabel.trim(),
          address: placeAddress.trim(),
          ...(placeData ?? {}),
        })
        setSavedPlaces(prev => prev.map(p => p.id === updated.id ? updated : p))
      } else {
        const created = await createSavedPlace({
          label: placeLabel.trim(),
          address: placeAddress.trim(),
          ...(placeData ?? {}),
        })
        setSavedPlaces(prev => [...prev, created])
      }
      closePlaceModal()
    } catch { /* ignore */ } finally {
      setPlaceSaving(false)
    }
  }

  const handleDeletePlace = async (id: string) => {
    await deleteSavedPlace(id).catch(() => {})
    setSavedPlaces(prev => prev.filter(p => p.id !== id))
    closePlaceModal()
  }

  const hasProfile = !!user
  const initials = getInitials(user?.name, user?.phone)
  const displayName = user?.name || formatPhone(user?.phone)
  const phoneDisplay = formatPhone(user?.phone)

  const handleEditName = () => {
    setNameInput(user?.name || '')
    setEditing(true)
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    // Save locally immediately so the change persists even if server is unreachable
    updateUser({ name: nameInput.trim() })
    setEditing(false)
    setSaving(false)
    try {
      await updateProfile({ name: nameInput.trim() })
    } catch {
      // Local save already done; server sync failed silently
    }
  }

  const handleLogout = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Sign out', 'Sign out of Yellow?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => logout() },
      ])
    } else {
      setShowSignOutModal(true)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: '500', color: YL.ink, letterSpacing: -0.6 }}>
          Account
        </Text>
        {hasProfile && (
          <Pressable
            onPress={handleEditName}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 100,
              backgroundColor: YL.bg2,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink3 }}>Edit name</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Guest / no profile state */}
        {!hasProfile && (
          <Pressable
            onPress={() => router.push('/(onboarding)/phone')}
            style={({ pressed }) => ({
              padding: 20,
              backgroundColor: YL.yellow,
              borderRadius: 22,
              borderWidth: 1.5,
              borderColor: YL.ink,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: '500', color: YL.ink, letterSpacing: -0.4 }}>
              Set up your profile
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 13.5, color: YL.ink, opacity: 0.7, marginTop: 4 }}>
              Add your name and email to personalise your experience →
            </Text>
          </Pressable>
        )}

        {/* Identity card */}
        {hasProfile && (
        <View
          style={{
            padding: 18,
            backgroundColor: YL.yellow,
            borderRadius: 22,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <GulmoharSpray
            style={{
              position: 'absolute',
              right: -60,
              top: -40,
              width: 180,
              height: 180,
            }}
            color={YL.ink}
            opacity={0.07}
          />
          {/* Avatar row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, zIndex: 1 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: YL.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 22,
                  fontWeight: '500',
                  color: YL.yellow,
                }}
              >
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: FONTS.display,
                      fontSize: 18,
                      fontWeight: '500',
                      color: YL.ink,
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      ...(({ outlineWidth: 0 }) as any),
                    }}
                    placeholder="Your name"
                    placeholderTextColor={YL.ink3}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  {saving ? (
                    <ActivityIndicator size="small" color={YL.ink} />
                  ) : (
                    <Pressable
                      onPress={handleSaveName}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: YL.ink,
                        borderRadius: 8,
                        opacity: pressed ? 0.7 : 1,
                        flexShrink: 0,
                      })}
                    >
                      <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '600', color: YL.yellow }}>
                        Save
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 20,
                    fontWeight: '500',
                    color: YL.ink,
                    letterSpacing: -0.4,
                  }}
                >
                  {displayName}
                </Text>
              )}
              {!editing && (
                <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink, opacity: 0.75 }}>
                  {phoneDisplay}
                </Text>
              )}
            </View>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, zIndex: 1 }}>
            {[
              { value: rideCount !== null ? String(rideCount) : '—', label: 'RIDES' },
              { value: rideCount !== null ? `${(rideCount * 4.2).toFixed(1)} kg` : '—', label: 'CO₂ SAVED' },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: 'rgba(26,20,10,0.08)',
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 18,
                    fontWeight: '500',
                    color: YL.ink,
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 10.5,
                    color: YL.ink,
                    opacity: 0.7,
                    letterSpacing: 0.3,
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Business toggle */}
        <Pressable
          onPress={() => setShowBizInfo(v => !v)}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: YL.card,
            borderWidth: 1.5,
            borderColor: YL.ink,
            borderStyle: 'dashed',
            borderRadius: showBizInfo ? 18 : 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: YL.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
              <Path d="M5 5.5V4C5 3.172 5.672 2.5 6.5 2.5H11.5C12.328 2.5 13 3.172 13 4V5.5" stroke={YL.yellow} strokeWidth={1.5} />
              <Path d="M1.5 5.5H16.5V14.5C16.5 15.052 16.052 15.5 15.5 15.5H2.5C1.948 15.5 1.5 15.052 1.5 14.5V5.5Z" stroke={YL.yellow} strokeWidth={1.5} />
              <Path d="M1.5 9.5H16.5" stroke={YL.yellow} strokeWidth={1.5} />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: '600', color: YL.ink }}>
                Yellow for Business
              </Text>
              <View style={{ backgroundColor: YL.yellowSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 9, color: YL.ink3, letterSpacing: 0.3 }}>SOON</Text>
              </View>
            </View>
            <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3 }}>
              Company-paid rides, GST receipts, expense export
            </Text>
          </View>
          <ChevronRight />
        </Pressable>
        {showBizInfo && (
          <View style={{
            marginTop: -8,
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: YL.yellowSoft,
            borderWidth: 1.5,
            borderColor: YL.ink,
            borderTopWidth: 0,
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 13.5, color: YL.ink, lineHeight: 20 }}>
              <Text style={{ fontWeight: '600' }}>Coming soon</Text>
              {' — '}Yellow for Business is launching soon. Company-paid rides, GST invoices, and expense export for teams.
            </Text>
          </View>
        )}

        {/* Saved places card */}
        <View
          style={{
            padding: 16,
            backgroundColor: YL.card,
            borderWidth: 1,
            borderColor: YL.line,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.mono,
              fontSize: 10.5,
              color: YL.ink3,
              letterSpacing: 0.3,
              marginBottom: 12,
            }}
          >
            SAVED PLACES
          </Text>
          {savedPlaces.map((p, i) => {
            const icon = p.label.toLowerCase() === 'home' ? 'home' : p.label.toLowerCase() === 'work' ? 'work' : 'add'
            return (
              <SavedPlace
                key={p.id}
                icon={icon}
                name={p.label}
                addr={p.address}
                last={i === savedPlaces.length - 1 && false}
                onPress={() => openEditPlace(p)}
              />
            )
          })}
          <SavedPlace icon="add" name="Add a place" addr="Parents, gym, weekend spots…" last onPress={openAddPlace} />
        </View>

        {/* Menu card */}
        <View
          style={{
            backgroundColor: YL.card,
            borderWidth: 1,
            borderColor: YL.line,
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <MenuRow
            icon="clock"
            label="Ride history"
            sub="All your trips"
            onPress={() => router.push('/(app)/history')}
          />
          <MenuRow
            icon="gift"
            label="Refer & earn"
            sub="Friends get 10% off their first ride"
            accent
            onPress={() => router.push('/(app)/referral')}
          />
          <MenuRow
            icon="help"
            label="Support"
            sub="WhatsApp · 8628062808"
            onPress={() => openWhatsApp('918628062808')}
          />
          <MenuRow
            icon="gear"
            label="Settings"
            sub="Notifications · privacy"
            last
            onPress={() => router.push('/(app)/settings')}
          />
        </View>

        {/* Sign out */}
        {hasProfile && (
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: YL.line,
              backgroundColor: YL.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: '#C0392B' }}>
              Sign out
            </Text>
          </Pressable>
        )}

        {/* Footer */}
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: YL.ink3,
            textAlign: 'center',
            marginTop: 6,
            letterSpacing: 0.3,
          }}
        >
          MADE IN BENGALURU
        </Text>
      </ScrollView>

      <BottomNav
        active="account"
        onRide={() => router.push('/(app)/home')}
        onHistory={() => router.push('/(app)/history')}
        onRewards={() => router.push('/(app)/referral')}
      />

      <Modal visible={!!(editingPlace || addingPlace)} transparent animationType="slide" onRequestClose={closePlaceModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(43,39,32,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: YL.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: '600', color: YL.ink, marginBottom: 20 }}>
              {editingPlace ? `Edit ${editingPlace.label}` : 'Add a place'}
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: '600', color: YL.ink2, marginBottom: 6 }}>LABEL</Text>
            <TextInput
              value={placeLabel}
              onChangeText={setPlaceLabel}
              placeholder="Home, Work, Gym…"
              style={{ height: 44, borderWidth: 1.5, borderColor: YL.line, borderRadius: 12, paddingHorizontal: 14, fontFamily: FONTS.display, fontSize: 14, color: YL.ink, backgroundColor: YL.bg, marginBottom: 16 }}
            />
            <Text style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: '600', color: YL.ink2, marginBottom: 6 }}>ADDRESS</Text>
            <LocationAutocomplete
              placeholder="Search for a place"
              value={placeAddress}
              onChangeText={(text) => { setPlaceAddress(text); if (!text) setPlaceData(null) }}
              onLocationSelect={(loc) => {
                setPlaceAddress(loc.placeName || loc.description || '')
                setPlaceData({ placeId: loc.placeId, lat: loc.lat, lng: loc.lng })
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              {editingPlace && (
                <Pressable
                  onPress={() => handleDeletePlace(editingPlace.id)}
                  style={({ pressed }) => ({ paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: '#C0392B', opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: '#C0392B', fontWeight: '500' }}>Delete</Text>
                </Pressable>
              )}
              <Pressable
                onPress={closePlaceModal}
                style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: YL.line, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 15, color: YL.ink }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSavePlace}
                disabled={placeSaving || !placeLabel.trim() || !placeAddress.trim()}
                style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: YL.ink, alignItems: 'center', opacity: pressed || placeSaving ? 0.7 : 1 })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '600', color: YL.yellow }}>{placeSaving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSignOutModal} transparent animationType="fade" onRequestClose={() => setShowSignOutModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(43,39,32,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: YL.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: '600', color: YL.ink, marginBottom: 8 }}>Sign out</Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink2, lineHeight: 21, marginBottom: 24 }}>
              Sign out of Yellow?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowSignOutModal(false)}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: YL.bg, borderWidth: 1, borderColor: YL.line,
                  borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '500', color: YL.ink }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowSignOutModal(false); logout() }}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: '#C0392B', borderRadius: 12, paddingVertical: 13,
                  alignItems: 'center', opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '600', color: 'white' }}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
