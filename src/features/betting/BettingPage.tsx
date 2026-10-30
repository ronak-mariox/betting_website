import { Loader } from '../../components/ui/Loader/Loader';
import { useLiveRefresh } from '../../lib/realtime';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BanIcon, CheckCircleIcon, EyeIcon, RefreshIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { formatMoney } from '../../lib/format';
import { ApiRequestError } from '../../lib/api';
import { bettingApi } from '../../lib/api/betting';
import type { ApiMatch, ApiProvider } from '../../lib/api/betting';
import { eventsApi } from '../../lib/api/events';
import { useAuth } from '../auth/authContext';
import { MATCH_TABS, PROVIDER_STATUS_TONE, bettingStats, filterMatchesForTab, matchMeta } from './bettingData';
import type { MatchTab } from './bettingData';
import { MatchDrawer } from './MatchDrawer';
import styles from './BettingPage.module.css';

const TABS = MATCH_TABS.map((label) =>
  label === 'Live' ? { label, dot: true, rgb: '255, 46, 99' } : { label },
);

/** Betting board — node 112:3861. */
export function BettingPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<MatchTab>('Live');
  const [open, setOpen] = useState<ApiMatch | null>(null);

  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Live: odds, match status and new bets refresh this page as they happen.
  useLiveRefresh(['odds', 'matches:changed', 'admin:changed'], () => setReloadKey((key) => key + 1));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    // No `tab` param — every tab is derived client-side, see bettingData.ts.
    Promise.all([bettingApi.matches(undefined, accessToken), bettingApi.providers(accessToken)])
      .then(([matchesRes, providersRes]) => {
        if (cancelled) return;
        setMatches(matchesRes.matches);
        setProviders(providersRes.providers);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : 'Unable to load the betting board.');
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  const stats = useMemo(() => bettingStats(matches, providers), [matches, providers]);
  const rows = useMemo(() => filterMatchesForTab(matches, tab), [matches, tab]);

  const handleSyncAll = async () => {
    if (!accessToken) return;
    setSyncing(true);
    try {
      const res = await bettingApi.syncAllProviders(accessToken);
      setProviders(res.providers);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to sync providers.');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (match: ApiMatch, status: 'Live' | 'Suspended') => {
    if (!accessToken) return;
    setSuspendingId(match._id);
    try {
      const res = await eventsApi.updateStatus(match._id, status, accessToken);
      setMatches((current) =>
        current.map((item) => (item._id === res.event._id ? { ...item, ...res.event } : item)),
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to update this match.');
    } finally {
      setSuspendingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <p className={styles.cardTitle}>API Provider Status</p>
          <Button variant="quiet" size="xs" icon={<RefreshIcon size={12} />} onClick={handleSyncAll} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync All'}
          </Button>
        </div>

        <div className={styles.providers}>
          {providers.length === 0 ? (
            <p className={styles.empty}>{pending ? <Loader label="Loading providers…" /> : 'No providers configured.'}</p>
          ) : (
            providers.map((provider) => (
              <div
                key={provider._id}
                className={styles.provider}
                style={
                  {
                    '--provider-bg': provider.healthy ? 'rgba(34, 197, 94, 0.04)' : 'var(--color-surface-subtle)',
                    '--provider-border': provider.healthy ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-border)',
                    '--provider-accent': provider.healthy ? 'var(--color-success)' : 'var(--color-text-muted)',
                  } as CSSProperties
                }
              >
                <div>
                  <p className={styles.providerName}>{provider.name}</p>
                  <p className={styles.providerMeta}>
                    Latency: <span className={styles.latency}>{provider.latency}ms</span> · {provider.marketsCount} markets
                  </p>
                </div>
                <div className={styles.providerRight}>
                  <Badge tone={PROVIDER_STATUS_TONE[provider.status]}>{provider.status}</Badge>
                  <span className={styles.uptime}>{provider.uptime}%</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.card}>
        <PillTabs items={TABS} value={tab} label="Match state" onChange={(value) => setTab(value as MatchTab)} />

        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger)', margin: '12px 0 0', fontSize: 12 }}>
            {error}
          </p>
        ) : null}

        <div className={styles.matches}>
          {rows.length === 0 ? (
            <p className={styles.empty}>{pending ? <Loader label="Loading matches…" /> : 'No matches in this state.'}</p>
          ) : (
            rows.map((match) => (
              <article key={match._id} className={styles.match}>
                <div className={styles.matchMain}>
                  <span className={styles.emoji} aria-hidden="true">
                    {match.emoji}
                  </span>
                  <div>
                    <div className={styles.matchTitleRow}>
                      <span className={styles.matchName}>{match.name}</span>
                      {match.status === 'Live' ? (
                        <>
                          <span className={styles.liveDot} aria-hidden="true" />
                          <Badge tone="danger">LIVE</Badge>
                        </>
                      ) : null}
                    </div>
                    <p className={styles.matchMeta}>{matchMeta(match)}</p>
                    <p className={styles.matchScore}>{match.score}</p>
                  </div>
                </div>

                <div className={styles.matchRight}>
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>Stake</span>
                    <span className={styles.stake}>{formatMoney(match.stake)}</span>
                  </div>
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>Exposure</span>
                    <span className={styles.exposure}>{formatMoney(match.exposure)}</span>
                  </div>
                  <div className={styles.matchActions}>
                    <Button className={styles.view} size="xs" icon={<EyeIcon size={12} />} onClick={() => setOpen(match)}>
                      View
                    </Button>
                    {match.status === 'Live' || (match.provider === 'diamond' && match.status === 'Upcoming') ? (
                      <Button
                        className={styles.suspend}
                        size="xs"
                        icon={<BanIcon size={12} />}
                        onClick={() => handleToggleStatus(match, 'Suspended')}
                        disabled={suspendingId === match._id}
                      >
                        Suspend
                      </Button>
                    ) : match.status !== 'Settled' && match.status !== 'Completed' ? (
                      <Button
                        variant="primary"
                        size="xs"
                        icon={<CheckCircleIcon size={12} />}
                        onClick={() => handleToggleStatus(match, 'Live')}
                        disabled={suspendingId === match._id}
                      >
                        {match.provider === 'diamond' ? 'Resume' : 'Activate'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {open ? (
        <MatchDrawer
          match={open}
          onClose={() => setOpen(null)}
          onChanged={() => setReloadKey((key) => key + 1)}
        />
      ) : null}
    </div>
  );
}
