import { Loader } from '../../components/ui/Loader/Loader';
import { useState } from 'react';
import { BanIcon, CheckCircleIcon, EyeIcon, PencilIcon, PlusIcon, UsersCogIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { MetricTile } from '../../components/ui/MetricTile/MetricTile';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import type { RoleDefinition } from '../../config/roles';
import { displayName } from '../../lib/api/network';
import type { NetworkAccount, NetworkRow } from '../../lib/api/network';
import { formatMoney, formatRupees } from '../../lib/format';
import { FRANCHISE_STATUS_TONE, formatLocation } from '../franchises/franchisesData';
import { SuperAgentDrawer } from '../franchises/SuperAgentDrawer';
import { useIsDirectUpline } from '../users/commissionRates';
import { statusLabel } from '../users/usersData';
import { useNetworkList, useStatusToggle } from '../users/useNetworkList';
import { StaffFormModal } from './StaffFormModal';
import { SUPER_AGENT_CAPABILITIES, ownsWholeDirectory, superAgentStats } from './superAgentsData';
import styles from './SuperAgentPage.module.css';

const PAGE_SIZE = 10;

/** Super agent directory from node 112:698, scoped to the signed-in account's downline. */
export function SuperAgentPage({ role }: { role: RoleDefinition }) {
  /** A franchise is looking at its own book, so the owning column is noise. */
  const showsFranchise = ownsWholeDirectory(role);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  /** null = closed, 'new' = Create, an account = Edit. */
  const [form, setForm] = useState<NetworkAccount | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, reload } = useNetworkList({ role: 'super-agent', q: query, page, limit: PAGE_SIZE });
  const { busyId, toggle } = useStatusToggle(reload, setActionError);

  const rows = data?.items ?? [];
  const abilities = data?.abilities ?? { create: false, edit: false, suspend: false };
  const isDirectUpline = useIsDirectUpline();
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const columns: Column<NetworkRow>[] = [
    { key: 'id', header: 'ID', render: (row) => <span className={styles.id}>{row.username}</span> },
    { key: 'name', header: 'Name', render: (row) => <span className={styles.name}>{row.name || row.username}</span> },
    ...(showsFranchise
      ? [
          {
            key: 'franchise',
            header: 'Franchise',
            render: (row: NetworkRow) => <span className={styles.muted}>{displayName(row.parent)}</span>,
          },
        ]
      : []),
    { key: 'agents', header: 'Agents', render: (row) => <span className={styles.strong}>{row.summary.agents}</span> },
    { key: 'users', header: 'Users', render: (row) => <span className={styles.strong}>{row.summary.players}</span> },
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
      key: 'credit',
      header: 'Credit',
      render: (row) => <span className={styles.credit}>{formatRupees(row.creditLimit)}</span>,
    },
    {
      key: 'exposure',
      header: 'Exposure',
      render: (row) => <span className={styles.exposure}>{formatMoney(row.summary.exposure)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={FRANCHISE_STATUS_TONE[statusLabel(row)]}>{statusLabel(row)}</Badge>,
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
              row.status === 'suspended' ? (
                <IconButton
                  icon={CheckCircleIcon}
                  tone="success"
                  label={`Reactivate ${name}`}
                  disabled={busyId === row._id}
                  onClick={() => toggle(row._id, 'active')}
                />
              ) : (
                <IconButton
                  icon={BanIcon}
                  tone="danger"
                  label={`Block ${name}`}
                  disabled={busyId === row._id}
                  onClick={() => toggle(row._id, 'suspended')}
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
        {superAgentStats(data?.stats ?? null, showsFranchise).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <CapabilityPanel />

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <SearchInput
            className={styles.search}
            size="lg"
            placeholder="Search super agents..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          <div className={styles.actions}>
            {abilities.create ? (
              <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={() => setForm('new')}>
                Create Super Agent
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
            emptyMessage={loading ? <Loader block /> : 'No super agents match this search.'}
          />
        </div>

        <Pagination
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          summary={`Showing ${rows.length} of ${data?.total ?? 0} super agents`}
          onChange={setPage}
        />
      </section>

      <div className={styles.highlights}>
        {rows.slice(0, 3).map((row) => (
          <article key={row._id} className={styles.highlight}>
            <div className={styles.highlightHead}>
              <div className={styles.highlightIdentity}>
                <span className={styles.avatar}>{(row.name || row.username).slice(0, 1).toUpperCase()}</span>
                <div>
                  <p className={styles.highlightName}>{row.name || row.username}</p>
                  <p className={styles.highlightMeta}>
                    {row.username} · {formatLocation(row)}
                  </p>
                </div>
              </div>
              <Badge tone={FRANCHISE_STATUS_TONE[statusLabel(row)]}>{statusLabel(row)}</Badge>
            </div>
            <div className={styles.highlightMetrics}>
              <MetricTile size="sm" label="Agents" value={String(row.summary.agents)} />
              <MetricTile size="sm" label="Users" value={String(row.summary.players)} />
              <MetricTile size="sm" label="Turnover" value={formatMoney(row.summary.turnover)} />
            </div>
          </article>
        ))}
      </div>

      {form ? (
        <StaffFormModal
          commissionOnly={form !== 'new' && !abilities.edit}
          role="super-agent"
          account={form === 'new' ? null : form}
          parents={data?.parentOptions ?? []}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}

      {openId ? <SuperAgentDrawer accountId={openId} onChanged={reload} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

/** "SUPER AGENT kya dekh aur kar sakta hai" — node 112:1069. */
function CapabilityPanel() {
  return (
    <section className={styles.capability}>
      <div className={styles.capabilityHead}>
        <span className={styles.capabilityTile}>
          <UsersCogIcon size={19.993} />
        </span>
        <div>
          <p className={styles.capabilityTitle}>SUPER AGENT kya dekh aur kar sakta hai</p>
          <p className={styles.capabilitySubtitle}>Only Within His Team</p>
        </div>
      </div>
      <div className={styles.capabilityGrid}>
        {SUPER_AGENT_CAPABILITIES.map((item) => (
          <div key={item} className={styles.capabilityItem}>
            <span className={styles.capabilityCheck}>
              <CheckCircleIcon size={12} />
            </span>
            <span className={styles.capabilityText}>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
