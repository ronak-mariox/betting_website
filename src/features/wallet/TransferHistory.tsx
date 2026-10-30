import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge/Badge';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { ApiRequestError } from '../../lib/api';
import { walletApi } from '../../lib/api/wallet';
import type { ApiFundTransfer, FundTransferStatus } from '../../lib/api/wallet';
import { formatRupees } from '../../lib/format';
import { useLiveRefresh } from '../../lib/realtime';
import { useAuth } from '../auth/authContext';
import styles from './WalletPage.module.css';

const STATUS_TONE: Record<FundTransferStatus, BadgeTone> = {
  Completed: 'success',
  Pending: 'warning',
  Failed: 'danger',
  Cancelled: 'neutral',
};

const party = (ref: ApiFundTransfer['from']) => (ref ? `${ref.name || ref.username} (${ref.username})` : '—');

/**
 * Fund transfer history — every attempt, failed and cancelled ones too.
 * `all` (wallet page) lists every transfer made in the caller's network;
 * otherwise only what the caller sent and received.
 */
export function TransferHistory({ all = false, refreshKey = 0 }: { all?: boolean; refreshKey?: number }) {
  const { accessToken, user } = useAuth();
  const [items, setItems] = useState<ApiFundTransfer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveKey, setLiveKey] = useState(0);
  useLiveRefresh(['admin:changed'], () => setLiveKey((key) => key + 1));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    walletApi
      .transfers({ all, limit: 100 }, accessToken)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to load transfers.');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, all, refreshKey, liveKey]);

  const mine = (ref: ApiFundTransfer['from']) => Boolean(ref && user && ref.username === user.username);
  const columns: Column<ApiFundTransfer>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (t) => <span className={styles.muted}>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
    },
    {
      key: 'time',
      header: 'Time',
      render: (t) => <span className={styles.muted}>{new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>,
    },
    { key: 'id', header: 'Transaction ID', render: (t) => <span className={styles.muted}>{t.reference}</span> },
    ...(all ? [{ key: 'from', header: 'Sender', render: (t: ApiFundTransfer) => <span>{party(t.from)}</span> }] : []),
    {
      key: 'client',
      header: all ? 'Receiver' : 'Client',
      render: (t) => <span>{all || mine(t.from) ? party(t.to) : `From ${party(t.from)}`}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (t) => (
        <span>
          {!all && !mine(t.from) ? '+' : !all ? '−' : ''}
          {formatRupees(t.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <div>
          <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
          {t.failureReason ? <p className={styles.muted}>{t.failureReason}</p> : null}
        </div>
      ),
    },
  ];

  return (
    <>
      {error ? <p className={styles.muted}>{error}</p> : null}
      <DataTable columns={columns} rows={items ?? []} rowKey={(t) => t._id} size="lg" emptyMessage={items ? 'No transfers yet.' : <Loader block />} />
    </>
  );
}
