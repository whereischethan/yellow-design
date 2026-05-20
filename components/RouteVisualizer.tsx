import React from 'react'
import { View, Text, ViewStyle } from 'react-native'
import { YL, FONTS } from '../constants/theme'

interface Stop {
  label: string
  sublabel?: string
  address?: string
}

interface RouteVisualizerProps {
  stops: Stop[]
  style?: ViewStyle
}

function DashedConnector() {
  // Renders a dashed vertical line using repeated segments
  const segments = 5
  return (
    <View
      style={{
        width: 2,
        flex: 1,
        minHeight: 24,
        alignItems: 'center',
        marginVertical: 2,
        marginLeft: 4,
      }}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            width: 2,
            marginVertical: 1.5,
            backgroundColor: YL.line,
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  )
}

function PickupDot() {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: YL.ink,
        marginTop: 5,
      }}
    />
  )
}

function DestinationDiamond() {
  return (
    <View
      style={{
        width: 12,
        height: 12,
        borderWidth: 1.5,
        borderColor: YL.ink,
        backgroundColor: YL.yellow,
        transform: [{ rotate: '45deg' }],
        marginTop: 4,
      }}
    />
  )
}

function MidpointDot() {
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: YL.ink2,
        backgroundColor: YL.card,
        marginTop: 5,
      }}
    />
  )
}

export default function RouteVisualizer({ stops, style }: RouteVisualizerProps) {
  if (!stops || stops.length === 0) return null

  return (
    <View style={[{ flexDirection: 'row', gap: 12 }, style]}>
      {/* Left: icons and connectors */}
      <View style={{ alignItems: 'center', width: 18 }}>
        {stops.map((stop, i) => (
          <React.Fragment key={i}>
            {i === 0 ? (
              <PickupDot />
            ) : i === stops.length - 1 ? (
              <DestinationDiamond />
            ) : (
              <MidpointDot />
            )}
            {i < stops.length - 1 && <DashedConnector />}
          </React.Fragment>
        ))}
      </View>

      {/* Right: labels */}
      <View style={{ flex: 1, gap: 0 }}>
        {stops.map((stop, i) => (
          <View
            key={i}
            style={{
              paddingBottom: i < stops.length - 1 ? 20 : 0,
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.display,
                fontSize: 14,
                color: YL.ink,
                letterSpacing: -0.1,
              }}
              numberOfLines={1}
            >
              {stop.label}
            </Text>
            {stop.address ? (
              <Text
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 11.5,
                  color: YL.ink2,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {stop.address}
              </Text>
            ) : null}
            {stop.sublabel ? (
              <Text
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 12,
                  color: YL.ink3,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {stop.sublabel}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  )
}
