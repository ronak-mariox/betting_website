import { createContext, useContext } from 'react';
import type { RoleId } from '../../config/roles';

export type AuthUser = {
  username: string;
  roleId: RoleId;
  /** The account's own name, shown in the sidebar and topbar; '' until set. */
  name?: string;
};

export type Credentials = {
  roleId: RoleId;
  username: string;
  password: string;
  remember: boolean;
};

export type AuthContextValue = {
  user: AuthUser | null;
  /** Bearer token for calling other authenticated endpoints; null when signed out. */
  accessToken: string | null;
  /** Resolves to an error message, or null when the sign-in succeeded. */
  signIn: (credentials: Credentials) => Promise<string | null>;
  signOut: () => void;
  /**
   * Swaps in a fresh access/refresh pair without a full sign-in — needed
   * after changing the password, which revokes every previously issued
   * token (including the one this session was using) and returns new ones.
   */
  setTokens: (accessToken: string, refreshToken: string) => void;
  /** Called after the profile is edited so the shell shows the new name at once. */
  setDisplayName: (name: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
