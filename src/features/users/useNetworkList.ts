import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { networkApi } from '../../lib/api/network';
import type { NetworkDetail, NetworkList, NetworkRole } from '../../lib/api/network';

export type NetworkListQuery = {
  role: NetworkRole;
  status?: 'active' | 'suspended';
  q?: string;
  page?: number;
  limit?: number;
};

/**
 * Loads one page of the caller's downline for a role. The search term is
 * debounced; `reload()` re-fetches after a create/edit/suspend.
 */
export function useNetworkList({ role, status, q = '', page = 1, limit = 25 }: NetworkListQuery) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<NetworkList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(q.trim());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    networkApi
      .list({ role, status, q: search || undefined, page, limit }, accessToken)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, role, status, search, page, limit, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { data, loading, error, reload };
}

/** Suspend / reactivate one account, reporting any error through `onError`. */
export function useStatusToggle(onDone: () => void, onError: (message: string) => void) {
  const { accessToken } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (id: string, next: 'active' | 'suspended') => {
    if (!accessToken) return;
    // Suspending signs the account out at once, so it's confirmed first.
    if (
      next === 'suspended' &&
      !window.confirm('Suspend this account?\n\nIt will be signed out right away and cannot log in until you reactivate it.')
    ) {
      return;
    }
    setBusyId(id);
    try {
      await networkApi.setStatus(id, next, accessToken);
      onDone();
    } catch (err) {
      onError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
    } finally {
      setBusyId(null);
    }
  };

  return { busyId, toggle };
}

/** Loads one account's record sheet; `reload()` refreshes it after a change. */
export function useNetworkDetail(accountId: string) {
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<NetworkDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    try {
      setDetail(await networkApi.detail(accountId, accessToken));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
    }
  }, [accessToken, accountId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { detail, error, setError, reload };
}
