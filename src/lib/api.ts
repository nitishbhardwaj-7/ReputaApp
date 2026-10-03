import { API_URL } from './config';
import type { Billing, CompetitorSummary, Mention, MentionsResponse, OverTimeRow, Overview, Sentiment, SessionResponse, TrackedCard } from './types';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** The session layer registers these so the API client never imports React state. */
let currentToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `${path}?${parts.join('&')}` : path;
}

async function request<T>(path: string, init: { method?: string; body?: unknown; query?: Query; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${withQuery(path, query)}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Tells the API to answer with a bearer token instead of a browser cookie.
        'X-Reputa-Client': 'mobile',
        ...(auth && currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (!res.ok) {
    let message = `Something went wrong (${res.status}).`;
    let code: string | undefined;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      code = data?.code;
    } catch {
      // not JSON
    }
    // A rejected token on a protected route means the session is gone.
    if (res.status === 401 && auth && currentToken) onUnauthorized?.();
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as T;
}

export interface MentionFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  sentiment?: Sentiment;
  platform?: string;
  dateFrom?: string;
}

export const api = {
  // ---- session
  login: (email: string, password: string) =>
    request<SessionResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  signup: (data: { name: string; email: string; password: string; organizationName: string; brandName: string }) =>
    request<SessionResponse>('/auth/signup', { method: 'POST', body: data, auth: false }),
  /** `credential` is the Google ID token obtained on the device. */
  google: (credential: string) => request<SessionResponse>('/auth/google', { method: 'POST', body: { credential }, auth: false }),
  me: () => request<SessionResponse>('/auth/me'),
  refresh: () => request<{ token?: string; expiresAt?: string }>('/auth/refresh', { method: 'POST' }),

  // ---- data
  overview: () => request<Overview>('/overview'),
  overTime: () => request<OverTimeRow[]>('/charts/over-time'),
  mentions: (filters: MentionFilters = {}) => request<MentionsResponse>('/items', { query: { ...filters } }),
  negative: (filters: MentionFilters = {}) => request<MentionsResponse>('/items/negative', { query: { ...filters } }),
  resolve: (kind: Mention['type'], id: string, resolved: boolean) =>
    request<{ ok: boolean; id: string; resolvedAt: string | null }>(`/items/${kind}/${id}/resolve`, { method: 'PATCH', body: { resolved } }),
  billing: () => request<Billing>('/billing'),
  /** One mention by id: used when a notification opens the app straight onto it. */
  mention: (kind: string, id: string) => request<Mention>(`/items/${kind}/${id}`),

  // ---- keyword cards (your brand)
  cards: () => request<{ cards: TrackedCard[] }>('/platform-keywords'),
  addCard: (platform: string, keyword: string) => request<{ ok: boolean }>('/platform-keywords', { method: 'POST', body: { platform, keyword } }),
  deleteCard: (id: string) => request<{ ok: boolean }>(`/platform-keywords/${id}`, { method: 'DELETE' }),
  toggleCard: (id: string) => request<{ ok: boolean }>(`/platform-keywords/${id}/toggle`, { method: 'PATCH' }),
  runCard: (id: string) => request<{ ok: boolean }>(`/platform-keywords/run-card/${id}`, { method: 'POST', body: {} }),
  runAllCards: () => request<{ ok: boolean }>('/platform-keywords/run-all', { method: 'POST', body: {} }),

  // ---- competitor cards
  competitorCards: () => request<{ cards: TrackedCard[] }>('/competitor-cards/cards'),
  addCompetitorCard: (platform: string, keyword: string) => request<{ ok: boolean }>('/competitor-cards/cards', { method: 'POST', body: { platform, keyword } }),
  deleteCompetitorCard: (id: string) => request<{ ok: boolean }>(`/competitor-cards/cards/${id}`, { method: 'DELETE' }),
  toggleCompetitorCard: (id: string) => request<{ ok: boolean }>(`/competitor-cards/cards/${id}/toggle`, { method: 'PATCH' }),
  runCompetitorCard: (id: string) => request<{ ok: boolean }>(`/competitor-cards/cards/run-card/${id}`, { method: 'POST', body: {} }),
  runAllCompetitorCards: () => request<{ ok: boolean }>('/competitor-cards/cards/run-all', { method: 'POST', body: {} }),
  competitorOverview: () => request<{ totalMentions: number; competitors?: CompetitorSummary[] }>('/competitors/overview'),

  // ---- push
  registerDevice: (token: string, platform: string) => request<{ ok: boolean }>('/devices', { method: 'POST', body: { token, platform } }),
  unregisterDevice: (token: string) => request<{ ok: boolean }>('/devices', { method: 'DELETE', body: { token } }),
};
