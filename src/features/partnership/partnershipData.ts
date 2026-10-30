import {
  CheckCircleIcon,
  DollarIcon,
  PartnershipIcon,
  TrendingUpIcon,
} from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatCount, formatMoney, platformTimeZone } from '../../lib/format';
import type { ApiPartner, ApiPartnerSettlement, ApiPartnerStatus, ApiRevenueEntry, ApiSettlementPartnerRef } from '../../lib/api/partnership';

/** Curated type options offered in the Add/Edit form — the backend stores `type` as a free string, not a validated enum. */
export type PartnerType =
  | 'Data Provider'
  | 'Exchange'
  | 'Payment'
  | 'Compliance'
  | 'Communication';

export type PartnerStatus = ApiPartnerStatus;

export type RevenueMonth = { month: string; label: string; value: number };

export type Settlement = { id: string; period: string; amount: string; status: 'Pending' | 'Paid' };

/** Revenue and settlements live in each partner's drawer. */
/** Partners: outside partnerships. Franchise Shareholders: franchises the admin gave company shares. */
export const PARTNER_TABS = ['Partners', 'Franchise Shareholders'] as const;

export const PARTNER_TYPES: PartnerType[] = [
  'Data Provider',
  'Exchange',
  'Payment',
  'Compliance',
  'Communication',
];

export const PARTNER_STATUSES: PartnerStatus[] = ['Active', 'Inactive', 'Pending'];

export const PARTNER_STATUS_TONE: Record<PartnerStatus, BadgeTone> = {
  Active: 'success',
  Inactive: 'warning',
  Pending: 'info',
};

/** "Jan 2023" — a partner's `since` date, formatted for the directory/drawer. */
export function formatSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { timeZone: platformTimeZone(), month: 'short', year: 'numeric' });
}

export function formatBetVolume(volume: number): string {
  return volume > 0 ? formatCount(volume) : '—';
}

export function formatRevShare(revShare: number): string {
  return `${Number(revShare.toFixed(2))}%`;
}

/**
 * Stat cards for the directory header. There's no backend concept of an
 * "SLA", so the fourth card — "Active SLAs" in the original static preview —
 * becomes "Active Partners", a real count instead of a fabricated one.
 */
export function partnerStats(partners: ApiPartner[], settlements: ApiPartnerSettlement[] = []): StatCardProps[] {
  const active = partners.filter((partner) => partner.status === 'Active');
  const monthlyFees = partners.reduce((sum, partner) => sum + partner.monthlyFee, 0);
  const paid = settlements.filter((s) => s.status === 'Paid').reduce((sum, s) => sum + s.amount, 0);
  const due = settlements.filter((s) => s.status === 'Pending').reduce((sum, s) => sum + s.amount, 0);

  return [
    {
      label: 'Total Partners',
      value: formatCount(partners.length),
      caption: `${active.length} active`,
      icon: PartnershipIcon,
      accent: 'blue',
      tinted: true,
    },
    { label: 'Partner Costs', value: formatMoney(monthlyFees), caption: 'Monthly fees', icon: DollarIcon, accent: 'red' },
    {
      label: 'Revenue Share Paid',
      value: formatMoney(paid),
      caption: due > 0 ? `${formatMoney(due)} still due` : 'All settlements paid',
      icon: TrendingUpIcon,
      accent: 'yellow',
    },
    { label: 'Active Partners', value: formatCount(active.length), caption: 'Currently active', icon: CheckCircleIcon, accent: 'green' },
  ];
}

export function mapRevenueHistory(entries: ApiRevenueEntry[]): RevenueMonth[] {
  return entries.map((entry) => ({ month: entry.month, label: formatMoney(entry.value), value: entry.value }));
}

export function revenueTotal(entries: ApiRevenueEntry[]): string {
  return formatMoney(entries.reduce((sum, entry) => sum + entry.value, 0));
}

function settlementPartnerId(ref: string | ApiSettlementPartnerRef): string {
  return typeof ref === 'string' ? ref : ref._id;
}

/** Settlements for one partner, newest first (the list is already sorted `{createdAt: -1}` server-side). */
export function settlementsForPartner(settlements: ApiPartnerSettlement[], partnerId: string): Settlement[] {
  return settlements
    .filter((settlement) => settlementPartnerId(settlement.partner) === partnerId)
    .map((settlement) => ({ id: settlement._id, period: settlement.period, amount: formatMoney(settlement.amount), status: settlement.status }));
}
