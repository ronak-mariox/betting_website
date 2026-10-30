import { Loader } from '../../components/ui/Loader/Loader';
import { useState } from 'react';
import { BanIcon, BuildingIcon, CheckCircleIcon, EyeIcon, PencilIcon, PlusIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { MetricTile } from '../../components/ui/MetricTile/MetricTile';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import type { Abilities, NetworkAccount, NetworkRow } from '../../lib/api/network';
import { formatCount, formatMoney, formatRupees } from '../../lib/format';
import { StaffFormModal } from '../superAgents/StaffFormModal';
import { statusLabel } from '../users/usersData';
import { useNetworkList, useStatusToggle } from '../users/useNetworkList';
import { FranchiseDrawer } from './FranchiseDrawer';
import { FRANCHISE_STATUS_TONE, franchiseStats } from './franchisesData';
import styles from './FranchisePage.module.css';

/** Franchise directory from node 111:3 — stats, toolbar and a card grid. */
export function FranchisePage() {
  const [query, setQuery] = useState('');
  /** null = closed, 'new' = Create, an account = Edit. */
  const [form, setForm] = useState<NetworkAccount | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, reload } = useNetworkList({ role: 'franchise', q: query, limit: 100 });
  const { busyId, toggle } = useStatusToggle(reload, setActionError);
  const rows = data?.items ?? [];
  const abilities = data?.abilities ?? { create: false, edit: false, suspend: false };

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {franchiseStats(data?.stats ?? null).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <SearchInput
            className={styles.search}
            size="lg"
            placeholder="Search franchises..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={styles.actions}>
            {abilities.create ? (
              <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={() => setForm('new')}>
                Create Franchise
              </Button>
            ) : null}
          </div>
        </div>

        {error || actionError ? <p className={styles.empty}>{error ?? actionError}</p> : null}

        {rows.length === 0 ? (
          <p className={styles.empty}>{loading ? <Loader /> : 'No franchises match this search.'}</p>
        ) : (
          <div className={styles.grid}>
            {rows.map((row) => (
              <FranchiseRecord
                key={row._id}
                franchise={row}
                abilities={abilities}
                busy={busyId === row._id}
                onView={() => setOpenId(row._id)}
                onEdit={() => setForm(row)}
                onToggle={() => toggle(row._id, row.status === 'suspended' ? 'active' : 'suspended')}
              />
            ))}
          </div>
        )}
      </section>

      {form ? (
        <StaffFormModal
          role="franchise"
          account={form === 'new' ? null : form}
          parents={[]}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}

      {openId ? <FranchiseDrawer accountId={openId} onChanged={reload} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function FranchiseRecord({
  franchise,
  abilities,
  busy,
  onView,
  onEdit,
  onToggle,
}: {
  franchise: NetworkRow;
  abilities: Abilities;
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const status = statusLabel(franchise);
  const suspended = status === 'Suspended';
  const title = franchise.businessName || franchise.name || franchise.username;

  return (
    <article className={styles.record}>
      <div className={styles.recordHead}>
        <div className={styles.identity}>
          <span className={styles.tile}>
            <BuildingIcon size={17.999} />
          </span>
          <div>
            <p className={styles.name}>{title}</p>
            <p className={styles.owner}>
              {franchise.username} · {franchise.name || '—'}
            </p>
          </div>
        </div>
        <Badge tone={FRANCHISE_STATUS_TONE[status]}>{status}</Badge>
      </div>

      <div className={styles.metrics}>
        <MetricTile size="sm" label="Agents" value={formatCount(franchise.summary.agents)} />
        <MetricTile size="sm" label="Users" value={formatCount(franchise.summary.players)} />
        <MetricTile size="sm" label="Turnover" value={formatMoney(franchise.summary.turnover)} />
      </div>

      <div className={styles.ledger}>
        <span>
          Credit: <span className={`${styles.ledgerValue} ${styles.credit}`}>{formatRupees(franchise.creditLimit)}</span>
        </span>
        <span>
          Exposure:{' '}
          <span className={`${styles.ledgerValue} ${styles.exposure}`}>{formatMoney(franchise.summary.exposure)}</span>
        </span>
        <span>
          Comm:{' '}
          <span className={`${styles.ledgerValue} ${styles.commission}`}>{formatMoney(franchise.summary.commission)}</span>
        </span>
      </div>

      <div className={styles.recordActions}>
        <Button className={styles.grow} variant="primary" size="xs" icon={<EyeIcon size={12} />} onClick={onView}>
          View
        </Button>
        {abilities.edit ? (
          <Button className={styles.grow} variant="outline" size="xs" icon={<PencilIcon size={12} />} onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {abilities.suspend ? (
          <Button
            className={suspended ? styles.unblock : styles.block}
            size="xs"
            disabled={busy}
            aria-label={suspended ? `Reactivate ${title}` : `Block ${title}`}
            icon={suspended ? <CheckCircleIcon size={12} /> : <BanIcon size={12} />}
            onClick={onToggle}
          />
        ) : null}
      </div>
    </article>
  );
}
