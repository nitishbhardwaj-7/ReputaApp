# Reputa — mobile app

The iOS and Android app for [Reputa](https://orm.webflowby.online), built with Expo (SDK 57) and
Expo Router. It talks to the same API as the website; the backend lives in the
[Reputa](https://github.com/nitishbhardwaj-7/Reputa) repository and the contract is in its
`docs/MOBILE_API.md`.

## What's in this version

| Screen | What it does |
|---|---|
| Sign in / Sign up | Email and password. Sign-up starts the 14-day trial. |
| Overview | Totals with week-over-week change, open alerts, a 7-day sentiment chart, mentions by source, recent mentions. |
| Mentions | Search, filter by sentiment, infinite scroll, pull to refresh. |
| Mention | Full text, why it matters, suggested response, details, **Mark resolved**, open the source. |
| Alerts | Negative mentions, open or all, newest detection first. |
| Account | Workspace, plan state and usage. Plans are managed on the website. |

Keywords, sources, competitors, reports and billing stay on the website. Nothing is sold
inside the app.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator. `npx expo start --web`
runs it in a browser for quick checks.

By default the app uses the production API. To point it somewhere else, copy `.env.example`
to `.env.local`:

```
EXPO_PUBLIC_API_URL=http://<your-computer-ip>:4000/api
```

A phone cannot reach `localhost` on your computer; use the computer's LAN address. For the web
preview, the backend must allow the origin: add `http://localhost:8081` to `APP_ORIGINS` in the
backend's `.env`.

## Checks

```bash
npx tsc --noEmit    # types
npx expo lint       # lint (includes the React Compiler rules)
npx expo-doctor     # dependency and config health
```

## How it is put together

```
src/app/                    routes (Expo Router)
  _layout.tsx               session provider + protected routes
  sign-in.tsx, sign-up.tsx  shown only when signed out
  (app)/(tabs)/             Overview, Mentions, Alerts, Account
  (app)/mention/[kind]/[id] mention detail
src/lib/
  api.ts                    typed API client; sends X-Reputa-Client: mobile and the bearer token
  session.tsx               sign in / out, token restore and renewal at launch
  storage.ts                token in the device keychain (expo-secure-store)
  format.ts, types.ts, config.ts
src/components/             buttons, fields, badges, the mention row
src/theme.ts                colours, spacing, type scale (matches the website)
```

The session token is stored in the keychain, renewed at every launch, and dropped the moment
the server rejects it.

## Not built yet

- **Push notifications** for negative mentions (needs a device-registration endpoint on the backend).
- **Google sign-in**. The API and `signInWithGoogle(idToken)` in `session.tsx` are ready; the
  native Google button needs a development build (it cannot run in Expo Go) plus iOS and
  Android OAuth client ids for the bundle id `com.adaptsmedia.reputa`.
- **Store builds** via EAS (`eas build`), app icon and splash artwork.
