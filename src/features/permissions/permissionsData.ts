export type RoleKey = 'superAgent' | 'agent' | 'franchise';

export type Role = {
  key: RoleKey;
  emoji: string;
  name: string;
  description: string;
  /** rgb triplet driving the card border, the meter and the group headers. */
  rgb: string;
};

/**
 * Per-role grant, written as a compact code: 'E' master enable, 'V' view,
 * 'X' edit. An empty string means the permission is off for that role, which
 * dims its whole row.
 */
export type Grant = string;

export const ROLES: Role[] = [
  { key: 'superAgent', emoji: '👑', name: 'Super Agent', description: 'Manages multiple agents and their users', rgb: '250, 204, 21' },
  { key: 'agent', emoji: '🧑‍💼', name: 'Agent', description: 'Manages users and betting activities', rgb: '41, 182, 246' },
  { key: 'franchise', emoji: '🏢', name: 'Franchise', description: 'Regional franchise owner with limited access', rgb: '34, 197, 94' },
];

export const LEGEND = [
  { term: 'Enable / Disable:', description: 'Master toggle — turn feature on or off for this role', rgb: '33, 150, 243' },
  { term: 'View:', description: 'Can see data but not make changes', rgb: '41, 182, 246' },
  { term: 'Edit:', description: 'Can modify data and take actions', rgb: '34, 197, 94' },
];

/** Group icons, keyed by the backend group key (backend/src/constants/permissions.js). */
export const GROUP_EMOJI: Record<string, string> = {
  finance: '💰',
  userManagement: '👥',
  bettingMarkets: '🎯',
  reportsAnalytics: '📊',
  accountSettings: '⚙️',
  support: '🎧',
};
