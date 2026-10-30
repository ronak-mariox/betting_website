import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest } from '../../lib/api';
import type { PermissionGroup } from '../../lib/api';
import { useLiveRefresh } from '../../lib/realtime';
import { useAuth } from './authContext';
import { PermissionsContext } from './usePermissions';
import type { GrantAction } from './usePermissions';

/**
 * Loads the signed-in staff role's live permission matrix once for the whole
 * panel, and again whenever the Super Admin changes it (pushed over the socket),
 * so the menu and buttons follow the Permissions page without a reload.
 */
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const isAdmin = user?.roleId === 'super-admin';

  const load = useCallback(() => {
    if (!accessToken || isAdmin) return;
    apiRequest<{ groups: PermissionGroup[] | null }>('/accounts/me/permissions', { accessToken })
      .then((res) => setGroups(res.groups ?? []))
      .catch(() => setGroups((current) => current ?? []));
  }, [accessToken, isAdmin]);

  useEffect(() => {
    setGroups(null);
    load();
    // A different account means a different matrix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, user?.roleId]);

  useLiveRefresh(['permissions:changed'], load, 300);

  const can = useCallback(
    (groupKey: string, permissionKey: string, action: GrantAction) => {
      if (isAdmin) return true;
      const grant = groups
        ?.find((group) => group.key === groupKey)
        ?.permissions.find((permission) => permission.key === permissionKey)?.grant;
      // Same rule as the server: the master switch (E) must be on as well as the asked-for right.
      return Boolean(grant?.includes('E') && grant.includes(action));
    },
    [groups, isAdmin],
  );

  const value = useMemo(() => ({ can, loaded: isAdmin || groups !== null }), [can, isAdmin, groups]);
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
