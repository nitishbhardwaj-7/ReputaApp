import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="mention/[kind]/[id]" options={{ title: 'Mention' }} />
    </Stack>
  );
}
