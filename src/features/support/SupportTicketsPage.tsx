import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { CheckCircleIcon, EyeIcon, XCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { supportApi } from '../../lib/api/support';
import type { ApiTicket, TicketStatus } from '../../lib/api/support';
import { TicketDrawer } from './TicketDrawer';
import {
  ALL_PRIORITY,
  ALL_STATUS,
  PRIORITY_OPTIONS,
  PRIORITY_RGB,
  STATUS_OPTIONS,
  STATUS_RGB,
  formatTicketDate,
  roleLabel,
  ticketCode,
  ticketStats,
  userName,
} from './supportData';
import styles from './SupportTicketsPage.module.css';

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/** Support ticket queue — node 112:11927. */
export function SupportTicketsPage() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(ALL_STATUS);
  const [priority, setPriority] = useState(ALL_PRIORITY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await supportApi.list(accessToken);
      setTickets(res.tickets);
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

  const setTicketStatus = async (id: string, next: TicketStatus) => {
    if (!accessToken) return;
    setPendingId(id);
    try {
      await supportApi.updateStatus(id, next, accessToken);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPendingId(null);
    }
  };

  const rows = tickets.filter((ticket) => {
    const haystack = `${ticketCode(ticket)} ${ticket.subject} ${userName(ticket.raisedBy)}`.toLowerCase();
    const matchesQuery = query.trim() === '' || haystack.includes(query.trim().toLowerCase());
    const matchesStatus = status === ALL_STATUS || ticket.status === status;
    const matchesPriority = priority === ALL_PRIORITY || ticket.priority === priority;
    return matchesQuery && matchesStatus && matchesPriority;
  });

  const columns: Column<ApiTicket>[] = [
    { key: 'id', header: 'Ticket ID', render: (row) => <span className={styles.code}>{ticketCode(row)}</span> },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <div>
          <p className={styles.subject}>{row.subject}</p>
          <p className={styles.category}>{row.category}</p>
        </div>
      ),
    },
    {
      key: 'raisedBy',
      header: 'Raised By',
      render: (row) => {
        const name = userName(row.raisedBy);
        return (
          <div className={styles.person}>
            <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
            <span className={styles.personName}>{name}</span>
          </div>
        );
      },
    },
    { key: 'role', header: 'Role', render: (row) => <span className={styles.muted}>{roleLabel(row.role)}</span> },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <span className={styles.chip} style={{ '--chip-rgb': PRIORITY_RGB[row.priority] } as CSSProperties}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={styles.chip} style={{ '--chip-rgb': STATUS_RGB[row.status] } as CSSProperties}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => <span className={styles.muted}>{formatTicketDate(row.createdAt)}</span>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (row) => <span className={styles.muted}>{row.assignedTeam || 'Unassigned'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button
            className={styles.view}
            size="xs"
            aria-label={`Open ${ticketCode(row)}`}
            onClick={() => setOpenId(row._id)}
          >
            <EyeIcon size={12.992} />
          </Button>
          <Button
            className={styles.resolve}
            size="xs"
            aria-label={`Resolve ${ticketCode(row)}`}
            disabled={pendingId === row._id || row.status === 'Resolved' || row.status === 'Closed'}
            onClick={() => setTicketStatus(row._id, 'Resolved')}
          >
            <CheckCircleIcon size={12.992} />
          </Button>
          <Button
            className={styles.close}
            size="xs"
            aria-label={`Close ${ticketCode(row)}`}
            disabled={pendingId === row._id || row.status === 'Closed'}
            onClick={() => setTicketStatus(row._id, 'Closed')}
          >
            <XCircleIcon size={12.992} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {ticketStats(tickets).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <SearchInput
            className={styles.search}
            placeholder="Search tickets..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <SelectField
            label="Status"
            labelCase="sentence"
            options={STATUS_OPTIONS}
            placeholder={null}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
          <SelectField
            label="Priority"
            labelCase="sentence"
            options={PRIORITY_OPTIONS}
            placeholder={null}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          />
        </div>

        {error ? <p className={styles.count}>{error}</p> : null}

        <div className={styles.table}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            size="lg"
            emptyMessage={loading ? <Loader block /> : 'No tickets match these filters.'}
          />
        </div>

        <p className={styles.count}>
          Showing {rows.length} of {tickets.length} tickets
        </p>
      </section>

      {openId ? <TicketDrawer ticketId={openId} onChanged={load} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
