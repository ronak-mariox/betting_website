import { Loader } from '../../components/ui/Loader/Loader';
import { useState } from 'react';
import { BanIcon, CheckCircleIcon, EyeIcon, PencilIcon, PlusIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import type { NetworkAccount, NetworkRow } from '../../lib/api/network';
import { formatMoney, formatRupees } from '../../lib/format';
import { StaffFormModal } from '../superAgents/StaffFormModal';
import { useIsDirectUpline } from '../users/commissionRates';
import { formatDate, statusLabel } from '../users/usersData';
import { useNetworkList, useStatusToggle } from '../users/useNetworkList';
import { AgentDrawer } from './AgentDrawer';
import { AGENT_STATUS_TONE, agentStats } from './agentsData';
import styles from './AgentPage.module.css';

const FILTERS = ['All', 'Active', 'Suspended'] as const;
type Filter = (typeof FILTERS)[number];

const PAGE_SIZE = 10;

/** Agent directory from node 112:1579, scoped to the signed-in account's downline. */
export function AgentPage() {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  /** null = closed, 'new' = Create, an account = Edit. */
  const [form, setForm] = useState<NetworkAccount | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, reload } = useNetworkList({
    role: 'agent',
    status: filter === 'All' ? undefined : filter === 'Active' ? 'active' : 'suspended',
    q: query,
    page,
    limit: PAGE_SIZE,
  });
  const { busyId, toggle } = useStatusToggle(reload, setActionError);

  const rows = data?.items ?? [];
  const abilities = data?.abilities ?? { create: false, edit: false, suspend: false };
  const isDirectUpline = useIsDirectUpline();
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const columns: Column<NetworkRow>[] = [
    { key: 'code', header: 'Agent ID', render: (row) => <span className={styles.id}>{row.username}</span> },
    { key: 'name', header: 'Name', render: (row) => <span className={styles.name}>{row.name || row.username}</span> },
    { key: 'users', header: 'Users', render: (row) => <span className={styles.name}>{row.summary.players}</span> },
    {
      key: 'turnover',
      header: 'Turnover',
      render: (row) => <span className={styles.turnover}>{formatMoney(row.summary.turnover)}</span>,
    },
    {
      key: 'commission',
      header: 'Commission',
      render: (row) => <span className={styles.commission}>{formatMoney(row.summary.commission)}</span>,
    },
    {
      key: 'wallet',
      header: 'Wallet',
      render: (row) => <span className={styles.wallet}>{formatRupees(row.walletBalance)}</span>,
    },
    { key: 'joined', header: 'Joined', render: (row) => <span className={styles.muted}>{formatDate(row.createdAt)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={AGENT_STATUS_TONE[statusLabel(row)]}>{statusLabel(row)}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const name = row.name || row.username;
        return (
          <div className={styles.rowActions}>
            <IconButton icon={EyeIcon} label={`View ${name}`} onClick={() => setOpenId(row._id)} />
            {abilities.edit || isDirectUpline(row) ? (
              <IconButton
                icon={PencilIcon}
                tone="warning"
                label={abilities.edit ? `Edit ${name}` : `Set commission for ${name}`}
                onClick={() => setForm(row)}
              />
            ) : null}
            {abilities.suspend ? (
              row.status === 'active' ? (
                <IconButton
                  icon={BanIcon}
                  tone="danger"
                  label={`Block ${name}`}
                  disabled={busyId === row._id}
                  onClick={() => toggle(row._id, 'suspended')}
                />
              ) : (
                <IconButton
                  icon={CheckCircleIcon}
                  tone="success"
                  label={`Reactivate ${name}`}
                  disabled={busyId === row._id}
                  onClick={() => toggle(row._id, 'active')}
                />
              )
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {agentStats(data?.stats ?? null).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <SearchInput
              className={styles.search}
              size="lg"
              placeholder="Search agents..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <Tabs
              items={FILTERS}
              value={filter}
              variant="solid"
              aria-label="Filter agents"
              onChange={(value) => {
                setFilter(value);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.actions}>
            {abilities.create ? (
              <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={() => setForm('new')}>
                Create Agent
              </Button>
            ) : null}
          </div>
        </div>

        {error || actionError ? <p className={styles.muted}>{error ?? actionError}</p> : null}

        <div className={styles.table}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            size="lg"
            emptyMessage={loading ? <Loader block /> : 'No agents match this filter.'}
          />
        </div>

        <Pagination
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          summary={`Showing ${rows.length} of ${data?.total ?? 0} agents`}
          onChange={setPage}
        />
      </section>

      {form ? (
        <StaffFormModal
          role="agent"
          commissionOnly={form !== 'new' && !abilities.edit}
          account={form === 'new' ? null : form}
          parents={data?.parentOptions ?? []}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}

      {openId ? <AgentDrawer accountId={openId} onChanged={reload} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
