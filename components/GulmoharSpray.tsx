import React from 'react'
import { ViewStyle } from 'react-native'
import Svg, { Path, Ellipse, G } from 'react-native-svg'

interface GulmoharSprayProps {
  style?: ViewStyle
  color?: string
  opacity?: number
}

export default function GulmoharSpray({
  style,
  color = '#D4763A',
  opacity = 0.18,
}: GulmoharSprayProps) {
  // 6 pairs of leaflets at y positions
  const yPositions = [30, 55, 80, 105, 130, 155]

  return (
    <Svg width={200} height={200} viewBox="0 0 200 200" style={style as any}>
      {/* Central stem */}
      <Path
        d="M100,180 L100,20"
        stroke={color}
        strokeWidth={1.5}
        opacity={opacity}
        strokeLinecap="round"
      />

      {yPositions.map((y, i) => {
        const spread = 22 + i * 2
        const leftCx = 100 - spread
        const rightCx = 100 + spread

        return (
          <G key={i}>
            {/* Left leaflet */}
            <Ellipse
              cx={leftCx}
              cy={y}
              rx={16}
              ry={4}
              fill={color}
              opacity={opacity}
              transform={`rotate(-15, ${leftCx}, ${y})`}
            />
            {/* Right leaflet */}
            <Ellipse
              cx={rightCx}
              cy={y}
              rx={16}
              ry={4}
              fill={color}
              opacity={opacity}
              transform={`rotate(15, ${rightCx}, ${y})`}
            />
          </G>
        )
      })}
    </Svg>
  )
}
