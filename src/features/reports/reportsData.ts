import type { ComponentType } from 'react';
import {
  BettingIcon,
  CommissionIcon,
  DollarIcon,
  ExportIcon,
  ReportsIcon,
  RiskIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from '../../components/icons';
import type { IconProps } from '../../components/icons';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { ReportKindSlug, ReportRow } from '../../lib/api/reports';
import { formatRupees, platformTimeZone } from '../../lib/format';

export type ReportFormat = 'PDF' | 'Excel' | 'Print';

export type ReportKind = {
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
  /** rgb triplet for the 9% tile wash behind the glyph. */
  rgb: string;
  formats: ReportFormat[];
  /** Slug the backend expects at `/reports/:kind/...` — super-admin only. */
  slug: ReportKindSlug;
};

export type Field = { label: string; value: string };

const money = (value: number) => formatRupees(Math.abs(value));

/**
 * Header cards from the viewer's financial ledger (the same rows the
 * Financial Report shows). `rows` is null while loading.
 */
export function reportStats(rows: ReportRow[] | null): StatCardProps[] {
  const list = rows ?? [];
  const sum = (types: string[]) =>
    list.filter((r) => types.includes(String(r.type)) && r.status === 'Completed').reduce((t, r) => t + Number(r.amount || 0), 0);
  const deposits = sum(['Deposit']);
  const withdrawals = Math.abs(sum(['Withdrawal']));
  // Players' bet results, flipped: their losses are the book's revenue.
  const betRevenue = -sum(['Bet Win', 'Bet Loss']);
  const value = (v: string) => (rows ? v : '…');
  return [
    { label: 'Ledger Entries', value: value(list.length.toLocaleString('en-IN')), caption: 'In your network', icon: ReportsIcon, accent: 'blue' },
    { label: 'Deposits', value: value(money(deposits)), caption: 'Completed', icon: WalletIcon, accent: 'green' },
    { label: 'Withdrawals', value: value(money(withdrawals)), caption: 'Completed', icon: ExportIcon, accent: 'yellow' },
    {
      label: 'Betting P&L',
      value: value(`${betRevenue < 0 ? '-' : ''}${money(betRevenue)}`),
      caption: 'Settled bets, book view',
      icon: TrendingUpIcon,
      accent: 'cyan',
    },
  ];
}

/** The six report kinds — node 112:8582. */
export const REPORT_KINDS: ReportKind[] = [
  { title: 'Financial Report', description: 'Revenue, P&L, expenses and projections', icon: DollarIcon, rgb: '34, 197, 94', formats: ['PDF', 'Excel', 'Print'], slug: 'financial' },
  { title: 'Betting Report', description: 'All bets, outcomes, and settlements', icon: BettingIcon, rgb: '33, 150, 243', formats: ['PDF', 'Excel'], slug: 'betting' },
  { title: 'User Report', description: 'User registrations and activity', icon: UsersIcon, rgb: '41, 182, 246', formats: ['PDF', 'Excel', 'Print'], slug: 'user' },
  { title: 'Wallet Report', description: 'Deposits, withdrawals and adjustments', icon: WalletIcon, rgb: '250, 204, 21', formats: ['PDF', 'Excel'], slug: 'wallet' },
  { title: 'Commission Report', description: 'Agent and franchise commissions', icon: CommissionIcon, rgb: '255, 46, 99', formats: ['PDF', 'Excel'], slug: 'commission' },
  { title: 'Exposure Report', description: 'Market and risk exposure analysis', icon: RiskIcon, rgb: '239, 68, 68', formats: ['PDF', 'Excel'], slug: 'exposure' },
];

export const REPORT_TYPE_OPTIONS = REPORT_KINDS.map((kind) => kind.title);

/** 'No grouping' lists every record; the rest roll dated reports up per period. */
export const NO_GROUPING = 'No grouping';
export const GROUP_BY_OPTIONS = [NO_GROUPING, 'Daily', 'Weekly', 'Monthly', 'Quarterly'];

/**
 * Only two kinds have a drawn preview so far. The rest borrow the financial
 * sheet — same fallback as before this map existed — but are washed in their
 * own colour, which is what the two designed sheets have in common.
 */

/** Column headers for a real preview: derived from row keys since they vary per kind. */
export function getReportColumns(rows: ReportRow[]): string[] {
  return rows.length ? Object.keys(rows[0]) : [];
}

/** "walletBalance" -> "Wallet Balance" — the API returns camelCase keys, the sheet wants titles. */
export function formatReportColumnHeader(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** One cell of a real preview row — dates read as ISO strings, everything else as-is. */
export function formatReportCell(value: ReportRow[string]): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (typeof value === 'string' && ISO_DATETIME.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-IN', { timeZone: platformTimeZone(), day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return String(value);
}
