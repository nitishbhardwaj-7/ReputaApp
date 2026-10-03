/**
 * Where the app finds the API. Override per environment with EXPO_PUBLIC_API_URL
 * (e.g. in .env.local for a local backend); EXPO_PUBLIC_ values are inlined at build time.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://orm.webflowby.online/api').replace(/\/+$/, '');

/** The website: plans are changed there, never sold inside the app. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://orm.webflowby.online').replace(/\/+$/, '');

export const APP_NAME = 'Reputa';
