import { apiRequest } from '../api';

/** The event ref on a market as populated by `GET /risk/exposure` (`.populate('event', 'name sport')`). */
export type ApiRiskEventRef = {
  _id: string;
  name: string;
  sport: string;
};

/** A Market document, as returned by the risk endpoints (`risk.service.js#getExposure`). */
/** Settings → Exposure Limits: utilization % at which a market reads Warning / Critical. */
export type RiskThresholds = { warningPercent: number; criticalPercent: number };

export type ApiRiskMarket = {
  _id: string;
  event: string | ApiRiskEventRef;
  code: string;
  name: string;
  type: string;
  backOdds: number;
  layOdds: number;
  maxBet: number;
  maxExposure: number;
  status: 'Active' | 'Suspended';
  bets: number;
  stake: number;
  exposure: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiRiskStats = {
  flaggedCount: number;
  patternCount: number;
  highExposureMarkets: number;
  largePendingRequests: number;
};

/** The user ref on a flagged user / pattern / wallet request (`.populate(..., 'name username')`). */
export type ApiRiskUserRef = {
  _id: string;
  name: string;
  username: string;
};

export type ApiFlaggedUser = {
  _id: string;
  user: string | ApiRiskUserRef;
  score: number;
  reason: string;
  active: boolean;
  /** Detection rule that raised it, e.g. 'win-rate', 'cash-cycling' (riskDetection.service.js). */
  rule?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiSuspiciousPattern = {
  _id: string;
  description: string;
  relatedUsers: (string | ApiRiskUserRef)[];
  severity: 'Low' | 'Medium' | 'High';
  detectedAt: string;
  resolved: boolean;
  key?: string;
};

export type ApiRiskScanResult = { newFlags: number; newPatterns: number; checkedFlags: number; checkedPatterns: number };

export type ApiLargePendingRequest = {
  _id: string;
  user: string | ApiRiskUserRef;
  kind: 'deposit' | 'withdrawal';
  amount: number;
  method: string;
  reference: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
};

/** `risk.service.js#getPanels` — `{ flaggedUsers, patterns, largePendingRequests }`. */
export type ApiRiskPanels = {
  flaggedUsers: ApiFlaggedUser[];
  patterns: ApiSuspiciousPattern[];
  largePendingRequests: ApiLargePendingRequest[];
};

export const riskApi = {
  stats: (accessToken?: string | null) => apiRequest<{ stats: ApiRiskStats }>('/risk/stats', { accessToken }),

  exposure: (accessToken?: string | null) =>
    apiRequest<{ markets: ApiRiskMarket[]; thresholds?: RiskThresholds }>('/risk/exposure', { accessToken }),

  panels: (accessToken?: string | null) => apiRequest<ApiRiskPanels>('/risk/panels', { accessToken }),

  /** Runs the detection rules now; returns what was new plus the refreshed panels. */
  scan: (accessToken?: string | null) =>
    apiRequest<ApiRiskPanels & { result: ApiRiskScanResult }>('/risk/scan', { method: 'POST', accessToken }),

  resolveFlag: (id: string, accessToken?: string | null) =>
    apiRequest<{ flagged: ApiFlaggedUser }>(`/risk/flagged/${id}/resolve`, { method: 'PATCH', accessToken }),

  resolvePattern: (id: string, accessToken?: string | null) =>
    apiRequest<{ pattern: ApiSuspiciousPattern }>(`/risk/patterns/${id}/resolve`, { method: 'PATCH', accessToken }),

  suspendExposure: (marketId: string, accessToken?: string | null) =>
    apiRequest<{ market: ApiRiskMarket }>(`/risk/exposure/${marketId}/suspend`, {
      method: 'PATCH',
      accessToken,
    }),
};
