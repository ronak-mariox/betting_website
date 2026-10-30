import { Loader } from '../../components/ui/Loader/Loader';
import { useState } from 'react';
import {
  BanIcon,
  BuildingIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  UserIcon,
  UsersCogIcon,
} from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { MetricTile } from '../../components/ui/MetricTile/MetricTile';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { displayName, networkApi } from '../../lib/api/network';
import type { NetworkDetail } from '../../lib/api/network';
import { formatMoney, formatRupees, formatPercent } from '../../lib/format';
import { AgentDrawer } from '../agents/AgentDrawer';
import { StaffFormModal } from '../superAgents/StaffFormModal';
import { UserDrawer } from '../users/UserDrawer';
import { statusLabel } from '../users/usersData';
import { describeCommission, useIsDirectUpline } from '../users/commissionRates';
import { useNetworkDetail } from '../users/useNetworkList';
import { FRANCHISE_STATUS_TONE, formatJoined, toNetworkPerson } from './franchisesData';
import { NetworkRow, NetworkSection, SummaryRow } from './NetworkRows';
import styles from './SuperAgentDrawer.module.css';

/**
 * Super agent record sheet — nodes 116:17943 (overview), 116:18917 (agents),
 * 116:19859 (users) and 116:20803 (performance). Also opened from the
 * franchise drawer, so it can show the parent in the breadcrumb.
 */
export function SuperAgentDrawer({
  accountId,
  /** Shown only when the sheet is stacked over the franchise drawer. */
  parentLabel,
  onChanged,
  onClose,
}: {
  accountId: string;
  parentLabel?: string;
  onChanged?: () => void;
  onClose: () => void;
}) {
  const { accessToken } = useAuth();
  const isDirectUpline = useIsDirectUpline();
  const { detail, error, setError, reload } = useNetworkDetail(accountId);
  const [tab, setTab] = useState('Overview');
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [openUser, setOpenUser] = useState<string | null>(null);

  if (!detail) {
    return (
      <Drawer label="Super agent details" onClose={onClose} header={<p className={styles.name}>Super Agent</p>}>
        <p className={styles.parentLabel}>{error ?? <Loader block />}</p>
      </Drawer>
    );
  }

  const { account, abilities, downline } = detail;
  const name = account.name || account.username;
  const status = statusLabel(account);
  const tabs = ['Overview', `Agents (${downline.agents.total})`, `Users (${downline.players.total})`, 'Performance'] as const;

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
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Drawer
        label={`${name} details`}
        onClose={onClose}
        header={
          <div>
            {parentLabel ? (
              <p className={styles.breadcrumb}>
                <span className={styles.breadcrumbParent}>{parentLabel}</span>
                <ChevronRightIcon size={10} />
                <span>Super Agent Details</span>
              </p>
            ) : null}
            <div className={styles.identity}>
              <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className={styles.name}>{name}</p>
                <div className={styles.meta}>
                  <span className={styles.code}>{account.username}</span>
                  <Badge tone={FRANCHISE_STATUS_TONE[status]}>{status}</Badge>
                </div>
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
        tabs={<Tabs items={tabs} value={tab} variant="underline" aria-label="Super agent sections" onChange={setTab} />}
      >
        {error ? <p className={styles.parentLabel}>{error}</p> : null}

        {tab === 'Overview' ? <OverviewTab detail={detail} onJump={setTab} tabs={tabs} /> : null}

        {tab === tabs[1] ? (
          <NetworkSection title={`Agents Under ${name}`} count={`${downline.agents.total} agents`}>
            {downline.agents.items.length === 0 ? <p className={styles.parentLabel}>No agents yet.</p> : null}
            {downline.agents.items.map((row, index) => (
              <NetworkRow key={row._id} person={toNetworkPerson(row, index)} onOpen={() => setOpenAgent(row._id)} />
            ))}
          </NetworkSection>
        ) : null}

        {tab === tabs[2] ? (
          <NetworkSection title={`Users Under ${name}'s Network`} count={`${downline.players.total} users`}>
            {downline.players.items.length === 0 ? <p className={styles.parentLabel}>No users yet.</p> : null}
            {downline.players.items.map((row, index) => (
              <NetworkRow key={row._id} person={toNetworkPerson(row, index)} onOpen={() => setOpenUser(row._id)} />
            ))}
          </NetworkSection>
        ) : null}

        {tab === 'Performance' ? <PerformanceRows detail={detail} className={styles.body} /> : null}

        {editing ? (
          <StaffFormModal
            commissionOnly={!abilities.edit}
            role="super-agent"
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

      {openAgent ? <AgentDrawer accountId={openAgent} onChanged={changed} onClose={() => setOpenAgent(null)} /> : null}
      {openUser ? <UserDrawer accountId={openUser} showAgent onChanged={changed} onClose={() => setOpenUser(null)} /> : null}
    </>
  );
}

/** Month-on-month figures for any staff account's book. */
export function PerformanceRows({ detail, className }: { detail: NetworkDetail; className?: string }) {
  const { summary } = detail;
  const delta =
    summary.prevMonthTurnover > 0
      ? `${summary.monthTurnover >= summary.prevMonthTurnover ? '+' : ''}${formatPercent(
          ((summary.monthTurnover - summary.prevMonthTurnover) / summary.prevMonthTurnover) * 100,
        )}`
      : undefined;
  return (
    <div className={className}>
      <SummaryRow
        stat={{ label: 'This Month Turnover', value: formatMoney(summary.monthTurnover), color: 'var(--color-warning)' }}
        delta={delta}
      />
      <SummaryRow stat={{ label: 'Commission Earned', value: formatMoney(summary.commission), color: 'var(--color-success)' }} />
      <SummaryRow stat={{ label: 'Active Bets', value: String(summary.openBets), color: 'var(--color-primary-light)' }} />
      <SummaryRow
        stat={{ label: 'Win Rate', value: summary.winRate === null ? '—' : `${summary.winRate}%`, color: 'var(--color-primary)' }}
      />
    </div>
  );
}

function OverviewTab({
  detail,
  onJump,
  tabs,
}: {
  detail: NetworkDetail;
  onJump: (tab: string) => void;
  tabs: readonly string[];
}) {
  const { account, summary, ancestors, downline } = detail;
  const franchise = ancestors.find((ref) => ref.role === 'franchise');
  const metrics = [
    { label: 'Total Agents', value: String(downline.agents.total), color: 'var(--color-primary-light)' },
    { label: 'Total Users', value: String(downline.players.total), color: 'var(--color-success)' },
    { label: 'Turnover', value: formatMoney(summary.turnover), color: 'var(--color-warning)' },
    { label: 'Commission', value: formatMoney(summary.commission), color: 'var(--color-success)' },
    { label: 'Credit Limit', value: formatRupees(account.creditLimit), color: 'var(--color-primary-light)' },
    { label: 'Exposure', value: formatMoney(summary.exposure), color: 'var(--color-live)' },
  ];

  return (
    <div className={styles.body}>
      {franchise ? (
        <div className={styles.parent}>
          <div className={styles.parentMain}>
            <span className={styles.parentTile}>
              <BuildingIcon size={16} />
            </span>
            <div>
              <p className={styles.parentLabel}>Under Franchise</p>
              <p className={styles.parentName}>{displayName(franchise)}</p>
            </div>
          </div>
          <span className={styles.tier}>
            {describeCommission(account)}
          </span>
        </div>
      ) : null}

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <MetricTile key={metric.label} label={metric.label} value={metric.value} color={metric.color} />
        ))}
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
          <span className={styles.rowLabel}>Joined</span>
          <span className={styles.rowValue}>{formatJoined(account.createdAt)}</span>
        </div>
      </div>

      <div className={styles.ctas}>
        <Button variant="primary" size="sm" icon={<UsersCogIcon size={13} />} onClick={() => onJump(tabs[1])}>
          View {downline.agents.total} Agents
        </Button>
        <Button variant="outline" size="sm" icon={<UserIcon size={13} />} onClick={() => onJump(tabs[2])}>
          View {downline.players.total} Users
        </Button>
      </div>
    </div>
  );
}
