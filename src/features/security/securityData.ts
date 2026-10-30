import { AlertTriangleIcon, LockIcon, LoginIcon, UsersIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { AuditLogEntry, SecurityStats } from '../../lib/api/security';
import { formatCount, formatRupees } from '../../lib/format';
import { ACTIVITY_TITLE } from '../users/usersData';

export const SECURITY_TABS = ['Logs', 'Sessions', 'Audit', 'Policy'] as const;

/** The audit actions the Logs tab shows: sign-ins and password events. */
export const LOGIN_ACTIONS = [
  'login_success',
  'login_failed',
  'logout',
  'register',
  'password_changed',
  'password_reset_requested',
  'password_reset',
];

export const LOG_STATUS_TONE: Record<AuditLogEntry['status'], BadgeTone> = {
  success: 'success',
  failed: 'danger',
};

export function securityStats(stats: SecurityStats | null): StatCardProps[] {
  const failedDelta = stats ? stats.failedLogins - stats.failedLoginsPrev : 0;
  return [
    {
      label: 'Active Sessions',
      value: stats ? formatCount(stats.activeSessions) : '—',
      caption: 'Signed-in devices',
      icon: LockIcon,
      accent: 'green',
    },
    {
      label: 'Signed-in Users',
      value: stats ? formatCount(stats.activeUsers) : '—',
      caption: 'Accounts with a live session',
      icon: UsersIcon,
      accent: 'blue',
    },
    {
      label: 'Failed Logins',
      value: stats ? formatCount(stats.failedLogins) : '—',
      caption: 'Last 24 hours',
      delta: stats ? `${failedDelta >= 0 ? '+' : ''}${failedDelta} vs previous 24h` : undefined,
      // Neutral on purpose: StatCard paints 'up' green, and more failed logins is not good news.
      tone: 'flat',
      icon: AlertTriangleIcon,
      accent: 'yellow',
    },
    {
      label: 'Successful Logins',
      value: stats ? formatCount(stats.logins) : '—',
      caption: 'Last 24 hours',
      icon: LoginIcon,
      accent: 'cyan',
    },
  ];
}

/** Who did it: the account name, or the username a failed sign-in tried. */
export function actorLabel(entry: AuditLogEntry): string {
  if (entry.actor) return entry.actor.name || entry.actor.username;
  const tried = typeof entry.metadata?.username === 'string' ? entry.metadata.username : '';
  return entry.actorUsername || (tried ? `${tried} (unknown)` : 'Unknown');
}

/** "Password Reset → franchise01 · grant EV" — a one-line summary for the audit trail. */
export function describeAudit(entry: AuditLogEntry): string {
  const title = ACTIVITY_TITLE[entry.action] ?? entry.action.replace(/_/g, ' ');
  const target =
    entry.target && entry.target._id !== entry.actor?._id ? ` → ${entry.target.name || entry.target.username}` : '';
  const meta = entry.metadata ?? {};
  const extras = [
    typeof meta.amount === 'number' ? formatRupees(meta.amount) : null,
    typeof meta.roleKey === 'string' ? `${meta.roleKey} · ${meta.groupKey}.${meta.permissionKey} = ${meta.grant || 'off'}` : null,
    typeof meta.revoked === 'number' ? `${meta.revoked} sessions` : null,
    typeof meta.reason === 'string' ? `Reason: ${meta.reason}` : null,
  ].filter(Boolean);
  return `${title}${target}${extras.length ? ` · ${extras.join(' · ')}` : ''}`;
}

/** Audit category badge, from the action's prefix. */
export function auditCategory(action: string): string {
  if (/^(login|logout|register|password|session)/.test(action)) return 'Auth';
  if (/^account/.test(action)) return 'Accounts';
  if (/^permission/.test(action)) return 'Permissions';
  if (/^(deposit|withdrawal)/.test(action)) return 'Wallet';
  return 'Profile';
}

/**
 * What the server actually enforces today (backend/src/routes/auth.routes.js,
 * config/env.js). Read-only: none of these is configurable from the panel yet.
 */
export const ENFORCED_POLICY = [
  { label: 'Minimum password length', value: '6 characters' },
  { label: 'Sign-in attempts', value: '20 per 15 minutes per IP (then blocked)' },
  { label: 'Access token lifetime', value: '15 minutes (renewed automatically)' },
  { label: 'Session lifetime', value: '30 days, or until signed out / revoked' },
  { label: 'Password change', value: 'Signs out every other device' },
  { label: 'Password reset code', value: '6 digits, valid 10 minutes, 5 wrong tries' },
];

export const toCsv = (entries: AuditLogEntry[]) =>
  [
    ['Time', 'Actor', 'Role', 'Action', 'Details', 'Status', 'IP', 'Device'],
    ...entries.map((entry) => [
      new Date(entry.createdAt).toISOString(),
      actorLabel(entry),
      entry.actor?.role ?? '',
      entry.action,
      describeAudit(entry),
      entry.status,
      entry.ip,
      entry.userAgent,
    ]),
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
