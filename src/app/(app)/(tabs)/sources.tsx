import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, ErrorNote, Loading, SourceIcon, Tag } from '@/components/ui';
import { api } from '@/lib/api';
import { sourceOf, timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { CardStats, CompetitorSummary, Overview, TrackedCard } from '@/lib/types';
import { colors, radius, space, type } from '@/theme';

/** Platforms a card can be added to, in the order the website lists them. */
const PLATFORMS = [
  { id: 'reddit', hint: 'Threads and comments' },
  { id: 'trustpilot', hint: 'Reviews — use the domain, e.g. acme.com' },
  { id: 'linkedin', hint: 'Posts and articles' },
  { id: 'quora', hint: 'Questions and answers' },
  { id: 'teamblind', hint: 'Anonymous professional discussions' },
] as const;

type Mode = 'brand' | 'competitors';

/** Alert.alert has no buttons on web; fall back to the browser's confirm there. */
function confirmDelete(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function IconAction({ icon, label, onPress, disabled, busy, danger }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; disabled?: boolean; busy?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [styles.iconAct, pressed && { backgroundColor: colors.surfaceMuted }, disabled && { opacity: 0.4 }]}>
      {busy ? <ActivityIndicator size="small" color={colors.ink} /> : <Feather name={icon} size={17} color={danger ? colors.negative : colors.inkSecondary} />}
    </Pressable>
  );
}

function CardRow({ card, busy, onRun, onToggle, onDelete }: { card: TrackedCard; busy: string | null; onRun: () => void; onToggle: () => void; onDelete: () => void }) {
  const s = card.stats;
  const locked = busy !== null;
  return (
    <View style={[styles.cardRow, !card.enabled && { backgroundColor: colors.surfaceMuted }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={styles.keyword}>{card.keyword}</Text>
          <Tag label={card.enabled ? 'Active' : 'Paused'} bg={card.enabled ? colors.positiveSoft : colors.surfaceMuted} fg={card.enabled ? colors.positive : colors.inkSecondary} />
        </View>
        <Text style={type.small}>
          {(s?.mentions ?? 0).toLocaleString()} mentions
          {s && s.mentions > 0 ? ` · ${s.positive} positive · ${s.negative} negative` : ''}
        </Text>
        <Text style={[type.small, { color: colors.inkTertiary }]}>{card.lastRunAt ? `Scanned ${timeAgo(card.lastRunAt)}` : 'Not scanned yet'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <IconAction icon="refresh-cw" label={`Scan ${card.keyword} now`} onPress={onRun} disabled={locked || !card.enabled} busy={busy === `run-${card.id}`} />
        <IconAction icon={card.enabled ? 'pause' : 'play'} label={`${card.enabled ? 'Pause' : 'Resume'} ${card.keyword}`} onPress={onToggle} disabled={locked} busy={busy === `tog-${card.id}`} />
        <IconAction icon="trash-2" label={`Delete ${card.keyword}`} onPress={onDelete} disabled={locked} busy={busy === `del-${card.id}`} danger />
      </View>
    </View>
  );
}

function AddRow({ platformLabel, noun, placeholder, disabled, onAdd }: { platformLabel: string; noun: string; placeholder: string; disabled: boolean; onAdd: (keyword: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value.trim() || saving) return;
    setSaving(true);
    const ok = await onAdd(value.trim());
    setSaving(false);
    if (ok) {
      setValue('');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${noun} on ${platformLabel}`} onPress={() => setOpen(true)} disabled={disabled}
        style={({ pressed }) => [styles.addRow, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <Feather name="plus" size={16} color={colors.inkSecondary} />
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkSecondary }}>Add {noun}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.addForm}>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.inkTertiary} autoFocus autoCapitalize="none" autoCorrect={false}
        returnKeyType="done" onSubmitEditing={submit} style={styles.addInput} accessibilityLabel={`New ${noun} on ${platformLabel}`} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Add card" onPress={submit} loading={saving} disabled={!value.trim()} style={{ flex: 1, height: 42 }} />
        <Button label="Cancel" variant="secondary" onPress={() => { setOpen(false); setValue(''); }} style={{ height: 42 }} />
      </View>
    </View>
  );
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function CompareRow({ name, stats, you }: { name: string; stats: CardStats; you?: boolean }) {
  const analyzed = stats.positive + stats.neutral + stats.negative;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.between}>
        <Text style={{ fontSize: 14, fontWeight: you ? '600' : '500', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{name}{you ? '  (you)' : ''}</Text>
        <Text style={type.small}>{stats.mentions.toLocaleString()} mentions</Text>
      </View>
      <View style={styles.vsBar}>
        {analyzed > 0 ? (
          <>
            <View style={{ width: `${(stats.positive / analyzed) * 100}%`, backgroundColor: colors.positive }} />
            <View style={{ width: `${(stats.neutral / analyzed) * 100}%`, backgroundColor: colors.neutral }} />
            <View style={{ width: `${(stats.negative / analyzed) * 100}%`, backgroundColor: colors.negative }} />
          </>
        ) : null}
      </View>
      <Text style={type.small}>{analyzed > 0 ? `${pct(stats.positive, analyzed)}% positive · ${pct(stats.negative, analyzed)}% negative` : 'Not analyzed yet'}</Text>
    </View>
  );
}

export default function SourcesScreen() {
  const { organization } = useSession();
  const [mode, setMode] = useState<Mode>('brand');
  const [brandCards, setBrandCards] = useState<TrackedCard[] | null>(null);
  const [rivalCards, setRivalCards] = useState<TrackedCard[] | null>(null);
  const [rivals, setRivals] = useState<CompetitorSummary[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, c, o, ov] = await Promise.all([api.cards(), api.competitorCards(), api.competitorOverview(), api.overview()]);
      setBrandCards(b.cards);
      setRivalCards(c.cards);
      setRivals(o.competitors ?? []);
      setOverview(ov);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your cards.');
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  /** Runs one action, then refreshes. Plan-limit messages from the server are shown as-is. */
  async function act(id: string, fn: () => Promise<unknown>, done: string): Promise<boolean> {
    setBusy(id);
    setNotice(null);
    try {
      await fn();
      await load();
      setNotice(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const competitor = mode === 'competitors';
  const cards = competitor ? rivalCards : brandCards;
  const noun = competitor ? 'competitor' : 'keyword';
  const ops = competitor
    ? { add: api.addCompetitorCard, run: api.runCompetitorCard, toggle: api.toggleCompetitorCard, remove: api.deleteCompetitorCard, runAll: api.runAllCompetitorCards }
    : { add: api.addCard, run: api.runCard, toggle: api.toggleCard, remove: api.deleteCard, runAll: api.runAllCards };
  const activeCount = (cards ?? []).filter((c) => c.enabled).length;
  const you: CardStats = { mentions: overview?.totalMentions ?? 0, positive: overview?.positive ?? 0, neutral: overview?.neutral ?? 0, negative: overview?.negative ?? 0 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.ink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ gap: 4 }}>
          <Text style={type.title}>Sources</Text>
          <Text style={type.secondary}>Each card is one keyword on one platform, scanned every hour.</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Your brand" active={!competitor} onPress={() => { setMode('brand'); setNotice(null); setError(null); }} />
          <Chip label="Competitors" active={competitor} onPress={() => { setMode('competitors'); setNotice(null); setError(null); }} />
        </View>

        <ErrorNote message={error} />
        {notice ? <View style={styles.notice}><Text style={{ color: colors.positive, fontSize: 13.5 }}>{notice}</Text></View> : null}

        {competitor && cards ? (
          <Card style={{ gap: space.lg }}>
            <Text style={type.heading}>You vs. competitors</Text>
            <CompareRow name={organization?.brandName ?? 'Your brand'} stats={you} you />
            {rivals.map((r) => <CompareRow key={r.keyword} name={r.keyword} stats={r} />)}
            {rivals.length === 0 ? <Text style={type.secondary}>{cards.length === 0 ? 'Add a competitor card below to start comparing.' : 'No competitor mentions yet. Run a scan or wait for the next hourly cycle.'}</Text> : null}
          </Card>
        ) : null}

        {cards === null && !error ? <Loading /> : null}

        {cards
          ? PLATFORMS.map((p) => {
              const source = sourceOf(p.id);
              const list = cards.filter((c) => c.platform === p.id);
              return (
                <View key={p.id} style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <SourceIcon source={source} size={22} />
                    <Text style={type.heading}>{source.label}</Text>
                    <Text style={type.small}>{list.length} card{list.length === 1 ? '' : 's'}</Text>
                  </View>
                  <View style={styles.group}>
                    {list.map((c) => (
                      <CardRow
                        key={c.id}
                        card={c}
                        busy={busy}
                        onRun={() => void act(`run-${c.id}`, () => ops.run(c.id), `Scanned “${c.keyword}”.`)}
                        onToggle={() => void act(`tog-${c.id}`, () => ops.toggle(c.id), c.enabled ? 'Card paused.' : 'Card resumed.')}
                        onDelete={() => confirmDelete(`Delete “${c.keyword}”?`, `It will stop being scanned on ${source.label}. Mentions already collected are kept.`, () => void act(`del-${c.id}`, () => ops.remove(c.id), 'Card deleted.'))}
                      />
                    ))}
                    <AddRow
                      platformLabel={source.label}
                      noun={noun}
                      placeholder={p.id === 'trustpilot' ? (competitor ? 'competitor.com' : 'yourdomain.com') : competitor ? 'Competitor brand' : organization?.brandName ?? 'Your brand'}
                      disabled={busy !== null}
                      onAdd={(keyword) => act('add', () => ops.add(p.id, keyword), 'Card added.')}
                    />
                  </View>
                  <Text style={[type.small, { color: colors.inkTertiary }]}>{p.hint}</Text>
                </View>
              );
            })
          : null}

        {cards && cards.length > 0 ? (
          <Button label={competitor ? 'Scan all competitors now' : 'Scan all now'} variant="secondary" loading={busy === 'all'} disabled={busy !== null || activeCount === 0}
            onPress={() => void act('all', () => ops.runAll(), 'Scan complete.')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  group: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  keyword: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.ink, flexShrink: 1 },
  iconAct: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 48 },
  addForm: { padding: 12, gap: 10 },
  addInput: { height: 46, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 16, color: colors.ink, backgroundColor: colors.surface },
  vsBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  notice: { backgroundColor: colors.positiveSoft, borderRadius: radius.md, padding: 12 },
});
