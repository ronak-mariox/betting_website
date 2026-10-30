import { Loader } from '../../components/ui/Loader/Loader';
import { usePermissions } from '../auth/usePermissions';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  BanIcon,
  CalendarIcon,
  CheckCircleIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MonitorIcon,
  PencilIcon,
  PhoneIcon,
  PulseIcon,
  SmartphoneIcon,
  UserIcon,
} from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { MetricTile } from '../../components/ui/MetricTile/MetricTile';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { displayName, networkApi } from '../../lib/api/network';
import type { DetailBet, NetworkDetail } from '../../lib/api/network';
import { useNetworkDetail } from './useNetworkList';
import { formatIp, formatRelativeTime, formatRupees } from '../../lib/format';
import { AddUserModal } from './AddUserModal';
import { useIsDirectUpline } from './commissionRates';
import {
  ACTIVITY_TITLE,
  RISK_TONE,
  STATUS_TONE,
  describeUserAgent,
  formatDate,
  statusLabel,
  activityExtras,
} from './usersData';
import styles from './UserDrawer.module.css';

const TABS = ['Overview', 'Bets', 'Transactions', 'Activity', 'Devices'] as const;
type Tab = (typeof TABS)[number];

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

export type UserDrawerProps = {
  accountId: string;
  /** Section to open on, e.g. straight to the bet history. */
  defaultTab?: Tab;
  /** Franchise and Super Agent also see the owning agent (node 119:68771). */
  showAgent?: boolean;
  /** Called after any change so the list behind can refresh. */
  onChanged?: () => void;
  onClose: () => void;
};

/** User record sheet from nodes 79:6144 (overview) and 79:12933 (bets). */
export function UserDrawer({ accountId, defaultTab = 'Overview', showAgent = false, onChanged, onClose }: UserDrawerProps) {
  const { accessToken, user } = useAuth();
  const isDirectUpline = useIsDirectUpline();
  const { detail, error, setError, reload: load } = useNetworkDetail(accountId);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const { can } = usePermissions();
  // Tabs follow the Permissions page: View Bets and Wallet Balance (ledger).
  const visibleTabs = TABS.filter(
    (name) =>
      (name !== 'Bets' || can('bettingMarkets', 'viewBets', 'V')) &&
      (name !== 'Transactions' || can('finance', 'walletBalance', 'V')) &&
      // Other users' devices and sessions are managed by the Super Admin only.
      (name !== 'Devices' || user?.roleId === 'super-admin'),
  );
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (!detail) {
    return (
      <Drawer label="User details" onClose={onClose} header={<p className={styles.name}>User</p>}>
        <p className={styles.empty}>{error ?? <Loader block />}</p>
      </Drawer>
    );
  }

  const { account, abilities } = detail;
  const name = account.name || account.username;
  const status = statusLabel(account);
  const agent = account.parent ? displayName(account.parent) : null;

  const toggleStatus = () =>
    accessToken &&
    run(() => networkApi.setStatus(account._id, account.status === 'suspended' ? 'active' : 'suspended', accessToken));

  return (
    <Drawer
      label={`${name} details`}
      onClose={onClose}
      header={
        <div className={styles.identity}>
          <span className={styles.avatar}>{name.slice(0, 1).toLowerCase()}</span>
          <div>
            <p className={styles.name}>{name}</p>
            <div className={styles.meta}>
              <span className={styles.code}>{account.username}</span>
              <Badge tone={STATUS_TONE[status]}>{status}</Badge>
              {showAgent && agent ? <span className={styles.owner}>Agent: {agent}</span> : null}
            </div>
          </div>
        </div>
      }
      tabs={<Tabs items={visibleTabs} value={tab} variant="underline" aria-label="User sections" onChange={setTab} />}
    >
      {error ? <p className={styles.empty}>{error}</p> : null}

      {tab === 'Overview' ? (
        <div>
          <div className={styles.metrics}>
            <MetricTile label="Balance" value={formatRupees(account.walletBalance)} color="var(--color-success)" />
            <MetricTile label="Total Bets" value={String(detail.summary.bets)} color="var(--color-primary)" />
            <MetricTile label="Open Bets" value={String(detail.summary.openBets)} color="var(--color-warning)" />
            <MetricTile
              label="Risk Level"
              value={detail.summary.risk.toUpperCase()}
              color={TONE_COLOR[RISK_TONE[detail.summary.risk]]}
            />
          </div>

          <div className={styles.panel}>
            <p className={styles.panelTitle}>Contact Details</p>
            <DetailRow icon={<MailIcon size={12.991} />} label="Email" value={account.email || '—'} />
            <DetailRow icon={<PhoneIcon size={12.991} />} label="Phone" value={account.phone || '—'} />
            <DetailRow
              icon={<MapPinIcon size={12.991} />}
              label="Location"
              value={[account.city, account.state].filter(Boolean).join(', ') || '—'}
            />
            {agent ? <DetailRow icon={<UserIcon size={12.991} />} label="Agent" value={agent} /> : null}
            <DetailRow icon={<CalendarIcon size={12.991} />} label="Joined" value={formatDate(account.createdAt)} />
          </div>

          {abilities.edit || abilities.suspend || isDirectUpline(account) ? (
            <div className={styles.actions}>
              {abilities.edit || isDirectUpline(account) ? (
                <Button variant="primary" size="sm" icon={<PencilIcon size={12.991} />} onClick={() => setEditing(true)}>
                  {abilities.edit ? 'Edit User' : 'Set Commission'}
                </Button>
              ) : null}
              {abilities.suspend ? (
                <Button
                  className={account.status === 'suspended' ? undefined : styles.danger}
                  size="sm"
                  disabled={pending}
                  icon={account.status === 'suspended' ? <CheckCircleIcon size={12.991} /> : <BanIcon size={12.991} />}
                  onClick={toggleStatus}
                >
                  {account.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'Bets' ? (
        <BetsTab
          bets={detail.bets}
          total={detail.summary.bets}
          onVoid={
            can('bettingMarkets', 'voidBet', 'X') && accessToken
              ? (bet) => {
                  const reason = window.prompt(`Void this ${formatRupees(bet.amount)} bet? The stake goes back to the player.\nReason (optional):`);
                  if (reason !== null) void run(() => networkApi.voidBet(accessToken, bet._id, reason.trim() || undefined));
                }
              : undefined
          }
        />
      ) : null}

      {tab === 'Transactions' ? (
        <div className={styles.list}>
          <p className={styles.listTitle}>Transaction History</p>
          {detail.transactions.length === 0 ? (
            <p className={styles.empty}>No transactions yet.</p>
          ) : (
            detail.transactions.map((txn) => (
              <article key={txn._id} className={`${styles.row} ${styles.rowTight}`}>
                <div>
                  <p className={styles.rowTitle}>{/^Cash out/i.test(txn.note || '') ? 'Cash Out' : txn.type}</p>
                  <p className={styles.rowRef}>{txn.reference || txn.note || txn._id.slice(-8).toUpperCase()}</p>
                  <p className={styles.rowMeta}>
                    {[txn.method, formatRelativeTime(txn.createdAt)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className={styles.rowRight}>
                  <span className={txn.amount >= 0 ? styles.amountUp : styles.amountDown}>
                    {txn.amount >= 0 ? '+' : '-'}
                    {formatRupees(Math.abs(txn.amount))}
                  </span>
                  <Badge tone={txn.status === 'Completed' ? 'success' : txn.status === 'Failed' ? 'danger' : 'warning'}>
                    {txn.status}
                  </Badge>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === 'Activity' ? (
        <div>
          <p className={styles.listTitle}>Activity Timeline</p>
          {detail.activity.length === 0 ? <p className={styles.empty}>No activity recorded yet.</p> : null}
          {detail.activity.map((event, index) => (
            <article key={event._id} className={styles.timelineRow}>
              <div className={styles.timelineRail}>
                <span className={styles.timelineDot}>
                  <PulseIcon size={12} />
                </span>
                {index < detail.activity.length - 1 ? <span className={styles.timelineLine} /> : null}
              </div>
              <div>
                <p className={styles.timelineTitle}>
                  {ACTIVITY_TITLE[event.action] ?? event.action}
                  {event.status === 'failed' ? ' (failed)' : ''}
                  {activityExtras(event.metadata) ? ` — ${activityExtras(event.metadata)}` : ''}
                </p>
                <p className={styles.timelineDetail}>
                  {[
                    typeof event.actor === 'object' && event.actor && event.actor._id !== account._id
                      ? `by ${event.actor.name || event.actor.username}`
                      : null,
                    describeUserAgent(event.userAgent).name,
                    formatIp(event.ip),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className={styles.timelineWhen}>{formatRelativeTime(event.createdAt)}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'Devices' ? <DevicesTab detail={detail} pending={pending} run={run} /> : null}

      {editing ? (
        <AddUserModal
          commissionOnly={!abilities.edit}
          title="User"
          account={account}
          agents={[]}
          agentOptional
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void load();
            onChanged?.();
          }}
        />
      ) : null}
    </Drawer>
  );
}

const TONE_COLOR = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-text-muted)',
} as const;

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      {icon}
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

// A removed match leaves the bet's own snapshot of the names.
const betName = (bet: DetailBet) =>
  bet.event && typeof bet.event !== 'string' ? bet.event.name : bet.eventName || (typeof bet.event === 'string' ? bet.event.slice(-6) : '—');
const marketName = (bet: DetailBet) => {
  const name = bet.market && typeof bet.market !== 'string' ? bet.market.name : bet.marketName;
  return name ? `${name} · ${bet.selection}` : bet.selection;
};

const BET_TONE = { Pending: 'info', Won: 'success', Lost: 'danger', Void: 'neutral', 'Cashed Out': 'warning' } as const;

export function BetsTab({
  bets,
  total,
  onVoid,
}: {
  bets: DetailBet[];
  total: number;
  /** Shown on open bets when the role holds "Void Bet" (edit). */
  onVoid?: (bet: DetailBet) => void;
}) {
  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.panelTitle}>Bet History</p>
        <Badge tone="brand">{total} total bets</Badge>
      </div>

      {bets.length === 0 ? (
        <p className={styles.empty}>No bets placed yet.</p>
      ) : (
        bets.map((bet) => {
          const payout =
            bet.status === 'Won' || bet.status === 'Cashed Out' ? (bet.payout ?? bet.amount * bet.odds) : bet.amount;
          return (
            <article key={bet._id} className={styles.betCard}>
              <div className={styles.betTop}>
                <div>
                  <p className={styles.betEvent}>{betName(bet)}</p>
                  <p className={styles.betMarket}>{marketName(bet)}</p>
                </div>
                <div>
                  <p className={bet.status === 'Lost' ? styles.betAmountLost : styles.betAmountWon}>
                    {bet.status === 'Lost' ? '-' : ''}
                    {formatRupees(payout)}
                  </p>
                  <p className={styles.betDate}>{formatRelativeTime(bet.createdAt)}</p>
                </div>
              </div>
              <div className={styles.betBottom}>
                <span className={styles.betId}>{bet._id.slice(-8).toUpperCase()}</span>
                <span>Odds: {bet.odds.toFixed(2)}</span>
                <span>Stake: {formatRupees(bet.amount)}</span>
                <Badge tone={BET_TONE[bet.status]}>{bet.status === 'Pending' ? 'Open' : bet.status}</Badge>
                {onVoid && bet.status === 'Pending' ? (
                  <button type="button" className={styles.voidBet} onClick={() => onVoid(bet)}>
                    Void
                  </button>
                ) : null}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

/** Logged-in devices — node 79:12074, from the account's live refresh-token sessions. */
function DevicesTab({
  detail,
  pending,
  run,
}: {
  detail: NetworkDetail;
  pending: boolean;
  run: (action: () => Promise<unknown>) => void;
}) {
  const { accessToken, user } = useAuth();
  const canRevoke = user?.roleId === 'super-admin';

  return (
    <div className={styles.list}>
      <p className={styles.listTitle}>Logged-in Devices</p>
      {detail.sessions.length === 0 ? <p className={styles.empty}>No active sessions.</p> : null}
      {detail.sessions.map((session, index) => {
        const device = describeUserAgent(session.userAgent);
        const Icon = device.mobile ? SmartphoneIcon : MonitorIcon;
        const latest = index === 0;
        return (
          <article key={session._id} className={`${styles.row} ${latest ? styles.deviceCurrent : ''}`}>
            <div className={styles.deviceMain}>
              <span className={`${styles.deviceTile} ${latest ? styles.deviceTileCurrent : ''}`}>
                <Icon size={17.993} />
              </span>
              <div>
                <p className={styles.rowTitle}>{device.name}</p>
                <p className={styles.deviceMeta}>
                  <GlobeIcon size={9.994} />
                  {formatIp(session.ip) || '—'}
                </p>
                <p className={`${styles.deviceSeen} ${latest ? styles.deviceSeenActive : ''}`}>
                  Last active {formatRelativeTime(session.updatedAt)}
                </p>
              </div>
            </div>
            {canRevoke && accessToken ? (
              <button
                type="button"
                className={styles.chipRevoke}
                disabled={pending}
                onClick={() => run(() => networkApi.revokeSession(session._id, accessToken))}
              >
                Revoke
              </button>
            ) : latest ? (
              <span className={styles.chipCurrent}>Latest</span>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
