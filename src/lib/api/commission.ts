import { apiRequest } from '../api';

export type ApiCommissionLevel = 'Franchise' | 'Super Agent' | 'Agent' | 'Player';
export type ApiCommissionStatus = 'Pending' | 'Settled';
/** Session: markets decided during the match. Match: Match Odds / Bookmaker. */
export type ApiCommissionKind = 'Session' | 'Match';

type Ref = { _id: string; name?: string; username: string };

/** The entity ref on a commission row (`.populate('entity', 'name username role')`). */
export type ApiCommissionEntityRef = Ref & { role: string };

export type ApiCommission = {
  _id: string;
  entity: string | ApiCommissionEntityRef;
  level: ApiCommissionLevel;
  /** "YYYY-MM". */
  period: string;
  /** The match it was paid for. */
  event: (Ref & { name: string; startTime: string }) | string | null;
  /** The player whose bets earned it. */
  player: Ref | string | null;
  kind: ApiCommissionKind;
  /** What the rate applies to: the session stake or the player's match net loss. */
  turnover: number;
  /** Percent this account keeps, e.g. 0.5 = 0.5%. */
  rate: number;
  /** What it received from its upline and passed down (rate = received − given); older rows have none. */
  receivedRate?: number | null;
  givenRate?: number | null;
  commission: number;
  status: ApiCommissionStatus;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListCommissionParams = {
  level?: ApiCommissionLevel;
  status?: ApiCommissionStatus;
  kind?: ApiCommissionKind;
  /** One match's rows only. */
  event?: string;
};

/** One commission share in a match's settlement: what the account received, passed down and kept. */
export type SettlementShare = {
  kind: ApiCommissionKind;
  level: ApiCommissionLevel;
  account: { _id: string; name?: string; username: string; role: string };
  base: number;
  receivedRate: number | null;
  givenRate: number | null;
  rate: number;
  commission: number;
  reference: string;
  settledAt: string | null;
};

/** GET /commission/events/:id/settlement — the Complete Match breakdown (scoped to the caller's network). */
export type EventSettlement = {
  event: { _id: string; name: string; status: string; startTime: string; commissionSettledAt: string | null; commissionPaid: boolean };
  markets: {
    _id: string;
    name: string;
    type: string;
    kind: ApiCommissionKind;
    result: string;
    settledAt: string | null;
    bets: number;
    settlement: 'Settled' | 'Voided' | 'Awaiting result' | 'No bets';
  }[];
  players: {
    player: { _id: string; name: string; username: string };
    sessionStake: number;
    sessionResult: number;
    matchResult: number;
    openBets: number;
    shares: SettlementShare[];
  }[];
  totals: {
    players: number;
    sessionStake: number;
    sessionResult: number;
    matchResult: number;
    sessionCommission: number;
    matchCommission: number;
    byLevel: Partial<Record<ApiCommissionLevel, number>>;
  };
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const commissionApi = {
  list: (params: ListCommissionParams = {}, accessToken?: string | null) =>
    apiRequest<{ items: ApiCommission[] }>(`/commission${buildQuery(params)}`, { accessToken }),

  settlement: (eventId: string, accessToken?: string | null) =>
    apiRequest<EventSettlement>(`/commission/events/${eventId}/settlement`, { accessToken }),
};
