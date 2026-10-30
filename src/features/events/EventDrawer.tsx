import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { BanIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { Meter } from '../../components/ui/ProgressBar/ProgressBar';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { formatCount, formatMoney, formatStartTime } from '../../lib/format';
import { ApiRequestError } from '../../lib/api';
import { eventsApi } from '../../lib/api/events';
import type { ApiEventDetail } from '../../lib/api/events';
import { useAuth } from '../auth/authContext';
import { EVENT_STATUS_TONE, mapEventBets, mapEventMarkets, mapExposureRows } from './eventsData';
import styles from './EventDrawer.module.css';

const TABS = ['Overview', 'Markets', 'Bets', 'Exposure'] as const;
type Tab = (typeof TABS)[number];

const EXPOSURE_FILL = 'linear-gradient(90deg, #ff2e63 0%, #facc15 100%)';

export type EventDrawerProps = {
  eventId: string;
  onClose: () => void;
  /** Called after this event's status is changed, so the list behind it can refresh. */
  onChanged?: () => void;
};

/**
 * Event activity sheet — nodes 119:44399 (overview), 119:45485 (markets),
 * 119:46569 (bets) and 119:47705 (exposure). Each screen wraps the same
 * 640px panel; only the tab body changes.
 */
export function EventDrawer({ eventId, onClose, onChanged }: EventDrawerProps) {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>('Overview');
  const [detail, setDetail] = useState<ApiEventDetail | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  /** The score being typed; null until the admin touches the field. */
  const [scoreDraft, setScoreDraft] = useState<string | null>(null);
  const [savingScore, setSavingScore] = useState(false);

  const saveScore = async () => {
    if (!accessToken || scoreDraft === null) return;
    setSavingScore(true);
    setError(null);
    try {
      const res = await eventsApi.updateScore(eventId, scoreDraft.trim(), accessToken);
      setDetail((current) => (current ? { ...current, event: res.event } : current));
      setScoreDraft(null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to save the score.');
    } finally {
      setSavingScore(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    eventsApi
      .get(eventId, accessToken)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : 'Unable to load this event.');
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, eventId]);

  const handleSuspend = async () => {
    if (!accessToken || !detail) return;
    setSuspending(true);
    try {
      await eventsApi.updateStatus(detail.event._id, 'Suspended', accessToken);
      // Suspending also closes the event's markets — reload so the tiles and tabs show it.
      setDetail(await eventsApi.get(detail.event._id, accessToken));
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to suspend this event.');
    } finally {
      setSuspending(false);
    }
  };

  if (pending || !detail) {
    return (
      <Drawer
        label="Event activity"
        width={640}
        surface="raised"
        header={<p className={styles.caption}>Event activity</p>}
        onClose={onClose}
      >
        <div className={styles.body}>
          <p className={styles.caption}>{error ?? <Loader label="Loading event…" />}</p>
        </div>
      </Drawer>
    );
  }

  const { event, markets, recentBets } = detail;
  const marketList = mapEventMarkets(markets);
  const betList = mapEventBets(recentBets, markets);
  const exposureRows = mapExposureRows(markets);
  const totalBets = markets.reduce((sum, market) => sum + market.bets, 0);
  const activeMarkets = markets.filter((market) => market.status === 'Active').length;

  const summary = [
    { label: 'Active Markets', value: String(activeMarkets), color: 'var(--color-primary)' },
    { label: 'Total Bets', value: formatCount(totalBets), color: 'var(--color-success)' },
    { label: 'Total Exposure', value: formatMoney(event.exposure), color: 'var(--color-live)' },
    { label: 'Start Time', value: formatStartTime(event.startTime), color: 'var(--color-text-muted)' },
  ];

  return (
    <Drawer
      label={`${event.name} activity`}
      width={640}
      surface="raised"
      headerClassName={styles.header}
      headerLayout="stack"
      onClose={onClose}
      actions={
        event.status === 'Live' ? (
          <Button
            className={styles.suspend}
            size="xs"
            icon={<BanIcon size={12} />}
            onClick={handleSuspend}
            disabled={suspending}
          >
            {suspending ? 'Suspending…' : 'Suspend'}
          </Button>
        ) : null
      }
      header={
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <span className={styles.emoji} aria-hidden="true">
              {event.emoji}
            </span>
            <span className={styles.name}>{event.name}</span>
            <Badge tone={EVENT_STATUS_TONE[event.status]}>{event.status}</Badge>
          </div>
          <p className={styles.league}>{event.league}</p>
          {event.score ? <p className={styles.score}>{event.score}</p> : null}
          {event.status === 'Live' ? (
            <form
              className={styles.scoreForm}
              onSubmit={(submitted) => {
                submitted.preventDefault();
                void saveScore();
              }}
            >
              <input
                className={styles.scoreInput}
                aria-label="Live score"
                placeholder="Live score, e.g. 142/3 (16.2 Ov)"
                maxLength={40}
                value={scoreDraft ?? event.score}
                onChange={(typed) => setScoreDraft(typed.target.value)}
              />
              <Button size="xs" type="submit" disabled={savingScore || scoreDraft === null || scoreDraft.trim() === event.score}>
                {savingScore ? 'Saving…' : 'Update Score'}
              </Button>
            </form>
          ) : null}
          <p className={styles.code}>{event._id}</p>

          <div className={styles.summary}>
            {summary.map((tile) => (
              <div
                key={tile.label}
                className={styles.summaryTile}
                style={{ '--tile-color': tile.color } as CSSProperties}
              >
                <p className={styles.tileLabel}>{tile.label}</p>
                <p className={styles.tileValue}>{tile.value}</p>
              </div>
            ))}
          </div>
        </div>
      }
      tabs={
        <Tabs items={TABS} value={tab} variant="underline" aria-label="Event sections" onChange={setTab} />
      }
    >
      {error ? (
        <p className={styles.caption} role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'Overview' ? (
        <OverviewTab
          event={event}
          activeMarkets={activeMarkets}
          totalBets={totalBets}
          exposureRows={exposureRows}
        />
      ) : null}

      {tab === 'Markets' ? (
        <div className={styles.markets}>
          {marketList.length === 0 ? <p className={styles.caption}>No markets for this event yet.</p> : null}
          {marketList.map((market) => (
            <div key={market.name} className={styles.market}>
              <div>
                <p className={styles.marketName}>{market.name}</p>
                <p className={styles.marketMeta}>{market.meta}</p>
              </div>
              <div className={styles.marketActions}>
                <Badge tone={market.active ? 'success' : 'danger'}>
                  {market.active ? 'Active' : 'Suspended'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'Bets' ? (
        <div>
          <p className={styles.caption}>Showing last {betList.length} bets placed on this event</p>
          {betList.map((bet) => (
            <article key={bet.id} className={styles.bet}>
              <span className={styles.avatar}>{bet.user.slice(0, 1)}</span>
              <div className={styles.betMain}>
                <div className={styles.betLine}>
                  <p className={styles.betUser}>{bet.user}</p>
                  <span className={styles.betAmount}>{bet.amount}</span>
                </div>
                <p className={styles.betMeta}>
                  {bet.market} · <span className={styles.selection}>{bet.selection}</span> @ {bet.odds}
                </p>
                <div className={styles.betFoot}>
                  <p className={styles.betWhen}>{bet.when}</p>
                  <Badge tone={bet.status.tone}>{bet.status.label}</Badge>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'Exposure' ? (
        <div className={styles.body}>
          <div className={styles.totalCard}>
            <p className={styles.totalLabel}>Total Exposure</p>
            <p className={styles.totalValue}>{formatMoney(event.exposure)}</p>
            <p className={styles.totalCaption}>Across {activeMarkets} active markets</p>
          </div>

          {exposureRows.map((row) => (
            <div key={row.market} className={styles.exposureRow}>
              <div className={styles.exposureHead}>
                <span className={styles.exposureName}>{row.market}</span>
                <span className={styles.exposureAmount}>{row.amount}</span>
              </div>
              <Meter
                className={styles.exposureBar}
                label={`${row.market} exposure`}
                percent={row.percent}
                fill={EXPOSURE_FILL}
                height={6}
              />
              <p className={styles.exposureMeta}>
                {row.bets} · {row.percent}% of total exposure
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}

function OverviewTab({
  event,
  activeMarkets,
  totalBets,
  exposureRows,
}: {
  event: ApiEventDetail['event'];
  activeMarkets: number;
  totalBets: number;
  exposureRows: ReturnType<typeof mapExposureRows>;
}) {
  const details = [
    { label: 'Event ID', value: event._id },
    { label: 'League', value: event.league || '—' },
    { label: 'Status', value: event.status },
    { label: 'Start Time', value: formatStartTime(event.startTime) },
    { label: 'Active Markets', value: String(activeMarkets) },
    { label: 'Total Bets Placed', value: formatCount(totalBets) },
    { label: 'Total Exposure', value: formatMoney(event.exposure) },
    { label: 'Sport', value: event.sport },
  ];

  return (
    <div className={styles.body}>
      <div className={styles.details}>
        {details.map((detail) => (
          <div key={detail.label} className={styles.detail}>
            <p className={styles.tileLabel}>{detail.label}</p>
            <p className={styles.detailValue}>{detail.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.breakdown}>
        <p className={styles.breakdownTitle}>Exposure Breakdown</p>
        {exposureRows.slice(0, 4).map((row) => (
          <div key={row.market} className={styles.breakdownRow}>
            <span>{row.market}</span>
            <span className={styles.breakdownAmount}>{row.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
