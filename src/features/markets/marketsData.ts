import { ActivityIcon, BanIcon, MarketsIcon, RiskIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatCount, formatMoney } from '../../lib/format';
import type { ApiMarket, ApiMarketStatus } from '../../lib/api/markets';

export type MarketStatus = ApiMarketStatus;

export const MARKET_STATUS_TONE: Record<MarketStatus, BadgeTone> = {
  Active: 'success',
  Suspended: 'danger',
};

/**
 * rgb triplet per known type — one token drives both the wash and the label.
 * The backend stores `type` as a free string, so any value outside this map
 * falls back to a neutral grey rather than being rejected.
 */
const MARKET_TYPE_RGB: Record<string, string> = {
  'Match Odds': '139, 92, 246',
  Winner: '33, 150, 243',
  'Over Under': '41, 182, 246',
  Fancy: '250, 204, 21',
  Session: '34, 197, 94',
  Bookmaker: '255, 46, 99',
};

const MARKET_TYPE_FALLBACK_RGB = '148, 163, 184';

export function marketTypeColor(type: string): string {
  return MARKET_TYPE_RGB[type] ?? MARKET_TYPE_FALLBACK_RGB;
}

/** Curated type options offered in the Add/Edit Market form — a UI convenience, not a validated backend enum. */
export const MARKET_TYPES = Object.keys(MARKET_TYPE_RGB);

export const MARKET_STATUSES: MarketStatus[] = ['Active', 'Suspended'];

export function marketStats(markets: ApiMarket[]): StatCardProps[] {
  const active = markets.filter((market) => market.status === 'Active' && !market.winner).length;
  // Settled / voided markets are Closed, not Suspended.
  const suspended = markets.filter((market) => market.status === 'Suspended' && !market.winner).length;
  const totalBets = markets.reduce((sum, market) => sum + market.bets, 0);
  const totalExposure = markets.reduce((sum, market) => sum + market.exposure, 0);

  return [
    {
      label: 'Open Markets',
      value: formatCount(active),
      caption: 'Open for betting',
      icon: MarketsIcon,
      accent: 'blue',
      tinted: true,
    },
    { label: 'Total Bets', value: formatCount(totalBets), caption: 'Placed, all time', icon: ActivityIcon, accent: 'cyan' },
    { label: 'Total Exposure', value: formatMoney(totalExposure), caption: 'Across all markets', icon: RiskIcon, accent: 'red' },
    { label: 'Suspended', value: formatCount(suspended), caption: 'Need review', icon: BanIcon, accent: 'yellow' },
  ];
}
