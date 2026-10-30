import { ActivityIcon, CheckCircleIcon, ClockIcon, EventsIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatCount, formatMoney, formatMoneyExact, formatRelativeTime, isToday } from '../../lib/format';
import type { ApiEvent, ApiEventBet, ApiEventStatus } from '../../lib/api/events';
import type { ApiMarket } from '../../lib/api/markets';

export type EventStatus = ApiEventStatus;

export type EventMarket = {
  name: string;
  meta: string;
  active: boolean;
};

export type EventBet = {
  id: string;
  user: string;
  market: string;
  selection: string;
  odds: string;
  amount: string;
  when: string;
  status: { label: string; tone: BadgeTone };
};

export type ExposureRow = {
  market: string;
  amount: string;
  bets: string;
  percent: number;
};

export const EVENT_STATUS_TONE: Record<EventStatus, BadgeTone> = {
  Live: 'danger',
  Upcoming: 'info',
  Suspended: 'warning',
  Completed: 'success',
  Settled: 'neutral',
};

/** In-Play holds matches still running or about to; Complete Match holds finished ones. */
export const IN_PLAY_STATUSES: EventStatus[] = ['Live', 'Upcoming', 'Suspended'];
export const COMPLETE_STATUSES: EventStatus[] = ['Completed', 'Settled'];
export type EventsView = 'in-play' | 'complete';

const BET_STATUS_TONE: Record<ApiEventBet['status'], BadgeTone> = {
  Pending: 'warning',
  Won: 'success',
  Lost: 'danger',
  Void: 'neutral',
  'Cashed Out': 'info',
};

export function eventStats(events: ApiEvent[], markets: ApiMarket[]): StatCardProps[] {
  const live = events.filter((event) => event.status === 'Live').length;
  const upcoming = events.filter((event) => event.status === 'Upcoming').length;
  const activeMarkets = markets.filter((market) => market.status === 'Active').length;
  const settledToday = events.filter((event) => event.status === 'Settled' && isToday(event.updatedAt)).length;

  return [
    { label: 'Live Events', value: formatCount(live), caption: 'Active now', icon: EventsIcon, accent: 'live' },
    { label: 'Upcoming Events', value: formatCount(upcoming), caption: 'Scheduled', icon: ClockIcon, accent: 'cyan' },
    {
      label: 'Active Markets',
      value: formatCount(activeMarkets),
      caption: 'Open for betting',
      icon: ActivityIcon,
      accent: 'blue',
    },
    {
      label: 'Settled Today',
      value: formatCount(settledToday),
      caption: 'Events completed',
      icon: CheckCircleIcon,
      accent: 'green',
    },
  ];
}

/** Per-event market count + total bets, derived from the full markets list (no per-event endpoint exists). */
export function marketsByEvent(markets: ApiMarket[]): Map<string, ApiMarket[]> {
  const map = new Map<string, ApiMarket[]>();
  for (const market of markets) {
    const eventId = typeof market.event === 'string' ? market.event : market.event._id;
    const bucket = map.get(eventId);
    if (bucket) bucket.push(market);
    else map.set(eventId, [market]);
  }
  return map;
}

export function mapEventMarkets(markets: ApiMarket[]): EventMarket[] {
  return markets.map((market) => ({
    name: market.name,
    meta: `${market.type} · ${formatCount(market.bets)} bets · Stake ${formatMoney(market.stake)}`,
    active: market.status === 'Active',
  }));
}

export function mapEventBets(bets: ApiEventBet[], markets: ApiMarket[]): EventBet[] {
  const marketNameById = new Map(markets.map((market) => [market._id, market.name]));
  return bets.map((bet) => ({
    id: bet._id,
    user: typeof bet.user === 'string' ? bet.user : bet.user.name || bet.user.username,
    market: marketNameById.get(bet.market) ?? bet.market,
    selection: bet.selection,
    odds: bet.odds.toFixed(2),
    amount: formatMoneyExact(bet.amount),
    when: formatRelativeTime(bet.placedAt ?? bet.createdAt),
    status: { label: bet.status.toLowerCase(), tone: BET_STATUS_TONE[bet.status] },
  }));
}

/** Exposure per market, scaled relative to the event's most-exposed market (matches the original mock's bar heights). */
export function mapExposureRows(markets: ApiMarket[]): ExposureRow[] {
  const maxExposure = Math.max(1, ...markets.map((market) => market.exposure));
  return markets
    .filter((market) => market.exposure > 0)
    .sort((a, b) => b.exposure - a.exposure)
    .map((market) => ({
      market: market.name,
      amount: formatMoney(market.exposure),
      bets: `${formatCount(market.bets)} bets`,
      percent: Math.round((market.exposure / maxExposure) * 100),
    }));
}
