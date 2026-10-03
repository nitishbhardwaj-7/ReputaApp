import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The session token lives in the device keychain / keystore. SecureStore has no web
 * implementation, so the web build (used for development previews) falls back to localStorage.
 */
const TOKEN_KEY = 'reputa.session';

export async function readToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // nothing to clear
  }
}
