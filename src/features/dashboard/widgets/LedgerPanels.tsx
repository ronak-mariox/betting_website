import { RefreshIcon } from '../../../components/icons';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import type { Column } from '../../../components/ui/DataTable/DataTable';
import { SectionCard } from '../../../components/ui/SectionCard/SectionCard';
import type { ActivityEntry, BetRow, TransactionRow } from '../dashboardData';
import styles from './widgets.module.css';

const TRANSACTION_COLUMNS: Column<TransactionRow>[] = [
  { key: 'id', header: 'Txn ID', render: (row) => <span className={styles.mono}>{row.id}</span> },
  { key: 'user', header: 'User', render: (row) => <span className={styles.strong}>{row.user}</span> },
  { key: 'type', header: 'Type', render: (row) => <span className={styles.muted}>{row.type}</span> },
  {
    key: 'amount',
    header: 'Amount',
    render: (row) => (
      <span className={row.positive ? styles.amountUp : styles.amountDown}>{row.amount}</span>
    ),
  },
  { key: 'method', header: 'Method', render: (row) => <span className={styles.muted}>{row.method}</span> },
  { key: 'time', header: 'Time', render: (row) => <span className={styles.muted}>{row.time}</span> },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
  },
];

export function TransactionsPanel({ rows, onRefresh }: { rows: TransactionRow[]; onRefresh?: () => void }) {
  return (
    <SectionCard
      title="Recent Transactions"
      subtitle="Latest 10 ledger entries"
      size="md"
      bodySpacing={20}
      action={
        <Button variant="quiet" size="xs" icon={<RefreshIcon size={12} />} onClick={onRefresh}>
          Refresh
        </Button>
      }
    >
      <DataTable columns={TRANSACTION_COLUMNS} rows={rows} rowKey={(row) => row.id} />
    </SectionCard>
  );
}

const BET_COLUMNS: Column<BetRow>[] = [
  { key: 'user', header: 'User', render: (row) => <span className={styles.strong}>{row.user}</span> },
  { key: 'event', header: 'Event', render: (row) => <span className={styles.muted}>{row.event}</span> },
  {
    key: 'selection',
    header: 'Selection',
    render: (row) => <span className={styles.selection}>{row.selection}</span>,
  },
  { key: 'odds', header: 'Odds', render: (row) => <span className={styles.odds}>{row.odds}</span> },
  { key: 'stake', header: 'Stake', render: (row) => <span className={styles.amountUp}>{row.stake}</span> },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
  },
];

export function RecentBetsPanel({ rows, onRefresh }: { rows: BetRow[]; onRefresh?: () => void }) {
  return (
    <SectionCard
      title="Recent Bets"
      subtitle="Latest 10 bets, any status"
      size="md"
      bodySpacing={20}
      action={
        <Button variant="quiet" size="xs" icon={<RefreshIcon size={12} />} onClick={onRefresh}>
          Refresh
        </Button>
      }
    >
      <DataTable columns={BET_COLUMNS} rows={rows} rowKey={(row) => row.id} size="sm" />
    </SectionCard>
  );
}

export function ActivityFeedPanel({ entries }: { entries: ActivityEntry[] }) {
  return (
    <SectionCard title="Activity Feed" subtitle="Latest platform events" size="md" bodySpacing={20}>
      <div>
        {entries.map((entry) => (
          <article key={entry.id} className={styles.feedRow}>
            <span className={styles.feedEmoji} aria-hidden="true">
              {entry.emoji}
            </span>
            <div>
              <p className={styles.feedMessage}>{entry.message}</p>
              <p className={styles.feedAge}>{entry.age}</p>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
