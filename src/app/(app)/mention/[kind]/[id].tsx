import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Empty, ErrorNote, Loading, SentimentBadge, SourceIcon } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, mentionCache, mentionSource, mentionUrl, timeAgo } from '@/lib/format';
import type { Mention } from '@/lib/types';
import { colors, space, type } from '@/theme';

/** The same guidance the website shows next to a mention, derived from its classification. */
function guidance(m: Mention, source: string): { why: string; reply: string } {
  const pct = Math.round((m.confidence ?? 0) * 100);
  if (m.sentiment === 'NEGATIVE') {
    return {
      why: `Classified negative with ${pct}% confidence. Mentions on ${source} are public and indexed, so an unanswered complaint keeps surfacing to people researching you.`,
      reply: 'Acknowledge the issue specifically, apologise for the experience without disputing details in public, and offer to resolve it privately. Follow up publicly once it is fixed.',
    };
  }
  if (m.sentiment === 'POSITIVE') {
    return {
      why: `Classified positive with ${pct}% confidence. Positive mentions on ${source} build trust with people comparing options.`,
      reply: 'Thank the author briefly and, if the mention is detailed, ask permission to feature it as a testimonial.',
    };
  }
  return {
    why: `Classified neutral with ${pct}% confidence — typically a question or a comparison. A helpful answer positions the brand as the authority in the thread.`,
    reply: 'Answer the question directly, link to a relevant resource, and avoid a sales tone.',
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={type.secondary}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: colors.ink, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function MentionScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const [mention, setMention] = useState<Mention | undefined>(() => mentionCache.get(kind, id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  // Opened from a notification (no list behind it): fetch the mention by id.
  useEffect(() => {
    if (mentionCache.get(kind, id)) return;
    let alive = true;
    api
      .mention(kind, id)
      .then((m) => {
        if (!alive) return;
        mentionCache.put(m);
        setMention(m);
      })
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [kind, id]);

  if (!mention) {
    if (!missing) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: space.xl, gap: space.lg }}>
        <Empty title="This mention is no longer available" body="It may have been removed." />
        <Button label="Go to alerts" onPress={() => router.replace('/alerts')} />
      </View>
    );
  }

  const source = mentionSource(mention);
  const url = mentionUrl(mention);
  const tips = guidance(mention, source.label);

  async function toggleResolved() {
    if (!mention) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.resolve(mention.type, mention.id, !mention.resolvedAt);
      const next = { ...mention, resolvedAt: res.resolvedAt };
      mentionCache.put(next);
      setMention(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this mention.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.body}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <SourceIcon source={source} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={type.heading}>{source.label}</Text>
          <Text style={type.small}>{[mention.author, timeAgo(mention.publishedAt ?? mention.createdAt)].filter(Boolean).join(' · ')}</Text>
        </View>
        <SentimentBadge sentiment={mention.sentiment} />
      </View>

      <Text style={styles.quote} selectable>“{mention.text?.trim() || 'No text was captured for this mention.'}”</Text>

      <ErrorNote message={error} />

      <Card style={{ gap: space.md }}>
        <View style={{ gap: 4 }}>
          <Text style={type.eyebrow}>Why this matters</Text>
          <Text style={type.body}>{tips.why}</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={type.eyebrow}>Suggested response</Text>
          <Text style={type.body}>{tips.reply}</Text>
        </View>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <Row label="Confidence" value={mention.confidence != null ? mention.confidence.toFixed(2) : '—'} />
        <Row label="Keyword" value={mention.keyword} />
        <Row label="Published" value={formatDate(mention.publishedAt)} />
        <Row label="Detected" value={mention.analyzedAt ? formatDate(mention.analyzedAt) : 'Pending analysis'} />
        <Row label="Email alert" value={mention.alertSent ? 'Sent' : mention.sentiment === 'NEGATIVE' ? 'Queued' : 'Not required'} />
        <Row label="Status" value={mention.resolvedAt ? `Resolved ${formatDate(mention.resolvedAt)}` : 'Open'} />
      </Card>

      <View style={{ gap: space.sm }}>
        <Button label={mention.resolvedAt ? 'Reopen' : 'Mark resolved'} onPress={toggleResolved} loading={busy} variant={mention.resolvedAt ? 'secondary' : 'primary'} />
        {url ? <Button label={`Open on ${source.label}`} variant="secondary" onPress={() => WebBrowser.openBrowserAsync(url)} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  quote: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, color: colors.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
});
