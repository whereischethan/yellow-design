import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { YL, FONTS } from '../../constants/theme'
import type { LocationData } from '../../types/booking'

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || ''

const BLR_CENTER = { latitude: 12.9716, longitude: 77.5946 }
const RADIUS_METERS = 50000

interface Suggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface Props {
  placeholder?: string
  value?: string
  onLocationSelect: (location: LocationData) => void
  label?: string
  restrictToBangalore?: boolean
}

export default function LocationAutocomplete({ placeholder = 'Enter location', value, onLocationSelect, label, restrictToBangalore }: Props) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value || '')
  }, [value])

  const fetchSuggestions = async (text: string) => {
    if (text.length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = restrictToBangalore
        ? {
            input: text,
            locationRestriction: {
              rectangle: {
                low: { latitude: 12.7, longitude: 77.35 },
                high: { latitude: 13.2, longitude: 77.85 },
              },
            },
          }
        : {
            input: text,
            locationBias: {
              circle: {
                center: { latitude: BLR_CENTER.latitude, longitude: BLR_CENTER.longitude },
                radius: RADIUS_METERS,
              },
            },
            includedRegionCodes: ['in'],
          }

      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
        },
        body: JSON.stringify(body),
      })

      if (!mountedRef.current) return

      if (!res.ok) {
        setSuggestions([])
        return
      }

      const data = await res.json()
      const items: Suggestion[] = (data.suggestions || []).map((s: any) => ({
        placeId: s.placePrediction?.placeId || '',
        description: s.placePrediction?.text?.text || '',
        mainText: s.placePrediction?.structuredFormat?.mainText?.text || s.placePrediction?.text?.text || '',
        secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text || '',
      })).filter((s: Suggestion) => s.placeId)

      if (mountedRef.current) setSuggestions(items)
    } catch {
      if (mountedRef.current) setSuggestions([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const handleChange = (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300)
  }

  const handleSelect = async (suggestion: Suggestion) => {
    setQuery(suggestion.mainText)
    setSuggestions([])
    setFocused(false)

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${suggestion.placeId}?fields=location,displayName`,
        {
          headers: {
            'X-Goog-Api-Key': PLACES_API_KEY,
            'X-Goog-FieldMask': 'location,displayName',
          },
        }
      )
      const data = await res.json()
      if (mountedRef.current) {
        onLocationSelect({
          description: suggestion.description,
          placeId: suggestion.placeId,
          placeName: data.displayName?.text || suggestion.mainText,
          lat: data.location?.latitude,
          lng: data.location?.longitude,
        })
      }
    } catch {
      if (mountedRef.current) {
        onLocationSelect({
          description: suggestion.description,
          placeId: suggestion.placeId,
          placeName: suggestion.mainText,
        })
      }
    }
  }

  const showDropdown = focused && suggestions.length > 0

  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.fieldBox, focused && styles.fieldBoxActive]}>
        <TextInput
          value={query}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => { if (mountedRef.current) setFocused(false) }, 200)}
          placeholder={placeholder}
          placeholderTextColor={YL.ink3}
          style={styles.input}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={YL.ink3} style={{ marginRight: 4 }} />}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <Pressable
              key={item.placeId}
              style={[styles.suggestion, index > 0 && styles.suggestionBorder]}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.suggestionMain} numberOfLines={1}>{item.mainText}</Text>
              {!!item.secondaryText && (
                <Text style={styles.suggestionSub} numberOfLines={1}>{item.secondaryText}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 10,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink2,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  fieldBox: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: YL.line,
    backgroundColor: YL.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  fieldBoxActive: {
    borderColor: YL.ink,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
    paddingVertical: 14,
  },
  dropdown: {
    backgroundColor: YL.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: YL.line,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderTopWidth: 1,
    borderTopColor: YL.lineSoft,
  },
  suggestionMain: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink,
  },
  suggestionSub: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: YL.ink3,
    marginTop: 2,
  },
})
