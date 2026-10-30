import { AlertTriangleIcon, RiskIcon, TrendingUpIcon, UsersIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatCount, formatMoney } from '../../lib/format';
import type {
  ApiFlaggedUser,
  ApiLargePendingRequest,
  ApiRiskMarket,
  ApiRiskPanels,
  ApiRiskStats,
  ApiRiskUserRef,
  ApiSuspiciousPattern,
  RiskThresholds,
} from '../../lib/api/risk';

export type RiskLevel = 'Normal' | 'Warning' | 'Critical';

/**
 * Drives the exposure figure and the utilization bar, independently of the
 * badge — row 5 is green while its level reads Warning. The summary panels
 * add 'live' for the pink Large Pending card.
 */
export type RiskTone = 'success' | 'warning' | 'danger' | 'live';

export type ExposureRow = {
  id: string;
  /** The market's event, for the View button (opens Markets on that event). */
  eventId: string | null;
  emoji: string;
  market: string;
  /** Live marker beside the name — the pink dot in the design. */
  live?: boolean;
  exposure: string;
  limit: string;
  utilization: number;
  tone: RiskTone;
  activeBets: string;
  level: RiskLevel;
};

export type RiskPanelItem = {
  id: string;
  text: string;
  /** Extra line under the text (the rule's reason, or who's involved). */
  detail?: string;
  /** Which resolve call applies; absent for items that are reviewed elsewhere (wallet requests). */
  resolve?: 'flag' | 'pattern';
};

export type RiskPanel = {
  title: string;
  count: string;
  tone: RiskTone;
  items: RiskPanelItem[];
};

/** Items shown per panel before "+N more". */
export const PANEL_ITEMS = 5;

export const RISK_LEVEL_TONE: Record<RiskLevel, BadgeTone> = {
  Normal: 'success',
  Warning: 'warning',
  Critical: 'danger',
};

/**
 * rgb triplets so a single custom property drives the solid colour (the
 * figure, the bar, the count) and the 13% border wash on the panels.
 */
export const RISK_TONE_RGB: Record<RiskTone, string> = {
  success: '34, 197, 94',
  warning: '250, 204, 21',
  danger: '239, 68, 68',
  live: '255, 46, 99',
};

/**
 * The backend stores no risk "level" on a market — it's derived here from
 * exposure / cap utilization against Settings → Exposure Limits' Warning and
 * Auto-Suspend thresholds (sent with `GET /risk/exposure`).
 */
const DEFAULT_THRESHOLDS: RiskThresholds = { warningPercent: 60, criticalPercent: 100 };

function utilizationOf(market: ApiRiskMarket): number {
  if (!market.maxExposure) return 0;
  return Math.min(100, Math.round((market.exposure / market.maxExposure) * 100));
}

function levelOf(utilization: number, thresholds: RiskThresholds): RiskLevel {
  if (utilization >= thresholds.criticalPercent) return 'Critical';
  if (utilization >= thresholds.warningPercent) return 'Warning';
  return 'Normal';
}

const LEVEL_TO_RISK_TONE: Record<RiskLevel, RiskTone> = {
  Normal: 'success',
  Warning: 'warning',
  Critical: 'danger',
};

/** Sport → emoji, matched loosely (case-insensitive) since the backend only supplies a free-text sport string. */
const SPORT_EMOJI: Record<string, string> = {
  cricket: '🏏',
  football: '⚽',
  soccer: '⚽',
  tennis: '🎾',
  basketball: '🏀',
  kabaddi: '🤼',
  hockey: '🏑',
  horse: '🏇',
  'horse racing': '🏇',
};

const SPORT_EMOJI_FALLBACK = '🎯';

function eventOf(market: ApiRiskMarket) {
  return typeof market.event === 'string' ? null : market.event;
}

export function marketEmoji(market: ApiRiskMarket): string {
  const sport = eventOf(market)?.sport?.toLowerCase().trim() ?? '';
  return SPORT_EMOJI[sport] ?? SPORT_EMOJI_FALLBACK;
}

function marketLabel(market: ApiRiskMarket): string {
  const event = eventOf(market);
  return event ? `${event.name} — ${market.name}` : market.name;
}

export function riskStats(stats: ApiRiskStats): StatCardProps[] {
  return [
    {
      label: 'Critical Markets',
      value: formatCount(stats.highExposureMarkets),
      caption: 'Exposure at or above limit',
      icon: AlertTriangleIcon,
      accent: 'live',
    },
    {
      label: 'High-Risk Users',
      value: formatCount(stats.flaggedCount),
      caption: 'Flagged for manual review',
      icon: UsersIcon,
      accent: 'red',
    },
    {
      label: 'Suspicious Patterns',
      value: formatCount(stats.patternCount),
      caption: 'Unresolved detections',
      icon: RiskIcon,
      accent: 'yellow',
    },
    {
      label: 'Large Pending',
      value: formatCount(stats.largePendingRequests),
      caption: `Wallet requests ≥ ${formatMoney(50000)}`,
      icon: TrendingUpIcon,
      accent: 'red',
    },
  ];
}

export function mapExposureRows(markets: ApiRiskMarket[], thresholds: RiskThresholds = DEFAULT_THRESHOLDS): ExposureRow[] {
  return markets.map((market) => {
    const utilization = utilizationOf(market);
    const level = levelOf(utilization, thresholds);
    return {
      id: market._id,
      eventId: eventOf(market)?._id ?? null,
      emoji: marketEmoji(market),
      market: marketLabel(market),
      live: level === 'Critical',
      exposure: formatMoney(market.exposure),
      limit: formatMoney(market.maxExposure),
      utilization,
      tone: LEVEL_TO_RISK_TONE[level],
      activeBets: formatCount(market.bets),
      level,
    };
  });
}

function userLabel(ref: string | ApiRiskUserRef): string {
  return typeof ref === 'string' ? ref : (ref.name || ref.username || ref._id);
}

function mapFlaggedUsers(flaggedUsers: ApiFlaggedUser[]): RiskPanel {
  return {
    title: 'High Risk Users',
    count: formatCount(flaggedUsers.length),
    tone: 'danger',
    items: flaggedUsers.slice(0, PANEL_ITEMS).map((item) => ({
      id: item._id,
      text: `${userLabel(item.user)} (Score: ${item.score})`,
      detail: item.reason,
      resolve: 'flag' as const,
    })),
  };
}

function mapPatterns(patterns: ApiSuspiciousPattern[]): RiskPanel {
  return {
    title: 'Suspicious Patterns',
    count: formatCount(patterns.length),
    tone: 'warning',
    items: patterns.slice(0, PANEL_ITEMS).map((item) => ({
      id: item._id,
      text: `${item.severity}: ${item.description}`,
      detail: item.relatedUsers.length ? item.relatedUsers.map(userLabel).join(', ') : undefined,
      resolve: 'pattern' as const,
    })),
  };
}

function kindLabel(kind: ApiLargePendingRequest['kind']): string {
  return kind === 'deposit' ? 'deposit' : 'withdrawal';
}

function mapLargePending(requests: ApiLargePendingRequest[]): RiskPanel {
  return {
    title: 'Large Pending',
    count: formatCount(requests.length),
    tone: 'live',
    items: requests.slice(0, PANEL_ITEMS).map((item) => ({
      id: item._id,
      text: `${formatMoney(item.amount)} ${kindLabel(item.kind)}: ${userLabel(item.user)}`,
      detail: 'Review it in Wallet',
    })),
  };
}

export function mapRiskPanels(panels: ApiRiskPanels): RiskPanel[] {
  return [mapFlaggedUsers(panels.flaggedUsers), mapPatterns(panels.patterns), mapLargePending(panels.largePendingRequests)];
}
