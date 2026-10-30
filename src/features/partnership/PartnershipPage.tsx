import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useState } from 'react';
import { EyeIcon, PencilIcon, PlusIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { partnershipApi } from '../../lib/api/partnership';
import type { ApiPartner, ApiPartnerSettlement } from '../../lib/api/partnership';
import { formatMoney } from '../../lib/format';
import { networkApi } from '../../lib/api/network';
import type { NetworkAccount } from '../../lib/api/network';
import { FranchiseDrawer } from '../franchises/FranchiseDrawer';
import { PartnerDrawer } from './PartnerDrawer';
import { PartnerFormModal } from './PartnerFormModal';
import {
  PARTNER_STATUS_TONE,
  PARTNER_TABS,
  formatBetVolume,
  formatRevShare,
  formatSince,
  partnerStats,
} from './partnershipData';
import styles from './PartnershipPage.module.css';

const TABS = PARTNER_TABS.map((label) => ({ label }));

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/** Partnership directory — node 112:7569. */
export function PartnershipPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<string>(PARTNER_TABS[0]);
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [settlements, setSettlements] = useState<ApiPartnerSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** null = closed, 'new' = Add Partnership, a row = Edit Partnership. */
  const [form, setForm] = useState<ApiPartner | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  /**
   * Franchises holding company shares (Company Share % on the franchise form).
   * They are partners of the company, but keep operating with franchise permissions only.
   */
  const [shareholders, setShareholders] = useState<NetworkAccount[]>([]);
  const [openFranchiseId, setOpenFranchiseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [partnersRes, settlementsRes, franchisesRes] = await Promise.all([
        partnershipApi.listPartners(accessToken),
        partnershipApi.settlements(accessToken),
        networkApi.list({ role: 'franchise', limit: 100 }, accessToken),
      ]);
      setPartners(partnersRes.partners);
      setSettlements(settlementsRes.settlements);
      setShareholders(
        franchisesRes.items
          .filter((franchise) => (franchise.shareHolding ?? 0) > 0)
          .sort((a, b) => (b.shareHolding ?? 0) - (a.shareHolding ?? 0)),
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = openId ? partners.find((partner) => partner._id === openId) ?? null : null;

  const columns: Column<ApiPartner>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => <span className={styles.code}>{row._id.slice(-6).toUpperCase()}</span>,
    },
    { key: 'name', header: 'Partner Name', render: (row) => <span className={styles.name}>{row.name}</span> },
    { key: 'type', header: 'Type', render: (row) => <Badge tone="brand">{row.type || '—'}</Badge> },
    {
      key: 'revShare',
      header: 'Rev Share',
      render: (row) => <span className={styles.revShare}>{formatRevShare(row.revShare)}</span>,
    },
    {
      key: 'fee',
      header: 'Monthly Fee',
      render: (row) => <span className={styles.fee}>{formatMoney(row.monthlyFee)}</span>,
    },
    {
      key: 'volume',
      header: 'Bet Volume',
      render: (row) => <span className={styles.volume}>{formatBetVolume(row.betVolume)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={PARTNER_STATUS_TONE[row.status]}>{row.status}</Badge>,
    },
    {
      key: 'since',
      header: 'Since',
      render: (row) => <span className={styles.since}>{formatSince(row.since || row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button
            className={styles.edit}
            size="xs"
            icon={<PencilIcon size={12} />}
            onClick={() => setForm(row)}
          >
            Edit
          </Button>
          <Button
            className={styles.view}
            size="xs"
            icon={<EyeIcon size={12} />}
            onClick={() => setOpenId(row._id)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const shareholderColumns: Column<NetworkAccount>[] = [
    {
      key: 'franchise',
      header: 'Franchise',
      render: (row) => <span className={styles.name}>{row.businessName || row.name || row.username}</span>,
    },
    { key: 'owner', header: 'Owner / Login', render: (row) => <span className={styles.since}>{`${row.name || '—'} · ${row.username}`}</span> },
    { key: 'share', header: 'Company Share', render: (row) => <span className={styles.revShare}>{`${row.shareHolding}%`}</span> },
    { key: 'access', header: 'Panel Access', render: () => <Badge tone="brand">Franchise permissions</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={row.status === 'active' ? 'success' : 'danger'}>{row.status === 'active' ? 'Active' : 'Suspended'}</Badge>,
    },
    { key: 'since', header: 'Since', render: (row) => <span className={styles.since}>{formatSince(row.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button className={styles.view} size="xs" icon={<EyeIcon size={12} />} onClick={() => setOpenFranchiseId(row._id)}>
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {partnerStats(partners, settlements).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.head}>
          <PillTabs items={TABS} value={tab} label="Partnership sections" onChange={setTab} />
          {tab === 'Partners' ? (
            <Button
              variant="primary"
              size="xs"
              icon={<PlusIcon size={12} />}
              onClick={() => setForm('new')}
            >
              Add Partnership
            </Button>
          ) : null}
        </div>

        {error ? <p className={styles.since}>{error}</p> : null}

        <div className={styles.table}>
          {tab === 'Partners' ? (
            <DataTable
              columns={columns}
              rows={partners}
              rowKey={(row) => row._id}
              size="lg"
              emptyMessage={loading ? <Loader block /> : 'No partnerships yet.'}
            />
          ) : (
            <DataTable
              columns={shareholderColumns}
              rows={shareholders}
              rowKey={(row) => row._id}
              size="lg"
              emptyMessage={
                loading ? (
                  <Loader block />
                ) : (
                  'No franchise holds company shares yet — set Company Share % on a franchise to add it here.'
                )
              }
            />
          )}
        </div>
      </section>

      {open ? (
        <PartnerDrawer
          partner={open}
          settlements={settlements}
          onEdit={() => {
            setForm(open);
            setOpenId(null);
          }}
          onChanged={load}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      {openFranchiseId ? (
        <FranchiseDrawer accountId={openFranchiseId} onChanged={load} onClose={() => setOpenFranchiseId(null)} />
      ) : null}

      {form ? (
        <PartnerFormModal
          partner={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
