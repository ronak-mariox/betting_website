import { apiRequest } from '../api';
import type { ApiMarket } from './markets';

export type ApiEventStatus = 'Live' | 'Upcoming' | 'Suspended' | 'Completed' | 'Settled';

export type ApiEvent = {
  _id: string;
  sport: string;
  league: string;
  name: string;
  emoji: string;
  score: string;
  /** ISO date string. */
  startTime: string;
  status: ApiEventStatus;
  /** Cached rollups from this event's markets/bets. */
  stake: number;
  exposure: number;
  createdBy: string | null;
  /** 'diamond' for fixtures from the odds feed (prices and status sync automatically), else 'manual'. */
  provider?: string;
  externalId?: string | null;
  hasStream?: boolean;
  /** Feed matches: embeddable live score card and video (match/event detail responses only). */
  scoreUrl?: string | null;
  streamUrl?: string | null;
  /** Set once the match's commission has been paid (the match is then Settled). */
  commissionSettledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiEventBetUser = {
  _id: string;
  name: string;
  username: string;
};

export type ApiEventBet = {
  _id: string;
  event: string;
  market: string;
  user: ApiEventBetUser | string;
  selection: string;
  odds: number;
  amount: number;
  status: 'Pending' | 'Won' | 'Lost' | 'Void' | 'Cashed Out';
  placedAt: string;
  createdAt: string;
  updatedAt: string;
};

/** `GET /events/:id` response — see event.service.js#getEvent. */
export type ApiEventDetail = {
  event: ApiEvent;
  markets: ApiMarket[];
  /** Last 20 bets placed on this event, newest first. */
  recentBets: ApiEventBet[];
};

export type CreateEventPayload = {
  sport: string;
  name: string;
  league?: string;
  emoji?: string;
  /** ISO 8601. */
  startTime: string;
};

export type ListEventsParams = {
  status?: ApiEventStatus;
  sport?: string;
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const eventsApi = {
  list: (params: ListEventsParams = {}, accessToken?: string | null) =>
    apiRequest<{ events: ApiEvent[] }>(`/events${buildQuery(params)}`, { accessToken }),

  get: (id: string, accessToken?: string | null) =>
    apiRequest<ApiEventDetail>(`/events/${id}`, { accessToken }),

  create: (payload: CreateEventPayload, accessToken?: string | null) =>
    apiRequest<{ event: ApiEvent }>('/events', { method: 'POST', body: payload, accessToken }),

  /** The score line shown to players on the match; '' clears it. */
  updateScore: (id: string, score: string, accessToken?: string | null) =>
    apiRequest<{ event: ApiEvent }>(`/events/${id}/score`, { method: 'PATCH', body: { score }, accessToken }),

  /** Suspended/Completed/Settled also suspend the event's active markets server-side. */
  updateStatus: (id: string, status: ApiEventStatus, accessToken?: string | null) =>
    apiRequest<{ event: ApiEvent }>(`/events/${id}/status`, {
      method: 'PATCH',
      body: { status },
      accessToken,
    }),
};
