import { Loader } from '../../components/ui/Loader/Loader';
import { useLiveRefresh } from '../../lib/realtime';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  PercentIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
  WifiIcon,
} from '../../components/icons';
import type { BarGroup } from '../../components/charts/BarChart';
import type { DonutSlice } from '../../components/charts/DonutChart';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { commissionApi } from '../../lib/api/commission';
import type { ApiCommission } from '../../lib/api/commission';
import { dashboardApi } from '../../lib/api/dashboard';
import type { ApiDashboard } from '../../lib/api/dashboard';
import { riskApi } from '../../lib/api/risk';
import type { ApiRiskStats } from '../../lib/api/risk';
import { transactionsApi } from '../../lib/api/transactions';
import type { ApiTransaction } from '../../lib/api/transactions';
import { walletApi } from '../../lib/api/wallet';
import type { WalletStats } from '../../lib/api/wallet';
import { formatCount, formatMoney, formatRupees, formatRelativeTime } from '../../lib/format';
import { toChartPoints } from '../analytics/analyticsData';
import type { ActivityEntry, BetRow, HealthMetric, LiveMatch, RiskAlert, TransactionRow } from './dashboardData';
import { CommissionPanel, RevenuePanel, SportSplitPanel, WalletFlowPanel } from './widgets/ChartPanels';
import type { CommissionRow } from './widgets/ChartPanels';
import { ActivityFeedPanel, RecentBetsPanel, TransactionsPanel } from './widgets/LedgerPanels';
import { LiveMatchesPanel, RiskAlertsPanel, SystemHealthPanel } from './widgets/MonitorPanels';
import styles from './DashboardView.module.css';

type Extras = {
  wallet: WalletStats | null;
  risk: ApiRiskStats | null;
  commission: ApiCommission[];
  deposits: ApiTransaction[];
  withdrawals: ApiTransaction[];
};

const PALETTE = [
  'var(--color-primary)',
  'var(--color-primary-light)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-text-muted)',
];

const LEVEL_COLOR: Record<string, string> = {
  Franchise: 'var(--color-primary)',
  'Super Agent': 'var(--color-primary-light)',
  Agent: 'var(--color-success)',
};

const TXN_TONE: Record<string, BadgeTone> = { Completed: 'success', Pending: 'warning', Failed: 'danger' };
const BET_TONE: Record<string, BadgeTone> = { Pending: 'info', Won: 'success', Lost: 'danger', Void: 'neutral' };

const ACTIVITY_EMOJI: Record<string, string> = {
  login_success: '🔓',
  login_failed: '🔐',
  logout: '👋',
  register: '👤',
  profile_updated: '✏️',
  password_changed: '🔑',
  password_reset_requested: '📧',
  password_reset: '🔑',
  account_created: '🆕',
  account_suspended: '⛔',
  account_activated: '✅',
  permission_updated: '🛡️',
  session_revoked: '🚫',
};

type Ref = { _id: string; name?: string; username: string } | string | null;
const refName = (ref: Ref, fallback = '—') =>
  !ref ? fallback : typeof ref === 'string' ? ref.slice(-6).toUpperCase() : ref.name || ref.username;

function buildStats(data: ApiDashboard, extras: Extras): StatCardProps[] {
  const wallet = extras.wallet;
  const risk = extras.risk;
  return [
    {
      label: 'Total Users',
      value: formatCount(data.stats.totalUsers),
      caption: `${formatCount(data.stats.activeUsers)} active`,
      icon: UsersIcon,
      accent: 'blue',
      tinted: true,
    },
    {
      label: "Today's Turnover",
      value: formatMoney(data.stats.todayTurnover),
      caption: 'Total stake placed today',
      icon: ActivityIcon,
      accent: 'cyan',
    },
    {
      label: "Today's Volume",
      value: wallet ? formatMoney(wallet.todayVolume) : '…',
      caption: wallet ? `${formatCount(wallet.todayTransactionCount)} transactions` : 'Ledger',
      icon: ServerIcon,
      accent: 'green',
      tinted: true,
    },
    {
      label: 'Platform Balance',
      value: formatMoney(data.stats.totalWalletBalance),
      caption: 'All user wallets',
      icon: BriefcaseIcon,
      accent: 'yellow',
    },
    {
      label: 'Pending Deposits',
      value: wallet ? formatCount(wallet.pendingDeposits) : '…',
      caption: 'Requests awaiting review',
      icon: ArrowUpIcon,
      accent: 'green',
    },
    {
      label: 'Pending Withdrawals',
      value: wallet ? formatCount(wallet.pendingWithdrawals) : '…',
      caption: 'Requests awaiting review',
      icon: ArrowDownIcon,
      accent: 'red',
    },
    {
      label: 'High-Exposure Markets',
      value: risk ? formatCount(risk.highExposureMarkets) : '…',
      caption: risk ? `${formatCount(risk.flaggedCount)} flagged users` : 'Risk',
      icon: ShieldCheckIcon,
      accent: 'red',
    },
    {
      label: 'Commission',
      value: formatMoney(data.commissionTotal),
      caption: 'All periods',
      icon: PercentIcon,
      accent: 'yellow',
      tinted: true,
    },
  ];
}

/** Deposits vs withdrawals per day for the last 7 days, from the ledger. */
function buildWalletFlow(deposits: ApiTransaction[], withdrawals: ApiTransaction[]): BarGroup[] {
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString('en-IN', { weekday: 'short' }) });
  }
  const sum = (rows: ApiTransaction[], key: string) =>
    rows
      .filter((row) => new Date(row.createdAt).toDateString() === key)
      .reduce((total, row) => total + Math.abs(row.amount), 0);
  return days.map((day) => ({ label: day.label, values: [sum(deposits, day.key), sum(withdrawals, day.key)] }));
}

function buildCommissionSplit(rows: ApiCommission[]): CommissionRow[] {
  const total = rows.reduce((sum, row) => sum + row.commission, 0);
  return ['Franchise', 'Super Agent', 'Agent'].map((level) => {
    const value = rows.filter((row) => row.level === level).reduce((sum, row) => sum + row.commission, 0);
    return { label: level, percent: total > 0 ? Math.round((value / total) * 100) : 0, color: LEVEL_COLOR[level] };
  });
}

function mapMatches(data: ApiDashboard): LiveMatch[] {
  return data.liveMatches.map((event) => ({
    id: event._id,
    sport: event.emoji || '🏟️',
    title: event.name,
    meta: [event.league, event.score].filter(Boolean).join(' · '),
    exposure: formatMoney(event.exposure || 0),
    odds: `${formatMoney(event.stake || 0)} staked`,
  }));
}

function mapRiskAlerts(data: ApiDashboard): RiskAlert[] {
  return data.riskAlerts.map((flag) => ({
    id: flag._id,
    emoji: flag.score >= 75 ? '🚨' : '⚠️',
    message: `${refName(flag.user, 'User')} — ${flag.reason} (risk ${flag.score})`,
    age: formatRelativeTime(flag.createdAt),
    tone: flag.score >= 75 ? 'danger' : 'warning',
  }));
}

function mapHealth(data: ApiDashboard): HealthMetric[] {
  return [
    { label: 'Platform', value: data.health.status, icon: ServerIcon },
    { label: 'Odds Providers', value: `${data.health.healthyProviders}/${data.health.providers} healthy`, icon: WifiIcon },
  ];
}

function mapTransactions(data: ApiDashboard): TransactionRow[] {
  return data.transactions.map((txn) => ({
    id: txn._id.slice(-8).toUpperCase(),
    user: refName(txn.user, 'Platform'),
    type: txn.type,
    amount: `${txn.amount < 0 ? '-' : '+'}${formatRupees(Math.abs(txn.amount))}`,
    positive: txn.amount >= 0,
    method: txn.method || '—',
    time: formatRelativeTime(txn.createdAt),
    status: { label: txn.status, tone: TXN_TONE[txn.status] ?? 'neutral' },
  }));
}

function mapBets(data: ApiDashboard): BetRow[] {
  return data.bets.map((bet) => ({
    id: bet._id,
    user: refName(bet.user),
    event: !bet.event ? '—' : typeof bet.event === 'string' ? bet.event.slice(-6) : bet.event.name,
    selection: bet.selection,
    odds: bet.odds.toFixed(2),
    stake: formatMoney(bet.amount),
    status: { label: bet.status === 'Pending' ? 'Open' : bet.status, tone: BET_TONE[bet.status] ?? 'info' },
  }));
}

function mapActivity(data: ApiDashboard): ActivityEntry[] {
  return data.activity.map((entry) => ({
    id: entry._id,
    emoji: ACTIVITY_EMOJI[entry.action] ?? '•',
    message: `${refName(entry.actor, entry.actorUsername || 'Someone')} · ${entry.action.replace(/_/g, ' ')}${
      entry.status === 'failed' ? ' (failed)' : ''
    }`,
    age: formatRelativeTime(entry.createdAt),
  }));
}

/** Super-admin dashboard, fed by `/api/dashboard` plus wallet/risk/commission/ledger reads. */
export function LiveDashboard() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [extras, setExtras] = useState<Extras>({ wallet: null, risk: null, commission: [], deposits: [], withdrawals: [] });
  const [error, setError] = useState<string | null>(null);

  /** Fetches the dashboard and its secondary figures; the panels' Refresh buttons call it again. */
  const load = useCallback(() => {
    if (!accessToken) return () => {};
    let cancelled = false;
    dashboardApi
      .get(accessToken)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
      });

    // Secondary figures — the dashboard still renders if any of these fail.
    Promise.allSettled([
      walletApi.stats(accessToken),
      riskApi.stats(accessToken),
      commissionApi.list({}, accessToken),
      transactionsApi.list({ tab: 'deposits', limit: 100 }, accessToken),
      transactionsApi.list({ tab: 'withdrawals', limit: 100 }, accessToken),
    ]).then(([wallet, risk, commission, deposits, withdrawals]) => {
      if (cancelled) return;
      setExtras({
        wallet: wallet.status === 'fulfilled' ? wallet.value.stats : null,
        risk: risk.status === 'fulfilled' ? risk.value.stats : null,
        commission: commission.status === 'fulfilled' ? commission.value.items : [],
        deposits: deposits.status === 'fulfilled' ? deposits.value.items : [],
        withdrawals: withdrawals.status === 'fulfilled' ? withdrawals.value.items : [],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => load(), [load]);
  // Live: bets, ledger and match changes refresh the dashboard (at most every 5 s).
  useLiveRefresh(['matches:changed', 'admin:changed'], () => load(), 5000);

  if (!data) {
    return (
      <div className={styles.page}>
        <p>{error ?? <Loader block />}</p>
      </div>
    );
  }

  const revenue = toChartPoints('revenue', data.revenue);
  const sports: DonutSlice[] = data.sports.map((slice, index) => ({
    label: slice.sport,
    value: slice.value,
    color: PALETTE[index % PALETTE.length],
  }));

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {buildStats(data, extras).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className={styles.split}>
        <RevenuePanel
          data={revenue}
          subtitle="Last 6 months"
          series={{
            Revenue: revenue,
            Wallet: toChartPoints('revenue', data.walletFlow),
            Commission: toChartPoints('commission', data.commission),
          }}
        />
        <SportSplitPanel data={sports} />
      </div>

      <div className={styles.wide}>
        <WalletFlowPanel data={buildWalletFlow(extras.deposits, extras.withdrawals)} subtitle="Deposits vs Withdrawals, last 7 days" />
        <CommissionPanel
          rows={buildCommissionSplit(extras.commission)}
          total={formatMoney(data.commissionTotal)}
          totalLabel="Total Commission"
        />
      </div>

      <div className={styles.split}>
        <LiveMatchesPanel matches={mapMatches(data)} />
        <div className={styles.column}>
          <RiskAlertsPanel alerts={mapRiskAlerts(data)} />
          <SystemHealthPanel metrics={mapHealth(data)} status={data.health.status} />
        </div>
      </div>

      <TransactionsPanel rows={mapTransactions(data)} onRefresh={load} />

      <div className={styles.wide}>
        <RecentBetsPanel rows={mapBets(data)} onRefresh={load} />
        <ActivityFeedPanel entries={mapActivity(data)} />
      </div>
    </div>
  );
}
