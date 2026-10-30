import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, ChevronDownIcon, ChevronRightIcon, CollapseIcon } from '../../components/icons';
import { Dot } from '../../components/ui/Dot/Dot';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import type { RoleDefinition } from '../../config/roles';
import { useAuth } from '../../features/auth/authContext';
import { usePermissions } from '../../features/auth/usePermissions';
import { networkApi } from '../../lib/api/network';
import { notificationsApi } from '../../lib/api/notifications';
import { formatRupees } from '../../lib/format';
import styles from './Topbar.module.css';
import { usePlatformStatus } from './usePlatformStatus';

export type TopbarProps = {
  role: RoleDefinition;
  /** Label of the section currently open. */
  section: string;
  username: string;
  /** The signed-in account's name (its username until a name is set). */
  displayName: string;
  /** The sidebar is hidden on desktop, so the menu button shows there too. */
  navCollapsed: boolean;
  onToggleNav: () => void;
};

/** One thing waiting for this account to act on, shown under the bell. */
type Alert = { id: string; title: string; detail: string; to: string };

const POLL_MS = 60_000;

/**
 * What's waiting for the signed-in account. Super-admin has the platform
 * notification feed (its own page); the network roles get the work queued
 * in their own book — requests to approve.
 */
function useAlerts(role: RoleDefinition) {
  const { accessToken } = useAuth();
  const { can, loaded } = usePermissions();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!accessToken || !loaded) return;
    let cancelled = false;
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

    const load = async () => {
      try {
        if (role.id === 'super-admin') {
          const { unreadCount, notifications } = await notificationsApi.list(accessToken);
          if (cancelled) return;
          setAlerts(
            unreadCount > 0
              ? [
                  {
                    id: 'unread',
                    title: `${plural(unreadCount, 'unread notification')}`,
                    detail: notifications.find((n) => n.unread)?.title ?? '',
                    to: `${role.basePath}/notifications`,
                  },
                ]
              : [],
          );
          return;
        }
        const { stats } = await networkApi.myDashboard(accessToken);
        if (cancelled) return;
        // Only a role that may approve requests reviews them itself; otherwise its agents do.
        const reviews = can('finance', 'deposit', 'X') || can('finance', 'withdrawal', 'X');
        const wallet = reviews ? `${role.basePath}/wallet` : `${role.basePath}/${role.manages ? 'agent' : 'users'}`;
        const waiting = (amount: number) =>
          reviews ? `${formatRupees(amount)} waiting for approval` : `${formatRupees(amount)} waiting with your agents`;
        setAlerts(
          [
            (stats.pendingDeposits?.count ?? 0) > 0 && {
              id: 'deposits',
              title: `${plural(stats.pendingDeposits!.count, 'deposit')} ${reviews ? 'to review' : 'pending'}`,
              detail: waiting(stats.pendingDeposits!.amount),
              to: reviews ? `${wallet}?tab=Deposits` : wallet,
            },
            (stats.pendingWithdrawals?.count ?? 0) > 0 && {
              id: 'withdrawals',
              title: `${plural(stats.pendingWithdrawals!.count, 'withdrawal')} ${reviews ? 'to review' : 'pending'}`,
              detail: waiting(stats.pendingWithdrawals!.amount),
              to: reviews ? `${wallet}?tab=Withdrawals` : wallet,
            },
          ].filter(Boolean) as Alert[],
        );
      } catch {
        // The bell is a convenience — a failed poll just keeps the last list.
      }
    };

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken, role, can, loaded]);

  return alerts;
}

export function Topbar({ role, section, username, displayName, navCollapsed, onToggleNav }: TopbarProps) {
  const navigate = useNavigate();
  const live = usePlatformStatus()?.liveMatches ?? 0;
  const alerts = useAlerts(role);
  const [query, setQuery] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Closes the bell's list on a click anywhere else, or Escape.
  useEffect(() => {
    if (!bellOpen) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!bellRef.current?.contains(event.target as Node)) setBellOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBellOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [bellOpen]);

  /** Searches the people this account manages — the list every role has. */
  const search = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`${role.basePath}/users?q=${encodeURIComponent(term)}`);
    setQuery('');
  };

  const openProfile = () => navigate(`${role.basePath}/profile`);

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.menuButton} ${navCollapsed ? styles.menuButtonShown : ''}`}
        aria-label="Open navigation"
        onClick={onToggleNav}
      >
        <CollapseIcon size={12} />
      </button>

      <div className={styles.heading}>
        <h1 className={styles.title}>{section}</h1>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <span>Home</span>
          <ChevronRightIcon size={12} />
          <span className={styles.breadcrumbCurrent}>{section}</span>
        </nav>
      </div>

      <form className={styles.globalSearch} role="search" onSubmit={search}>
        <SearchInput
          placeholder="Search users…"
          aria-label="Search users"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <div className={`${styles.chip} ${styles.chipLive}`}>
        <Dot tone="live" />
        <span className={styles.chipLiveLabel}>LIVE</span>
        <span className={styles.chipMeta}>
          {live} {live === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <button type="button" className={`${styles.chip} ${styles.chipRole}`} title="Open my profile" onClick={openProfile}>
        <Dot />
        {role.label}
        <ChevronDownIcon size={12} />
      </button>

      <div className={styles.bell} ref={bellRef}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Notifications"
          aria-expanded={bellOpen}
          onClick={() => setBellOpen((open) => !open)}
        >
          <BellIcon size={15.999} />
          {alerts.length > 0 ? <span className={styles.badgeDot} /> : null}
        </button>
        {bellOpen ? (
          <div className={styles.alerts} role="menu" aria-label="Waiting for you">
            <p className={styles.alertsTitle}>Waiting for you</p>
            {alerts.length === 0 ? <p className={styles.alertsEmpty}>Nothing is waiting — you're all caught up.</p> : null}
            {alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                role="menuitem"
                className={styles.alert}
                onClick={() => {
                  setBellOpen(false);
                  navigate(alert.to);
                }}
              >
                <span className={styles.alertTitle}>{alert.title}</span>
                <span className={styles.alertDetail}>{alert.detail}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={styles.avatar}
        title={`${displayName} (${username}) — open my profile`}
        aria-label="Open my profile"
        onClick={openProfile}
      >
        {displayName.slice(0, 1).toUpperCase()}
      </button>
    </header>
  );
}
