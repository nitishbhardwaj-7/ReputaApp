import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError, setAuthToken, setUnauthorizedHandler } from './api';
import { clearToken, readToken, writeToken } from './storage';
import type { Organization, SessionResponse, User } from './types';

interface SessionState {
  /** True until the stored token has been checked once at launch. */
  isLoading: boolean;
  user: User | null;
  organization: Organization | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { name: string; email: string; password: string }) => Promise<void>;
  /** For the native Google button: pass the ID token it returns. */
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads the workspace (plan state can change while the app is open). */
  reload: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com']);

/** Same rule the website uses for a first workspace name; the owner can rename it later. */
function workspaceName(name: string, email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain && !FREE_MAIL.has(domain)) {
    const base = domain.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return `${name.trim().split(/\s+/)[0] || 'My'}'s workspace`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const drop = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setOrganization(null);
    await clearToken();
  }, []);

  const adopt = useCallback(async (res: SessionResponse) => {
    if (!res.token) throw new ApiError('The server did not return a session. Please update the app.', 500);
    setAuthToken(res.token);
    await writeToken(res.token);
    setUser(res.user);
    setOrganization(res.organization);
  }, []);

  // Launch: restore the stored token, renew it, and load the workspace.
  useEffect(() => {
    let alive = true;
    setUnauthorizedHandler(() => { void drop(); });
    (async () => {
      const stored = await readToken();
      if (!stored) return;
      setAuthToken(stored);
      try {
        const renewed = await api.refresh();
        if (renewed.token) {
          setAuthToken(renewed.token);
          await writeToken(renewed.token);
        }
        const me = await api.me();
        if (!alive) return;
        setUser(me.user);
        setOrganization(me.organization);
      } catch (err) {
        // Offline at launch keeps the token for next time; a rejected token is discarded.
        if (err instanceof ApiError && err.status === 401) await drop();
        else setAuthToken(null);
      }
    })().finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
      setUnauthorizedHandler(null);
    };
  }, [drop]);

  const value = useMemo<SessionState>(
    () => ({
      isLoading,
      user,
      organization,
      signIn: async (email, password) => adopt(await api.login(email.trim().toLowerCase(), password)),
      signUp: async ({ name, email, password }) => {
        const clean = email.trim().toLowerCase();
        const workspace = workspaceName(name, clean);
        await adopt(await api.signup({ name: name.trim(), email: clean, password, organizationName: workspace, brandName: workspace }));
      },
      signInWithGoogle: async (idToken) => adopt(await api.google(idToken)),
      signOut: drop,
      reload: async () => {
        const me = await api.me();
        setUser(me.user);
        setOrganization(me.organization);
      },
    }),
    [isLoading, user, organization, adopt, drop]
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
