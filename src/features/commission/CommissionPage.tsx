import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useMemo, useState } from 'react';
import { DonutChart } from '../../components/charts/DonutChart';
import { Badge } from '../../components/ui/Badge/Badge';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { SectionCard } from '../../components/ui/SectionCard/SectionCard';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { ApiRequestError } from '../../lib/api';
import { commissionApi } from '../../lib/api/commission';
import type { ApiCommission, ApiCommissionKind, ApiCommissionLevel } from '../../lib/api/commission';
import { useAuth } from '../auth/authContext';
import {
  COMMISSION_KINDS,
  COMMISSION_LEVELS,
  SETTLEMENT_TONE,
  commissionSplit,
  commissionStats,
  mapCommissionRows,
} from './commissionData';
import type { CommissionRow } from './commissionData';
import styles from './CommissionPage.module.css';

const ALL = 'all';

/**
 * Commission console — node 112:6945. Session and match commission is paid
 * automatically at the end of every match; each row is one account's share of
 * one player's bets in one match. Every role sees rows scoped to its network.
 */
export function CommissionPage() {
  const { user, accessToken } = useAuth();
  const adminTools = user?.roleId === 'super-admin';
  return <LiveCommissionPage accessToken={accessToken} viewer={adminTools ? undefined : user?.username} />;
}

function LiveCommissionPage({
  accessToken,
  viewer,
}: {
  accessToken: string | null;
  /** Username of a network role reading its own commission; undefined for the admin's platform view. */
  viewer?: string;
}) {
  const [level, setLevel] = useState<string>(ALL);
  const [kind, setKind] = useState<string>(ALL);
  const [items, setItems] = useState<ApiCommission[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    commissionApi
      .list(
        {
          level: level === ALL ? undefined : (level as ApiCommissionLevel),
          kind: kind === ALL ? undefined : (kind as ApiCommissionKind),
        },
        accessToken,
      )
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to load commission data.');
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, level, kind]);

  const stats = useMemo(() => commissionStats(items, viewer), [items, viewer]);
  const rows = useMemo(() => mapCommissionRows(items), [items]);
  const split = useMemo(() => commissionSplit(items), [items]);

  const columns: Column<CommissionRow>[] = [
    {
      key: 'match',
      header: 'Match · Player',
      render: (row) => (
        <span className={styles.entity}>
          {row.match}
          <br />
          <small>{row.date}</small>
        </span>
      ),
    },
    { key: 'entity', header: 'Paid To', render: (row) => <span className={styles.entity}>{row.entity}</span> },
    { key: 'level', header: 'Level', render: (row) => <Badge tone="brand">{row.level}</Badge> },
    { key: 'kind', header: 'Type', render: (row) => <Badge tone={row.kind === 'Match' ? 'warning' : 'info'}>{row.kind}</Badge> },
    { key: 'base', header: 'On', render: (row) => <span className={styles.turnover}>{row.base}</span> },
    {
      key: 'rate',
      header: 'Share % (kept)',
      render: (row) => (
        <span className={styles.rate}>
          {row.rate}
          {row.split ? (
            <>
              <br />
              <small>{row.split}</small>
            </>
          ) : null}
        </span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      render: (row) => <span className={styles.commission}>{row.commission}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={SETTLEMENT_TONE[row.status]}>{row.status === 'Settled' ? 'Paid' : row.status}</Badge>,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', margin: 0, fontSize: 12 }}>
          {error}
        </p>
      ) : null}

      <div className={styles.split}>
        <SectionCard
          title="Commission by Match"
          subtitle="Paid automatically at the end of every match"
          size="md"
          bodySpacing={20}
          action={
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <SelectField
                label="Level"
                options={COMMISSION_LEVELS}
                placeholder="All Levels"
                value={level === ALL ? '' : level}
                onChange={(evt) => setLevel(evt.target.value || ALL)}
              />
              <SelectField
                label="Type"
                options={COMMISSION_KINDS}
                placeholder="Session + Match"
                value={kind === ALL ? '' : kind}
                onChange={(evt) => setKind(evt.target.value || ALL)}
              />
            </div>
          }
        >
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            size="lg"
            emptyMessage={pending ? <Loader block label="Loading commission…" /> : 'No commission paid yet.'}
          />
        </SectionCard>

        <SectionCard title="Commission Distribution">
          <DonutChart data={split} layout="stack" />
        </SectionCard>
      </div>
    </div>
  );
}
