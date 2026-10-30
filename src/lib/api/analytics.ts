import { apiRequest } from '../api';

export type AnalyticsDimension = 'revenue' | 'users' | 'sports' | 'commission';

/** revenue/users/commission are monthly series; sports is grouped by sport name. */
export type AnalyticsSeriesPoint = { month: string; value: number } | { sport: string; value: number };

export type AnalyticsSeriesResponse = {
  dimension: AnalyticsDimension;
  series: AnalyticsSeriesPoint[];
};

export type AnalyticsHighlights = {
  totalUsers: number;
  totalBets: number;
  totalTurnover: number;
  totalCommission: number;
};

type Compare = { current: number; previous: number };

/** Last 30 days vs the 30 days before (see analytics.service.js getGrowth). */
export type AnalyticsGrowth = {
  revenue: Compare;
  betVolume: Compare;
  newPlayers: Compare;
  activePlayers: number;
  totalPlayers: number;
};

export const analyticsApi = {
  growth: (accessToken: string) => apiRequest<{ growth: AnalyticsGrowth }>('/analytics/growth', { accessToken }),

  series: (dimension: AnalyticsDimension, accessToken: string) =>
    apiRequest<AnalyticsSeriesResponse>(`/analytics/series?dimension=${dimension}`, { accessToken }),

  highlights: (accessToken: string) =>
    apiRequest<{ highlights: AnalyticsHighlights }>('/analytics/highlights', { accessToken }),
};
