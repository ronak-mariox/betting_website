import { apiRequest } from '../api';
import type { ApiRole } from '../api';

type UserRef = { _id: string; username: string; name?: string; role: ApiRole } | null;

export type AuditLogEntry = {
  _id: string;
  actor: UserRef;
  actorUsername: string;
  action: string;
  target: UserRef;
  status: 'success' | 'failed';
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogPage = { items: AuditLogEntry[]; total: number; page: number; limit: number };

export type PlatformSession = {
  _id: string;
  user: UserRef;
  ip: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type SecurityStats = {
  activeSessions: number;
  activeUsers: number;
  /** Failed sign-ins in the last 24 hours, and in the 24 hours before that. */
  failedLogins: number;
  failedLoginsPrev: number;
  logins: number;
};

export const securityApi = {
  stats: (accessToken: string) => apiRequest<SecurityStats>('/auth/security/stats', { accessToken }),

  auditLogs: (accessToken: string, params: { page?: number; limit?: number; actions?: string[] } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.actions?.length) query.set('action', params.actions.join(','));
    return apiRequest<AuditLogPage>(`/auth/audit-logs?${query}`, { accessToken });
  },

  sessions: (accessToken: string) =>
    apiRequest<{ sessions: PlatformSession[] }>('/auth/security/sessions', { accessToken }),

  revokeSession: (accessToken: string, sessionId: string) =>
    apiRequest<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE', accessToken }),

  /** Signs every other account out; the caller's own devices stay signed in. */
  revokeAll: (accessToken: string) =>
    apiRequest<{ revoked: number }>('/auth/security/sessions/revoke-all', { method: 'POST', accessToken }),
};
