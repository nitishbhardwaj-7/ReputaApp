import * as Notifications from 'expo-notifications';
import { Stack, router, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { pathFromNotification } from '@/lib/push';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/theme';

// Stay on the splash until the stored session has been checked, so there is no flash of the sign-in screen.
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoading, user } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  // Tapping an alert opens the mention it is about, whether the app was running or not.
  useEffect(() => {
    if (Platform.OS === 'web' || isLoading || !user) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const path = pathFromNotification(response);
      if (path) router.push(path as Href);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [isLoading, user]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}
