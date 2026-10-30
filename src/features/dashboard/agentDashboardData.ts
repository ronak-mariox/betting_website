import {
  ArrowDownIcon,
  ArrowUpIcon,
  BettingIcon,
  CheckCircleIcon,
  CommissionIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from '../../components/icons';
import type { BarGroup } from '../../components/charts/BarChart';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { MyDashboard } from '../../lib/api/network';
import { formatCount, formatMoney, formatRupees, formatPercent } from '../../lib/format';

export type OverviewTile = { label: string; value: string; share: string; color: string };

/** "+4 vs yesterday" style delta; omitted when both days are zero. */
function delta(today: number, yesterday: number, format: (n: number) => string): Pick<StatCardProps, 'delta' | 'tone'> {
  if (today === 0 && yesterday === 0) return {};
  const diff = today - yesterday;
  return {
    delta: `${diff >= 0 ? '+' : '-'}${format(Math.abs(diff))} vs yesterday`,
    tone: diff >= 0 ? 'up' : 'down',
  };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "Across 1 super agent · 2 agents" — who the caller's users sit under. */
function networkCaption(data: MyDashboard): string {
  if (data.superAgents.length > 0) {
    return `Across ${plural(data.superAgents.length, 'super agent')} · ${plural(data.agents.length, 'agent')}`;
  }
  return data.agents.length > 0 ? `Across ${plural(data.agents.length, 'agent')}` : 'Under my panel';
}

type Restricted = 'wallet' | 'bets' | 'commission';

/** Agent dashboard — node 139:114739, every figure scoped to the agent's own players. */
export function agentStats(data: MyDashboard): StatCardProps[] {
  const { stats, commissionRates } = data;
  // Cards for what the role may not see (Permissions page) are left out; their figures arrive as null.
  const hidden = new Set(data.restricted ?? []);
  const cards: [Restricted | null, () => StatCardProps][] = [
    [null, () => ({
      label: 'My Total Users',
      value: formatCount(stats.totalUsers),
      caption: networkCaption(data),
      icon: UsersIcon,
      accent: 'blue',
    })],
    [null, () => ({
      label: 'Active Users',
      value: formatCount(stats.activeToday),
      caption: 'Placed bets today',
      ...delta(stats.activeToday, stats.activeYesterday, formatCount),
      icon: CheckCircleIcon,
      accent: 'green',
    })],
    ['wallet', () => ({
      label: 'My Wallet Balance',
      value: formatRupees(stats.walletBalance),
      caption: 'Available balance',
      icon: WalletIcon,
      accent: 'cyan',
    })],
    ['bets', () => ({
      label: "Today's Bets",
      value: formatCount(stats.todayBets),
      caption: `${formatMoney(stats.todayStake)} total stake`,
      ...delta(stats.todayBets, stats.yesterdayBets, formatCount),
      icon: BettingIcon,
      accent: 'yellow',
    })],
    ['commission', () => ({
      label: "Today's Commission",
      value: formatRupees(stats.todayCommission),
      caption: `Match ${commissionRates.match}% · Session ${commissionRates.session}%`,
      ...delta(stats.todayCommission, stats.yesterdayCommission, formatRupees),
      icon: CommissionIcon,
      accent: 'green',
    })],
    [null, () => ({
      label: "Today's Revenue",
      value: formatRupees(stats.todayRevenue),
      caption: 'Net after payouts',
      ...delta(stats.todayRevenue, stats.yesterdayRevenue, formatRupees),
      icon: TrendingUpIcon,
      accent: 'blue',
    })],
    ['wallet', () => ({
      label: 'Pending Deposits',
      value: formatCount(stats.pendingDeposits!.count),
      caption: `${formatRupees(stats.pendingDeposits!.amount)} total`,
      icon: ArrowDownIcon,
      accent: 'yellow',
    })],
    ['wallet', () => ({
      label: 'Pending Withdrawals',
      value: formatCount(stats.pendingWithdrawals!.count),
      caption: `${formatRupees(stats.pendingWithdrawals!.amount)} total`,
      icon: ArrowUpIcon,
      accent: 'red',
    })],
  ];
  return cards.filter(([need]) => !need || !hidden.has(need)).map(([, card]) => card());
}

const share = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%';

export function agentOverview(data: MyDashboard): OverviewTile[] {
  const o = data.overview;
  const growth =
    o.newLastMonth > 0
      ? `${o.newThisMonth >= o.newLastMonth ? '+' : ''}${formatPercent(((o.newThisMonth - o.newLastMonth) / o.newLastMonth) * 100)}`
      : 'This month';
  return [
    { label: 'Total Users', value: formatCount(o.totalUsers), share: o.totalUsers > 0 ? '100%' : '0%', color: 'var(--color-primary)' },
    { label: 'Active Today', value: formatCount(o.activeToday), share: share(o.activeToday, o.totalUsers), color: 'var(--color-success)' },
    { label: 'Suspended', value: formatCount(o.suspended), share: share(o.suspended, o.totalUsers), color: 'var(--color-danger)' },
    { label: 'New This Month', value: formatCount(o.newThisMonth), share: growth, color: '#8b5cf6' },
  ];
}

export function commissionWeek(data: MyDashboard): BarGroup[] {
  return data.commissionWeek.map((day) => ({
    label: new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }),
    values: [day.commission],
  }));
}

export const TXN_TONE: Record<string, BadgeTone> = {
  Completed: 'success',
  Pending: 'warning',
  Failed: 'danger',
};
