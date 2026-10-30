import { BuildingIcon, CheckCircleIcon, DollarIcon, PercentIcon } from '../../components/icons';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { NetworkListStats, NetworkRow } from '../../lib/api/network';
import { formatCount, formatMoney, formatRupees, platformTimeZone } from '../../lib/format';
import { statusLabel } from '../users/usersData';

export type FranchiseStatus = 'Active' | 'Suspended';

export const FRANCHISE_STATUS_TONE = { Active: 'success', Suspended: 'danger' } as const;

export type NetworkStat = { label: string; value: string; color: string };

/** One row in a network list: super agent, agent or user. */
export type NetworkPerson = {
  id: string;
  code: string;
  name: string;
  /** Second line after the name, e.g. the username and owning agent. */
  meta: string;
  status: FranchiseStatus;
  /** Avatar tint. */
  accent: string;
  stats: NetworkStat[];
};

const ACCENTS = ['var(--color-warning)', 'var(--color-success)', 'var(--color-primary-light)', 'var(--color-primary)'];

/** Adapts a downline row from the API to the shared network list row. */
export function toNetworkPerson(row: NetworkRow, index: number): NetworkPerson {
  const name = row.businessName || row.name || row.username;
  const base = {
    id: row._id,
    code: row.username,
    name,
    status: statusLabel(row),
    accent: ACCENTS[index % ACCENTS.length],
  };

  if (row.role === 'player') {
    return {
      ...base,
      meta: row.parent ? `${row.username} · ${row.parent.name || row.parent.username}` : row.username,
      stats: [
        { label: 'Balance', value: formatRupees(row.walletBalance), color: 'var(--color-success)' },
        { label: 'Bets', value: formatCount(row.summary.bets), color: 'var(--color-text)' },
      ],
    };
  }

  if (row.role === 'agent') {
    return {
      ...base,
      meta: row.username,
      stats: [
        { label: 'Users', value: formatCount(row.summary.players), color: 'var(--color-text)' },
        { label: 'Turnover', value: formatMoney(row.summary.turnover), color: 'var(--color-warning)' },
      ],
    };
  }

  return {
    ...base,
    meta: row.phone ? `${row.username} · ${row.phone}` : row.username,
    stats: [
      { label: 'Agents', value: formatCount(row.summary.agents), color: 'var(--color-primary-light)' },
      { label: 'Users', value: formatCount(row.summary.players), color: 'var(--color-success)' },
      { label: 'Turnover', value: formatMoney(row.summary.turnover), color: 'var(--color-warning)' },
    ],
  };
}

export function franchiseStats(stats: NetworkListStats | null): StatCardProps[] {
  const value = (fn: (s: NetworkListStats) => string) => (stats ? fn(stats) : '…');
  return [
    {
      label: 'Total Franchises',
      value: value((s) => formatCount(s.total)),
      caption: value((s) => `${formatCount(s.players)} users across the network`),
      icon: BuildingIcon,
      accent: 'blue',
    },
    {
      label: 'Active',
      value: value((s) => formatCount(s.active)),
      caption: value((s) => `${formatCount(s.suspended)} suspended`),
      icon: CheckCircleIcon,
      accent: 'green',
    },
    {
      label: 'Total Turnover',
      value: value((s) => formatMoney(s.turnover)),
      caption: value((s) => `${formatMoney(s.monthTurnover)} this month`),
      icon: DollarIcon,
      accent: 'yellow',
    },
    {
      label: 'Total Commission',
      value: value((s) => formatMoney(s.commission)),
      caption: 'Earned by franchises',
      icon: PercentIcon,
      accent: 'cyan',
    },
  ];
}

export function formatLocation(row: { city?: string; state?: string }): string {
  return [row.city, row.state].filter(Boolean).join(', ') || '—';
}

export function formatJoined(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { timeZone: platformTimeZone(), month: 'short', year: 'numeric' });
}
