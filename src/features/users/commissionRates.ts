import type { AccountRef } from '../../lib/api/network';
import { useAuth } from '../auth/authContext';

/**
 * Session / match commission: every account receives a percent from its
 * upline and keeps what it doesn't pass down. Shared by the staff and player
 * forms.
 */
export type CommissionCap = { match: number; session: number } | null;

/** The most an account under `parent` can be given; null under super-admin (it sets the whole rate). */
export function commissionCap(parent: AccountRef | null | undefined): CommissionCap {
  if (!parent || parent.role === 'super-admin') return null;
  return { match: parent.matchCommission ?? 0, session: parent.sessionCommission ?? 0 };
}

export function commissionLabel(kind: 'Match' | 'Session', cap: CommissionCap): string {
  const max = cap ? (kind === 'Match' ? cap.match : cap.session) : null;
  return max === null ? `${kind} Commission %` : `${kind} Commission % (max ${max}%)`;
}

/** '' = 0%; anything else must be a percent within the upline's own rate. */
export function parseCommission(kind: 'Match' | 'Session', raw: string, cap: CommissionCap): number {
  if (raw.trim() === '') return 0;
  const value = Number(raw);
  const max = cap ? (kind === 'Match' ? cap.match : cap.session) : 100;
  if (Number.isNaN(value) || value < 0 || value > max) {
    throw new Error(`${kind} commission must be between 0 and ${max}%.`);
  }
  return value;
}

/** "Match 2% · Session 3%" for drawers and lists. */
export const describeCommission = (account: { matchCommission?: number; sessionCommission?: number }) =>
  `Match ${account.matchCommission ?? 0}% · Session ${account.sessionCommission ?? 0}%`;

/**
 * True for an account the signed-in user sits directly above: that upline sets
 * the rates it passes down even without the edit grant.
 */
export function useIsDirectUpline(): (account: { parent?: AccountRef | null }) => boolean {
  const { user } = useAuth();
  return (account) => Boolean(user && account.parent?.username === user.username);
}
