import type { ComponentType } from 'react';
import type { BadgeTone } from '../components/ui/Badge/Badge';
import type { DotTone } from '../components/ui/Dot/Dot';
import type { IconProps } from '../components/icons';
import {
  AnalyticsIcon,
  BellIcon,
  BettingIcon,
  BuildingIcon,
  CheckCircleIcon,
  CmsIcon,
  CommissionIcon,
  EventsIcon,
  LayoutDashboardIcon,
  MarketsIcon,
  PartnershipIcon,
  ReportsIcon,
  RiskIcon,
  SecurityIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SupportIcon,
  TransactionsIcon,
  UserIcon,
  UsersCogIcon,
  UsersIcon,
  WalletIcon,
} from '../components/icons';

export type RoleId = 'super-admin' | 'franchise' | 'super-agent' | 'agent';

/** Tones a role can be signed with — the ones both Badge and Dot understand. */
export type RoleAccent = Extract<BadgeTone, DotTone>;

export type NavItem = {
  /** Path segment appended to the role's base path; '' is the role home. */
  segment: string;
  label: string;
  icon: ComponentType<IconProps>;
  /**
   * The Permissions-page grant (group, permission) a staff role needs at
   * "View" to see this entry; super-admin always sees it.
   */
  permission?: readonly [string, string];
};

export type RoleDefinition = {
  id: RoleId;
  /** Label shown on the login chip and in the panel shell. */
  label: string;
  icon: ComponentType<IconProps>;
  /** One-line description of the role's remit. */
  description: string;
  /** Route prefix owned by this role, e.g. /super-admin. */
  basePath: string;
  /** Credentials pre-filled by the Quick Demo Login chips — dev server only. */
  demo: { username: string; password: string };
  /** Person shown in the sidebar identity chip. */
  operator: string;
  /** The role directly beneath this one in the hierarchy. */
  manages: RoleId | null;
  /**
   * Colour this panel is signed with — the sidebar identity chip and the
   * profile badge. Each role gets its own so the panel is recognisable at a
   * glance; Badge's tones already carry the exact hues the design uses.
   */
  accent: RoleAccent;
  /** Nav entry that lists this role's downline (franchises, agents, players…). */
  downline: NavItem;
  nav: NavItem[];
};

/**
 * Every nav destination in the product. Roles pick from this registry so a
 * label or icon is only ever declared once.
 */
const NAV = {
  dashboard: { segment: '', label: 'Dashboard', icon: LayoutDashboardIcon },
  users: { segment: 'users', label: 'Users', icon: UsersIcon, permission: ['userManagement', 'userList'] as const },
  franchises: { segment: 'franchise', label: 'Franchise', icon: BuildingIcon, permission: ['userManagement', 'userList'] as const },
  superAgents: { segment: 'super-agent', label: 'Super Agent', icon: UsersCogIcon, permission: ['userManagement', 'userList'] as const },
  agents: { segment: 'agent', label: 'Agent', icon: UserIcon, permission: ['userManagement', 'userList'] as const },
  wallet: { segment: 'wallet', label: 'Wallet', icon: WalletIcon, permission: ['finance', 'walletBalance'] as const },
  transactions: { segment: 'transactions', label: 'Transactions', icon: TransactionsIcon, permission: ['finance', 'walletBalance'] as const },
  betting: { segment: 'betting', label: 'Betting', icon: BettingIcon },
  events: { segment: 'events', label: 'In-Play', icon: EventsIcon, permission: ['bettingMarkets', 'events'] as const },
  completeMatches: {
    segment: 'complete-match',
    label: 'Complete Match',
    icon: CheckCircleIcon,
    permission: ['bettingMarkets', 'events'] as const,
  },
  markets: { segment: 'markets', label: 'Markets', icon: MarketsIcon, permission: ['bettingMarkets', 'markets'] as const },
  risk: { segment: 'risk', label: 'Risk', icon: RiskIcon },
  commission: { segment: 'commission', label: 'Commission', icon: CommissionIcon, permission: ['finance', 'commission'] as const },
  partnership: { segment: 'partnership', label: 'Partnership', icon: PartnershipIcon },
  reports: { segment: 'reports', label: 'Reports', icon: ReportsIcon, permission: ['reportsAnalytics', 'reports'] as const },
  analytics: { segment: 'analytics', label: 'Analytics', icon: AnalyticsIcon, permission: ['reportsAnalytics', 'analytics'] as const },
  cms: { segment: 'cms', label: 'CMS', icon: CmsIcon },
  notifications: { segment: 'notifications', label: 'Notifications', icon: BellIcon },
  security: { segment: 'security', label: 'Security', icon: SecurityIcon },
  settings: { segment: 'settings', label: 'Settings', icon: SettingsIcon },
  profile: { segment: 'profile', label: 'Profile', icon: UserIcon },
  support: { segment: 'support-tickets', label: 'Support Tickets', icon: SupportIcon },
  /** Contact channels rather than a ticket queue — node 139:90076. */
  contactSupport: { segment: 'support', label: 'Support', icon: SupportIcon, permission: ['support', 'contactSupport'] as const },
  permissions: { segment: 'permissions', label: 'Permissions', icon: ShieldCheckIcon },
} satisfies Record<string, NavItem>;

/** Production builds ship no credentials: the login form starts empty. */
const NO_DEMO = { username: '', password: '' };

/**
 * The four panels. Order here drives the Quick Demo Login grid, the router and
 * the sidebar — there is no second list to keep in sync.
 */
export const ROLES: RoleDefinition[] = [
  {
    id: 'super-admin',
    accent: 'brand',
    label: 'Super Admin',
    icon: ShieldCheckIcon,
    description: 'Full platform control across every franchise, market and settlement.',
    basePath: '/super-admin',
    demo: import.meta.env.DEV ? { username: 'mithu8178', password: 'superadmin@123' } : NO_DEMO,
    operator: 'Ankit Sharma',
    manages: 'franchise',
    downline: NAV.franchises,
    nav: [
      NAV.dashboard,
      NAV.users,
      NAV.franchises,
      NAV.superAgents,
      NAV.agents,
      NAV.wallet,
      NAV.transactions,
      NAV.betting,
      NAV.events,
      NAV.completeMatches,
      NAV.markets,
      NAV.risk,
      NAV.commission,
      NAV.partnership,
      NAV.reports,
      NAV.analytics,
      NAV.cms,
      NAV.notifications,
      NAV.security,
      NAV.settings,
      NAV.profile,
      NAV.support,
      NAV.permissions,
    ],
  },
  {
    id: 'franchise',
    accent: 'success',
    label: 'Franchise',
    icon: BuildingIcon,
    description: 'Runs a region: onboards super agents and owns their exposure limits.',
    basePath: '/franchise',
    demo: import.meta.env.DEV ? { username: 'franchise01', password: 'franchise@123' } : NO_DEMO,
    operator: 'Rakesh Kadam',
    manages: 'super-agent',
    downline: NAV.superAgents,
    nav: [
      NAV.dashboard,
      NAV.users,
      NAV.superAgents,
      NAV.agents,
      NAV.wallet,
      NAV.transactions,
      NAV.events,
      NAV.completeMatches,
      NAV.markets,
      NAV.commission,
      NAV.reports,
      NAV.analytics,
      NAV.settings,
      NAV.profile,
      NAV.contactSupport,
    ],
  },
  {
    id: 'super-agent',
    accent: 'warning',
    label: 'Super Agent',
    icon: UsersCogIcon,
    description: 'Manages a book of agents and their daily credit allocation.',
    basePath: '/super-agent',
    demo: import.meta.env.DEV ? { username: 'superagent01', password: 'superagent@123' } : NO_DEMO,
    operator: 'Imran Sheikh',
    manages: 'agent',
    downline: NAV.agents,
    nav: [
      NAV.dashboard,
      NAV.users,
      NAV.agents,
      NAV.wallet,
      NAV.transactions,
      NAV.events,
      NAV.completeMatches,
      NAV.markets,
      NAV.commission,
      NAV.reports,
      NAV.analytics,
      NAV.settings,
      NAV.profile,
      NAV.contactSupport,
    ],
  },
  {
    id: 'agent',
    accent: 'info',
    label: 'Agent',
    icon: UserIcon,
    description: 'Front line: creates players, tops up chips and settles positions.',
    basePath: '/agent',
    demo: import.meta.env.DEV ? { username: 'agent01', password: 'agent@123' } : NO_DEMO,
    operator: 'Sahil Verma',
    manages: null,
    downline: NAV.users,
    nav: [
      NAV.dashboard,
      NAV.users,
      NAV.wallet,
      NAV.transactions,
      NAV.events,
      NAV.completeMatches,
      NAV.markets,
      NAV.commission,
      NAV.reports,
      NAV.analytics,
      NAV.settings,
      NAV.profile,
      NAV.contactSupport,
    ],
  },
];

const ROLE_BY_ID = new Map(ROLES.map((role) => [role.id, role]));

export function getRole(id: RoleId): RoleDefinition {
  const role = ROLE_BY_ID.get(id);
  if (!role) throw new Error(`Unknown role: ${id}`);
  return role;
}

/** Absolute route for a nav item within its role. */
export function navPath(role: RoleDefinition, item: NavItem): string {
  return item.segment ? `${role.basePath}/${item.segment}` : role.basePath;
}
