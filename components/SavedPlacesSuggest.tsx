import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { YL, FONTS } from '../constants/theme'
import { getSavedPlaces, type SavedPlace } from '../lib/api'
import type { LocationData } from '../types/booking'


interface Props {
  onSelect: (location: LocationData) => void
}

export default function SavedPlacesSuggest({ onSelect }: Props) {
  const [places, setPlaces] = useState<SavedPlace[]>([])

  useEffect(() => {
    getSavedPlaces().then(setPlaces).catch(() => {})
  }, [])

  if (places.length === 0) return null

  return (
    <View style={{ marginBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}>
        {places.map(p => (
          <Pressable
            key={p.id}
            onPress={() => {
              if (!p.address) return
              onSelect({
                placeName: p.label,
                description: p.address,
                placeId: p.placeId ?? '',
                lat: p.lat ?? 0,
                lng: p.lng ?? 0,
              })
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: pressed ? YL.yellowSoft : YL.card,
              borderWidth: 1,
              borderColor: YL.line,
              borderRadius: 20,
            })}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '500', color: YL.ink }}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
