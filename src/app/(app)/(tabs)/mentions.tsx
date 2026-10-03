import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentionRow } from '@/components/mention-row';
import { Chip, Empty, ErrorNote, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import type { Mention, Sentiment } from '@/lib/types';
import { colors, space, type } from '@/theme';

const PAGE = 25;
const FILTERS: { label: string; value: Sentiment | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Negative', value: 'NEGATIVE' },
  { label: 'Positive', value: 'POSITIVE' },
  { label: 'Neutral', value: 'NEUTRAL' },
];

export default function MentionsScreen() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | undefined>(undefined);
  const [items, setItems] = useState<Mention[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // Which search + filter the list on screen belongs to; anything else is still loading.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a slow earlier request overwriting a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const key = `${search}|${sentiment ?? ''}`;
  const loading = loadedKey !== key;

  const load = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      const id = ++requestId.current;
      try {
        const res = await api.mentions({ page: nextPage, pageSize: PAGE, search: search || undefined, sentiment });
        if (id !== requestId.current) return;
        setItems((prev) => (mode === 'append' ? [...prev, ...res.items] : res.items));
        setTotal(res.pagination.total);
        setPage(nextPage);
        setError(null);
      } catch (e) {
        if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not load mentions.');
      } finally {
        if (id === requestId.current) setLoadedKey(`${search}|${sentiment ?? ''}`);
      }
    },
    [search, sentiment]
  );

  // First page for the current search + filter. State is only set from the promise callbacks.
  useEffect(() => {
    const id = ++requestId.current;
    const current = `${search}|${sentiment ?? ''}`;
    api
      .mentions({ page: 1, pageSize: PAGE, search: search || undefined, sentiment })
      .then((res) => {
        if (id !== requestId.current) return;
        setItems(res.items);
        setTotal(res.pagination.total);
        setPage(1);
        setError(null);
      })
      .catch((e) => {
        if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not load mentions.');
      })
      .finally(() => {
        if (id === requestId.current) setLoadedKey(current);
      });
  }, [search, sentiment]);

  async function more() {
    if (loadingMore || loading || items.length >= total) return;
    setLoadingMore(true);
    await load(page + 1, 'append');
    setLoadingMore(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.head}>
        <Text style={type.title}>Mentions</Text>
        <View style={styles.search}>
          <Feather name="search" size={16} color={colors.inkTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search mentions"
            placeholderTextColor={colors.inkTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search mentions"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => <Chip key={f.label} label={f.label} active={sentiment === f.value} onPress={() => setSentiment(f.value)} />)}
        </ScrollView>
      </View>

      {error ? <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}><ErrorNote message={error} /></View> : null}

      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => `${m.type}:${m.id}`}
          renderItem={({ item }) => <MentionRow mention={item} />}
          onEndReached={more}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(1, 'replace'); setRefreshing(false); }}
          ListHeaderComponent={<Text style={[type.small, styles.count]}>{total.toLocaleString()} mention{total === 1 ? '' : 's'}</Text>}
          ListEmptyComponent={<Empty title="No mentions match" body="Try a different search or filter." />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.ink} style={{ paddingVertical: 20 }} /> : <View style={{ height: 24 }} />}
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { padding: space.lg, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.surface },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, height: '100%' },
  count: { paddingHorizontal: space.lg, paddingVertical: 10, backgroundColor: colors.bg },
});
