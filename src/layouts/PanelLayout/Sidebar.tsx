import { usePermissions } from '../../features/auth/usePermissions';
import { useBranding } from '../../lib/brandingContext';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CollapseIcon, LogoutIcon } from '../../components/icons';
import { BrandMark } from '../../components/ui/BrandMark/BrandMark';
import { Dot } from '../../components/ui/Dot/Dot';
import { SearchInput } from '../../components/ui/SearchInput/SearchInput';
import { APP } from '../../config/app';
import { navPath } from '../../config/roles';
import type { NavItem, RoleDefinition } from '../../config/roles';
import { translateLabel, useDisplayPrefs } from '../../lib/panelPrefs';
import { cx } from '../../lib/cx';
import styles from './Sidebar.module.css';

export type SidebarProps = {
  role: RoleDefinition;
  /** The signed-in account's name (its username until a name is set). */
  displayName: string;
  open: boolean;
  /** Hidden on desktop (the topbar's menu button brings it back). */
  collapsed: boolean;
  onNavigate: () => void;
  onToggle: () => void;
  onSignOut: () => void;
};

/** Left rail — identical for all four panels; entries come from the role. */
export function Sidebar({ role, displayName, open, collapsed, onNavigate, onToggle, onSignOut }: SidebarProps) {
  const { name: brandName } = useBranding();
  const { can } = usePermissions();
  const [menuQuery, setMenuQuery] = useState('');
  const term = menuQuery.trim().toLowerCase();
  // Staff only see what the Permissions page grants them (super-admin sees everything).
  const allowed = role.nav.filter((item) => !item.permission || can(item.permission[0], item.permission[1], 'V'));
  const { language } = useDisplayPrefs();
  const label = (item: NavItem) => translateLabel(item.label, language);
  const items = term
    ? allowed.filter((item) => item.label.toLowerCase().includes(term) || label(item).toLowerCase().includes(term))
    : allowed;

  return (
    <aside className={cx(styles.sidebar, open && styles.sidebarOpen, collapsed && styles.sidebarCollapsed)}>
      <div className={styles.brand}>
        <BrandMark size={33.993} />
        <div className={styles.brandText}>
          <span className={styles.brandName}>{brandName}</span>
          <span className={styles.brandVersion}>{APP.edition}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.collapse}
        aria-label="Toggle navigation"
        onClick={onToggle}
      >
        <CollapseIcon size={12} />
      </button>

      <div className={styles.identity}>
        <div className={cx(styles.identityChip, styles[role.accent])}>
          <Dot tone={role.accent} />
          <div>
            <p className={styles.identityRole}>{role.label}</p>
            <p className={styles.identityUser}>{displayName} · Online</p>
          </div>
        </div>
      </div>

      <div className={styles.search}>
        <SearchInput
          size="sm"
          placeholder="Search menu..."
          aria-label="Search menu"
          value={menuQuery}
          onChange={(event) => setMenuQuery(event.target.value)}
        />
      </div>

      <nav className={styles.nav}>
        {items.length === 0 ? <p className={styles.navEmpty}>No menu matches “{menuQuery.trim()}”</p> : null}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.segment || 'home'}
              to={navPath(role, item)}
              end={item.segment === ''}
              className={({ isActive }) => cx(styles.navItem, isActive && styles.navItemActive)}
              onClick={() => {
                setMenuQuery('');
                onNavigate();
              }}
            >
              <Icon size={15.999} />
              {label(item)}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.logoutWrap}>
        <button type="button" className={styles.logout} onClick={onSignOut}>
          <LogoutIcon size={15.999} />
          Logout
        </button>
      </div>
    </aside>
  );
}
