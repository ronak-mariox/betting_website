import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PercentIcon,
  PlusIcon,
  RefreshIcon,
  TransactionsIcon,
} from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { useAuth } from '../auth/authContext';
import { usePermissions } from '../auth/usePermissions';
import { networkApi } from '../../lib/api/network';
import { ApiRequestError } from '../../lib/api';
import type { ApiUser } from '../../lib/api';
import { accountsApi } from '../../lib/api/accounts';
import { commissionApi } from '../../lib/api/commission';
import type { ApiCommission, ApiCommissionLevel } from '../../lib/api/commission';
import { transactionsApi } from '../../lib/api/transactions';
import { walletApi } from '../../lib/api/wallet';
import type { ApiPayment, ApiWalletRequest, ManualEntryAction, WalletStats } from '../../lib/api/wallet';
import { formatCount, formatMoney, formatRupees, formatRelativeTime } from '../../lib/format';
import { NewPaymentModal } from './NewPaymentModal';
import type { PaymentRecipientOption } from './NewPaymentModal';
import { FundTransferModal } from './FundTransferModal';
import { TransferHistory } from './TransferHistory';
import { ReviewRequestModal } from './ReviewRequestModal';
import type { ReviewRequest } from './ReviewRequestModal';
import { WalletActionModal } from './WalletActionModal';
import type { WalletAction, WalletUserOption } from './WalletActionModal';
import walletStyles from './WalletPage.module.css';
import paymentStyles from './PaymentsTab.module.css';

const styles = walletStyles;

const TAB_LABELS = ['Deposits', 'Withdrawals', 'History', 'Fund Transfers', 'Payments', 'Manual Activity'] as const;
type Tab = (typeof TAB_LABELS)[number];

const QUICK_ACTIONS = [
  { label: 'Manual Credit', icon: ArrowDownIcon, rgb: '34, 197, 94' },
  { label: 'Manual Debit', icon: ArrowUpIcon, rgb: '239, 68, 68' },
  { label: 'Transfer', icon: TransactionsIcon, rgb: '33, 150, 243' },
  { label: 'Adjustment', icon: RefreshIcon, rgb: '250, 204, 21' },
] as const;

const ACTION_FOR: Record<WalletAction, ManualEntryAction> = {
  'Manual Credit': 'Credit',
  'Manual Debit': 'Debit',
  Transfer: 'Transfer',
  Adjustment: 'Adjustment',
};

const BUCKETS: {
  level: ApiCommissionLevel;
  emoji: string;
  label: string;
  color: string;
  rgb: string;
}[] = [
  {
    level: 'Super Agent',
    emoji: '👑',
    label: 'Super Agents',
    color: 'var(--color-warning)',
    rgb: '250, 204, 21',
  },
  {
    level: 'Agent',
    emoji: '🧑‍💼',
    label: 'Agents',
    color: 'var(--color-primary-light)',
    rgb: '41, 182, 246',
  },
  {
    level: 'Franchise',
    emoji: '🏢',
    label: 'Franchises',
    color: 'var(--color-success)',
    rgb: '34, 197, 94',
  },
];

const RECIPIENT_TYPE_BY_ROLE: Record<string, PaymentRecipientOption['type'] | undefined> = {
  'super-agent': 'Super Agent',
  agent: 'Agent',
  franchise: 'Franchise',
};

const ROLE_TONE: Record<string, BadgeTone> = {
  'super-agent': 'warning',
  agent: 'info',
  franchise: 'success',
};

/** One table row, whichever source (wallet request or ledger entry) it came from. */
type Row = {
  id: string;
  requestId?: string;
  user: string;
  amount: number;
  incoming: boolean;
  method: string;
  reference: string;
  /** The plain UTR / destination, without the rejection note `reference` may carry. */
  rawReference?: string;
  /** Deposit requests: a payment screenshot came with it. */
  hasProof?: boolean;
  isRequest?: boolean;
  time: string;
  status: { label: string; tone: BadgeTone };
};

const errorMessage = (err: unknown) => (err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');

const userLabel = (user: ApiUser) => `${user.name || user.username} (${user.username})`;

function refName(ref: ApiWalletRequest['user'] | undefined): string {
  if (!ref) return '—';
  if (typeof ref === 'string') return ref.slice(-6).toUpperCase();
  return ref.name || ref.username;
}

const REQUEST_TONE: Record<ApiWalletRequest['status'], BadgeTone> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

function requestRow(request: ApiWalletRequest): Row {
  return {
    id: request._id,
    requestId: request.status === 'Pending' ? request._id : undefined,
    user: refName(request.user),
    amount: request.amount,
    incoming: request.kind === 'deposit',
    method: request.method || '—',
    reference:
      request.status === 'Rejected' && request.rejectionReason
        ? `${request.reference || '—'} · Rejected: ${request.rejectionReason}`
        : request.reference || '—',
    rawReference: request.reference || '—',
    hasProof: Boolean(request.proof?.name || request.proof?.size),
    isRequest: true,
    time: formatRelativeTime(request.createdAt),
    status: { label: request.status, tone: REQUEST_TONE[request.status] },
  };
}

function walletStats(stats: WalletStats | null): StatCardProps[] {
  const value = (fn: (s: WalletStats) => string) => (stats ? fn(stats) : '…');
  return [
    {
      label: 'Platform Balance',
      value: value((s) => formatMoney(s.totalWalletBalance)),
      caption: 'All user wallets',
      icon: BriefcaseIcon,
      accent: 'blue',
    },
    {
      label: "Today's Volume",
      value: value((s) => formatMoney(s.todayVolume)),
      caption: value((s) => `${formatCount(s.todayTransactionCount)} transactions`),
      icon: TransactionsIcon,
      accent: 'green',
    },
    {
      label: 'Pending Deposits',
      value: value((s) => formatCount(s.pendingDeposits)),
      caption: 'Awaiting review',
      icon: ArrowUpIcon,
      accent: 'yellow',
    },
    {
      label: 'Pending Withdrawals',
      value: value((s) => formatCount(s.pendingWithdrawals)),
      caption: 'Awaiting review',
      icon: ClockIcon,
      accent: 'red',
    },
  ];
}

/** Super-admin wallet console — every number and action goes through `/api/wallet`. */
/**
 * `adminTools` (super-admin) adds partner payments, manual entries and the
 * Payments tab; every other role sees its own network's deposit/withdrawal
 * queue and history, which the backend scopes to their downline.
 */
export function LiveWallet({ adminTools }: { adminTools: boolean }) {
  const { accessToken } = useAuth();
  // The bell's links open the page on a tab (`?tab=Withdrawals`).
  const [params] = useSearchParams();
  const linkedTab = TAB_LABELS.find((label) => label === params.get('tab')) ?? 'Deposits';
  const [tab, setTab] = useState<Tab>(linkedTab);
  useEffect(() => setTab(linkedTab), [linkedTab]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  /** Commission paid out this month (match-end payouts), for the level buckets. */
  const [monthCommission, setMonthCommission] = useState<ApiCommission[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** The request whose approve / reject confirmation is open. */
  const [reviewing, setReviewing] = useState<ReviewRequest | null>(null);
  const [action, setAction] = useState<WalletAction | null>(null);
  const [paying, setPaying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Staff hold a wallet of their own (commission paid in, money moved down the network).
  const { can, loaded: permissionsLoaded } = usePermissions();
  const visibleTabs = TAB_LABELS.filter((label) => {
    if (label === 'Payments') return adminTools;
    if (label === 'Deposits') return can('finance', 'deposit', 'V');
    if (label === 'Withdrawals') return can('finance', 'withdrawal', 'V');
    if (label === 'History') return can('finance', 'deposit', 'V') || can('finance', 'withdrawal', 'V');
    return true;
  });
  // A tab this role can't see (default / ?tab= link) falls back to the first one it can.
  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.includes(tab)) setTab(visibleTabs[0]);
  }, [visibleTabs, tab]);
  // Don't fetch a tab this role can't open (the backend would 403) — wait for the fallback above.
  const tabReady = permissionsLoaded && visibleTabs.includes(tab);
  const canTransfer = !adminTools && can('finance', 'fundTransfer', 'X');
  const [myBalance, setMyBalance] = useState<number | null>(null);
  const [transferring, setTransferring] = useState(false);
  useEffect(() => {
    if (!accessToken || adminTools) return undefined;
    let cancelled = false;
    networkApi
      .myDashboard(accessToken)
      .then((res) => {
        if (!cancelled) setMyBalance(res.stats.walletBalance);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken, adminTools, refreshKey]);

  const userMap = new Map(users.map((user) => [user._id, user]));
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    Promise.all([
      walletApi.stats(accessToken),
      adminTools ? accountsApi.list({ limit: 100 }, accessToken) : Promise.resolve({ items: [] as ApiUser[] }),
      adminTools ? commissionApi.list({}, accessToken) : Promise.resolve({ items: [] as ApiCommission[] }),
    ])
      .then(([statsRes, usersRes, commissionRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats);
        setUsers(usersRes.items);
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setMonthCommission(commissionRes.items.filter((row) => row.period === period));
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshKey, adminTools]);

  useEffect(() => {
    if (!accessToken || tab === 'Payments' || tab === 'Fund Transfers' || !tabReady) return;
    let cancelled = false;
    setLoading(true);

    const load = async (): Promise<Row[]> => {
      if (tab === 'Manual Activity') {
        const res = await transactionsApi.list({ tab: 'adjustments', limit: 50 }, accessToken);
        return res.items.map((txn) => ({
          id: txn._id,
          user: !txn.user
            ? 'Platform'
            : typeof txn.user === 'string'
              ? txn.user.slice(-6).toUpperCase()
              : txn.user.name || txn.user.username,
          amount: Math.abs(txn.amount),
          incoming: txn.amount >= 0,
          method: txn.method
            ? `${txn.method} ${txn.amount >= 0 ? 'in' : 'out'}`
            : txn.amount >= 0
              ? 'Manual Credit'
              : 'Manual Debit',
          reference: txn.note || txn.reference || '—',
          time: formatRelativeTime(txn.createdAt),
          status: {
            label: txn.status,
            tone: txn.status === 'Completed' ? 'success' : txn.status === 'Failed' ? 'danger' : 'warning',
          },
        }));
      }
      if (tab === 'History') {
        const res = await walletApi.requests({ limit: 100 }, accessToken);
        return res.items.filter((request) => request.status !== 'Pending').map((request) => requestRow(request));
      }
      const res = await walletApi.requests(
        {
          kind: tab === 'Deposits' ? 'deposit' : 'withdrawal',
          status: 'Pending',
          limit: 100,
        },
        accessToken,
      );
      return res.items.map((request) => requestRow(request));
    };

    load()
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, tab, tabReady, refreshKey]);

  /** Saves the decision made in the confirmation dialog; throws the message for the dialog to show. */
  const decide = async (request: ReviewRequest, reason: string) => {
    // Opened only to look at: there is no decision to save.
    if (!accessToken || request.approve === null) return;
    setBusyId(request.id);
    try {
      await (request.approve
        ? walletApi.approve(request.id, accessToken)
        : walletApi.reject(request.id, accessToken, reason));
      setReviewing(null);
      refresh();
    } catch (err) {
      // Someone else reviewed it meanwhile: the list is stale either way.
      refresh();
      throw new Error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  /** `approve: null` opens the request just to look at it (the screenshot, mostly). */
  const review = (row: Row, approve: boolean | null) =>
    setReviewing({
      id: row.id,
      user: row.user,
      amount: row.amount,
      kind: row.incoming ? 'deposit' : 'withdrawal',
      method: row.method,
      reference: row.rawReference ?? row.reference,
      hasProof: Boolean(row.hasProof),
      approve,
    });

  const userOptions: WalletUserOption[] = users
    .filter((user) => user.role !== 'super-admin')
    .map((user) => ({ id: user._id, label: userLabel(user) }));

  const recipients: PaymentRecipientOption[] = users.flatMap((user) => {
    const type = RECIPIENT_TYPE_BY_ROLE[user.role];
    return type ? [{ id: user._id, label: userLabel(user), type }] : [];
  });

  // The queues follow the Permissions page: Deposit / Withdrawal (view) to see each, (edit) to decide.
  const reviewKind = tab === 'Deposits' ? 'deposit' : tab === 'Withdrawals' ? 'withdrawal' : null;
  const showActions = reviewKind !== null && can('finance', reviewKind, 'X');
  const tabs = visibleTabs.map((label) => {
    if (label === 'Deposits' && stats?.pendingDeposits)
      return {
        label,
        badge: `${stats.pendingDeposits} pending`,
        rgb: '250, 204, 21',
      };
    if (label === 'Withdrawals' && stats?.pendingWithdrawals)
      return {
        label,
        badge: `${stats.pendingWithdrawals} pending`,
        rgb: '239, 68, 68',
      };
    return { label };
  });

  const columns: Column<Row>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => <span className={styles.id}>{row.id.slice(-8).toUpperCase()}</span>,
    },
    {
      key: 'user',
      header: 'User',
      render: (row) => <span className={styles.user}>{row.user}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className={row.incoming ? styles.amount : styles.amountOut}>{formatRupees(row.amount)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => <span className={styles.muted}>{row.method}</span>,
    },
    {
      key: 'reference',
      header: 'UTR / Ref',
      render: (row) => (
        <span className={styles.ref} title={row.reference}>
          {row.reference}
        </span>
      ),
    },
    ...(tab === 'Deposits' || tab === 'History'
      ? [
          {
            key: 'proof',
            header: 'Screenshot',
            render: (row: Row) =>
              row.isRequest && row.incoming && row.hasProof ? (
                <Button size="xs" variant="outline" icon={<EyeIcon size={12} />} onClick={() => review(row, null)}>
                  View
                </Button>
              ) : (
                <span className={styles.muted}>{row.isRequest && row.incoming ? 'Not attached' : '—'}</span>
              ),
          } satisfies Column<Row>,
        ]
      : []),
    {
      key: 'time',
      header: 'Time',
      render: (row) => <span className={styles.muted}>{row.time}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
    },
    // Only the two queues have anything to act on.
    ...(showActions
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (row) =>
              showActions && row.requestId ? (
                <div className={styles.rowActions}>
                  <Button
                    className={styles.approve}
                    size="xs"
                    icon={<CheckCircleIcon size={12} />}
                    disabled={busyId === row.requestId}
                    onClick={() => review(row, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    className={styles.reject}
                    size="xs"
                    icon={<BanIcon size={12} />}
                    disabled={busyId === row.requestId}
                    onClick={() => review(row, false)}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <span className={styles.muted}>—</span>
              ),
          } satisfies Column<Row>,
        ]
      : []),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {walletStats(stats).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {!adminTools && myBalance !== null ? (
        <section className={styles.myWallet}>
          <div>
            <p className={styles.myWalletLabel}>My Wallet Balance</p>
            <p className={styles.myWalletValue}>{formatRupees(myBalance)}</p>
            <p className={styles.myWalletNote}>
              Settled commission is paid in here. Your users' money is the Platform Balance above.
            </p>
          </div>
          {canTransfer ? (
            <Button
              variant="primary"
              size="sm"
              icon={<TransactionsIcon size={14} />}
              onClick={() => setTransferring(true)}
            >
              Fund Transfer
            </Button>
          ) : null}
        </section>
      ) : null}

      {transferring && myBalance !== null ? (
        <FundTransferModal
          balance={myBalance}
          onClose={() => setTransferring(false)}
          onDone={(balance) => {
            setMyBalance(balance);
            setTransferring(false);
            refresh();
          }}
        />
      ) : null}

      {adminTools ? (
        <>
          <section className={styles.partners}>
            <div className={styles.partnersHead}>
              <div>
                <p className={styles.partnersTitle}>Partner Payments</p>
                <p className={styles.partnersSubtitle}>
                  Commission is paid automatically at match end. Record a credit top-up or bonus for Super Agents, Agents &amp; Franchises
                </p>
              </div>
              <Button
                className={styles.manage}
                size="sm"
                icon={<TransactionsIcon size={12.992} />}
                onClick={() => setTab('Payments')}
              >
                Manage Payments
              </Button>
            </div>

            <div className={styles.buckets}>
              {BUCKETS.map((bucket) => {
                const paid = monthCommission.filter((row) => row.level === bucket.level);
                return (
                  <div
                    key={bucket.label}
                    className={styles.bucket}
                    style={
                      {
                        '--bucket-border': `rgba(${bucket.rgb}, 0.14)`,
                        '--bucket-color': bucket.color,
                      } as CSSProperties
                    }
                  >
                    <div className={styles.bucketHead}>
                      <span className={styles.bucketEmoji} aria-hidden="true">
                        {bucket.emoji}
                      </span>
                      <span className={styles.bucketLabel}>{bucket.label}</span>
                      <span className={styles.bucketActive}>{paid.length} payouts</span>
                    </div>
                    <p className={styles.bucketDue}>{formatMoney(paid.reduce((sum, row) => sum + row.commission, 0))}</p>
                    <p className={styles.bucketCaption}>Commission paid this month</p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className={styles.actions}>
            {QUICK_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={styles.action}
                  style={
                    {
                      '--action-bg': `rgba(${item.rgb}, 0.1)`,
                      '--action-hover': `rgba(${item.rgb}, 0.18)`,
                      '--action-border': `rgba(${item.rgb}, 0.13)`,
                      '--action-color': `rgb(${item.rgb})`,
                    } as CSSProperties
                  }
                  onClick={() => setAction(item.label as WalletAction)}
                >
                  <Icon size={17.999} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <PillTabs items={tabs} value={tab} label="Wallet sections" onChange={(value) => setTab(value as Tab)} />
        </div>

        {error ? <p className={styles.muted}>{error}</p> : null}

        {tab === 'Fund Transfers' ? (
          <div className={styles.table}>
            <TransferHistory all refreshKey={refreshKey} />
          </div>
        ) : tab === 'Payments' ? (
          <LivePaymentsTab
            users={userMap}
            monthCommission={monthCommission}
            refreshKey={refreshKey}
            onNewPayment={() => setPaying(true)}
          />
        ) : (
          <div className={styles.table}>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              size="lg"
              emptyMessage={loading ? <Loader block /> : 'Nothing here right now.'}
            />
          </div>
        )}
      </section>

      {reviewing ? (
        <ReviewRequestModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onConfirm={(reason) => decide(reviewing, reason)}
        />
      ) : null}

      {action ? (
        <WalletActionModal
          action={action}
          users={userOptions}
          onClose={() => setAction(null)}
          onConfirm={() => {
            setAction(null);
            refresh();
          }}
          onSubmit={async (values) => {
            if (!accessToken) return;
            await walletApi.manualEntry(
              {
                userId: values.userId,
                toUserId: values.toUserId,
                action: ACTION_FOR[action],
                amount: values.amount,
                note: values.note,
                direction: values.direction,
              },
              accessToken,
            );
          }}
        />
      ) : null}

      {paying ? (
        <NewPaymentModal
          recipients={recipients}
          onClose={() => setPaying(false)}
          onConfirm={() => {
            setPaying(false);
            refresh();
          }}
          onSubmit={async (values) => {
            if (!accessToken) return;
            await walletApi.createPayment(
              {
                recipientType: 'User',
                ...values,
                note: values.note || undefined,
              },
              accessToken,
            );
          }}
        />
      ) : null}
    </div>
  );
}

const SCOPES = ['All', 'Superagent', 'Agent', 'Franchise'] as const;
type Scope = (typeof SCOPES)[number];
const SCOPE_ROLE: Record<Exclude<Scope, 'All'>, string> = {
  Superagent: 'super-agent',
  Agent: 'agent',
  Franchise: 'franchise',
};

const PAYMENT_TONE: Record<ApiPayment['status'], BadgeTone> = {
  Completed: 'success',
  Pending: 'warning',
  Failed: 'danger',
};

type LivePaymentsTabProps = {
  users: Map<string, ApiUser>;
  /** Commission paid automatically at match end this month. */
  monthCommission: ApiCommission[];
  refreshKey: number;
  onNewPayment: () => void;
};

/** Payments tab, live — history from `/wallet/payments`; commission itself is paid automatically at match end. */
function LivePaymentsTab({ users, monthCommission, refreshKey, onNewPayment }: LivePaymentsTabProps) {
  const { accessToken } = useAuth();
  const [scope, setScope] = useState<Scope>('All');
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    walletApi
      .payments({ limit: 100 }, accessToken)
      .then((res) => {
        if (!cancelled) setPayments(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshKey]);

  const now = new Date();
  const thisMonth = payments.filter((payment) => {
    const date = new Date(payment.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const monthName = now.toLocaleDateString('en-IN', { month: 'long' });
  const commissionPaid = monthCommission.reduce((sum, row) => sum + row.commission, 0);

  const summary = [
    {
      label: `Total Paid (${monthName})`,
      value: formatMoney(thisMonth.filter((p) => p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0)),
      color: 'var(--color-success)',
      icon: CheckCircleIcon,
      rgb: '34, 197, 94',
    },
    {
      label: `Commission Paid (${monthName})`,
      value: formatMoney(commissionPaid),
      color: 'var(--color-primary-light)',
      icon: PercentIcon,
      rgb: '41, 182, 246',
    },
    {
      label: 'Payments This Month',
      value: formatCount(thisMonth.length),
      color: 'var(--color-primary)',
      icon: TransactionsIcon,
      rgb: '33, 150, 243',
    },
  ];

  const rows = payments.filter((payment) => {
    if (scope === 'All') return true;
    return users.get(payment.recipient)?.role === SCOPE_ROLE[scope];
  });

  const columns: Column<ApiPayment>[] = [
    {
      key: 'id',
      header: 'Pay ID',
      render: (row) => <span className={paymentStyles.payId}>{row._id.slice(-8).toUpperCase()}</span>,
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (row) => {
        const user = users.get(row.recipient);
        return (
          <div>
            <p className={paymentStyles.recipient}>{user ? user.name || user.username : row.recipientType}</p>
            <p className={paymentStyles.recipientCode}>{user?.username ?? row.recipient.slice(-6).toUpperCase()}</p>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const role = users.get(row.recipient)?.role ?? row.recipientType.toLowerCase();
        return <Badge tone={ROLE_TONE[role] ?? 'neutral'}>{role}</Badge>;
      },
    },
    {
      key: 'paymentType',
      header: 'Payment Type',
      render: (row) => <Badge tone="success">{row.paymentType}</Badge>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className={paymentStyles.amount}>{formatRupees(row.amount)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => <span className={paymentStyles.muted}>{row.method || '—'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className={paymentStyles.muted}>{formatRelativeTime(row.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={PAYMENT_TONE[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <div className={paymentStyles.tab}>
      <div className={paymentStyles.summary}>
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={paymentStyles.summaryCard}
              style={
                {
                  '--tile-bg': `rgba(${item.rgb}, 0.12)`,
                  '--tile-color': item.color,
                } as CSSProperties
              }
            >
              <span className={paymentStyles.summaryTile}>
                <Icon size={15.996} />
              </span>
              <div>
                <p className={paymentStyles.summaryLabel}>{item.label}</p>
                <p className={paymentStyles.summaryValue}>{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className={paymentStyles.muted}>{error}</p> : null}

      <div>
        <div className={paymentStyles.historyHead}>
          <p className={paymentStyles.historyTitle}>Payment History</p>
          <div className={paymentStyles.historyActions}>
            <Tabs items={SCOPES} value={scope} variant="solid" aria-label="Filter payments" onChange={setScope} />
            <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={onNewPayment}>
              New Payment
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row._id}
          size="lg"
          emptyMessage={loading ? <Loader block /> : 'No payments for this filter.'}
        />
      </div>
    </div>
  );
}
