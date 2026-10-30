import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getRole, navPath } from '../../config/roles';
import type { NavItem, RoleDefinition } from '../../config/roles';
import { useAuth } from '../../features/auth/authContext';
import { cx } from '../../lib/cx';
import { AnnouncementBar } from './AnnouncementBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { Topbar } from './Topbar';
import styles from './PanelLayout.module.css';
import { timeZoneLabel, platformTimeZone } from '../../lib/format';
import { authApi } from '../../lib/api';
import { setDisplayPrefs, translateLabel, useDisplayPrefs } from '../../lib/panelPrefs';

/** The nav entry matching the current URL — drives the title and breadcrumb. */
function useCurrentNavItem(role: RoleDefinition): NavItem {
  const { pathname } = useLocation();
  return (
    [...role.nav].reverse().find((item) => pathname.startsWith(navPath(role, item))) ?? role.nav[0]
  );
}

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  // Platform time (Settings → General → Timezone) whatever the browser's zone is.
  return `${timeZoneLabel()} ${now.toLocaleTimeString('en-IN', { hour12: true, timeZone: platformTimeZone() })}`;
}

/**
 * One shell for all four panels. Everything role-specific — identity chip,
 * nav entries, landing route — comes from the role definition.
 */
export function PanelLayout() {
  const navigate = useNavigate();
  const { user, signOut, accessToken } = useAuth();
  const { language } = useDisplayPrefs();
  // The account's saved theme / language follow it to any browser it signs in from.
  useEffect(() => {
    if (!accessToken) return;
    authApi
      .me(accessToken)
      .then(({ user: account }) => {
        const prefs = (account.preferences ?? {}) as Record<string, unknown>;
        setDisplayPrefs({ theme: prefs.theme as never, language: prefs.language as never });
      })
      .catch(() => undefined);
  }, [accessToken]);
  const [navOpen, setNavOpen] = useState(false);
  // Desktop: the sidebar can be hidden to widen the page. Narrow screens use navOpen (a drawer) instead.
  const [collapsed, setCollapsed] = useState(false);
  const toggleNav = () => {
    if (window.matchMedia('(max-width: 1080px)').matches) setNavOpen((open) => !open);
    else setCollapsed((value) => !value);
  };
  const role = getRole(user!.roleId);
  const current = useCurrentNavItem(role);
  const clock = useClock();
  const displayName = user!.name || user!.username;

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      <div
        className={cx(styles.scrim, navOpen && styles.scrimOpen)}
        onClick={() => setNavOpen(false)}
      />
      <Sidebar
        role={role}
        displayName={displayName}
        open={navOpen}
        collapsed={collapsed}
        onNavigate={() => setNavOpen(false)}
        onToggle={toggleNav}
        onSignOut={handleSignOut}
      />

      <div className={styles.main}>
        <Topbar
          role={role}
          section={translateLabel(current.label, language)}
          username={user!.username}
          displayName={displayName}
          navCollapsed={collapsed}
          onToggleNav={toggleNav}
        />
        <AnnouncementBar />
        <main className={styles.content}>
          <Outlet />
        </main>
        <StatusBar clock={clock} />
      </div>
    </div>
  );
}
