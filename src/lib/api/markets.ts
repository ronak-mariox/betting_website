import { apiRequest } from '../api';

export type ApiMarketStatus = 'Active' | 'Suspended';

/** The event ref on a market as populated by `GET /markets` (`.populate('event', 'name sport status')`). */
export type ApiMarketEventRef = {
  _id: string;
  name: string;
  sport: string;
  status: string;
};

export type ApiMarket = {
  _id: string;
  /** A populated ref on list responses, a bare id string when just created/updated. */
  event: string | ApiMarketEventRef;
  code: string;
  name: string;
  type: string;
  backOdds: number;
  layOdds: number;
  maxBet: number;
  maxExposure: number;
  status: ApiMarketStatus;
  /** Backable selections; empty = the event's two sides at back / lay odds. */
  runners?: { name: string; odds: number; active?: boolean; line?: number | null; rate?: number | null }[];
  /** 'back' — pick a selection; 'session' — No / Yes on a run line (settled by runs); 'view' — shown only. */
  betStyle?: 'back' | 'session' | 'view';
  /** The app tab it's listed under ("Match Odds", "Normal", "Odd Even", …). */
  group?: string;
  /** Feed type: match, match1, fancy, fancy1, fancy2, oddeven, cricketcasino, meter. */
  providerType?: string;
  remark?: string;
  /** Feed markets (Diamond): prices and status come from the feed, so they aren't edited by hand. */
  externalId?: string | null;
  /** Last raw answer from the feed's result endpoint, while the market waits for a result. */
  lastResult?: string;
  /** Set once the market is settled. */
  winner?: string | null;
  settledAt?: string | null;
  /** Cached rollups from this market's bets. */
  bets: number;
  stake: number;
  exposure: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMarketPayload = {
  event: string;
  code: string;
  name: string;
  type?: string;
  backOdds?: number;
  layOdds?: number;
  maxBet?: number;
  maxExposure?: number;
  status?: ApiMarketStatus;
  /** What players can back, each at its own price. Back / lay odds follow the first two. */
  runners?: { name: string; odds: number }[];
};

export type UpdateMarketPayload = Partial<Omit<CreateMarketPayload, 'event'>>;

export type ListMarketsParams = {
  eventId?: string;
  status?: ApiMarketStatus;
  type?: string;
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const marketsApi = {
  list: (params: ListMarketsParams = {}, accessToken?: string | null) =>
    apiRequest<{ markets: ApiMarket[] }>(`/markets${buildQuery(params)}`, { accessToken }),

  create: (payload: CreateMarketPayload, accessToken?: string | null) =>
    apiRequest<{ market: ApiMarket }>('/markets', { method: 'POST', body: payload, accessToken }),

  /** Partial update — PATCH /markets/:id. */
  update: (id: string, payload: UpdateMarketPayload, accessToken?: string | null) =>
    apiRequest<{ market: ApiMarket }>(`/markets/${id}`, { method: 'PATCH', body: payload, accessToken }),

  updateStatus: (id: string, status: ApiMarketStatus, accessToken?: string | null) =>
    apiRequest<{ market: ApiMarket }>(`/markets/${id}/status`, {
      method: 'PATCH',
      body: { status },
      accessToken,
    }),

  /** Settles every open bet on the market with `winner` and closes it for good. */
  /** No result: open bets are voided and their stakes released. */
  void: (id: string, reason: string, accessToken?: string | null) =>
    apiRequest<{ market: ApiMarket; voided: number; released: number }>(`/markets/${id}/void`, {
      method: 'POST',
      body: { reason },
      accessToken,
    }),

  settle: (id: string, winner: string, accessToken?: string | null) =>
    apiRequest<{ market: ApiMarket; settled: number; won: number; lost: number }>(`/markets/${id}/settle`, {
      method: 'POST',
      body: { winner },
      accessToken,
    }),

  /** Bulk-suspends Active markets — one event's, or every one when `eventId` is omitted. Response is `{ modifiedCount }`. */
  suspendAll: (accessToken?: string | null, eventId?: string) =>
    apiRequest<{ modifiedCount: number }>('/markets/suspend-all', {
      method: 'POST',
      body: eventId ? { eventId } : {},
      accessToken,
    }),
};
