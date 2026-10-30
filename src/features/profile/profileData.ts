import type { ComponentType } from 'react';
import {
  CheckCircleIcon,
  LockIcon,
  LoginIcon,
  MonitorIcon,
  SlidersIcon,
  UserIcon,
} from '../../components/icons';
import type { IconProps } from '../../components/icons';
import type { RoleDefinition } from '../../config/roles';

export type ProfileTab = {
  label: string;
  icon: ComponentType<IconProps>;
};





/** Left rail — node 112:11449, simplified to what every account needs. */
const ALL_TABS: ProfileTab[] = [
  { label: 'My Profile', icon: UserIcon },
  { label: 'Change Password', icon: LockIcon },
  { label: 'Activity', icon: LoginIcon },
  { label: 'Devices', icon: MonitorIcon },
  { label: 'Preferences', icon: SlidersIcon },
];

/** The same sections for every role. */
export function getProfileTabs(_role: RoleDefinition): ProfileTab[] {
  return ALL_TABS;
}

/** "Rahul Kumar" -> ["Rahul", "Kumar"]; a one-word name leaves last blank. */
export function splitName(name: string): [string, string] {
  const [first = '', ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return [first, rest.join(' ')];
}

/**
 * What the profile shows before the real account loads (or if it fails to).
 * Deliberately blank — never a made-up person the form could save over the real one.
 */
export function getProfileIdentity(role: RoleDefinition) {
  return {
    first: '',
    last: '',
    name: 'Loading…',
    role: role.label,
    presence: 'Online',
  };
}






export const PASSWORD_HINT = 'Password must be at least 6 characters.';


/**
 * Preferences → Notifications. Each switch mutes some kinds of panel
 * notifications for this account only (see notification.service.js).
 */
export const NOTIFICATION_PREFERENCES: { key: string; label: string }[] = [
  { key: 'notifyWallet', label: 'Deposit & withdrawal notifications' },
  { key: 'notifyBetting', label: 'Bet, live match & risk notifications' },
  { key: 'notifySecurity', label: 'Security & login notifications' },
];



export const SAVE_ICON = CheckCircleIcon;
