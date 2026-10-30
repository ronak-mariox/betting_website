import { BuildingIcon, CommissionIcon, GiftIcon, UsersCogIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { DonutSlice } from '../../components/charts/DonutChart';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { formatMoney, formatRupeesPaise } from '../../lib/format';
import type {
  ApiCommission,
  ApiCommissionEntityRef,
  ApiCommissionKind,
  ApiCommissionLevel,
  ApiCommissionStatus,
} from '../../lib/api/commission';

export type SettlementStatus = ApiCommissionStatus;

export type CommissionRow = {
  id: string;
  match: string;
  date: string;
  entity: string;
  level: ApiCommissionLevel;
  kind: ApiCommissionKind;
  /** What the rate applied to: session stake or match net loss. */
  base: string;
  rate: string;
  /** "2% received · 1.5% passed down" — blank on rows paid before this was recorded. */
  split: string;
  commission: string;
  status: SettlementStatus;
};

export const COMMISSION_LEVELS: ApiCommissionLevel[] = ['Franchise', 'Super Agent', 'Agent', 'Player'];
export const COMMISSION_KINDS: ApiCommissionKind[] = ['Session', 'Match'];

const refLabel = (ref: string | { name?: string; username: string } | null) =>
  !ref ? '' : typeof ref === 'string' ? ref : ref.name || ref.username;

const entityLabel = (ref: string | ApiCommissionEntityRef) => refLabel(ref);

const dateLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function mapCommissionRows(items: ApiCommission[]): CommissionRow[] {
  return items.map((item) => {
    const event = item.event && typeof item.event !== 'string' ? item.event : null;
    const player = refLabel(item.player);
    return {
      id: item._id,
      match: `${event?.name ?? 'Match'}${player ? ` · ${player}` : ''}`,
      date: dateLabel(item.settledAt ?? item.createdAt),
      entity: entityLabel(item.entity),
      level: item.level,
      kind: item.kind,
      base: `${formatRupeesPaise(item.turnover)} ${item.kind === 'Match' ? 'loss' : 'stake'}`,
      rate: `${item.rate}%`,
      split: item.receivedRate == null ? '' : `${item.receivedRate}% received · ${item.givenRate ?? 0}% passed down`,
      commission: formatRupeesPaise(item.commission),
      status: item.status,
    };
  });
}

const sum = (rows: ApiCommission[]) => rows.reduce((acc, item) => acc + item.commission, 0);
const ofKind = (rows: ApiCommission[], kind: ApiCommissionKind) => rows.filter((item) => item.kind === kind);

/** Stat cards over the loaded (filtered) rows. A network role reads "what I earned" first. */
export function commissionStats(items: ApiCommission[], viewerUsername?: string): StatCardProps[] {
  if (viewerUsername) {
    const isMine = (item: ApiCommission) => typeof item.entity !== 'string' && item.entity.username === viewerUsername;
    const mine = items.filter(isMine);
    const downline = items.filter((item) => !isMine(item));
    return [
      {
        label: 'My Commission',
        value: formatMoney(sum(mine)),
        caption: 'Paid into my wallet at match end',
        icon: CommissionIcon,
        accent: 'blue',
        tinted: true,
      },
      { label: 'My Session Share', value: formatMoney(sum(ofKind(mine, 'Session'))), caption: 'On session stake', icon: GiftIcon, accent: 'green' },
      { label: 'My Match Share', value: formatMoney(sum(ofKind(mine, 'Match'))), caption: 'On players\' net match loss', icon: BuildingIcon, accent: 'yellow' },
      {
        label: "My Downline's Commission",
        value: formatMoney(sum(downline)),
        caption: downline.length ? `${downline.length} payout${downline.length === 1 ? '' : 's'} below me` : 'Nobody below me earned yet',
        icon: UsersCogIcon,
        accent: 'cyan',
      },
    ];
  }
  const players = items.filter((item) => item.level === 'Player');
  return [
    { label: 'Total Commission', value: formatMoney(sum(items)), caption: 'Current view', icon: CommissionIcon, accent: 'blue', tinted: true },
    { label: 'Session Commission', value: formatMoney(sum(ofKind(items, 'Session'))), caption: 'On session stake', icon: GiftIcon, accent: 'green' },
    { label: 'Match Commission', value: formatMoney(sum(ofKind(items, 'Match'))), caption: 'On net match loss', icon: BuildingIcon, accent: 'yellow' },
    { label: 'Paid to Players', value: formatMoney(sum(players)), caption: 'Players\' own share', icon: UsersCogIcon, accent: 'cyan' },
  ];
}

const LEVEL_COLOR: Record<ApiCommissionLevel, string> = {
  Franchise: '#2196f3',
  'Super Agent': '#29b6f6',
  Agent: '#22c55e',
  Player: '#facc15',
};

/** Ring + legend, grouped by level. */
export function commissionSplit(items: ApiCommission[]): DonutSlice[] {
  return COMMISSION_LEVELS.map((level) => ({
    label: level,
    value: sum(items.filter((item) => item.level === level)),
    color: LEVEL_COLOR[level],
  })).filter((slice) => slice.value > 0);
}

export const SETTLEMENT_TONE: Record<SettlementStatus, BadgeTone> = {
  Settled: 'info',
  Pending: 'warning',
};
