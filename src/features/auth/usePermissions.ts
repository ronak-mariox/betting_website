import { createContext, useContext } from 'react';

export type GrantAction = 'E' | 'V' | 'X';

export type PermissionsValue = {
  /** `can('finance', 'fundTransfer', 'X')` — super-admin can always; nothing is allowed while loading. */
  can: (groupKey: string, permissionKey: string, action: GrantAction) => boolean;
  loaded: boolean;
};

export const PermissionsContext = createContext<PermissionsValue>({ can: () => false, loaded: false });

/**
 * The signed-in role's live permission matrix (what the Super Admin set on
 * the Permissions page), so pages show only what the account may do.
 * Provided once by PermissionsProvider.
 */
export function usePermissions(): PermissionsValue {
  return useContext(PermissionsContext);
}
