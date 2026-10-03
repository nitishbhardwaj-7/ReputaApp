import type { Mention } from './types';

export interface SourceMeta {
  id: string;
  label: string;
  color: string;
  glyph: string;
}

const SOURCES: Record<string, SourceMeta> = {
  reddit: { id: 'reddit', label: 'Reddit', color: '#FF4500', glyph: 'R' },
  google: { id: 'google', label: 'Google', color: '#4285F4', glyph: 'G' },
  trustpilot: { id: 'trustpilot', label: 'Trustpilot', color: '#00B67A', glyph: 'T' },
  linkedin: { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', glyph: 'L' },
  quora: { id: 'quora', label: 'Quora', color: '#B92B27', glyph: 'Q' },
  youtube: { id: 'youtube', label: 'YouTube', color: '#FF0000', glyph: '▶' },
  teamblind: { id: 'teamblind', label: 'TeamBlind', color: '#2D2D2D', glyph: 'T' },
};

/** Maps whatever platform label the data carries to a display source (same rules as the website). */
export function sourceOf(platform?: string | null, url?: string | null): SourceMeta {
  const p = (platform ?? '').toLowerCase();
  const u = (url ?? '').toLowerCase();
  if (p.includes('reddit') || u.includes('reddit.com')) return SOURCES.reddit;
  if (p.includes('trustpilot') || u.includes('trustpilot.com')) return SOURCES.trustpilot;
  if (p.includes('linkedin') || u.includes('linkedin.com')) return SOURCES.linkedin;
  if (p.includes('quora') || u.includes('quora.com')) return SOURCES.quora;
  if (p.includes('youtube') || u.includes('youtube.com') || u.includes('youtu.be')) return SOURCES.youtube;
  if (p.includes('blind') || u.includes('teamblind.com')) return SOURCES.teamblind;
  if (p === 'news' || p === 'web' || p === 'google' || p === 'bing') return SOURCES.google;
  const label = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Web';
  return { id: p || 'web', label, color: '#6B7078', glyph: label.charAt(0) };
}

export function mentionSource(m: Mention): SourceMeta {
  return sourceOf(m.platform ?? m.post?.platform, m.url ?? m.post?.url);
}

export function mentionUrl(m: Mention): string | null {
  return m.url ?? m.post?.url ?? null;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function severityOf(confidence: number | null): 'High' | 'Medium' | 'Low' {
  const c = confidence ?? 0;
  return c >= 0.9 ? 'High' : c >= 0.75 ? 'Medium' : 'Low';
}

const PLAN_NAMES: Record<string, string> = { trial: 'Free trial', starter: 'Starter', growth: 'Growth', scale: 'Scale' };
export function planName(plan?: string | null): string {
  return PLAN_NAMES[plan ?? 'trial'] ?? 'Free trial';
}

/** Detail screens read the mention the list already holds; there is no single-item endpoint. */
const cache = new Map<string, Mention>();
export const mentionCache = {
  key: (m: Pick<Mention, 'type' | 'id'>) => `${m.type}:${m.id}`,
  put(m: Mention) {
    cache.set(`${m.type}:${m.id}`, m);
  },
  get(kind: string, id: string): Mention | undefined {
    return cache.get(`${kind}:${id}`);
  },
};
