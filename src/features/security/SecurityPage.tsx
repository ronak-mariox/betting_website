import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useState } from 'react';
import { BanIcon, ExportIcon, RefreshIcon, ShieldCheckIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { ApiRequestError } from '../../lib/api';
import { securityApi } from '../../lib/api/security';
import type { AuditLogEntry, AuditLogPage, PlatformSession, SecurityStats } from '../../lib/api/security';
import { cx } from '../../lib/cx';
import { formatIp, formatRelativeTime, platformTimeZone } from '../../lib/format';
import { useAuth } from '../auth/authContext';
import { ACTIVITY_TITLE, describeUserAgent } from '../users/usersData';
import {
  ENFORCED_POLICY,
  LOGIN_ACTIONS,
  LOG_STATUS_TONE,
  SECURITY_TABS,
  actorLabel,
  auditCategory,
  describeAudit,
  securityStats,
  toCsv,
} from './securityData';
import styles from './SecurityPage.module.css';

const TABS = SECURITY_TABS.map((label) => ({ label }));
const PAGE_SIZE = 25;

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: platformTimeZone(), day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Security console: live sign-in logs, signed-in devices, the audit trail and the enforced policy. */
export function SecurityPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<string>(SECURITY_TABS[0]);
  const [stats, setStats] = useState<SecurityStats | null>(null);

  const loadStats = useCallback(async () => {
    if (!accessToken) return;
    try {
      setStats(await securityApi.stats(accessToken));
    } catch {
      setStats(null);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {securityStats(stats).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <PillTabs items={TABS} value={tab} size="sm" label="Security sections" onChange={setTab} />

        <div className={styles.body}>
          {tab === 'Logs' ? <AuditList actions={LOGIN_ACTIONS} variant="logs" /> : null}
          {tab === 'Sessions' ? <SessionsTab onChange={loadStats} /> : null}
          {tab === 'Audit' ? <AuditList variant="audit" /> : null}
          {tab === 'Policy' ? <PolicyTab /> : null}
        </div>
      </section>
    </div>
  );
}

/** One page of /auth/audit-logs at a time, as the sign-in table (Logs) or the full trail (Audit). */
function AuditList({ actions, variant }: { actions?: string[]; variant: 'logs' | 'audit' }) {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setData(await securityApi.auditLogs(accessToken, { page, limit: PAGE_SIZE, actions }));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
    // `actions` is a module constant, so it never changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, page]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Pulls up to the latest 1,000 entries (10 pages) and saves them as CSV. */
  const exportCsv = async () => {
    if (!accessToken) return;
    setExporting(true);
    try {
      const entries: AuditLogEntry[] = [];
      for (let p = 1; p <= 10; p += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await securityApi.auditLogs(accessToken, { page: p, limit: 100, actions });
        entries.push(...res.items);
        if (entries.length >= res.total) break;
      }
      const url = URL.createObjectURL(new Blob([toCsv(entries)], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${variant === 'logs' ? 'login-logs' : 'audit-trail'}-${new Date().toISOString().slice(0, 10)}.csv`;
      // Firefox / Safari only download from a link that is in the document, and need the URL alive a moment.
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const rows = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const head = (
    <div className={styles.tabHead}>
      <p className={styles.tabTitle}>{variant === 'logs' ? 'Sign-in Activity' : 'Admin Audit Trail'}</p>
      <div className={styles.rowActions}>
        <Button className={styles.quiet} size="xs" icon={<RefreshIcon size={12} />} onClick={() => void load()}>
          Refresh
        </Button>
        <Button
          className={styles.quiet}
          size="xs"
          icon={<ExportIcon size={12} />}
          disabled={exporting || rows.length === 0}
          onClick={() => void exportCsv()}
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>
    </div>
  );

  const footer = (
    <Pagination
      page={Math.min(page, pageCount)}
      pageCount={pageCount}
      summary={`Showing ${rows.length} of ${data?.total ?? 0} entries`}
      onChange={setPage}
    />
  );

  if (variant === 'audit') {
    return (
      <div>
        {head}
        {error ? <p className={styles.error}>{error}</p> : null}
        {rows.length === 0 ? (
          <p className={styles.empty}>{loading ? <Loader /> : 'No audit entries yet.'}</p>
        ) : (
          rows.map((entry) => (
            <article key={entry._id} className={styles.audit}>
              <span className={styles.auditTile}>
                <ShieldCheckIcon size={13.993} />
              </span>
              <div className={styles.auditMain}>
                <p className={styles.auditActor}>{actorLabel(entry)}</p>
                <p className={styles.auditDescription}>{describeAudit(entry)}</p>
                <p className={styles.auditTime}>{formatWhen(entry.createdAt)}</p>
              </div>
              <div className={styles.auditSide}>
                <Badge tone={entry.status === 'failed' ? 'danger' : 'brand'}>{auditCategory(entry.action)}</Badge>
                <span className={styles.ip}>{formatIp(entry.ip) || '—'}</span>
              </div>
            </article>
          ))
        )}
        {footer}
      </div>
    );
  }

  const columns: Column<AuditLogEntry>[] = [
    { key: 'user', header: 'User', render: (row) => <span className={styles.logUser}>{actorLabel(row)}</span> },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <span className={styles.logAction}>{ACTIVITY_TITLE[row.action] ?? row.action}</span>,
    },
    {
      key: 'ip',
      header: 'IP Address',
      render: (row) => (
        <span className={cx(styles.ip, row.status === 'failed' && styles.ipFlagged)}>{formatIp(row.ip) || '—'}</span>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      render: (row) => <span className={styles.meta}>{describeUserAgent(row.userAgent).name}</span>,
    },
    { key: 'time', header: 'Time', render: (row) => <span className={styles.meta}>{formatWhen(row.createdAt)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={LOG_STATUS_TONE[row.status]}>{row.status === 'failed' ? 'Failed' : 'Success'}</Badge>
      ),
    },
  ];

  return (
    <div>
      {head}
      {error ? <p className={styles.error}>{error}</p> : null}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        rowClassName={(row) => (row.status === 'failed' ? styles.logFailed : undefined)}
        size="md"
        emptyMessage={loading ? <Loader block /> : 'No sign-in activity yet.'}
      />
      {footer}
    </div>
  );
}

function SessionsTab({ onChange }: { onChange: () => void }) {
  const { accessToken, user } = useAuth();
  const [sessions, setSessions] = useState<PlatformSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setSessions((await securityApi.sessions(accessToken)).sessions);
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

  const isOwn = (session: PlatformSession) => session.user?.username === user?.username;
  const others = sessions.filter((session) => !isOwn(session));
  const userCount = new Set(sessions.map((session) => session.user?._id)).size;

  const revoke = async (session: PlatformSession) => {
    if (!accessToken) return;
    setBusy(session._id);
    setNotice(null);
    try {
      await securityApi.revokeSession(accessToken, session._id);
      await load();
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const revokeAll = async () => {
    if (!accessToken || others.length === 0) return;
    if (!window.confirm(`Sign out ${others.length} session(s) on every other account? Your own devices stay signed in.`)) return;
    setBusy('all');
    setNotice(null);
    try {
      const { revoked } = await securityApi.revokeAll(accessToken);
      setNotice(`${revoked} session(s) revoked. Those devices are signed out within 15 minutes.`);
      await load();
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.tabHead}>
        <p className={styles.tabTitle}>
          Active Sessions — {sessions.length} devices · {userCount} users
        </p>
        <Button
          className={styles.danger}
          size="xs"
          icon={<BanIcon size={12} />}
          disabled={busy !== null || others.length === 0}
          onClick={() => void revokeAll()}
        >
          {busy === 'all' ? 'Revoking…' : 'Revoke All Others'}
        </Button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {sessions.length === 0 ? <p className={styles.empty}>{loading ? <Loader /> : 'No one is signed in.'}</p> : null}

      {sessions.map((session) => {
        const own = isOwn(session);
        const name = session.user ? session.user.name || session.user.username : 'Deleted account';
        return (
          <article key={session._id} className={cx(styles.session, own && styles.sessionOwn)}>
            <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
            <div className={styles.sessionMain}>
              <p className={styles.sessionName}>
                {name}
                {own ? <span className={styles.you}>YOU</span> : null}
              </p>
              <p className={styles.sessionMeta}>
                {[session.user?.role, describeUserAgent(session.userAgent).name, formatIp(session.ip)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className={styles.sessionSide}>
              <span className={styles.duration} title={`Signed in ${formatWhen(session.createdAt)}`}>
                Active {formatRelativeTime(session.updatedAt)}
              </span>
              {own ? null : (
                <button
                  type="button"
                  className={styles.revoke}
                  disabled={busy !== null}
                  onClick={() => void revoke(session)}
                >
                  {busy === session._id ? 'Revoking…' : 'Revoke'}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PolicyTab() {
  return (
    <div className={styles.settings}>
      <section>
        <p className={styles.tabTitle}>Enforced Security Policy</p>
        <p className={styles.tabSubtitle}>What the server enforces today. These rules are fixed in the backend.</p>
        <div className={styles.toggleList}>
          {ENFORCED_POLICY.map((rule) => (
            <div key={rule.label} className={styles.toggleRow}>
              <p className={styles.toggleTitle}>{rule.label}</p>
              <p className={styles.toggleDescription}>{rule.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
