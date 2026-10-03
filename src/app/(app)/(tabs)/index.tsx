import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentionRow } from '@/components/mention-row';
import { Card, Empty, ErrorNote, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { sourceOf } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Mention, OverTimeRow, Overview, TrendChange } from '@/lib/types';
import { colors, space, type } from '@/theme';

function Metric({ label, value, change, goodWhen = 'up', tone }: { label: string; value: number; change?: TrendChange; goodWhen?: 'up' | 'down'; tone?: string }) {
  const dir = !change || change.abs === 0 ? 'flat' : change.abs > 0 ? 'up' : 'down';
  const good = dir !== 'flat' && dir === goodWhen;
  const trend = !change
    ? null
    : dir === 'flat'
      ? 'No change'
      : change.pct === null
        ? `+${change.abs} new`
        : `${dir === 'up' ? '↑' : '↓'} ${Math.abs(change.pct)}%`;
  return (
    <Card style={styles.metric}>
      <Text style={type.small}>{label}</Text>
      <Text style={[type.metric, tone ? { color: tone } : null]}>{value.toLocaleString()}</Text>
      {trend ? <Text style={{ fontSize: 12, color: dir === 'flat' ? colors.inkSecondary : good ? colors.positive : colors.negative }}>{trend} vs last week</Text> : null}
    </Card>
  );
}

/** Seven stacked bars, one per day: the phone-sized version of the sentiment timeline. */
function WeekBars({ rows }: { rows: OverTimeRow[] }) {
  // The clock is read once per mount; rendering stays pure.
  const [now] = useState(() => Date.now());
  const byDay = new Map(rows.map((r) => [r.date, r]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    const r = byDay.get(d.toISOString().slice(0, 10));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), pos: r?.POSITIVE ?? 0, neu: r?.NEUTRAL ?? 0, neg: r?.NEGATIVE ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.pos + d.neu + d.neg));
  const height = 96;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: height + 22 }}>
      {days.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View style={{ height, width: '100%', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
            <View style={{ height: (d.neg / max) * height, backgroundColor: colors.negative }} />
            <View style={{ height: (d.neu / max) * height, backgroundColor: colors.neutral }} />
            <View style={{ height: (d.pos / max) * height, backgroundColor: colors.positive }} />
          </View>
          <Text style={{ fontSize: 11, color: colors.inkTertiary }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Legend() {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {([['Positive', colors.positive], ['Neutral', colors.neutral], ['Negative', colors.negative]] as const).map(([l, c]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
          <Text style={{ fontSize: 11.5, color: colors.inkSecondary }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

function PlanNotice() {
  const { organization } = useSession();
  const [now] = useState(() => Date.now());
  const state = organization?.subscriptionState;
  if (state === 'trialing') {
    const days = organization?.trialEndsAt ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - now) / 86_400_000)) : 0;
    if (days > 3) return null;
    return <View style={[styles.notice, { backgroundColor: colors.warnSoft }]}><Text style={{ color: colors.warn, fontSize: 13 }}>Free trial · {days} day{days === 1 ? '' : 's'} left. Choose a plan on the website to keep scanning.</Text></View>;
  }
  if (state === 'expired' || state === 'canceled') {
    return <View style={[styles.notice, { backgroundColor: colors.negativeSoft }]}><Text style={{ color: '#9C2F33', fontSize: 13 }}>Scanning and alerts are paused. Choose a plan on the website to resume; your data is safe.</Text></View>;
  }
  if (state === 'past_due') {
    return <View style={[styles.notice, { backgroundColor: colors.warnSoft }]}><Text style={{ color: colors.warn, fontSize: 13 }}>The last payment didn&apos;t go through. Update billing on the website.</Text></View>;
  }
  return null;
}

export default function OverviewScreen() {
  const { organization, reload } = useSession();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<OverTimeRow[]>([]);
  const [recent, setRecent] = useState<Mention[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, t, m] = await Promise.all([api.overview(), api.overTime(), api.mentions({ pageSize: 5 })]);
      setOverview(o);
      setRows(t);
      setRecent(m.items);
      setError(null);
      reload().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your dashboard.');
    }
  }, [reload]);

  // Refresh whenever the tab comes back into view (e.g. after resolving an alert).
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sources = Object.entries(overview?.byPlatform ?? {}).reduce<Record<string, { label: string; color: string; n: number }>>((acc, [platform, n]) => {
    const s = sourceOf(platform);
    acc[s.id] = { label: s.label, color: s.color, n: (acc[s.id]?.n ?? 0) + n };
    return acc;
  }, {});
  const sourceList = Object.values(sources).sort((a, b) => b.n - a.n);
  const sourceMax = Math.max(1, ...sourceList.map((s) => s.n));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.ink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ gap: 6 }}>
          <Text style={type.eyebrow}>{organization?.brandName ?? 'Your brand'}</Text>
          <Text style={type.display}>Your reputation at a glance.</Text>
        </View>

        <PlanNotice />
        <ErrorNote message={error} />

        {!overview && !error ? <Loading /> : null}

        {overview ? (
          <>
            <View style={styles.grid}>
              <Metric label="Total mentions" value={overview.totalMentions} change={overview.trend?.change.total} />
              <Metric label="Open alerts" value={overview.openAlerts ?? 0} tone={(overview.openAlerts ?? 0) > 0 ? colors.negative : undefined} />
              <Metric label="Positive" value={overview.positive} change={overview.trend?.change.positive} tone={colors.positive} />
              <Metric label="Negative" value={overview.negative} change={overview.trend?.change.negative} goodWhen="down" tone={colors.negative} />
            </View>

            <Card style={{ gap: space.lg }}>
              <View style={styles.cardHead}><Text style={type.heading}>Last 7 days</Text><Legend /></View>
              <WeekBars rows={rows} />
            </Card>

            <Card style={{ gap: space.md }}>
              <Text style={type.heading}>Mentions by source</Text>
              {sourceList.length === 0 ? (
                <Text style={type.secondary}>No mentions yet. Add a keyword in the Sources tab to start scanning.</Text>
              ) : (
                sourceList.map((s) => (
                  <View key={s.label} style={{ gap: 5 }}>
                    <View style={styles.cardHead}><Text style={{ fontSize: 13.5, color: colors.ink }}>{s.label}</Text><Text style={type.small}>{s.n.toLocaleString()}</Text></View>
                    <View style={styles.track}><View style={{ width: `${(s.n / sourceMax) * 100}%`, height: '100%', backgroundColor: colors.ink, borderRadius: 3 }} /></View>
                  </View>
                ))
              )}
            </Card>

            <View style={{ gap: space.sm }}>
              <View style={styles.cardHead}>
                <Text style={type.heading}>Recent mentions</Text>
                <Link href="/mentions" style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>View all →</Link>
              </View>
              <View style={styles.list}>
                {recent.length === 0 ? <Empty title="Nothing yet" body="Mentions appear here after the first scan." /> : recent.map((m) => <MentionRow key={`${m.type}:${m.id}`} mention={m} />)}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  metric: { flexBasis: '47%', flexGrow: 1, gap: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  list: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
  notice: { borderRadius: 8, padding: 12 },
});
