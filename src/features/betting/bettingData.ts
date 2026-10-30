import { ActivityIcon, EventsIcon, HashIcon, TrendUpIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatCount, formatMoney, isToday } from '../../lib/format';
import type { ApiMatch } from '../../lib/api/betting';
import type { ApiProvider } from '../../lib/api/betting';

/**
 * 'Settled' and 'Open Bets' have no matching value in the backend's
 * `GET /betting/matches?tab=` enum (only live/upcoming/completed — see
 * betting.service.js#listMatches). Rather than depend on that endpoint's
 * "unrecognized tab returns everything" fallback, the page fetches every
 * match once (no tab param) and every tab below is derived client-side from
 * `event.status`.
 */
export type MatchTab = 'Live' | 'Upcoming' | 'Settled' | 'Open Bets';

export const MATCH_TABS: readonly MatchTab[] = ['Live', 'Upcoming', 'Settled', 'Open Bets'];

/** Finished matches: the feed marks them Completed, a manual settle marks them Settled. */
const isFinished = (match: ApiMatch) => match.status === 'Settled' || match.status === 'Completed';

export function filterMatchesForTab(matches: ApiMatch[], tab: MatchTab): ApiMatch[] {
  if (tab === 'Live') return matches.filter((match) => match.status === 'Live');
  if (tab === 'Upcoming') return matches.filter((match) => match.status === 'Upcoming');
  if (tab === 'Settled') return matches.filter(isFinished);
  // Open Bets: every match that isn't finished yet.
  return matches.filter((match) => !isFinished(match));
}

export function matchMeta(match: ApiMatch): string {
  const marketCount = match.markets.length;
  const bets = match.markets.reduce((sum, market) => sum + market.bets, 0);
  const scope = match.league || match.sport;
  return `${scope} · ${formatCount(marketCount)} markets · ${formatCount(bets)} bets`;
}

export function matchBetsCount(match: ApiMatch): number {
  return match.markets.reduce((sum, market) => sum + market.bets, 0);
}

export const PROVIDER_STATUS_TONE: Record<ApiProvider['status'], BadgeTone> = {
  Connected: 'success',
  Disconnected: 'warning',
  Syncing: 'info',
};

/**
 * Stats derived from the full (unfiltered) match list and the provider list.
 * "Today's Bets" and "Settled Today" payout can't be computed exactly — there
 * is no site-wide bets ledger or payout endpoint — so they're approximated
 * from the market-level `bets`/`exposure` rollups that ARE available, and the
 * captions are written to not imply a number we don't actually have.
 */
export function bettingStats(matches: ApiMatch[], providers: ApiProvider[]): StatCardProps[] {
  const liveCricket = matches.filter((match) => match.status === 'Live' && match.sport === 'Cricket').length;
  const openMatches = matches.filter((match) => !isFinished(match));
  const openBets = openMatches.reduce((sum, match) => sum + matchBetsCount(match), 0);
  const openStake = openMatches.reduce((sum, match) => sum + match.stake, 0);
  const totalBets = matches.reduce((sum, match) => sum + matchBetsCount(match), 0);
  const totalStake = matches.reduce((sum, match) => sum + match.stake, 0);
  const settledToday = matches.filter((match) => isFinished(match) && isToday(match.updatedAt));
  const connectedProviders = providers.filter((provider) => provider.status === 'Connected').length;

  return [
    { label: 'Live Cricket', value: formatCount(liveCricket), caption: 'Matches in-play', icon: EventsIcon, accent: 'red' },
    { label: 'Open Bets', value: formatCount(openBets), caption: `${formatMoney(openStake)} stake`, icon: ActivityIcon, accent: 'blue' },
    {
      label: 'Total Bets',
      value: formatCount(totalBets),
      caption: `${formatMoney(totalStake)} stake overall`,
      icon: TrendUpIcon,
      accent: 'green',
    },
    {
      label: 'Settled Today',
      value: formatCount(settledToday.length),
      caption: `${connectedProviders}/${providers.length || 0} providers connected`,
      icon: HashIcon,
      accent: 'yellow',
    },
  ];
}
