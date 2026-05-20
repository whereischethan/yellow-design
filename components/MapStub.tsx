import React from 'react'
import { View, ViewStyle } from 'react-native'
import Svg, {
  Rect,
  Path,
  Circle,
  G,
  Polygon,
} from 'react-native-svg'
import { YL } from '../constants/theme'

interface MapStubProps {
  style?: ViewStyle
}

export default function MapStub({ style }: MapStubProps) {
  const bg = YL.bg2
  const road = YL.line
  const route = YL.yellow
  const ink = YL.ink

  return (
    <View style={[{ borderRadius: 16, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 380" preserveAspectRatio="xMidYMid slice">
        {/* Background */}
        <Rect x={0} y={0} width={400} height={380} fill={bg} />

        {/* Abstract road network - horizontal roads */}
        <Path d="M0 120 H400" stroke={road} strokeWidth={18} strokeLinecap="butt" />
        <Path d="M0 260 H400" stroke={road} strokeWidth={14} strokeLinecap="butt" />
        <Path d="M0 320 H400" stroke={road} strokeWidth={10} strokeLinecap="butt" />

        {/* Abstract road network - vertical roads */}
        <Path d="M80 0 V380" stroke={road} strokeWidth={14} strokeLinecap="butt" />
        <Path d="M220 0 V380" stroke={road} strokeWidth={18} strokeLinecap="butt" />
        <Path d="M340 0 V380" stroke={road} strokeWidth={10} strokeLinecap="butt" />

        {/* Diagonal connector */}
        <Path
          d="M80 120 Q150 180 220 260"
          stroke={road}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />

        {/* Route highlight - the actual path taken */}
        <Path
          d="M80 310 L80 260 Q80 120 220 120 L300 120"
          stroke={route}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pickup pin at (80, 310) */}
        <Circle cx={80} cy={310} r={10} fill={YL.card} stroke={ink} strokeWidth={2} />
        <Circle cx={80} cy={310} r={5} fill={ink} />

        {/* Partner car dot at (180, 120) */}
        <G transform="translate(170, 110)">
          <Rect x={0} y={4} width={20} height={12} rx={3} fill={ink} />
          <Rect x={3} y={0} width={14} height={8} rx={2} fill={ink} />
          <Circle cx={4} cy={16} r={3} fill={YL.bg2} />
          <Circle cx={16} cy={16} r={3} fill={YL.bg2} />
        </G>

        {/* Destination pin at (300, 120) */}
        <G transform="translate(292, 100)">
          <Path
            d="M8 0 C3.582 0 0 3.582 0 8 C0 14 8 22 8 22 C8 22 16 14 16 8 C16 3.582 12.418 0 8 0 Z"
            fill={YL.yellow}
            stroke={ink}
            strokeWidth={1.5}
          />
          <Circle cx={8} cy={8} r={3} fill={ink} />
        </G>
      </Svg>
    </View>
  )
}
