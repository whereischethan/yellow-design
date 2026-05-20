import React from 'react'
import { View, Text, Image, ImageSourcePropType } from 'react-native'
import { YL, FONTS } from '../constants/theme'

interface YBrandProps {
  size?: number
  showKannada?: boolean
  logoSource?: ImageSourcePropType | null
}

// logo.png natural size: 781×312, aspect ratio ~2.503
const LOGO_ASPECT = 781 / 312

export default function YBrand({ size = 22, showKannada = false, logoSource }: YBrandProps) {
  const circleSize = size * 1.6
  // Match the height of the circle, derive width from the real aspect ratio
  const logoHeight = circleSize
  const logoWidth = logoHeight * LOGO_ASPECT

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {logoSource ? (
        <Image
          source={logoSource}
          style={{ width: logoWidth, height: logoHeight }}
          resizeMode="contain"
        />
      ) : (
        <>
          {/* Yellow circle with italic Y */}
          <View
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: YL.yellow,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.displaySemiBold,
                fontSize: circleSize * 0.6,
                color: YL.ink,
                fontStyle: 'italic',
                lineHeight: circleSize * 0.75,
                includeFontPadding: false,
              }}
            >
              Y
            </Text>
          </View>

          {/* Brand name */}
          <View>
            <Text
              style={{
                fontFamily: FONTS.displaySemiBold,
                fontSize: size,
                color: YL.ink,
                letterSpacing: -0.3,
                lineHeight: size * 1.2,
              }}
            >
              Yellow
            </Text>
            {showKannada && (
              <Text
                style={{
                  fontFamily: FONTS.kannada,
                  fontSize: size * 0.65,
                  color: YL.ink2,
                  lineHeight: size * 0.9,
                }}
              >
                ಯೆಲ್ಲೊ
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  )
}
