import { useState } from 'react';
import type { CSSProperties } from 'react';
import { BanIcon, CheckCircleIcon, PencilIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { partnershipApi } from '../../lib/api/partnership';
import type { ApiPartner, ApiPartnerSettlement } from '../../lib/api/partnership';
import { formatMoney } from '../../lib/format';
import {
  PARTNER_STATUS_TONE,
  formatBetVolume,
  formatRevShare,
  formatSince,
  mapRevenueHistory,
  revenueTotal,
  settlementsForPartner,
} from './partnershipData';
import styles from './PartnerDrawer.module.css';

const TABS = ['Overview', 'Revenue', 'Settings'] as const;
type Tab = (typeof TABS)[number];

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

export type PartnerDrawerProps = {
  partner: ApiPartner;
  settlements: ApiPartnerSettlement[];
  onEdit: () => void;
  onChanged: () => void | Promise<void>;
  onClose: () => void;
};

/**
 * Partner detail sheet — nodes 119:52099 (overview), 119:52900 (revenue) and
 * 119:53743 (settings). One panel; only the tab body changes.
 */
export function PartnerDrawer({ partner, settlements, onEdit, onChanged, onClose }: PartnerDrawerProps) {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>('Overview');
  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isActive = partner.status === 'Active';

  const toggleStatus = async () => {
    if (!accessToken) return;
    setStatusPending(true);
    setStatusError(null);
    try {
      await partnershipApi.updateStatus(partner._id, isActive ? 'Inactive' : 'Active', accessToken);
      await onChanged();
    } catch (err) {
      setStatusError(errorMessage(err));
    } finally {
      setStatusPending(false);
    }
  };

  const summary = [
    { label: 'Players', value: String(partner.playerCount ?? 0), color: 'var(--color-success)' },
    { label: 'Rev Share', value: formatRevShare(partner.revShare), color: 'var(--color-warning)' },
    { label: 'Monthly Fee', value: formatMoney(partner.monthlyFee), color: 'var(--color-danger)' },
    { label: 'Bet Volume', value: formatBetVolume(partner.betVolume), color: 'var(--color-primary)' },
  ];

  return (
    <Drawer
      label={`${partner.name} detail`}
      width={580}
      surface="raised"
      headerClassName={styles.header}
      headerLayout="stack"
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" size="xs" icon={<PencilIcon size={12} />} onClick={onEdit}>
            Edit
          </Button>
          <Button
            className={isActive ? styles.deactivate : undefined}
            size="xs"
            disabled={statusPending}
            icon={isActive ? <BanIcon size={12} /> : <CheckCircleIcon size={12} />}
            onClick={toggleStatus}
          >
            {statusPending ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </>
      }
      header={
        <div className={styles.identity}>
          <p className={styles.name}>{partner.name}</p>
          <div className={styles.meta}>
            <Badge tone="brand">{partner.type || '—'}</Badge>
            <Badge tone={PARTNER_STATUS_TONE[partner.status]}>{partner.status}</Badge>
            <span className={styles.since}>Since {formatSince(partner.since || partner.createdAt)}</span>
          </div>
          {statusError ? <p className={styles.since}>{statusError}</p> : null}

          <div className={styles.summary}>
            {summary.map((tile) => (
              <div
                key={tile.label}
                className={styles.summaryTile}
                style={{ '--tile-color': tile.color } as CSSProperties}
              >
                <p className={styles.tileLabel}>{tile.label}</p>
                <p className={styles.tileValue}>{tile.value}</p>
              </div>
            ))}
          </div>
        </div>
      }
      tabs={
        <Tabs items={TABS} value={tab} variant="underline" aria-label="Partner sections" onChange={setTab} />
      }
    >
      {tab === 'Overview' ? <OverviewTab partner={partner} /> : null}
      {tab === 'Revenue' ? <RevenueTab partner={partner} settlements={settlements} onChanged={onChanged} /> : null}
      {tab === 'Settings' ? <SettingsTab key={partner.updatedAt} partner={partner} onChanged={onChanged} /> : null}
    </Drawer>
  );
}

function OverviewTab({ partner }: { partner: ApiPartner }) {
  const details = [
    { label: 'Sign-up Code', value: partner.referralCode || '—' },
    { label: 'Partner ID', value: partner._id.slice(-6).toUpperCase() },
    { label: 'Type', value: partner.type || '—' },
    { label: 'Contact', value: partner.contact || '—' },
    { label: 'Email', value: partner.email || '—' },
    { label: 'Website', value: partner.website || '—' },
    { label: 'Partner Since', value: formatSince(partner.since || partner.createdAt) },
  ];

  return (
    <div className={styles.body}>
      <div className={styles.details}>
        {details.map((detail) => (
          <div key={detail.label} className={styles.detail}>
            <p className={styles.tileLabel}>{detail.label}</p>
            <p className={styles.detailValue}>{detail.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.notesCard}>
        <p className={styles.cardLabel}>How players join</p>
        <p className={styles.notes}>
          Players who enter {partner.referralCode || 'this partner’s code'} as the referral code at sign-up are linked to
          this partner. Their bets build its volume, and {formatRevShare(partner.revShare)} of the house&apos;s net win
          from them is its monthly revenue share.
        </p>
      </div>

      <div className={styles.apiCard}>
        <p className={styles.cardLabel}>API Key</p>
        <p className={styles.apiKey}>{partner.apiKey || '—'}</p>
      </div>

      <div className={styles.notesCard}>
        <p className={styles.cardLabel}>Notes</p>
        <p className={styles.notes}>{partner.notes || '—'}</p>
      </div>
    </div>
  );
}

function RevenueTab({
  partner,
  settlements,
  onChanged,
}: {
  partner: ApiPartner;
  settlements: ApiPartnerSettlement[];
  onChanged: () => void | Promise<void>;
}) {
  const { accessToken } = useAuth();
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const pay = async (id: string, period: string, amount: string) => {
    if (!accessToken || !window.confirm(`Mark ${amount} for ${period} as paid to ${partner.name}?`)) return;
    setPaying(id);
    setPayError(null);
    try {
      await partnershipApi.paySettlement(id, accessToken);
      await onChanged();
    } catch (err) {
      setPayError(errorMessage(err));
    } finally {
      setPaying(null);
    }
  };

  const months = mapRevenueHistory(partner.revenueHistory);
  const peak = Math.max(1, ...months.map((month) => month.value));
  const partnerSettlements = settlementsForPartner(settlements, partner._id);

  return (
    <div className={styles.body}>
      <div className={styles.totalCard}>
        <p className={styles.cardLabel}>Total Revenue Shared</p>
        <p className={styles.totalValue}>{revenueTotal(partner.revenueHistory)}</p>
      </div>

      <section>
        <p className={styles.sectionTitle}>Monthly Revenue Share</p>
        {months.length === 0 ? (
          <p className={styles.notes}>No revenue recorded yet.</p>
        ) : (
          <div className={styles.bars}>
            {months.map((month) => (
              <div key={month.month} className={styles.bar}>
                <span className={styles.barValue}>{month.label}</span>
                <div className={styles.barFill} style={{ height: `${(month.value / peak) * 70}px` }} />
                <span className={styles.barMonth}>{month.month}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionTitle}>Settlement History</p>
        {payError ? <p className={styles.notes}>{payError}</p> : null}
        {partnerSettlements.length === 0 ? (
          <p className={styles.notes}>No settlements yet — one is created for each finished month with a share to pay.</p>
        ) : (
          partnerSettlements.map((settlement) => (
            <div key={settlement.id} className={styles.settlement}>
              <span className={styles.settlementPeriod}>{settlement.period}</span>
              <span className={styles.settlementAmount}>{settlement.amount}</span>
              {settlement.status === 'Pending' ? (
                <Button
                  variant="primary"
                  size="xs"
                  disabled={paying !== null}
                  onClick={() => void pay(settlement.id, settlement.period, settlement.amount)}
                >
                  {paying === settlement.id ? 'Saving…' : 'Mark Paid'}
                </Button>
              ) : (
                <Badge tone="success">Paid</Badge>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function SettingsTab({ partner, onChanged }: { partner: ApiPartner; onChanged: () => void | Promise<void> }) {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({
    name: partner.name,
    revShare: String(partner.revShare),
    monthlyFee: String(partner.monthlyFee),
    email: partner.email,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await partnershipApi.updatePartner(
        partner._id,
        {
          name: form.name.trim(),
          revShare: Number(form.revShare) || 0,
          monthlyFee: Number(form.monthlyFee) || 0,
          email: form.email.trim(),
        },
        accessToken,
      );
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.body}>
      <TextField
        label="Partner Name"
        labelCase="caps"
        value={form.name}
        onChange={(event) => set('name')(event.target.value)}
      />
      <TextField
        label="Revenue Share"
        labelCase="caps"
        type="number"
        value={form.revShare}
        onChange={(event) => set('revShare')(event.target.value)}
      />
      <TextField
        label="Monthly Fee"
        labelCase="caps"
        type="number"
        value={form.monthlyFee}
        onChange={(event) => set('monthlyFee')(event.target.value)}
      />
      <TextField
        label="Contact Email"
        labelCase="caps"
        type="email"
        value={form.email}
        onChange={(event) => set('email')(event.target.value)}
      />

      {error ? <p className={styles.notes}>{error}</p> : null}

      <Button
        variant="primary"
        size="sm"
        block
        disabled={pending}
        icon={<CheckCircleIcon size={13.993} />}
        onClick={save}
      >
        {pending ? 'Saving…' : 'Save Settings'}
      </Button>
    </div>
  );
}
