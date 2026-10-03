import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentionRow } from '@/components/mention-row';
import { Chip, Empty, ErrorNote, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import type { Mention } from '@/lib/types';
import { colors, space, type } from '@/theme';

export default function AlertsScreen() {
  const [items, setItems] = useState<Mention[] | null>(null);
  // The list loads the latest 200; the server's total may be larger.
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<'open' | 'all'>('open');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.negative({ pageSize: 200 });
      // Newest detections first: that is the order someone on call needs.
      setItems(res.items.slice().sort((a, b) => new Date(b.analyzedAt ?? b.createdAt).getTime() - new Date(a.analyzedAt ?? a.createdAt).getTime()));
      setTotal(res.pagination.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load alerts.');
    }
  }, []);

  // Coming back from a mention that was just resolved should show it as reviewed.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = (items ?? []).filter((m) => !m.resolvedAt);
  const shown = view === 'open' ? open : (items ?? []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.head}>
        <Text style={type.title}>Alerts</Text>
        <Text style={type.secondary}>Negative mentions that need a response.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Chip label={`Open${items ? ` · ${open.length}${total > items.length ? '+' : ''}` : ''}`} active={view === 'open'} onPress={() => setView('open')} />
          <Chip label={`All${items ? ` · ${Math.max(total, items.length).toLocaleString()}` : ''}`} active={view === 'all'} onPress={() => setView('all')} />
        </View>
      </View>

      {error ? <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}><ErrorNote message={error} /></View> : null}

      {items === null && !error ? (
        <Loading />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(m) => `${m.type}:${m.id}`}
          renderItem={({ item }) => <MentionRow mention={item} alert />}
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          ListEmptyComponent={<Empty title={view === 'open' ? 'All clear' : 'No negative mentions'} body={view === 'open' ? 'Every negative mention has been reviewed.' : 'Nothing negative has been detected yet.'} />}
          ListFooterComponent={<View style={{ height: 24 }} />}
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { padding: space.lg, gap: 4, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
