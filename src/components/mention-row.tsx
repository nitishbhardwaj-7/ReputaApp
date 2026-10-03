import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SentimentBadge, SourceIcon, Tag } from '@/components/ui';
import { mentionCache, mentionSource, severityOf, timeAgo } from '@/lib/format';
import type { Mention } from '@/lib/types';
import { colors, space, type } from '@/theme';

/** One mention in a list. `alert` swaps the sentiment badge for severity and open/reviewed state. */
export function MentionRow({ mention, alert = false }: { mention: Mention; alert?: boolean }) {
  const source = mentionSource(mention);
  const when = timeAgo(alert ? (mention.analyzedAt ?? mention.createdAt) : (mention.publishedAt ?? mention.createdAt));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${source.label} mention, ${mention.sentiment?.toLowerCase() ?? 'pending'}`}
      onPress={() => {
        mentionCache.put(mention);
        router.push({ pathname: '/mention/[kind]/[id]', params: { kind: mention.type, id: mention.id } });
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <SourceIcon source={source} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.meta}>
          <Text style={styles.source}>{source.label}</Text>
          {mention.author ? <Text style={type.small} numberOfLines={1}>· {mention.author}</Text> : null}
          <Text style={[type.small, { marginLeft: 'auto' }]}>{when}</Text>
        </View>
        <Text style={type.body} numberOfLines={3}>
          {mention.text?.trim() || 'No text was captured for this mention.'}
        </Text>
        <View style={styles.tags}>
          {alert ? (
            <>
              <Tag label={`${severityOf(mention.confidence)} severity`} bg={colors.negativeSoft} fg={colors.negative} />
              <Tag label={mention.resolvedAt ? 'Reviewed' : 'Open'} bg={mention.resolvedAt ? colors.surfaceMuted : colors.warnSoft} fg={mention.resolvedAt ? colors.inkSecondary : colors.warn} />
            </>
          ) : (
            <>
              <SentimentBadge sentiment={mention.sentiment} />
              {mention.alertSent ? <Tag label="Alert sent" /> : null}
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, backgroundColor: colors.surface },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  source: { fontSize: 13, fontWeight: '600', color: colors.ink },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
});
