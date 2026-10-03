import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

/** The Android channel negative-mention alerts are delivered on. Must match the server. */
export const ALERT_CHANNEL = 'alerts';

// Show alerts as a banner even while the app is open: a negative mention is worth interrupting for.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let registeredToken: string | null = null;

/**
 * Asks for permission, gets this device's Expo push token and registers it with the API.
 * Quietly does nothing where push cannot work: the web preview, simulators, a denied
 * permission, or a build without push credentials (no EAS project id / Firebase config).
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    if (Platform.OS === 'android') {
      // The channel must exist before Android 13+ will show the permission prompt.
      await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, {
        name: 'Negative mention alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E5484D',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const status = existing.status === 'granted' ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return null; // the build was not linked to an EAS project yet

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.registerDevice(token, Platform.OS);
    registeredToken = token;
    return token;
  } catch {
    // Missing push credentials or a transient failure: the app works without push.
    return null;
  }
}

/** Stops alerts to this device. Call while the session is still valid (before signing out). */
export async function unregisterFromPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await api.unregisterDevice(token);
  } catch {
    // Best effort; the server also drops tokens Expo reports as gone.
  }
}

/** Where a tapped notification should take the user, if it carries an in-app path. */
export function pathFromNotification(response: Notifications.NotificationResponse | null | undefined): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') ? url : null;
}
