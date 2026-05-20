import React from 'react'
import Svg, { Path, Circle, Polygon, Rect, G } from 'react-native-svg'
import { YL } from '../constants/theme'

interface IconProps {
  size?: number
  color?: string
}

export function IconPerson({ size = 18, color = YL.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={6} r={3} stroke={color} strokeWidth={1.5} />
      <Path
        d="M3 16C3 12.686 5.686 10 9 10C12.314 10 15 12.686 15 16"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

interface IconBagProps extends IconProps {
  large?: boolean
}

export function IconBag({ size = 18, color = YL.ink, large = false }: IconBagProps) {
  if (large) {
    return (
      <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        {/* Large suitcase with handle */}
        <Rect x={2} y={6} width={14} height={10} rx={2} stroke={color} strokeWidth={1.5} />
        <Path
          d="M6 6V4.5C6 3.672 6.672 3 7.5 3H10.5C11.328 3 12 3.672 12 4.5V6"
          stroke={color}
          strokeWidth={1.5}
        />
        <Path d="M2 10H16" stroke={color} strokeWidth={1.2} />
        <Path d="M7 10V16" stroke={color} strokeWidth={1} />
        <Path d="M11 10V16" stroke={color} strokeWidth={1} />
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      {/* Regular suitcase */}
      <Rect x={2} y={7} width={14} height={9} rx={2} stroke={color} strokeWidth={1.5} />
      <Path
        d="M6.5 7V5.5C6.5 4.672 7.172 4 8 4H10C10.828 4 11.5 4.672 11.5 5.5V7"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path d="M2 11H16" stroke={color} strokeWidth={1.2} />
    </Svg>
  )
}

export function IconStar({ size = 18, color = YL.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        d="M9 2L10.854 6.757L16 7.174L12.25 10.437L13.416 15.5L9 12.77L4.584 15.5L5.75 10.437L2 7.174L7.146 6.757L9 2Z"
        fill={color}
      />
    </Svg>
  )
}

export function IconChevronRight({ size = 18, color = YL.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M7 4L12 9L7 14"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
