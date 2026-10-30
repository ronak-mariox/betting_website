import { Loader } from '../../components/ui/Loader/Loader';
import { usePermissions } from '../auth/usePermissions';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  BanIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  TransactionsIcon,
  UserIcon,
  UsersCogIcon,
  WalletIcon,
} from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { MetricTile } from '../../components/ui/MetricTile/MetricTile';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { networkApi } from '../../lib/api/network';
import type { NetworkDetail } from '../../lib/api/network';
import { commissionCap, commissionLabel, parseCommission } from '../users/commissionRates';
import { formatCount, formatMoney, formatRupees, formatRelativeTime, withCurrency } from '../../lib/format';
import { StaffFormModal } from '../superAgents/StaffFormModal';
import { statusLabel } from '../users/usersData';
import { useNetworkDetail } from '../users/useNetworkList';
import { FRANCHISE_STATUS_TONE, formatJoined, formatLocation, toNetworkPerson } from './franchisesData';
import { NetworkRow, NetworkSection, SummaryRow } from './NetworkRows';
import { SuperAgentDrawer } from './SuperAgentDrawer';
import styles from './FranchiseDrawer.module.css';

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/**
 * Franchise record sheet — node 114:13787 (overview) plus the Super Agents,
 * Wallet and Settings tabs (nodes 116:15541, 116:16345, 116:17152).
 */
export function FranchiseDrawer({
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
  const { detail, error, setError, reload } = useNetworkDetail(accountId);
  const [tab, setTab] = useState('Overview');
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  if (!detail) {
    return (
      <Drawer label="Franchise details" width={600} onClose={onClose} header={<p className={styles.name}>Franchise</p>}>
        <p className={styles.placeholder}>{error ?? <Loader block />}</p>
      </Drawer>
    );
  }

  const { account, abilities, downline } = detail;
  const title = account.businessName || account.name || account.username;
  const status = statusLabel(account);
  const tabs = ['Overview', `Super Agents (${downline.superAgents.total})`, 'Wallet', 'Settings'] as const;
  // The Wallet tab is the network's ledger: "Wallet Balance" (view).
  const shownTabs = tabs.filter((name) => name !== 'Wallet' || can('finance', 'walletBalance', 'V'));

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
    <>
      <Drawer
        label={`${title} details`}
        width={600}
        onClose={onClose}
        header={
          <div className={styles.identity}>
            <span className={styles.tile}>
              <BuildingIcon size={21.996} />
            </span>
            <div>
              <p className={styles.name}>{title}</p>
              <div className={styles.meta}>
                <span className={styles.code}>{account.username}</span>
                <Badge tone={FRANCHISE_STATUS_TONE[status]}>{status}</Badge>
              </div>
            </div>
          </div>
        }
        actions={
          abilities.edit || abilities.suspend ? (
            <>
              {abilities.edit ? (
                <Button variant="primary" size="xs" icon={<PencilIcon size={12} />} onClick={() => setEditing(true)}>
                  Edit
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
        tabs={<Tabs items={shownTabs} value={tab} variant="underline" aria-label="Franchise sections" onChange={setTab} />}
      >
        {error ? <p className={styles.placeholder}>{error}</p> : null}

        {tab === 'Overview' ? <OverviewTab detail={detail} onViewSuperAgents={() => setTab(tabs[1])} /> : null}

        {tab === tabs[1] ? (
          <NetworkSection title={`Super Agents under ${title}`} count={`${downline.superAgents.total} super agents`}>
            {downline.superAgents.items.length === 0 ? <p className={styles.placeholder}>No super agents yet.</p> : null}
            {downline.superAgents.items.map((row, index) => (
              <NetworkRow key={row._id} person={toNetworkPerson(row, index)} onOpen={() => setOpenAgent(row._id)} />
            ))}
          </NetworkSection>
        ) : null}

        {tab === 'Wallet' ? <WalletTab detail={detail} onAdjust={abilities.edit ? () => setTab('Settings') : undefined} /> : null}
        {tab === 'Settings' ? <SettingsTab key={account.updatedAt} detail={detail} onSaved={changed} /> : null}

        {editing ? (
          <StaffFormModal
            role="franchise"
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

      {openAgent ? (
        <SuperAgentDrawer accountId={openAgent} parentLabel={title} onChanged={changed} onClose={() => setOpenAgent(null)} />
      ) : null}
    </>
  );
}

function OverviewTab({ detail, onViewSuperAgents }: { detail: NetworkDetail; onViewSuperAgents: () => void }) {
  const { account, summary, downline } = detail;

  return (
    <div className={styles.body}>
      <div className={styles.metrics}>
        <MetricTile label="Super Agents" value={formatCount(downline.superAgents.total)} color="var(--color-primary)" />
        <MetricTile label="Total Agents" value={formatCount(downline.agents.total)} color="var(--color-primary-light)" />
        <MetricTile label="Total Users" value={formatCount(downline.players.total)} color="var(--color-success)" />
        <MetricTile label="Turnover" value={formatMoney(summary.turnover)} color="var(--color-warning)" />
        <MetricTile label="Credit Limit" value={formatRupees(account.creditLimit)} color="var(--color-primary-light)" />
        <MetricTile label="Exposure" value={formatMoney(summary.exposure)} color="var(--color-live)" />
      </div>

      <div className={styles.panel}>
        <p className={styles.panelTitle}>Contact Information</p>
        <Row icon={<UserIcon size={12.992} />} label="Owner" value={account.name || '—'} />
        <Row icon={<PhoneIcon size={12.992} />} label="Phone" value={account.phone || '—'} />
        <Row icon={<MailIcon size={12.992} />} label="Email" value={account.email || '—'} />
        <Row icon={<MapPinIcon size={12.992} />} label="Location" value={formatLocation(account)} />
        <Row icon={<CalendarIcon size={12.992} />} label="Joined" value={formatJoined(account.createdAt)} />
      </div>

      <Button
        className={styles.cta}
        variant="primary"
        size="sm"
        block
        icon={<UsersCogIcon size={12.992} />}
        onClick={onViewSuperAgents}
      >
        View {downline.superAgents.total} Super Agents
      </Button>
    </div>
  );
}

function WalletTab({ detail, onAdjust }: { detail: NetworkDetail; onAdjust?: () => void }) {
  const [showTxns, setShowTxns] = useState(false);
  const { account, summary, wallet, transactions } = detail;

  return (
    <div className={styles.body}>
      <div className={styles.walletTiles}>
        <WalletTile label="Credit Limit" value={formatRupees(account.creditLimit)} rgb="34, 197, 94" />
        <WalletTile label="Current Exposure" value={formatMoney(summary.exposure)} rgb="255, 46, 99" />
      </div>

      <div className={styles.walletActions}>
        {onAdjust ? (
          <Button variant="primary" size="sm" icon={<WalletIcon size={13} />} onClick={onAdjust}>
            Edit Limits
          </Button>
        ) : null}
        <Button variant="outline" size="sm" icon={<TransactionsIcon size={13} />} onClick={() => setShowTxns((value) => !value)}>
          {showTxns ? 'Hide Txns' : 'View Txns'}
        </Button>
      </div>

      <SummaryRow stat={{ label: 'Turnover This Month', value: formatMoney(summary.monthTurnover), color: 'var(--color-success)' }} />
      <SummaryRow stat={{ label: 'Commission Earned', value: formatMoney(wallet.commissionEarned), color: 'var(--color-warning)' }} />
      <SummaryRow stat={{ label: 'Net User Deposits', value: formatMoney(wallet.deposited - wallet.withdrawn), color: 'var(--color-primary)' }} />

      {showTxns ? (
        transactions.length === 0 ? (
          <p className={styles.placeholder}>No transactions in this network yet.</p>
        ) : (
          transactions.map((txn) => (
            <SummaryRow
              key={txn._id}
              stat={{
                label: `${txn.type} · ${!txn.user ? 'Platform' : typeof txn.user === 'string' ? txn.user.slice(-6) : txn.user.name || txn.user.username}`,
                value: `${txn.amount >= 0 ? '+' : '-'}${formatRupees(Math.abs(txn.amount))}`,
                color: txn.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              }}
              delta={formatRelativeTime(txn.createdAt)}
            />
          ))
        )
      ) : null}
    </div>
  );
}

function WalletTile({ label, value, rgb }: { label: string; value: string; rgb: string }) {
  return (
    <div
      className={styles.walletTile}
      style={
        {
          '--tile-bg': `rgba(${rgb}, 0.08)`,
          '--tile-border': `rgba(${rgb}, 0.2)`,
          '--tile-color': `rgb(${rgb})`,
        } as CSSProperties
      }
    >
      <p className={styles.walletLabel}>{label}</p>
      <p className={styles.walletValue}>{value}</p>
    </div>
  );
}

const numberOrEmpty = (value: number | null) => (value === null || value === 0 ? '' : String(value));

function SettingsTab({ detail, onSaved }: { detail: NetworkDetail; onSaved: () => Promise<void> }) {
  const { accessToken } = useAuth();
  const { account, abilities } = detail;
  const [form, setForm] = useState({
    matchCommission: numberOrEmpty(account.matchCommission ?? 0),
    sessionCommission: numberOrEmpty(account.sessionCommission ?? 0),
    bettingLimit: numberOrEmpty(account.bettingLimit),
    maxExposure: numberOrEmpty(account.maxExposure),
  });
  const cap = commissionCap(account.parent);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!accessToken) return;
    const amount = (label: string, raw: string) => {
      if (raw.trim() === '') return 0;
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0) throw new Error(`${label} must be a positive number.`);
      return value;
    };
    setPending(true);
    setMessage(null);
    try {
      await networkApi.update(
        account._id,
        {
          matchCommission: parseCommission('Match', form.matchCommission, cap),
          sessionCommission: parseCommission('Session', form.sessionCommission, cap),
          bettingLimit: amount('Betting limit', form.bettingLimit),
          maxExposure: amount('Max exposure', form.maxExposure),
        },
        accessToken,
      );
      await onSaved();
      setMessage('Saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const readOnly = !abilities.edit;

  return (
    <div className={styles.settings}>
      <TextField
        label={commissionLabel('Match', cap)}
        labelCase="caps"
        inputMode="decimal"
        placeholder="0"
        readOnly={readOnly}
        value={form.matchCommission}
        onChange={(event) => set('matchCommission')(event.target.value)}
      />
      <TextField
        label={commissionLabel('Session', cap)}
        labelCase="caps"
        inputMode="decimal"
        placeholder="0"
        readOnly={readOnly}
        value={form.sessionCommission}
        onChange={(event) => set('sessionCommission')(event.target.value)}
      />
      <TextField
        label={withCurrency('Betting Limit per User (₹)')}
        labelCase="caps"
        inputMode="numeric"
        placeholder="Platform default"
        readOnly={readOnly}
        value={form.bettingLimit}
        onChange={(event) => set('bettingLimit')(event.target.value)}
      />
      <TextField
        label={withCurrency('Max Exposure Limit (₹)')}
        labelCase="caps"
        inputMode="numeric"
        placeholder="Platform default"
        readOnly={readOnly}
        value={form.maxExposure}
        onChange={(event) => set('maxExposure')(event.target.value)}
      />
      {message ? <p className={styles.placeholder}>{message}</p> : null}
      {readOnly ? null : (
        <Button
          className={styles.save}
          variant="primary"
          size="sm"
          disabled={pending}
          icon={<CheckCircleIcon size={13} />}
          onClick={save}
        >
          {pending ? 'Saving…' : 'Save Settings'}
        </Button>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.row}>
      {icon}
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
