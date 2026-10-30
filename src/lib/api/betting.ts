import { apiRequest } from '../api';
import type { ApiEvent } from './events';
import type { ApiMarket } from './markets';

export type ApiProviderStatus = 'Connected' | 'Disconnected' | 'Syncing';

export type ApiProvider = {
  _id: string;
  name: string;
  /** Milliseconds. */
  latency: number;
  marketsCount: number;
  /** Percent, 0-100. */
  uptime: number;
  status: ApiProviderStatus;
  healthy: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** An Event + its Markets, as returned by `GET /betting/matches` — see betting.service.js#listMatches. */
export type ApiMatch = ApiEvent & { markets: ApiMarket[] };

export type BettingTab = 'live' | 'upcoming' | 'completed';

export const bettingApi = {
  matches: (tab?: BettingTab, accessToken?: string | null) =>
    apiRequest<{ matches: ApiMatch[] }>(`/betting/matches${tab ? `?tab=${tab}` : ''}`, { accessToken }),

  providers: (accessToken?: string | null) =>
    apiRequest<{ providers: ApiProvider[] }>('/betting/providers', { accessToken }),

  /** Stub sync — marks every provider Connected/healthy. See betting.service.js#syncAllProviders. */
  syncAllProviders: (accessToken?: string | null) =>
    apiRequest<{ providers: ApiProvider[] }>('/betting/providers/sync-all', {
      method: 'POST',
      accessToken,
    }),
};
