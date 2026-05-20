import React from 'react'
import { Pressable, Text } from 'react-native'
import { YL, FONTS } from '../constants/theme'

interface StepBtnProps {
  label: '+' | '-'
  onPress?: () => void
  disabled?: boolean
}

export default function StepBtn({ label, onPress, disabled = false }: StepBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? YL.bg2 : YL.ink,
        opacity: pressed && !disabled ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: FONTS.displaySemiBold,
          fontSize: 18,
          color: disabled ? YL.ink3 : '#FFFFFF',
          lineHeight: 22,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
