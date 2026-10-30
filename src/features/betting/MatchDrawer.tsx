import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { BanIcon, CheckCircleIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { formatCount, formatMoney, formatStartTime } from '../../lib/format';
import { ApiRequestError } from '../../lib/api';
import type { ApiMatch } from '../../lib/api/betting';
import { eventsApi } from '../../lib/api/events';
import type { EventBet } from '../events/eventsData';
import { mapEventBets } from '../events/eventsData';
import { useAuth } from '../auth/authContext';
import { matchBetsCount } from './bettingData';
import styles from './MatchDrawer.module.css';

const TABS = ['Overview', 'Markets', 'Bets'] as const;
type Tab = (typeof TABS)[number];

export type MatchDrawerProps = {
  match: ApiMatch;
  onClose: () => void;
  /** Called after this match's status changes, so the board behind it can refresh. */
  onChanged?: () => void;
};

/**
 * Match sheet — nodes 119:40667 (overview), 119:42501 (markets) and
 * 119:43428 (bets).
 */
export function MatchDrawer({ match, onClose, onChanged }: MatchDrawerProps) {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>('Overview');
  const [current, setCurrent] = useState(match);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Latest bets on this match, fetched when the Bets tab first opens. */
  const [bets, setBets] = useState<EventBet[] | null>(null);
  const [betsError, setBetsError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'Bets' || bets || !accessToken) return;
    let cancelled = false;
    eventsApi
      .get(match._id, accessToken)
      .then((res) => {
        if (!cancelled) setBets(mapEventBets(res.recentBets, res.markets));
      })
      .catch((err) => {
        if (!cancelled) setBetsError(err instanceof ApiRequestError ? err.message : 'Unable to load bets.');
      });
    return () => {
      cancelled = true;
    };
  }, [tab, bets, accessToken, match._id]);

  const totalBets = matchBetsCount(current);
  const summary = [
    { label: 'Markets', value: String(current.markets.length), color: 'var(--color-primary)' },
    { label: 'Total Bets', value: formatCount(totalBets), color: 'var(--color-success)' },
    { label: 'Stake', value: formatMoney(current.stake), color: 'var(--color-warning)' },
    { label: 'Exposure', value: formatMoney(current.exposure), color: 'var(--color-live)' },
  ];

  const handleToggleStatus = async (status: 'Live' | 'Suspended') => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      const res = await eventsApi.updateStatus(current._id, status, accessToken);
      setCurrent((prev) => ({ ...prev, ...res.event }));
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to update this match.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Drawer
      label={`${current.name} details`}
      width={600}
      surface="raised"
      headerClassName={styles.header}
      headerLayout="stack"
      onClose={onClose}
      header={
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <span className={styles.emoji} aria-hidden="true">
              {current.emoji}
            </span>
            <span className={styles.name}>{current.name}</span>
            {current.status === 'Live' ? (
              <>
                <span className={styles.liveDot} aria-hidden="true" />
                <Badge tone="danger">LIVE</Badge>
              </>
            ) : null}
          </div>
          <p className={styles.league}>{current.league}</p>
          {current.score ? <p className={styles.score}>{current.score}</p> : null}

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
        <Tabs items={TABS} value={tab} variant="underline" aria-label="Match sections" onChange={setTab} />
      }
    >
      {error ? (
        <p className={styles.listCaption} role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'Overview' ? (
        <OverviewTab match={current} totalBets={totalBets} pending={pending} onToggleStatus={handleToggleStatus} />
      ) : null}

      {tab === 'Markets' ? (
        <div className={styles.body}>
          {current.markets.length === 0 ? <p className={styles.listCaption}>No markets for this match yet.</p> : null}
          {current.markets.map((market) => (
            <div key={market._id} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{market.name}</p>
                <p className={styles.rowMeta}>
                  {market.type} · {formatCount(market.bets)} bets
                </p>
              </div>
              <div className={styles.rowActions}>
                <Badge tone={market.status === 'Active' ? 'success' : market.winner ? 'neutral' : 'warning'}>
                  {market.status === 'Active' ? 'Active' : market.winner ? `Settled: ${market.winner}` : 'Suspended'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'Bets' ? (
        <div>
          {betsError ? <p className={styles.listCaption}>{betsError}</p> : null}
          {!bets && !betsError ? <p className={styles.listCaption}><Loader label="Loading bets…" /></p> : null}
          {bets?.length === 0 ? <p className={styles.listCaption}>No bets on this match yet.</p> : null}
          {bets?.length ? <p className={styles.listCaption}>Latest {bets.length} bets on this match</p> : null}
          {bets?.map((bet) => (
            <div key={bet.id} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>
                  {bet.user} · {bet.amount}
                </p>
                <p className={styles.rowMeta}>
                  {bet.market} · {bet.selection} @ {bet.odds} · {bet.when}
                </p>
              </div>
              <div className={styles.rowActions}>
                <Badge tone={bet.status.tone}>{bet.status.label}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}

function OverviewTab({
  match,
  totalBets,
  pending,
  onToggleStatus,
}: {
  match: ApiMatch;
  totalBets: number;
  pending: boolean;
  onToggleStatus: (status: 'Live' | 'Suspended') => void;
}) {
  const details = [
    { label: 'Match ID', value: match._id },
    { label: 'League', value: match.league || '—' },
    { label: 'Status', value: match.status.toLowerCase() },
    { label: 'Start Time', value: match.status === 'Live' ? 'In Play' : formatStartTime(match.startTime) },
    { label: 'Active Markets', value: String(match.markets.filter((m) => m.status === 'Active').length) },
    { label: 'Total Bets', value: formatCount(totalBets) },
    { label: 'Source', value: match.provider === 'diamond' ? 'Live feed (Diamond)' : 'Created in panel' },
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

      {match.status === 'Live' && match.streamUrl ? (
        <iframe className={styles.stream} src={match.streamUrl} title={`${match.name} live video`} allow="autoplay; fullscreen" />
      ) : null}
      {match.status === 'Live' && match.scoreUrl ? (
        <iframe className={styles.scorecard} src={match.scoreUrl} title={`${match.name} live score`} />
      ) : null}

      <div className={styles.actions}>
        {match.status === 'Live' || (match.provider === 'diamond' && match.status === 'Upcoming') ? (
          <Button
            className={styles.suspend}
            size="sm"
            icon={<BanIcon size={13.993} />}
            onClick={() => onToggleStatus('Suspended')}
            disabled={pending}
          >
            {pending ? 'Suspending…' : 'Suspend Match'}
          </Button>
        ) : match.status !== 'Settled' && match.status !== 'Completed' ? (
          <Button
            variant="primary"
            size="sm"
            icon={<CheckCircleIcon size={13.993} />}
            onClick={() => onToggleStatus('Live')}
            disabled={pending}
          >
            {pending ? 'Saving…' : match.provider === 'diamond' ? 'Resume' : 'Activate Match'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
