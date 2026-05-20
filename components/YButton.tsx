import React from 'react'
import {
  Pressable,
  Text,
  ViewStyle,
  TextStyle,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { YL, FONTS } from '../constants/theme'

type Variant = 'primary' | 'ink' | 'outline' | 'soft'
type Size = 'md' | 'lg'

interface YButtonProps {
  variant?: Variant
  size?: Size
  full?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  children: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
}

const variantStyles: Record<Variant, { bg: string; textColor: string; borderColor?: string }> = {
  primary: {
    bg: YL.yellow,
    textColor: YL.ink,
  },
  ink: {
    bg: YL.ink,
    textColor: '#FFFFFF',
  },
  outline: {
    bg: YL.card,
    textColor: YL.ink,
    borderColor: YL.ink,
  },
  soft: {
    bg: YL.bg2,
    textColor: YL.ink,
  },
}

const sizeStyles: Record<Size, { height: number; fontSize: number; paddingHorizontal: number }> = {
  md: { height: 48, fontSize: 14.5, paddingHorizontal: 20 },
  lg: { height: 56, fontSize: 16, paddingHorizontal: 24 },
}

export default function YButton({
  variant = 'primary',
  size = 'lg',
  full = true,
  style,
  textStyle,
  children,
  onPress,
  disabled = false,
  loading = false,
}: YButtonProps) {
  const vStyle = variantStyles[variant]
  const sStyle = sizeStyles[size]

  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height: sStyle.height,
          paddingHorizontal: sStyle.paddingHorizontal,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor: vStyle.bg,
          borderWidth: vStyle.borderColor ? 1.5 : 0,
          borderColor: vStyle.borderColor,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
          // Inner shadow for primary variant
          ...(variant === 'primary'
            ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.08,
                shadowRadius: 0,
              }
            : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={vStyle.textColor}
        />
      ) : (
        typeof children === 'string' ? (
          <Text
            style={[
              {
                fontFamily: FONTS.displaySemiBold,
                fontSize: sStyle.fontSize,
                color: vStyle.textColor,
                letterSpacing: -0.2,
              },
              textStyle,
            ]}
          >
            {children}
          </Text>
        ) : (
          children
        )
      )}
    </Pressable>
  )
}
