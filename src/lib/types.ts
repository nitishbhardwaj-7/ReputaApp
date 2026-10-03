export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type SubscriptionState = 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  hasPassword?: boolean;
  googleLinked?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  brandName: string;
  alertEmails: string[];
  plan: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  subscriptionState?: SubscriptionState;
}

export interface SessionResponse {
  user: User;
  organization: Organization;
  token?: string;
  expiresAt?: string;
  created?: boolean;
}

export interface TrendChange {
  abs: number;
  /** null when the previous window was empty, so there is no meaningful percentage. */
  pct: number | null;
}

export interface Overview {
  totalMentions: number;
  totalAnalyzed: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  openAlerts?: number;
  alertsSent24h?: number;
  byPlatform?: Record<string, number>;
  trend?: { change: { total: TrendChange; positive: TrendChange; negative: TrendChange } };
}

export interface OverTimeRow {
  date: string;
  POSITIVE: number;
  NEGATIVE: number;
  NEUTRAL: number;
}

export interface Mention {
  id: string;
  type: 'post' | 'comment';
  keyword: string;
  text: string | null;
  url: string | null;
  author: string | null;
  platform?: string | null;
  publishedAt: string | null;
  createdAt: string;
  analyzedAt?: string | null;
  sentiment: Sentiment | null;
  confidence: number | null;
  alertSent?: boolean;
  resolvedAt?: string | null;
  /** Present on comments: the thread they belong to. */
  post?: { url?: string | null; platform?: string | null } | null;
}

export interface MentionsResponse {
  items: Mention[];
  pagination: { page: number; pageSize: number; total: number };
}

export interface CardStats {
  mentions: number;
  positive: number;
  negative: number;
  neutral: number;
}

/** A keyword (or a competitor) tracked on one platform. */
export interface TrackedCard {
  id: string;
  platform: string;
  keyword: string;
  enabled: boolean;
  lastRunAt?: string | null;
  stats?: CardStats;
}

export type CompetitorSummary = { keyword: string } & CardStats;

export interface PlanLimits {
  mentionsPerMonth: number;
  keywords: number;
  competitors: number;
  alertRecipients: number;
  searchScanning: boolean;
  exports: boolean;
}

export interface Billing {
  entitlements: {
    plan: string;
    planName: string;
    state: SubscriptionState;
    usable: boolean;
    trialDaysLeft: number | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    limits: PlanLimits;
    usage: { mentionsThisMonth: number; keywords: number; competitors: number; alertRecipients: number };
  };
}
