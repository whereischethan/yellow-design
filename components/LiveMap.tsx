import React from 'react'
import { Image, View, ViewStyle } from 'react-native'
import MapStub from './MapStub'

// Live trip map rendered via Google Static Maps — identical on web and native
// with zero SDK. This component is the seam to swap in react-native-maps when
// native builds land.

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? ''

interface LatLng { lat: number; lng: number }

interface LiveMapProps {
  driver?: LatLng | null
  pickup?: LatLng | null
  drop?: LatLng | null
  target: 'pickup' | 'drop'
  style?: ViewStyle
}

function buildUri(driver: LatLng | null | undefined, pickup: LatLng | null | undefined, drop: LatLng | null | undefined, target: 'pickup' | 'drop'): string | null {
  if (!GOOGLE_KEY) return null
  if (!driver && !pickup && !drop) return null

  const parts: string[] = [
    'https://maps.googleapis.com/maps/api/staticmap?size=640x400&scale=2',
    `key=${GOOGLE_KEY}`,
  ]
  if (pickup) parts.push(`markers=${encodeURIComponent(`color:0x2B2720|label:P|${pickup.lat},${pickup.lng}`)}`)
  if (drop) parts.push(`markers=${encodeURIComponent(`color:0x4A7C59|label:D|${drop.lat},${drop.lng}`)}`)
  if (driver) parts.push(`markers=${encodeURIComponent(`color:0xFFD84A|label:Y|${driver.lat},${driver.lng}`)}`)

  const targetCoords = target === 'drop' ? drop : pickup
  if (driver && targetCoords) {
    parts.push(`path=${encodeURIComponent(`color:0x2B2720CC|weight:3|${driver.lat},${driver.lng}|${targetCoords.lat},${targetCoords.lng}`)}`)
  }
  return parts.join('&')
}

export default function LiveMap({ driver, pickup, drop, target, style }: LiveMapProps) {
  const uri = React.useMemo(
    () => buildUri(driver, pickup, drop, target),
    [driver?.lat, driver?.lng, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, target],
  )

  if (!uri) return <MapStub style={style} />

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  )
}
