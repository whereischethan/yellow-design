// constants/theme.ts
export const YL = {
  yellow: '#FFD84A',
  yellowSoft: '#FFF0A8',
  yellowDeep: '#E6B800',
  bg: '#F6F3EB',      // oklch(0.975 0.012 90) approximation
  bg2: '#EDE8DA',     // oklch(0.955 0.018 90) approximation
  card: '#FFFFFF',
  ink: '#2B2720',     // oklch(0.22 0.015 80) approximation
  ink2: '#736E65',    // oklch(0.48 0.012 80) approximation
  ink3: '#9E9A91',    // oklch(0.65 0.012 80) approximation
  leaf: '#4A9442',    // oklch(0.58 0.10 150) approximation
  leafSoft: '#DFF0DA',// oklch(0.94 0.04 150) approximation
  gulmohar: '#D4763A',// oklch(0.68 0.18 35) approximation
  gulmoharSoft: '#F3E8DE', // oklch(0.94 0.04 35) approximation
  line: '#E2DDD7',    // oklch(0.90 0.008 80) approximation
  lineSoft: '#EDE9E3',// oklch(0.945 0.008 80) approximation
} as const

export const YL_BIZ = {
  teal: '#3D8C9E',
  tealSoft: '#DDF2F5',
  tealDeep: '#2D6B7A',
} as const

// Font family names as loaded by expo-google-fonts
export const FONTS = {
  display: 'BricolageGrotesque_500Medium',
  displaySemiBold: 'BricolageGrotesque_600SemiBold',
  displayRegular: 'BricolageGrotesque_400Regular',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  kannada: 'NotoSansKannada_400Regular',
  kannadaMedium: 'NotoSansKannada_500Medium',
  kannadaSemiBold: 'NotoSansKannada_600SemiBold',
  // General Sans not on Google Fonts — use system fallback
  sans: undefined, // uses system default (sans-serif)
} as const
