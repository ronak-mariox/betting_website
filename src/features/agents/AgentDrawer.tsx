import { Loader } from '../../components/ui/Loader/Loader';
import { usePermissions } from '../auth/usePermissions';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AnalyticsIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  PulseIcon,
  UsersIcon,
  WalletIcon,
} from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { MetricTile } from '../../components/ui/MetricTile/MetricTile';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { displayName, networkApi } from '../../lib/api/network';
import type { NetworkDetail } from '../../lib/api/network';
import { walletApi } from '../../lib/api/wallet';
import { formatIp, formatMoney, formatPercent, formatRelativeTime, formatRupees } from '../../lib/format';
import { StaffFormModal } from '../superAgents/StaffFormModal';
import { UserDrawer } from '../users/UserDrawer';
import { describeCommission, useIsDirectUpline } from '../users/commissionRates';
import { ACTIVITY_TITLE, formatDate, statusLabel } from '../users/usersData';
import { useNetworkDetail } from '../users/useNetworkList';
import { WalletActionModal } from '../wallet/WalletActionModal';
import type { WalletAction } from '../wallet/WalletActionModal';
import { AGENT_STATUS_TONE } from './agentsData';
import styles from './AgentDrawer.module.css';

const TABS = ['Overview', 'Users', 'Wallet', 'Transactions', 'Reports', 'Activity'] as const;
type Tab = (typeof TABS)[number];

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/**
 * Agent record sheet — nodes 116:27600 (overview), 116:28563 (users),
 * 116:29510 (wallet), 116:30416 (transactions), 116:31356 (reports) and
 * 116:33379 (activity).
 */
export function AgentDrawer({
  accountId,
  onChanged,
  onClose,
}: {
  accountId: string;
  onChanged?: () => void;
  onClose: () => void;
}) {
  const { can } = usePermissions();
  const { accessToken } = useAuth();
  const isDirectUpline = useIsDirectUpline();
  const { detail, error, setError, reload } = useNetworkDetail(accountId);
  const [tab, setTab] = useState<Tab>('Overview');
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!detail) {
    return (
      <Drawer label="Agent details" width={600} onClose={onClose} header={<p className={styles.name}>Agent</p>}>
        <p className={styles.listTitle}>{error ?? <Loader block />}</p>
      </Drawer>
    );
  }

  const { account, abilities } = detail;
  const name = account.name || account.username;
  const status = statusLabel(account);

  const changed = async () => {
    await reload();
    onChanged?.();
  };

  const toggleStatus = async () => {
    if (!accessToken) return;
    setPending(true);
    try {
      await networkApi.setStatus(account._id, account.status === 'suspended' ? 'active' : 'suspended', accessToken);
      await changed();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Drawer
      label={`${name} details`}
      width={600}
      onClose={onClose}
      header={
        <div className={styles.identity}>
          <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
          <div>
            <p className={styles.name}>{name}</p>
            <div className={styles.meta}>
              <span className={styles.code}>{account.username}</span>
              <Badge tone={AGENT_STATUS_TONE[status]}>{status}</Badge>
              {account.parent ? <span className={styles.parentCode}>SA: {displayName(account.parent)}</span> : null}
            </div>
          </div>
        </div>
      }
      actions={
        abilities.edit || abilities.suspend || isDirectUpline(account) ? (
          <>
            {abilities.edit || isDirectUpline(account) ? (
              <Button variant="primary" size="xs" icon={<PencilIcon size={12} />} onClick={() => setEditing(true)}>
                {abilities.edit ? 'Edit' : 'Set Commission'}
              </Button>
            ) : null}
            {abilities.suspend ? (
              <Button
                className={account.status === 'active' ? styles.block : undefined}
                size="xs"
                disabled={pending}
                icon={account.status === 'active' ? <BanIcon size={12} /> : <CheckCircleIcon size={12} />}
                onClick={toggleStatus}
              >
                {account.status === 'active' ? 'Block' : 'Reactivate'}
              </Button>
            ) : null}
          </>
        ) : undefined
      }
      tabs={
        <Tabs
          items={TABS.filter((name) => (name !== 'Wallet' && name !== 'Transactions') || can('finance', 'walletBalance', 'V'))}
          value={tab}
          variant="underline"
          accent="var(--color-success)"
          aria-label="Agent sections"
          onChange={setTab}
        />
      }
    >
      {error ? <p className={styles.txnMeta}>{error}</p> : null}
      {tab === 'Overview' ? <OverviewTab detail={detail} onJump={setTab} /> : null}
      {tab === 'Users' ? <UsersTab detail={detail} onChanged={changed} /> : null}
      {tab === 'Wallet' ? <WalletTab detail={detail} onChanged={changed} /> : null}
      {tab === 'Transactions' ? <TransactionsTab detail={detail} /> : null}
      {tab === 'Reports' ? <PerformanceTab detail={detail} /> : null}
      {tab === 'Activity' ? <ActivityTab detail={detail} /> : null}

      {editing ? (
        <StaffFormModal
          commissionOnly={!abilities.edit}
          role="agent"
          account={account}
          parents={[]}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void changed();
          }}
        />
      ) : null}
    </Drawer>
  );
}

function OverviewTab({ detail, onJump }: { detail: NetworkDetail; onJump: (tab: Tab) => void }) {
  const { can } = usePermissions();
  const { account, summary, ancestors } = detail;
  const superAgent = ancestors[0];
  const franchise = ancestors.find((ref) => ref.role === 'franchise');

  return (
    <div className={styles.body}>
      <div className={styles.metrics}>
        <MetricTile label="Total Users" value={String(summary.players)} color="var(--color-success)" />
        <MetricTile label="Turnover" value={formatMoney(summary.turnover)} color="var(--color-warning)" />
        <MetricTile label="Commission" value={formatMoney(summary.commission)} color="var(--color-primary)" />
        <MetricTile label="Wallet Balance" value={formatRupees(account.walletBalance)} color="var(--color-primary-light)" />
        <MetricTile label="Commission %" value={describeCommission(account)} color="var(--color-text-muted)" />
        <MetricTile label="Joined" value={formatDate(account.createdAt)} color="var(--color-text-muted)" />
      </div>

      <div className={styles.panel}>
        <p className={styles.panelTitle}>Contact Details</p>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Phone</span>
          <span className={styles.rowValue}>{account.phone || '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Email</span>
          <span className={styles.rowValue}>{account.email || '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Referral Code</span>
          <span className={styles.rowValue}>{account.referralCode || '—'}</span>
        </div>
      </div>

      {superAgent ? (
        <div className={styles.assigned}>
          <p className={styles.assignedLabel}>Assigned Super Agent</p>
          <div className={styles.assignedRow}>
            <div className={styles.assignedMain}>
              <span className={styles.assignedTile}>{displayName(superAgent).slice(0, 1).toUpperCase()}</span>
              <div>
                <p className={styles.assignedName}>{displayName(superAgent)}</p>
                <p className={styles.assignedMeta}>
                  {superAgent.username}
                  {franchise ? ` · ${displayName(franchise)}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.ctas}>
        <Button variant="primary" size="sm" icon={<UsersIcon size={13} />} onClick={() => onJump('Users')}>
          View Users
        </Button>
        {can('finance', 'walletBalance', 'V') ? (
          <Button className={styles.ctaWallet} size="sm" icon={<WalletIcon size={13} />} onClick={() => onJump('Wallet')}>
            Wallet
          </Button>
        ) : null}
        <Button className={styles.ctaReports} size="sm" icon={<AnalyticsIcon size={13} />} onClick={() => onJump('Reports')}>
          Reports
        </Button>
      </div>
    </div>
  );
}

function UsersTab({ detail, onChanged }: { detail: NetworkDetail; onChanged: () => void }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { items, total } = detail.downline.players;
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (user) => !needle || `${user.name} ${user.username}`.toLowerCase().includes(needle),
  );

  return (
    <div className={styles.body}>
      <div className={styles.listHead}>
        <p className={styles.listTitle}>Users under {detail.account.name || detail.account.username}</p>
        <Badge tone="brand">{total} total</Badge>
      </div>

      <SearchInput size="lg" placeholder="Search users..." value={query} onChange={(event) => setQuery(event.target.value)} />

      {visible.length === 0 ? <p className={styles.txnMeta}>No users yet.</p> : null}
      {visible.map((user) => {
        const status = statusLabel(user);
        return (
          <article key={user._id} className={styles.userRow}>
            <div className={styles.userMain}>
              <span className={styles.userAvatar}>{(user.name || user.username).slice(0, 1).toUpperCase()}</span>
              <div>
                <p className={styles.userName}>{user.name || user.username}</p>
                <p className={styles.userMeta}>
                  {user.username} · {formatRupees(user.walletBalance)} · {user.summary.bets} bets
                </p>
              </div>
            </div>
            <div className={styles.userTail}>
              <Badge tone={AGENT_STATUS_TONE[status]}>{status}</Badge>
              <button type="button" className={styles.open} aria-label={`Open ${user.name || user.username}`} onClick={() => setOpenId(user._id)}>
                <EyeIcon size={13} />
              </button>
            </div>
          </article>
        );
      })}

      {openId ? <UserDrawer accountId={openId} onChanged={onChanged} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function WalletTab({ detail, onChanged }: { detail: NetworkDetail; onChanged: () => void }) {
  const { accessToken, user } = useAuth();
  const [action, setAction] = useState<WalletAction | null>(null);
  const { wallet, account } = detail;
  // Manual wallet entries are a super-admin-only backend action.
  const canMoveFunds = user?.roleId === 'super-admin';

  const tiles = [
    { label: 'Deposited by Users', value: formatMoney(wallet.deposited), color: 'var(--color-success)' },
    { label: 'Withdrawn by Users', value: formatMoney(wallet.withdrawn), color: 'var(--color-danger)' },
    { label: 'Commission Earned', value: formatMoney(wallet.commissionEarned), color: 'var(--color-success)' },
    { label: 'Pending Settlement', value: formatMoney(wallet.commissionPending), color: 'var(--color-primary-light)' },
  ];

  return (
    <div className={styles.body}>
      <div className={styles.balanceCard}>
        <p className={styles.balanceLabel}>Current Wallet Balance</p>
        <p className={styles.balanceValue}>{formatRupees(wallet.balance)}</p>
        {canMoveFunds ? (
          <div className={styles.balanceActions}>
            <Button className={styles.deposit} size="xs" icon={<ArrowDownIcon size={12} />} onClick={() => setAction('Manual Credit')}>
              Deposit
            </Button>
            <Button className={styles.withdraw} size="xs" icon={<ArrowUpIcon size={12} />} onClick={() => setAction('Manual Debit')}>
              Withdraw
            </Button>
          </div>
        ) : null}
      </div>

      <div className={styles.walletTiles}>
        {tiles.map((tile) => (
          <MetricTile key={tile.label} label={tile.label} value={tile.value} color={tile.color} />
        ))}
      </div>

      {action && accessToken ? (
        <WalletActionModal
          action={action}
          users={[{ id: account._id, label: `${account.name || account.username} (${account.username})` }]}
          onClose={() => setAction(null)}
          onConfirm={() => {
            setAction(null);
            onChanged();
          }}
          onSubmit={async (values) => {
            await walletApi.manualEntry(
              {
                userId: values.userId,
                action: action === 'Manual Debit' ? 'Debit' : 'Credit',
                amount: values.amount,
                note: values.note,
              },
              accessToken,
            );
          }}
        />
      ) : null}
    </div>
  );
}

function TransactionsTab({ detail }: { detail: NetworkDetail }) {
  return (
    <div className={styles.body}>
      <div className={styles.listHead}>
        <p className={styles.listTitle}>Agent Transactions</p>
      </div>
      {detail.transactions.length === 0 ? <p className={styles.txnMeta}>No transactions yet.</p> : null}
      {detail.transactions.map((txn) => {
        const person = !txn.user ? 'Platform' : typeof txn.user === 'string' ? txn.user.slice(-6) : txn.user.name || txn.user.username;
        return (
          <article key={txn._id} className={styles.txnRow}>
            <div>
              <p className={styles.txnTitle}>
                {txn.type} <span className={styles.txnPerson}>— {person}</span>
              </p>
              <p className={styles.txnMeta}>
                {[txn.reference || txn._id.slice(-8).toUpperCase(), txn.method, formatRelativeTime(txn.createdAt)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className={styles.txnRight}>
              <span className={txn.amount >= 0 ? styles.amountUp : styles.amountDown}>
                {txn.amount >= 0 ? '+' : '-'}
                {formatRupees(Math.abs(txn.amount))}
              </span>
              <Badge tone={txn.status === 'Completed' ? 'success' : txn.status === 'Failed' ? 'danger' : 'warning'}>
                {txn.status}
              </Badge>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Live performance figures for the agent's book (replaces the static report shortcuts). */
export function PerformanceTab({ detail }: { detail: NetworkDetail }) {
  const { summary } = detail;
  const change =
    summary.prevMonthTurnover > 0
      ? `${summary.monthTurnover >= summary.prevMonthTurnover ? '+' : ''}${formatPercent(
          ((summary.monthTurnover - summary.prevMonthTurnover) / summary.prevMonthTurnover) * 100,
        )} vs last month`
      : 'No turnover last month';
  const tiles = [
    { label: 'This Month Turnover', value: formatMoney(summary.monthTurnover), color: 'var(--color-warning)' },
    { label: 'Last Month Turnover', value: formatMoney(summary.prevMonthTurnover), color: 'var(--color-text-muted)' },
    { label: 'Open Bets', value: String(summary.openBets), color: 'var(--color-primary-light)' },
    { label: 'Open Exposure', value: formatMoney(summary.exposure), color: 'var(--color-danger)' },
    { label: 'Win Rate', value: summary.winRate === null ? '—' : `${summary.winRate}%`, color: 'var(--color-primary)' },
    { label: 'Commission Earned', value: formatMoney(summary.commission), color: 'var(--color-success)' },
  ];

  return (
    <div className={styles.body}>
      <div className={styles.listHead}>
        <p className={styles.listTitle}>Performance</p>
        <Badge tone="brand">{change}</Badge>
      </div>
      <div className={styles.metrics}>
        {tiles.map((tile) => (
          <MetricTile key={tile.label} label={tile.label} value={tile.value} color={tile.color} />
        ))}
      </div>
    </div>
  );
}

const ACTIVITY_RGB: Record<string, string> = {
  account_suspended: '239, 68, 68',
  login_failed: '239, 68, 68',
  account_activated: '34, 197, 94',
  account_created: '34, 197, 94',
  login_success: '33, 150, 243',
};

export function ActivityTab({ detail }: { detail: NetworkDetail }) {
  const events = detail.activity;
  return (
    <div>
      <p className={styles.listTitle}>Activity Timeline</p>
      {events.length === 0 ? <p className={styles.txnMeta}>No activity recorded yet.</p> : null}
      {events.map((event, index) => {
        const rgb = ACTIVITY_RGB[event.action] ?? '184, 194, 204';
        const actor =
          typeof event.actor === 'object' && event.actor && event.actor._id !== detail.account._id
            ? `by ${event.actor.name || event.actor.username}`
            : formatIp(event.ip);
        return (
          <article
            key={event._id}
            className={styles.timelineRow}
            style={
              {
                '--event-bg': `rgba(${rgb}, 0.15)`,
                '--event-border': `rgba(${rgb}, 0.3)`,
                '--event-color': `rgb(${rgb})`,
              } as CSSProperties
            }
          >
            <div className={styles.timelineRail}>
              <span className={styles.timelineDot}>
                <PulseIcon size={12} />
              </span>
              {index < events.length - 1 ? <span className={styles.timelineLine} /> : null}
            </div>
            <div>
              <p className={styles.timelineTitle}>
                {ACTIVITY_TITLE[event.action] ?? event.action}
                {event.status === 'failed' ? ' (failed)' : ''}
              </p>
              <p className={styles.timelineDetail}>{actor || '—'}</p>
              <p className={styles.timelineWhen}>{formatRelativeTime(event.createdAt)}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
