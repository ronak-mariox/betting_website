import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import type { RoleDefinition } from '../../config/roles';
import { displayName } from '../../lib/api/network';
import type { NetworkAccount, NetworkRow } from '../../lib/api/network';
import { formatRupees, formatRelativeTime } from '../../lib/format';
import { AddUserModal } from './AddUserModal';
import { useIsDirectUpline } from './commissionRates';
import { UserDrawer } from './UserDrawer';
import {
  RISK_TONE,
  STATUS_TONE,
  peopleStats,
  showsAgentColumn,
  showsLastLogin,
  statusLabel,
} from './usersData';
import { useNetworkList, useStatusToggle } from './useNetworkList';
import styles from './PeopleListPage.module.css';

const FILTERS = ['All', 'Active', 'Suspended'] as const;
type Filter = (typeof FILTERS)[number];

const PAGE_SIZE = 10;

/**
 * The list screen from node 79:3065 — "Users" for every role, scoped by the
 * backend to the signed-in account's own downline.
 */
export function PeopleListPage({ role, title }: { role: RoleDefinition; title: string }) {
  const withAgent = showsAgentColumn(role);
  const withLastLogin = showsLastLogin(role);
  const noun = title.toLowerCase();
  const singular = title.replace(/s$/, '');

  // The topbar's search opens this page with `?q=`.
  const [params] = useSearchParams();
  const linkedQuery = params.get('q') ?? '';
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState(linkedQuery);
  const [page, setPage] = useState(1);

  // A new link while the page is already open (searching again from the topbar).
  useEffect(() => {
    setQuery(linkedQuery);
    setFilter('All');
    setPage(1);
  }, [linkedQuery]);
  const [openId, setOpenId] = useState<string | null>(null);
  /** null = closed, 'new' = Add, an account = Edit. */
  const [form, setForm] = useState<NetworkAccount | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, reload } = useNetworkList({
    role: 'player',
    status: filter === 'Active' ? 'active' : filter === 'Suspended' ? 'suspended' : undefined,
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
    { key: 'id', header: 'User ID', render: (row) => <span className={styles.id}>{row.username}</span> },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className={styles.identityCell}>
          <p className={styles.name}>{row.name || row.username}</p>
          <p className={styles.email}>{row.email || '—'}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => <span className={styles.phone}>{row.phone || '—'}</span> },
    ...(withAgent
      ? [
          {
            key: 'agent',
            header: 'Agent',
            render: (row: NetworkRow) => <span className={styles.agent}>{displayName(row.parent)}</span>,
          },
        ]
      : []),
    {
      key: 'balance',
      header: 'Balance',
      render: (row) => <span className={styles.balance}>{formatRupees(row.walletBalance)}</span>,
    },
    { key: 'bets', header: 'Total Bets', render: (row) => row.summary.bets },
    ...(withLastLogin
      ? [
          {
            key: 'lastLogin',
            header: 'Last Login',
            render: (row: NetworkRow) => (
              <span className={styles.lastLogin}>{row.lastLoginAt ? formatRelativeTime(row.lastLoginAt) : 'Never'}</span>
            ),
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[statusLabel(row)]}>{statusLabel(row)}</Badge>,
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (row) => (
        <Badge tone={RISK_TONE[row.summary.risk]} bare>
          {row.summary.risk}
        </Badge>
      ),
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
                  label={`Suspend ${name}`}
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
        {peopleStats(data?.stats ?? null, title).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <SearchInput
              className={styles.search}
              size="lg"
              placeholder={`Search ${noun}...`}
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
              aria-label={`Filter ${noun}`}
              onChange={(value) => {
                setFilter(value);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.actions}>
            {abilities.create ? (
              <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={() => setForm('new')}>
                Add {singular}
              </Button>
            ) : null}
          </div>
        </div>

        {error || actionError ? <p className={styles.email}>{error ?? actionError}</p> : null}

        <div className={styles.table}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            emptyMessage={loading ? <Loader block /> : `No ${noun} match this filter.`}
          />
        </div>

        <Pagination
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          summary={`Showing ${rows.length} of ${data?.total ?? 0} ${noun}`}
          onChange={setPage}
        />
      </section>

      {form ? (
        <AddUserModal
          commissionOnly={form !== 'new' && !abilities.edit}
          title={singular}
          account={form === 'new' ? null : form}
          agents={data?.parentOptions ?? []}
          agentOptional={role.id === 'super-admin'}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}

      {openId ? (
        <UserDrawer accountId={openId} showAgent={withAgent} onChanged={reload} onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  );
}
