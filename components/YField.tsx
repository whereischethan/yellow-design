import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Animated,
  ViewStyle,
} from 'react-native'
import { YL, FONTS } from '../constants/theme'

interface YFieldProps {
  label?: string
  value?: string
  placeholder?: string
  hint?: string
  adornment?: React.ReactNode
  caret?: boolean
  style?: ViewStyle
  onPress?: () => void
}

export default function YField({
  label,
  value,
  placeholder,
  hint,
  adornment,
  caret = false,
  style,
  onPress,
}: YFieldProps) {
  const caretOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!caret) return

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(caretOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    )
    blink.start()
    return () => blink.stop()
  }, [caret, caretOpacity])

  const hasValue = value !== undefined && value !== ''
  const borderColor = caret ? YL.ink : YL.line

  return (
    <View style={style}>
      {label && (
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 12,
            color: YL.ink2,
            marginBottom: 6,
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          height: 56,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: YL.card,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 10,
        }}
      >
        {adornment && (
          <View style={{ flexShrink: 0 }}>{adornment}</View>
        )}

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {hasValue ? (
            <Text
              style={{
                fontFamily: FONTS.display,
                fontSize: 15,
                color: YL.ink,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {value}
            </Text>
          ) : (
            <Text
              style={{
                fontFamily: FONTS.display,
                fontSize: 15,
                color: YL.ink3,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {placeholder}
            </Text>
          )}

          {caret && (
            <Animated.View
              style={{
                width: 2,
                height: 18,
                backgroundColor: YL.ink,
                borderRadius: 1,
                marginLeft: 1,
                opacity: caretOpacity,
              }}
            />
          )}
        </View>
      </View>

      {hint && (
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 11.5,
            color: YL.ink3,
            marginTop: 5,
            letterSpacing: 0.1,
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  )
}
