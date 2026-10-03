import { StyleSheet } from 'react-native';

import { colors, space } from '@/theme';

/** Shared by the sign-in and sign-up screens. */
export const authStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.xxl, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  brandName: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3, color: colors.ink },
  alt: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  link: { fontSize: 13.5, fontWeight: '600', color: colors.ink, textDecorationLine: 'underline' },
});
