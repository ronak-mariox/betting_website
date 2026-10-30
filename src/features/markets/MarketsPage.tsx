import { Loader } from '../../components/ui/Loader/Loader';
import { useLiveRefresh } from '../../lib/realtime';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { BanIcon, CheckCircleIcon, PencilIcon, PlusIcon, RefreshIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { cx } from '../../lib/cx';
import { formatCount, formatMoney, formatRupees } from '../../lib/format';
import { ApiRequestError } from '../../lib/api';
import { eventsApi } from '../../lib/api/events';
import type { ApiEvent } from '../../lib/api/events';
import { marketsApi } from '../../lib/api/markets';
import type { ApiMarket, CreateMarketPayload, UpdateMarketPayload } from '../../lib/api/markets';
import { useAuth } from '../auth/authContext';
import { MarketFormModal } from './MarketFormModal';
import { marketStats, marketTypeColor } from './marketsData';
import { marketStatusLabel } from '../events/matchMarketsData';
import styles from './MarketsPage.module.css';

/** Settle-picker value for voiding the market instead of naming a winner. */
const VOID = '__void__';
const ALL_EVENTS = 'all';

/** Market manager — node 112:5525. */
export function MarketsPage() {
  const { accessToken } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  // Risk's View button opens this page on one event.
  const [scope, setScope] = useState<string>((location.state as { eventId?: string } | null)?.eventId ?? ALL_EVENTS);
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Live: odds, market status and new bets refresh this page as they happen.
  useLiveRefresh(['odds', 'matches:changed', 'admin:changed'], () => setReloadKey((key) => key + 1));
  /** null = closed, 'new' = Add Market, a market = Edit Market. */
  const [form, setForm] = useState<ApiMarket | 'new' | null>(null);
  const [suspendingAll, setSuspendingAll] = useState(false);
  const [rowPending, setRowPending] = useState<string | null>(null);
  /** Market whose winner picker is open, and the picked selection. */
  const [settling, setSettling] = useState<{ id: string; winner: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    eventsApi
      .list({}, accessToken)
      .then((res) => {
        if (!cancelled) setEvents(res.events);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    marketsApi
      .list(scope === ALL_EVENTS ? {} : { eventId: scope }, accessToken)
      .then((res) => {
        if (!cancelled) setMarkets(res.markets);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to load markets.');
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, scope, reloadKey]);

  const stats = useMemo(() => marketStats(markets), [markets]);

  const toggleStatus = async (row: ApiMarket) => {
    if (!accessToken) return;
    const nextStatus = row.status === 'Active' ? 'Suspended' : 'Active';
    setRowPending(row._id);
    try {
      const res = await marketsApi.updateStatus(row._id, nextStatus, accessToken);
      setMarkets((current) => current.map((item) => (item._id === res.market._id ? res.market : item)));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to update the market.');
    } finally {
      setRowPending(null);
    }
  };

  /** Mirrors the backend's `runnersFor`: explicit runners, else the event's two sides. */
  const selectionsFor = (row: ApiMarket) => {
    if (row.runners?.length) return row.runners.map((r) => r.name);
    const name = typeof row.event === 'string' ? '' : row.event.name;
    const [home, away] = name.split(/\s+(?:vs\.?|v\.?|-)\s+/i);
    return [home || 'Home', away || 'Away'];
  };

  const settle = async () => {
    if (!accessToken || !settling?.winner) return;
    setRowPending(settling.id);
    try {
      if (settling.winner === VOID) {
        const res = await marketsApi.void(settling.id, 'Match abandoned / no result', accessToken);
        setNotice(`Market voided: ${res.voided} open bets returned (${formatRupees(res.released)} released).`);
      } else {
        const res = await marketsApi.settle(settling.id, settling.winner, accessToken);
        setNotice(`Settled on ${res.market?.winner ?? settling.winner}: ${res.settled} bets (${res.won} won, ${res.lost} lost).`);
      }
      setSettling(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to settle the market.');
    } finally {
      setRowPending(null);
    }
  };

  const suspendAll = async () => {
    if (!accessToken) return;
    const eventId = scope === ALL_EVENTS ? undefined : scope;
    const where = eventId ? 'on this event' : 'on EVERY event across the platform';
    if (!window.confirm(`Suspend all active markets ${where}? Players can't bet on them until re-enabled.`)) return;
    setSuspendingAll(true);
    try {
      const { modifiedCount } = await marketsApi.suspendAll(accessToken, eventId);
      setNotice(`${modifiedCount} market${modifiedCount === 1 ? '' : 's'} suspended.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to suspend all markets.');
    } finally {
      setSuspendingAll(false);
    }
  };

  const handleCreate = async (payload: CreateMarketPayload) => {
    if (!accessToken) return;
    const res = await marketsApi.create(payload, accessToken);
    setMarkets((current) => [...current, res.market]);
    setForm(null);
  };

  const handleUpdate = async (id: string, payload: UpdateMarketPayload) => {
    if (!accessToken) return;
    const res = await marketsApi.update(id, payload, accessToken);
    setMarkets((current) => current.map((item) => (item._id === res.market._id ? res.market : item)));
    setForm(null);
  };

  const columns: Column<ApiMarket>[] = [
    {
      key: 'match',
      header: 'Match',
      render: (row) => <span className={styles.name}>{typeof row.event === 'string' ? '—' : row.event.name}</span>,
    },
    {
      key: 'market',
      header: 'Market',
      render: (row) => (
        <div>
          <p className={styles.name}>{row.name}</p>
          <p className={styles.code}>{row.externalId ? `${row.group || row.type} · Live feed (Diamond)` : row.code}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={styles.type} style={{ '--type-rgb': marketTypeColor(row.type) } as CSSProperties}>
          {row.type}
        </span>
      ),
    },
    {
      key: 'prices',
      header: 'Available Rate / Odds',
      // Session sides read "No 73 @100 · Yes 74 @100"; back markets list each selection's odds.
      render: (row) => (
        <span className={styles.back}>
          {(row.runners?.length ? row.runners : [{ name: 'Back', odds: row.backOdds }, { name: 'Lay', odds: row.layOdds }])
            .slice(0, 4)
            .map((r) =>
              'active' in r && r.active === false
                ? `${r.name} SUSP`
                : r.line != null
                  ? `${r.name} ${r.line && r.rate ? `${r.line} @${r.rate}` : '—'}` // 0 = no line (ball running)
                  : `${r.name} ${r.odds.toFixed(2)}`,
            )
            .join(' · ')}
          {(row.runners?.length ?? 0) > 4 ? ` · +${(row.runners?.length ?? 0) - 4}` : ''}
        </span>
      ),
    },
    { key: 'bets', header: 'Bets', render: (row) => <span className={styles.bets}>{formatCount(row.bets)}</span> },
    { key: 'stake', header: 'Stake', render: (row) => <span className={styles.stake}>{formatMoney(row.stake)}</span> },
    { key: 'exposure', header: 'Exposure', render: (row) => <span className={styles.exposure}>{formatMoney(row.exposure)}</span> },
    { key: 'maxBet', header: 'Max Bet', render: (row) => <span className={styles.maxBet}>{formatMoney(row.maxBet)}</span> },
    {
      key: 'status',
      header: 'Market Status',
      render: (row) => {
        // Open / Suspended / Closed — a settled or voided market is Closed, with its result.
        const status = marketStatusLabel(row);
        return (
          <Badge tone={status.tone}>
            {status.label}
            {row.winner ? ` · ${row.winner === 'Void' ? 'Void, stakes returned' : row.winner}` : ''}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.winner ? null : settling?.id === row._id ? (
          <div className={styles.rowActions}>
            {row.betStyle === 'session' || row.betStyle === 'view' ? (
              // Session lines settle on the runs scored: each bet wins on its own line.
              <input
                className={styles.settleSelect}
                type="number"
                min={0}
                placeholder="Runs scored"
                aria-label="Runs scored"
                value={settling.winner === VOID ? '' : settling.winner}
                onChange={(e) => setSettling({ id: row._id, winner: e.target.value })}
              />
            ) : null}
            <select
              className={styles.settleSelect}
              aria-label="Winning selection"
              hidden={row.betStyle === 'session' || row.betStyle === 'view'}
              value={settling.winner}
              onChange={(e) => setSettling({ id: row._id, winner: e.target.value })}
            >
              <option value="">Winner…</option>
              {selectionsFor(row).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={VOID}>Void — no result, return stakes</option>
            </select>
            <Button
              className={styles.enable}
              size="xs"
              icon={<CheckCircleIcon size={12} />}
              onClick={settle}
              disabled={!settling.winner || rowPending === row._id}
            >
              {rowPending === row._id ? 'Settling…' : 'Confirm'}
            </Button>
            {row.betStyle === 'session' || row.betStyle === 'view' ? (
              <Button className={styles.suspend} size="xs" onClick={() => setSettling({ id: row._id, winner: VOID })}>
                Void
              </Button>
            ) : null}
            <Button className={styles.edit} size="xs" onClick={() => setSettling(null)}>
              Cancel
            </Button>
          </div>
        ) : (
        <div className={styles.rowActions}>
          {/* Feed markets take their prices from Diamond every few seconds — a manual edit wouldn't stick. */}
          {row.externalId ? null : (
            <Button className={styles.edit} size="xs" icon={<PencilIcon size={12} />} onClick={() => setForm(row)}>
              Edit
            </Button>
          )}
          <Button className={styles.enable} size="xs" onClick={() => setSettling({ id: row._id, winner: '' })}>
            Settle
          </Button>
          {row.status === 'Active' ? (
            <Button
              className={styles.suspend}
              size="xs"
              icon={<BanIcon size={12} />}
              onClick={() => toggleStatus(row)}
              disabled={rowPending === row._id}
            >
              Suspend
            </Button>
          ) : (
            <Button
              className={styles.enable}
              size="xs"
              icon={<CheckCircleIcon size={12} />}
              onClick={() => toggleStatus(row)}
              disabled={rowPending === row._id}
            >
              Enable
            </Button>
          )}
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
          <div className={styles.heading}>
            <p className={styles.title}>Market Manager</p>
            <div className={styles.scopes}>
              <button
                type="button"
                className={cx(styles.scope, scope === ALL_EVENTS && styles.scopeActive)}
                onClick={() => setScope(ALL_EVENTS)}
              >
                All Events
              </button>
              {events.map((event) => (
                <button
                  key={event._id}
                  type="button"
                  className={cx(styles.scope, scope === event._id && styles.scopeActive)}
                  onClick={() => setScope(event._id)}
                >
                  {event.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              className={styles.refresh}
              size="xs"
              icon={<RefreshIcon size={12} />}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Refresh
            </Button>
            <Button
              className={styles.suspendAll}
              size="xs"
              icon={<BanIcon size={12} />}
              onClick={suspendAll}
              disabled={suspendingAll}
            >
              {suspendingAll ? 'Suspending…' : 'Suspend All'}
            </Button>
            <Button
              variant="primary"
              size="xs"
              icon={<PlusIcon size={12} />}
              onClick={() => setForm('new')}
              disabled={events.length === 0}
            >
              Add Market
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger)', margin: '12px 0 0', fontSize: 12 }}>
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" style={{ color: 'var(--color-success)', margin: '12px 0 0', fontSize: 12 }}>
            {notice}
          </p>
        ) : null}

        <div className={styles.table}>
          <DataTable
            columns={columns}
            rows={markets}
            rowKey={(row) => row._id}
            size="lg"
            emptyMessage={pending ? <Loader block label="Loading markets…" /> : scope === ALL_EVENTS ? 'No markets yet.' : 'No markets on this event yet.'}
          />
        </div>
      </section>

      {form ? (
        <MarketFormModal
          market={form === 'new' ? null : form}
          events={events}
          onClose={() => setForm(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      ) : null}
    </div>
  );
}
