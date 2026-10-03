import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ErrorNote, Tag } from '@/components/ui';
import { api } from '@/lib/api';
import { WEB_URL } from '@/lib/config';
import { formatDate, planName } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Billing, SubscriptionState } from '@/lib/types';
import { colors, space, type } from '@/theme';

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.rowBetween}>
        <Text style={{ fontSize: 13.5, color: colors.ink }}>{label}</Text>
        <Text style={type.small}>{used.toLocaleString()} / {limit.toLocaleString()}</Text>
      </View>
      <View style={styles.track}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: pct >= 100 ? colors.negative : pct >= 80 ? colors.warn : colors.ink }} />
      </View>
    </View>
  );
}

const STATE: Record<SubscriptionState, { label: string; bg: string; fg: string }> = {
  trialing: { label: 'Free trial', bg: colors.surfaceMuted, fg: colors.ink },
  active: { label: 'Active', bg: colors.positiveSoft, fg: colors.positive },
  past_due: { label: 'Payment due', bg: colors.warnSoft, fg: colors.warn },
  expired: { label: 'Ended', bg: colors.negativeSoft, fg: colors.negative },
  canceled: { label: 'Ended', bg: colors.negativeSoft, fg: colors.negative },
};

export default function AccountScreen() {
  const { user, organization, signOut } = useSession();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.billing().then((b) => { setBilling(b); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : 'Could not load your plan.'));
    }, [])
  );

  const e = billing?.entitlements;
  const state = e ? STATE[e.state] : null;
  const detail = !e
    ? ''
    : e.state === 'trialing'
      ? `${e.trialDaysLeft} day${e.trialDaysLeft === 1 ? '' : 's'} left · ends ${formatDate(e.trialEndsAt)}`
      : e.state === 'active' && e.currentPeriodEnd
        ? `Renews ${formatDate(e.currentPeriodEnd)}`
        : e.state === 'past_due'
          ? 'The last payment did not go through.'
          : e.usable
            ? ''
            : 'Scanning and alerts are paused. Your data is safe.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={type.title}>Account</Text>
        <ErrorNote message={error} />

        <Card style={{ gap: 4 }}>
          <Text style={type.small}>Signed in as</Text>
          <Text style={type.heading}>{user?.name}</Text>
          <Text style={type.secondary}>{user?.email}</Text>
        </Card>

        <Card style={{ gap: 4 }}>
          <Text style={type.small}>Workspace</Text>
          <Text style={type.heading}>{organization?.name}</Text>
          <Text style={type.secondary}>Monitoring “{organization?.brandName}”</Text>
          <Text style={[type.small, { marginTop: 6 }]}>Alerts go to {organization?.alertEmails?.length ? organization.alertEmails.join(', ') : 'no one yet'}</Text>
        </Card>

        <Card style={{ gap: space.md }}>
          <View style={styles.rowBetween}>
            <View style={{ gap: 2 }}>
              <Text style={type.small}>Plan</Text>
              <Text style={type.heading}>{e?.planName ?? planName(organization?.plan)}</Text>
            </View>
            {state ? <Tag label={state.label} bg={state.bg} fg={state.fg} /> : null}
          </View>
          {detail ? <Text style={type.secondary}>{detail}</Text> : null}
          {e ? (
            <View style={{ gap: space.md, marginTop: 4 }}>
              <Meter label="Mentions this month" used={e.usage.mentionsThisMonth} limit={e.limits.mentionsPerMonth} />
              <Meter label="Keywords" used={e.usage.keywords} limit={e.limits.keywords} />
              <Meter label="Competitors" used={e.usage.competitors} limit={e.limits.competitors} />
            </View>
          ) : null}
          {/* Plans are managed on the website; nothing is sold inside the app. */}
          <Button label="Manage plan on the website" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/app/billing`)} />
        </Card>

        <Card style={{ gap: space.sm }}>
          <Text style={type.heading}>Reports and exports</Text>
          <Text style={type.secondary}>Monthly reports and Excel exports are on the website. Keywords and competitors are in the Sources tab.</Text>
          <Button label="Open reports on the website" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/app/reports`)} />
        </Card>

        <Button label="Sign out" variant="quiet" loading={leaving} onPress={async () => { setLeaving(true); await signOut(); }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
});
