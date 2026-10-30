import { BanIcon, CheckCircleIcon, UsersIcon, WalletIcon } from '../../components/icons';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { RoleDefinition } from '../../config/roles';
import type { NetworkAccount, NetworkListStats } from '../../lib/api/network';
import { formatCount, formatRupees, platformTimeZone } from '../../lib/format';

export type PersonStatus = 'Active' | 'Suspended';

export const statusLabel = (account: Pick<NetworkAccount, 'status'>): PersonStatus =>
  account.status === 'suspended' ? 'Suspended' : 'Active';

/** Franchise and Super Agent see which agent owns each user; Super Admin and Agent don't need it. */
export function showsAgentColumn(role: RoleDefinition): boolean {
  return role.manages === 'super-agent' || role.manages === 'agent';
}

/** Every downline panel tracks login recency; the platform-wide list omits it. */
export function showsLastLogin(role: RoleDefinition): boolean {
  return role.id !== 'super-admin';
}

export function peopleStats(stats: NetworkListStats | null, noun: string): StatCardProps[] {
  const value = (key: keyof NetworkListStats) => (stats ? formatCount(stats[key]) : '…');
  return [
    { label: `Total ${noun}`, value: value('total'), caption: 'In your network', icon: UsersIcon, accent: 'blue', tinted: true },
    { label: 'Active', value: value('active'), caption: 'Can log in', icon: CheckCircleIcon, accent: 'green' },
    { label: 'Suspended', value: value('suspended'), caption: 'Need review', icon: BanIcon, accent: 'red' },
    {
      label: 'Wallet Balance',
      value: stats ? formatRupees(stats.balance) : '…',
      caption: 'Held by these accounts',
      icon: WalletIcon,
      accent: 'yellow',
    },
  ];
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { timeZone: platformTimeZone(), day: '2-digit', month: 'short', year: 'numeric' });
}

/** Browser + OS guess from a user-agent string, for the Devices tab. */
export function describeUserAgent(userAgent: string): { name: string; mobile: boolean } {
  if (!userAgent) return { name: 'Unknown device', mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : /okhttp|ReactNative|Expo/i.test(userAgent)
            ? 'Mobile app'
            : 'Browser';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(userAgent) && !mobile
      ? 'macOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad|iOS/.test(userAgent)
          ? 'iOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return { name: os ? `${browser} / ${os}` : browser, mobile };
}

/** "₹5,000 · Reason: UTR did not match" — the extras a review entry carries, '' if none. */
export const activityExtras = (metadata?: { amount?: number; reason?: string; documentType?: string }) =>
  [
    metadata?.amount ? formatRupees(metadata.amount) : null,
    metadata?.documentType ?? null,
    metadata?.reason ? `Reason: ${metadata.reason}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

export const ACTIVITY_TITLE: Record<string, string> = {
  login_success: 'Login',
  login_failed: 'Failed Login',
  logout: 'Logout',
  register: 'Registered',
  profile_updated: 'Profile Updated',
  password_changed: 'Password Changed',
  password_reset_requested: 'Password Reset Requested',
  password_reset: 'Password Reset',
  bet_voided: 'Bet Voided',
  account_created: 'Account Created',
  account_updated: 'Account Updated',
  account_suspended: 'Account Suspended',
  account_activated: 'Account Activated',
  permission_updated: 'Permissions Updated',
  session_revoked: 'Session Revoked',
  deposit_approved: 'Deposit Approved',
  deposit_rejected: 'Deposit Rejected',
  withdrawal_approved: 'Withdrawal Approved',
  withdrawal_rejected: 'Withdrawal Rejected',
};

export const STATUS_TONE = { Active: 'success', Suspended: 'danger' } as const;
export const RISK_TONE = { low: 'success', medium: 'warning', high: 'danger' } as const;
