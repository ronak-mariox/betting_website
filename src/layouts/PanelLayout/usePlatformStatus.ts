import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

export type PlatformStatus = {
  status: 'ok' | 'degraded';
  dbMs: number;
  cpu: number;
  uptimeSeconds: number;
  liveMatches: number;
};

const POLL_MS = 30_000;

/** `/health`, refreshed every 30s; null until the first answer or while the API is unreachable. */
export function usePlatformStatus() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiRequest<PlatformStatus>('/health')
        .then((next) => !cancelled && setStatus(next))
        .catch(() => !cancelled && setStatus(null));
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return status;
}

/** 93784 → "1d 2h", 5400 → "1h 30m", 90 → "1m". */
export function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}
