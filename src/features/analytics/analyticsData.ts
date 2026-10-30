import { BettingIcon, TargetIcon, TrendingUpIcon, UsersIcon } from '../../components/icons';
import type { ChartPoint } from '../../components/charts/AreaChart';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatCount, formatMoney } from '../../lib/format';
import type { AnalyticsDimension, AnalyticsGrowth, AnalyticsHighlights, AnalyticsSeriesPoint } from '../../lib/api/analytics';

/** A highlight card built from the live `/analytics/highlights` totals. */
export type AnalyticsHighlightCard = {
  label: string;
  value: string;
  /** rgb triplet driving the value colour and the 13% border wash. */
  rgb: string;
};

/** "+12.5%" for a change between two periods; "New" when there was nothing before, "—" when both are 0. */
function change(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '—' : 'New';
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

/** Headline cards from `/analytics/growth` — last 30 days vs the 30 days before. */
export function analyticsStats(growth: AnalyticsGrowth | null): StatCardProps[] {
  const dash = '—';
  return [
    {
      label: 'Revenue Growth',
      value: growth ? change(growth.revenue.current, growth.revenue.previous) : dash,
      caption: growth ? `${formatMoney(growth.revenue.current)} in 30 days vs ${formatMoney(growth.revenue.previous)}` : 'Last 30 days',
      icon: TrendingUpIcon,
      accent: 'green',
      tinted: true,
    },
    {
      label: 'New Players',
      value: growth ? change(growth.newPlayers.current, growth.newPlayers.previous) : dash,
      caption: growth ? `${formatCount(growth.newPlayers.current)} joined in 30 days vs ${formatCount(growth.newPlayers.previous)}` : 'Last 30 days',
      icon: UsersIcon,
      accent: 'blue',
    },
    {
      label: 'Bet Volume',
      value: growth ? change(growth.betVolume.current, growth.betVolume.previous) : dash,
      caption: growth ? `${formatMoney(growth.betVolume.current)} staked in 30 days vs ${formatMoney(growth.betVolume.previous)}` : 'Last 30 days',
      icon: BettingIcon,
      accent: 'cyan',
    },
    {
      label: 'Active Players',
      value: growth ? formatCount(growth.activePlayers) : dash,
      caption: growth ? `Signed in within 30 days, of ${formatCount(growth.totalPlayers)} players` : 'Last 30 days',
      icon: TargetIcon,
      accent: 'yellow',
    },
  ];
}

export const ANALYTICS_TABS = ['Revenue', 'Users', 'Sports', 'Commission'] as const;

/** Maps a pill-tab label to the `dimension` query param `/analytics/series` expects. */
export const ANALYTICS_DIMENSION_BY_TAB: Record<(typeof ANALYTICS_TABS)[number], AnalyticsDimension> = {
  Revenue: 'revenue',
  Users: 'users',
  Sports: 'sports',
  Commission: 'commission',
};

const MONTH_FORMAT = new Intl.DateTimeFormat('en-IN', { month: 'short' });

/** "2024-07" -> "Jul". Falls back to the raw string if it doesn't parse. */
function monthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex) return month;
  const date = new Date(year, monthIndex - 1, 1);
  return Number.isNaN(date.getTime()) ? month : MONTH_FORMAT.format(date);
}

/**
 * Converts a `/analytics/series` response into the project's own SVG
 * AreaChart's point shape. Revenue/Users/Commission are monthly (`month`
 * keys); Sports is grouped by sport name (`sport` keys) with no time axis.
 */
export function toChartPoints(dimension: AnalyticsDimension, series: AnalyticsSeriesPoint[]): ChartPoint[] {
  if (dimension === 'sports') {
    return series.map((point) => ({
      label: 'sport' in point ? point.sport : '',
      value: point.value,
    }));
  }
  return series.map((point) => ({
    label: 'month' in point ? monthLabel(point.month) : '',
    value: point.value,
  }));
}

/** The four highlight cards under the chart — node 112:9342, now fed by `/analytics/highlights`. */
export function buildHighlightCards(highlights: AnalyticsHighlights): AnalyticsHighlightCard[] {
  return [
    { label: 'Total Users', value: formatCount(highlights.totalUsers), rgb: '33, 150, 243' },
    { label: 'Total Bets', value: formatCount(highlights.totalBets), rgb: '41, 182, 246' },
    { label: 'Total Turnover', value: formatMoney(highlights.totalTurnover), rgb: '34, 197, 94' },
    { label: 'Total Commission', value: formatMoney(highlights.totalCommission), rgb: '250, 204, 21' },
  ];
}
