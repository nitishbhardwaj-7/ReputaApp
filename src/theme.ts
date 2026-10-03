import { Platform } from 'react-native';

/** One palette for web and app: warm white, near-black, hairlines; green and red only carry sentiment. */
export const colors = {
  bg: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F0EC',
  ink: '#111111',
  inkSecondary: '#666666',
  inkTertiary: '#9B9A95',
  line: '#DEDDD8',
  lineSoft: '#EBEAE5',
  black: '#0B0C0D',
  positive: '#15966A',
  positiveSoft: '#E4F3EC',
  negative: '#E5484D',
  negativeSoft: '#FCE9EA',
  neutral: '#8A8F98',
  neutralSoft: '#ECEDEF',
  warn: '#A4651A',
  warnSoft: '#FBF0DD',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 6, md: 8, lg: 12 } as const;

export const font = Platform.select({ ios: 'System', default: undefined });

export const type = {
  eyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.inkSecondary, fontWeight: '500' },
  display: { fontSize: 30, lineHeight: 33, letterSpacing: -1.1, fontWeight: '600', color: colors.ink },
  title: { fontSize: 22, lineHeight: 26, letterSpacing: -0.6, fontWeight: '600', color: colors.ink },
  heading: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  secondary: { fontSize: 13.5, lineHeight: 19, color: colors.inkSecondary },
  small: { fontSize: 12, color: colors.inkSecondary },
  metric: { fontSize: 28, letterSpacing: -1, fontWeight: '600', color: colors.ink },
} as const;
