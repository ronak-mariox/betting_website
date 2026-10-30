import { apiRequest } from '../api';
import type { PermissionGroup } from '../api';

/** Matches backend ROLE_KEYS — see backend/src/constants/permissions.js. */
export type PermissionRoleKey = 'superAgent' | 'agent' | 'franchise';

export type PermissionMatrix = Record<PermissionRoleKey, PermissionGroup[]>;

export const permissionsApi = {
  /** Every staff role's live matrix (super-admin only). */
  matrix: (accessToken: string) =>
    apiRequest<{ roles: PermissionMatrix }>('/permissions', { accessToken }),

  /** Replaces one cell's grant ('' off, or any mix of E / V / X). */
  setGrant: (
    accessToken: string,
    roleKey: PermissionRoleKey,
    groupKey: string,
    permissionKey: string,
    grant: string,
  ) =>
    apiRequest<{ groups: PermissionGroup[] }>(`/permissions/${roleKey}/${groupKey}/${permissionKey}`, {
      method: 'PUT',
      body: { grant },
      accessToken,
    }),
};
