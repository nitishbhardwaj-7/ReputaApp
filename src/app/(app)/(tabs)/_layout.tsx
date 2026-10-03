import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { colors } from '@/theme';

export default function TabsLayout() {
  const [openAlerts, setOpenAlerts] = useState(0);

  // The badge on the Alerts tab: open negative mentions, refreshed every minute while the app is open.
  useEffect(() => {
    let alive = true;
    const load = () => api.overview().then((o) => alive && setOpenAlerts(o.openAlerts ?? 0)).catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color }) => <Feather name="activity" size={22} color={color} /> }} />
      <Tabs.Screen name="mentions" options={{ title: 'Mentions', tabBarIcon: ({ color }) => <Feather name="message-circle" size={22} color={color} /> }} />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Feather name="bell" size={22} color={color} />,
          tabBarBadge: openAlerts > 0 ? (openAlerts > 99 ? '99+' : openAlerts) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.negative, color: '#fff', fontSize: 10 },
        }}
      />
      <Tabs.Screen name="sources" options={{ title: 'Sources', tabBarIcon: ({ color }) => <Feather name="layers" size={22} color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} /> }} />
    </Tabs>
  );
}
