import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import Svg, { Path } from 'react-native-svg';

import type { SourceMeta } from '@/lib/format';
import { LOGOS } from '@/lib/logos';
import type { Sentiment } from '@/lib/types';
import { colors, radius, space, type } from '@/theme';

export function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, style,
}: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet'; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'quiet' && styles.btnQuiet,
        pressed && { opacity: 0.82 },
        off && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.ink} />
      ) : (
        <Text style={[styles.btnText, variant === 'primary' ? { color: '#fff' } : { color: colors.ink }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...input }: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkTertiary} style={styles.input} {...input} />
      {hint ? <Text style={type.small}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={{ color: '#B4363A', fontSize: 13.5, lineHeight: 19 }}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const SENTIMENT: Record<Sentiment, { bg: string; fg: string; label: string }> = {
  POSITIVE: { bg: colors.positiveSoft, fg: colors.positive, label: 'Positive' },
  NEGATIVE: { bg: colors.negativeSoft, fg: colors.negative, label: 'Negative' },
  NEUTRAL: { bg: colors.neutralSoft, fg: '#5F646C', label: 'Neutral' },
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  const s = sentiment ? SENTIMENT[sentiment] : { bg: colors.surfaceMuted, fg: colors.inkSecondary, label: 'Pending' };
  return <Tag label={s.label} bg={s.bg} fg={s.fg} />;
}

export function Tag({ label, bg = colors.surfaceMuted, fg = colors.inkSecondary }: { label: string; bg?: string; fg?: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

export function SourceIcon({ source, size = 22 }: { source: SourceMeta; size?: number }) {
  const logo = LOGOS[source.id];
  // The platform's own mark where we have one; a lettered tile for anything else.
  if (logo) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={source.label}>
        {logo.paths.map((p, i) => <Path key={i} d={p.d} fill={p.fill ?? logo.color} />)}
      </Svg>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 5, backgroundColor: source.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.5, fontWeight: '700' }}>{source.glyph}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: active ? '#fff' : colors.inkSecondary }}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ paddingVertical: 56, paddingHorizontal: space.xl, alignItems: 'center', gap: 6 }}>
      <Text style={[type.heading, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.secondary, { textAlign: 'center' }]}>{body}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 56, alignItems: 'center' }}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, borderWidth: 1, borderColor: 'transparent' },
  btnPrimary: { backgroundColor: colors.black },
  btnSecondary: { backgroundColor: 'transparent', borderColor: colors.line },
  btnQuiet: { backgroundColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  label: { fontSize: 13, fontWeight: '500', color: colors.ink },
  input: { height: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, color: colors.ink, backgroundColor: colors.surface },
  error: { backgroundColor: colors.negativeSoft, borderWidth: 1, borderColor: '#F3C2C4', borderRadius: radius.md, padding: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg },
  tag: { paddingHorizontal: 8, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.black, borderColor: colors.black },
});
