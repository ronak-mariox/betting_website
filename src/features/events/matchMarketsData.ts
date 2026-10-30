import type { BadgeTone } from '../../components/ui/Badge/Badge';

/** Open = taking bets, Suspended = paused, Closed = settled or voided (never reopens). */
export function marketStatusLabel(market: { status: string; winner?: string | null }): { label: 'Open' | 'Suspended' | 'Closed'; tone: BadgeTone } {
  if (market.winner) return { label: 'Closed', tone: 'neutral' };
  return market.status === 'Active' ? { label: 'Open', tone: 'success' } : { label: 'Suspended', tone: 'warning' };
}

/** Settlement status of one market of a finished match. */
export function marketSettlement(market: { winner?: string | null; bets: number }): { label: string; tone: BadgeTone } {
  if (market.winner === 'Void') return { label: 'Voided · stakes returned', tone: 'warning' };
  if (market.winner) return { label: 'Settled', tone: 'success' };
  return market.bets ? { label: 'Awaiting result', tone: 'danger' } : { label: 'No bets', tone: 'neutral' };
}
