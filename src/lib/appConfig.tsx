import { Fragment, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { API_BASE_URL } from './api';
import { AppConfigContext, DEFAULT_APP_CONFIG } from './appConfigContext';
import type { AppConfig } from './appConfigContext';
import { setCurrency, setTimezone } from './format';
import { useLiveRefresh } from './realtime';
import { useAuth } from '../features/auth/authContext';

const STORAGE_KEY = 'bettingweb.appConfig';

const readStored = (): AppConfig => {
  try {
    return { ...DEFAULT_APP_CONFIG, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULT_APP_CONFIG;
  }
};

/** Puts currency / timezone into the format helpers before anything renders with them. */
const apply = (config: AppConfig) => {
  setCurrency(config.currency);
  setTimezone(config.timezone);
  return config;
};

/**
 * Platform Settings the panels follow — currency and timezone for every
 * figure, support contacts, the marquee and staff announcements. Reloaded
 * when the server says Settings / CMS changed. Inside AuthProvider (the live
 * socket needs the session).
 */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [config, setConfig] = useState<AppConfig>(() => apply(readStored()));

  const refresh = useCallback(async () => {
    try {
      // Signed in, the server adds the announcements published for staff.
      const res = await fetch(`${API_BASE_URL}/app-config`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) return;
      const next = apply({ ...DEFAULT_APP_CONFIG, announcements: [], ...(await res.json()).config });
      setConfig(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the config still applies for this visit.
      }
    } catch {
      // Offline: keep the last known config.
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useLiveRefresh(['config:changed'], () => void refresh(), 500);

  return (
    <AppConfigContext.Provider value={config}>
      {/* A new currency / timezone redraws every figure (the format helpers aren't React state). */}
      <Fragment key={`${config.currency.code}|${config.timezone}`}>{children}</Fragment>
    </AppConfigContext.Provider>
  );
}
