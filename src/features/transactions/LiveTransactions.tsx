import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowDownIcon, ArrowUpIcon, BriefcaseIcon, TransactionsIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { transactionsApi } from '../../lib/api/transactions';
import type { ApiTransaction, TransactionStatus, TransactionTab, TransactionType } from '../../lib/api/transactions';
import { walletApi } from '../../lib/api/wallet';
import type { WalletStats } from '../../lib/api/wallet';
import { formatCount, formatMoney, formatRupeesPaise, platformTimeZone } from '../../lib/format';
import styles from './TransactionsPage.module.css';

const PAGE_SIZE = 20;

const TABS: { label: string; tab?: TransactionTab }[] = [
  { label: 'All' },
  { label: 'Deposits', tab: 'deposits' },
  { label: 'Withdrawals', tab: 'withdrawals' },
  { label: 'Bets', tab: 'bets' },
  { label: 'Commission', tab: 'commission' },
  { label: 'Partner Payments', tab: 'payments' },
  { label: 'Fund Transfers', tab: 'transfers' },
  { label: 'Adjustments', tab: 'adjustments' },
];

const TYPE_RGB: Record<TransactionType, string> = {
  Deposit: '34, 197, 94',
  Withdrawal: '239, 68, 68',
  'Bet Win': '34, 197, 94',
  'Bet Loss': '239, 68, 68',
  Adjustment: '41, 182, 246',
  Commission: '34, 197, 94',
  Payment: '250, 204, 21',
  'Referral Bonus': '34, 197, 94',
};

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  Completed: 'success',
  Pending: 'warning',
  Failed: 'danger',
  Cancelled: 'neutral',
};

const userLabel = (user: ApiTransaction['user']) =>
  !user ? 'Platform' : typeof user === 'string' ? user.slice(-6).toUpperCase() : user.name || user.username;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { timeZone: platformTimeZone(), day: '2-digit', month: 'short', year: '2-digit' });
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: platformTimeZone(), hour: '2-digit', minute: '2-digit' });

const COLUMNS: Column<ApiTransaction>[] = [
  {
    key: 'id',
    header: 'TXN ID',
    // Transfers and commission carry their own ID (TRF… / COMM-…); other entries use the record id.
    render: (row) => (
      <span className={styles.id}>{/^(TRF|COMM-)/.test(row.reference) ? row.reference : row._id.slice(-8).toUpperCase()}</span>
    ),
  },
  { key: 'user', header: 'User', render: (row) => <span className={styles.user}>{userLabel(row.user)}</span> },
  {
    key: 'party',
    header: 'Sender / Receiver',
    render: (row) =>
      row.counterparty ? (
        <span className={styles.muted}>
          {row.type === 'Commission' ? 'On ' : row.amount < 0 ? 'To ' : 'From '}
          {row.counterparty.name || row.counterparty.username}
        </span>
      ) : (
        <span className={styles.muted}>—</span>
      ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (row) => (
      <span
        className={styles.type}
        style={
          {
            '--type-bg': `rgba(${TYPE_RGB[row.type]}, 0.08)`,
            '--type-color': `rgb(${TYPE_RGB[row.type]})`,
          } as CSSProperties
        }
      >
        {row.type}
        {row.kind ? ` · ${row.kind}` : ''}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row) => (
      <span className={row.amount < 0 ? styles.amountDown : styles.amountUp}>
        {row.amount < 0 ? '-' : '+'}
        {formatRupeesPaise(Math.abs(row.amount))}
      </span>
    ),
  },
  {
    key: 'balance',
    header: 'Balance After',
    render: (row) => <span className={styles.muted}>{row.balanceAfter == null ? '—' : formatRupeesPaise(row.balanceAfter)}</span>,
  },
  { key: 'method', header: 'Method', render: (row) => <span className={styles.muted}>{row.method || '—'}</span> },
  {
    key: 'reference',
    header: 'Details',
    render: (row) => <span className={styles.ref}>{row.note || row.reference || '—'}</span>,
  },
  { key: 'date', header: 'Date', render: (row) => <span className={styles.muted}>{formatDate(row.createdAt)}</span> },
  { key: 'time', header: 'Time', render: (row) => <span className={styles.muted}>{formatTime(row.createdAt)}</span> },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
  },
];

function buildStats(stats: WalletStats | null, total: number): StatCardProps[] {
  return [
    {
      label: "Today's Transactions",
      value: stats ? formatCount(stats.todayTransactionCount) : '…',
      caption: stats ? `${formatMoney(stats.todayVolume)} volume` : 'All types',
      icon: TransactionsIcon,
      accent: 'blue',
    },
    { label: 'Ledger Entries', value: formatCount(total), caption: 'In this view', icon: BriefcaseIcon, accent: 'green' },
    {
      label: 'Pending Deposits',
      value: stats ? formatCount(stats.pendingDeposits) : '…',
      caption: 'Awaiting review',
      icon: ArrowUpIcon,
      accent: 'yellow',
    },
    {
      label: 'Pending Withdrawals',
      value: stats ? formatCount(stats.pendingWithdrawals) : '…',
      caption: 'Awaiting review',
      icon: ArrowDownIcon,
      accent: 'red',
    },
  ];
}

/** Super-admin ledger — reads `/api/transactions`. */
export function LiveTransactions() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ApiTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    walletApi
      .stats(accessToken)
      .then((res) => {
        if (!cancelled) setStats(res.stats);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    const apiTab = TABS.find((item) => item.label === tab)?.tab;
    transactionsApi
      .list({ tab: apiTab, q: debounced || undefined, page, limit: PAGE_SIZE }, accessToken)
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, tab, debounced, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {buildStats(stats, total).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <PillTabs
            items={TABS.map(({ label }) => ({ label }))}
            value={tab}
            size="sm"
            label="Filter transactions"
            onChange={(value) => {
              setTab(value);
              setPage(1);
            }}
          />
          <div className={styles.toolbarActions}>
            <SearchInput
              className={styles.search}
              size="lg"
              placeholder="Search user, reference, method..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error ? <p className={styles.muted}>{error}</p> : null}

        <div className={styles.table}>
          <DataTable
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row._id}
            size="lg"
            emptyMessage={loading ? <Loader block /> : 'No transactions match this filter.'}
          />
        </div>

        <Pagination
          page={page}
          pageCount={pageCount}
          run={5}
          summary={`Showing ${rows.length} of ${total} transactions · Page ${page} of ${pageCount}`}
          onChange={setPage}
        />
      </section>
    </div>
  );
}
