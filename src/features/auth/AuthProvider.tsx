import { closeRealtime } from '../../lib/realtime';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { RoleId } from '../../config/roles';
import { ApiRequestError, authApi, bindSession, setSessionListener } from '../../lib/api';
import { AuthContext } from './authContext';
import type { AuthUser, Credentials } from './authContext';

const STORAGE_KEY = 'betmaster.session';

type StoredSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, quota) — the session just won't survive a reload.
  }
}

/**
 * Talks to the real backend (see backend/README.md). `signIn` posts to
 * /auth/login and, when the caller passed a roleId (the Quick Demo Login
 * chips always do), the server cross-checks it against the account's real
 * role and returns the same "not valid for this panel" wording the old
 * client-side check used.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readStoredSession();
  const [user, setUser] = useState<AuthUser | null>(initial?.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(initial?.accessToken ?? null);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial?.refreshToken ?? null);
  /** Whether the current session should survive a reload — mirrors the last "Remember me" choice. */
  const [remembered, setRemembered] = useState(Boolean(initial));

  const signIn = useCallback(async ({ roleId, username, password, remember }: Credentials) => {
    try {
      const session = await authApi.login({ username, password, roleId });
      const nextUser: AuthUser = {
        username: session.user.username,
        roleId: session.user.role as RoleId,
        name: session.user.name,
      };

      setUser(nextUser);
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      setRemembered(remember);
      writeStoredSession(
        remember ? { user: nextUser, accessToken: session.accessToken, refreshToken: session.refreshToken } : null,
      );

      return null;
    } catch (err) {
      if (err instanceof ApiRequestError) return err.message;
      return 'Unable to reach the server. Please try again.';
    }
  }, []);

  const signOut = useCallback(() => {
    if (refreshToken) {
      authApi.logout(refreshToken, accessToken).catch(() => {
        // Best-effort: the local session is cleared regardless.
      });
    }
    closeRealtime();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    writeStoredSession(null);
  }, [accessToken, refreshToken]);

  const setTokens = useCallback(
    (nextAccessToken: string, nextRefreshToken: string) => {
      setAccessToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);
      if (remembered && user) {
        writeStoredSession({ user, accessToken: nextAccessToken, refreshToken: nextRefreshToken });
      }
    },
    [remembered, user],
  );

  // Keeps the API client's token pair in step with the session, and follows
  // the refreshes it does by itself when an access token expires mid-session.
  useEffect(() => {
    bindSession(accessToken && refreshToken ? { accessToken, refreshToken } : null);
  }, [accessToken, refreshToken]);

  useEffect(() => {
    setSessionListener({
      onRotate: (tokens) => setTokens(tokens.accessToken, tokens.refreshToken),
      onExpire: () => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        writeStoredSession(null);
      },
    });
    return () => setSessionListener(null);
  }, [setTokens]);

  // Confirms a session restored from localStorage is still valid (not
  // suspended, not deleted) rather than trusting it blindly. An expired
  // access token is refreshed by the API client itself (see lib/api.ts), so
  // only a rejected session signs the user out — a network blip doesn't.
  useEffect(() => {
    if (!initial) return;

    authApi
      .me(initial.accessToken)
      // The name may have changed (or never been stored) since this session was saved.
      .then((res) => setUser((current) => (current ? { ...current, name: res.user.name } : current)))
      .catch((err) => {
        if (!(err instanceof ApiRequestError) || err.status === 0) return;
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        writeStoredSession(null);
      });
    // Runs once, against the session that was on disk when the provider mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDisplayName = useCallback((name: string) => {
    setUser((current) => (current ? { ...current, name } : current));
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, signIn, signOut, setTokens, setDisplayName }),
    [user, accessToken, signIn, signOut, setTokens, setDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
