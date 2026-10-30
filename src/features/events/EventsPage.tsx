import { Loader } from '../../components/ui/Loader/Loader';
import { useLiveRefresh } from '../../lib/realtime';
import { useEffect, useMemo, useState } from 'react';
import { BanIcon, CheckCircleIcon, EyeIcon, PlusIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { cx } from '../../lib/cx';
import { formatCount, formatMoney, formatStartTime } from '../../lib/format';
import { ApiRequestError } from '../../lib/api';
import { eventsApi } from '../../lib/api/events';
import type { ApiEvent } from '../../lib/api/events';
import { marketsApi } from '../../lib/api/markets';
import type { ApiMarket } from '../../lib/api/markets';
import { useAuth } from '../auth/authContext';
import { EventDrawer } from './EventDrawer';
import { EventFormModal } from './EventFormModal';
import { COMPLETE_STATUSES, EVENT_STATUS_TONE, IN_PLAY_STATUSES, eventStats, marketsByEvent } from './eventsData';
import type { EventsView } from './eventsData';
import { MatchMarketsTable, SettlementModal } from './MatchMarkets';
import type { MatchMarketRow } from './MatchMarkets';
import { usePermissions } from '../auth/usePermissions';
import styles from './EventsPage.module.css';

/**
 * Events board — node 112:4629. Split into In-Play (live, upcoming,
 * suspended) and Complete Match (finished, with results and settlement).
 */
export function EventsPage({ view }: { view: EventsView }) {
  const { accessToken } = useAuth();
  const { can } = usePermissions();
  const complete = view === 'complete';
  const statuses = complete ? COMPLETE_STATUSES : IN_PLAY_STATUSES;
  const [filter, setFilter] = useState<string>('All');
  const [settlementOf, setSettlementOf] = useState<ApiEvent | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bumped to re-run the load effect after a mutation (create/status change). */
  const [reloadKey, setReloadKey] = useState(0);
  // Live: match status and new bets refresh this page as they happen.
  useLiveRefresh(['matches:changed', 'admin:changed'], () => setReloadKey((key) => key + 1));

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    Promise.all([eventsApi.list({}, accessToken), marketsApi.list({}, accessToken)])
      .then(([eventsRes, marketsRes]) => {
        if (cancelled) return;
        setEvents(eventsRes.events);
        setMarkets(marketsRes.markets);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : 'Unable to load events.');
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  const byEvent = useMemo(() => marketsByEvent(markets), [markets]);
  const stats = useMemo(() => eventStats(events, markets), [events, markets]);
  const rows = useMemo(
    () =>
      events
        .filter((event) => statuses.includes(event.status))
        .filter((event) => filter === 'All' || event.status === filter),
    [events, filter, statuses],
  );
  const marketRows = useMemo<MatchMarketRow[]>(
    () =>
      rows.flatMap((event) =>
        (byEvent.get(event._id) ?? []).map((market) => ({
          id: market._id,
          matchId: event._id,
          matchName: event.name,
          marketName: market.name,
          marketType: market.type,
          status: market.status,
          winner: market.winner,
          bets: market.bets,
          runners: market.runners?.length
            ? market.runners
            : [
                { name: 'Back', odds: market.backOdds },
                { name: 'Lay', odds: market.layOdds },
              ],
        })),
      ),
    [rows, byEvent],
  );
  /** Finished match: settled once commission is paid; otherwise what it still waits for. */
  const settlementStatus = (event: ApiEvent) => {
    if (event.commissionSettledAt) return { label: 'Settled · commission paid', tone: 'success' as const };
    const waiting = (byEvent.get(event._id) ?? []).some((market) => !market.winner && market.bets > 0);
    return waiting ? { label: 'Awaiting results', tone: 'danger' as const } : { label: 'Commission being paid', tone: 'warning' as const };
  };

  const updateStatus = async (event: ApiEvent, status: ApiEvent['status']) => {
    if (!accessToken) return;
    try {
      const res = await eventsApi.updateStatus(event._id, status, accessToken);
      setEvents((current) => current.map((item) => (item._id === res.event._id ? res.event : item)));
      // A status move to Completed/Settled auto-suspends this event's active markets server-side.
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to update the event.');
    }
  };

  const handleCreate = async (payload: Parameters<typeof eventsApi.create>[0]) => {
    if (!accessToken) return;
    const res = await eventsApi.create(payload, accessToken);
    setEvents((current) => [...current, res.event]);
    setShowAdd(false);
  };

  const columns: Column<ApiEvent>[] = [
    {
      key: 'event',
      header: 'Event',
      render: (event) => (
        <div className={styles.event}>
          <span className={styles.eventEmoji} aria-hidden="true">
            {event.emoji}
          </span>
          <div>
            <p className={styles.eventName}>{event.name}</p>
            {event.score ? <p className={styles.eventScore}>{event.score}</p> : null}
            <p className={styles.eventCode}>{event._id}</p>
          </div>
        </div>
      ),
    },
    { key: 'league', header: 'League / Series', render: (event) => <span className={styles.muted}>{event.league || '—'}</span> },
    {
      key: 'start',
      header: 'Start Time',
      render: (event) =>
        event.status === 'Live' ? (
          <span className={styles.inPlay}>
            <span className={styles.dot} aria-hidden="true" />
            In Play
          </span>
        ) : (
          <span className={styles.muted}>{formatStartTime(event.startTime)}</span>
        ),
    },
    {
      key: 'markets',
      header: 'Markets',
      render: (event) => <span className={styles.strong}>{byEvent.get(event._id)?.length ?? 0}</span>,
    },
    {
      key: 'bets',
      header: 'Total Bets',
      render: (event) => {
        const eventMarkets = byEvent.get(event._id) ?? [];
        const bets = eventMarkets.reduce((sum, market) => sum + market.bets, 0);
        return <span className={styles.strong}>{formatCount(bets)}</span>;
      },
    },
    {
      key: 'exposure',
      header: 'Exposure',
      render: (event) =>
        event.exposure === 0 ? (
          <span className={styles.muted}>—</span>
        ) : (
          <span className={styles.exposure}>{formatMoney(event.exposure)}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => <Badge tone={EVENT_STATUS_TONE[event.status]}>{event.status}</Badge>,
    },
    ...(complete
      ? [
          {
            key: 'settlement',
            header: 'Settlement',
            render: (event: ApiEvent) => {
              const settlement = settlementStatus(event);
              return <Badge tone={settlement.tone}>{settlement.label}</Badge>;
            },
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Actions',
      render: (event) =>
        complete ? (
          <div className={styles.rowActions}>
            <Button className={styles.activity} size="xs" icon={<EyeIcon size={12} />} onClick={() => setOpenId(event._id)}>
              Activity
            </Button>
            {can('finance', 'commission', 'V') ? (
              <Button className={styles.activity} size="xs" onClick={() => setSettlementOf(event)}>
                Settlement
              </Button>
            ) : null}
          </div>
        ) : (
        <div className={styles.rowActions}>
          <Button
            className={styles.activity}
            size="xs"
            icon={<EyeIcon size={12} />}
            onClick={() => setOpenId(event._id)}
          >
            Activity
          </Button>
          {event.status === 'Live' || (event.provider === 'diamond' && event.status === 'Upcoming') ? (
            <Button
              className={styles.suspend}
              size="xs"
              icon={<BanIcon size={12} />}
              onClick={() => updateStatus(event, 'Suspended')}
            >
              Suspend
            </Button>
          ) : event.status !== 'Settled' && event.status !== 'Completed' ? (
            <Button
              variant="primary"
              size="xs"
              icon={<CheckCircleIcon size={12} />}
              onClick={() => updateStatus(event, 'Live')}
            >
              {event.provider === 'diamond' ? 'Resume' : 'Activate'}
            </Button>
          ) : null}
          {/* Feed matches finish from Diamond; a manual match is closed here, which also pays its commission. */}
          {event.provider !== 'diamond' && event.status !== 'Settled' && event.status !== 'Completed' ? (
            <Button
              className={styles.activity}
              size="xs"
              onClick={() => {
                if (window.confirm(`Mark "${event.name}" as completed? Betting closes and commission is paid once every bet is settled.`)) {
                  void updateStatus(event, 'Completed');
                }
              }}
            >
              Complete
            </Button>
          ) : null}
        </div>
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.head}>
          <div className={styles.title}>
            <span className={styles.emoji} aria-hidden="true">
              🏏
            </span>
            <span className={styles.titleText}>{complete ? 'Complete Matches' : 'In-Play Matches'}</span>
            <Badge tone="brand">{rows.length} Matches</Badge>
          </div>

          <div className={styles.actions}>
            {['All', ...statuses].map((item) => (
              <button
                key={item}
                type="button"
                className={cx(styles.filter, filter === item && styles.filterActive)}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
            {complete ? null : (
              <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={() => setShowAdd(true)}>
                Add Event
              </Button>
            )}
          </div>
        </div>

        {error ? <p className={styles.eventScore} role="alert">{error}</p> : null}

        <div className={styles.table}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(event) => event._id}
            size="lg"
            emptyMessage={pending ? <Loader block label="Loading matches…" /> : complete ? 'No completed matches yet.' : 'No live or upcoming matches.'}
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.head}>
          <div className={styles.title}>
            <span className={styles.titleText}>{complete ? 'Markets · Results' : 'Markets · Live Rates'}</span>
            <Badge tone="brand">{marketRows.length} Markets</Badge>
          </div>
        </div>
        <div className={styles.table}>
          <MatchMarketsTable
            rows={marketRows}
            complete={complete}
            emptyMessage={pending ? <Loader block label="Loading markets…" /> : 'No markets for these matches.'}
          />
        </div>
      </section>

      {openId ? <EventDrawer eventId={openId} onClose={() => setOpenId(null)} onChanged={() => setReloadKey((key) => key + 1)} /> : null}
      {settlementOf ? <SettlementModal eventId={settlementOf._id} name={settlementOf.name} onClose={() => setSettlementOf(null)} /> : null}
      {showAdd ? <EventFormModal onClose={() => setShowAdd(false)} onCreate={handleCreate} /> : null}
    </div>
  );
}
