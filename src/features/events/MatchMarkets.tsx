import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '../../components/ui/Badge/Badge';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { Modal } from '../../components/ui/Modal/Modal';
import { ApiRequestError } from '../../lib/api';
import { commissionApi } from '../../lib/api/commission';
import type { EventSettlement } from '../../lib/api/commission';
import { formatRupeesPaise } from '../../lib/format';
import { useAuth } from '../auth/authContext';
import { marketSettlement, marketStatusLabel } from './matchMarketsData';
import styles from './MatchMarkets.module.css';

/**
 * Shared by the In-Play and Complete Match pages (super-admin and staff):
 * one row per market with its match, status and current rates; finished
 * matches add the result and settlement status.
 */

type Runner = { name: string; odds: number; active?: boolean; line?: number | null; rate?: number | null };

export type MatchMarketRow = {
  id: string;
  matchId: string;
  matchName: string;
  marketName: string;
  marketType: string;
  status: 'Active' | 'Suspended';
  /** Set once settled ('Void' for a voided market). */
  winner?: string | null;
  bets: number;
  runners: Runner[];
};

function RateList({ runners }: { runners: Runner[] }) {
  if (!runners.length) return <span className={styles.muted}>—</span>;
  return (
    <div className={styles.runners}>
      {runners.map((runner) => (
        <span key={runner.name} className={runner.active === false ? styles.runnerOff : styles.runner}>
          {runner.name}{' '}
          <b>
            {runner.active === false
              ? 'SUSP'
              : runner.line != null
                ? runner.line && runner.rate
                  ? `${runner.line} @${runner.rate}`
                  : '—'
                : runner.odds.toFixed(2)}
          </b>
        </span>
      ))}
    </div>
  );
}

export function MatchMarketsTable({ rows, complete = false, emptyMessage }: { rows: MatchMarketRow[]; complete?: boolean; emptyMessage: ReactNode }) {
  const columns: Column<MatchMarketRow>[] = [
    { key: 'match', header: 'Match', render: (row) => <span className={styles.strong}>{row.matchName}</span> },
    {
      key: 'market',
      header: 'Market',
      render: (row) => (
        <div>
          <p className={styles.strong}>{row.marketName}</p>
          <p className={styles.muted}>{row.marketType}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Market Status',
      render: (row) => {
        const status = marketStatusLabel(row);
        return <Badge tone={status.tone}>{status.label}</Badge>;
      },
    },
    { key: 'rates', header: complete ? 'Last Rate / Odds' : 'Available Rate / Odds', render: (row) => <RateList runners={row.runners} /> },
  ];
  if (complete) {
    columns.push(
      {
        key: 'result',
        header: 'Result',
        render: (row) => <span className={styles.strong}>{row.winner === 'Void' ? 'No result (void)' : row.winner || '—'}</span>,
      },
      {
        key: 'settlement',
        header: 'Settlement',
        render: (row) => {
          const settlement = marketSettlement(row);
          return <Badge tone={settlement.tone}>{settlement.label}</Badge>;
        },
      },
    );
  }
  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} size="md" emptyMessage={emptyMessage} />;
}

const money = (value: number) => formatRupeesPaise(value);
const signed = (value: number) => (value > 0 ? `+${money(value)}` : money(value));
const pct = (value: number | null | undefined) => (value == null ? '—' : `${value}%`);

/**
 * A finished match's final settlement: market results, each player's
 * session / match result and every commission share — what each level
 * received, passed down and kept. Needs the Commission view grant.
 */
export function SettlementModal({ eventId, name, onClose }: { eventId: string; name: string; onClose: () => void }) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EventSettlement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    commissionApi
      .settlement(eventId, accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Unable to load the settlement.'));
  }, [accessToken, eventId]);

  const status = data
    ? data.event.commissionPaid
      ? { label: 'Settled · commission paid', tone: 'success' as const }
      : data.markets.some((m) => m.settlement === 'Awaiting result') || data.players.some((p) => p.openBets)
        ? { label: 'Awaiting results', tone: 'danger' as const }
        : { label: 'Commission being paid', tone: 'warning' as const }
    : null;

  return (
    <Modal title="Match Settlement" subtitle={name} width={980} onClose={onClose}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {!data && !error ? <Loader block /> : null}
      {data && status ? (
        <div className={styles.settlement}>
          <div className={styles.summary}>
            <div>
              <p className={styles.muted}>Status</p>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div>
              <p className={styles.muted}>Players</p>
              <p className={styles.strong}>{data.totals.players}</p>
            </div>
            <div>
              <p className={styles.muted}>Session stake</p>
              <p className={styles.strong}>{money(data.totals.sessionStake)}</p>
            </div>
            <div>
              <p className={styles.muted}>Players' session result</p>
              <p className={styles.strong}>{signed(data.totals.sessionResult)}</p>
            </div>
            <div>
              <p className={styles.muted}>Players' match result</p>
              <p className={styles.strong}>{signed(data.totals.matchResult)}</p>
            </div>
            <div>
              <p className={styles.muted}>Session commission</p>
              <p className={styles.strong}>{money(data.totals.sessionCommission)}</p>
            </div>
            <div>
              <p className={styles.muted}>Match commission</p>
              <p className={styles.strong}>{money(data.totals.matchCommission)}</p>
            </div>
          </div>

          <h4 className={styles.heading}>Market results</h4>
          <DataTable
            columns={[
              { key: 'name', header: 'Market', render: (m) => <span className={styles.strong}>{m.name}</span> },
              { key: 'kind', header: 'Commission type', render: (m) => <span className={styles.muted}>{m.kind}</span> },
              { key: 'result', header: 'Result', render: (m) => <span>{m.result === 'Void' ? 'No result (void)' : m.result || '—'}</span> },
              { key: 'bets', header: 'Bets', render: (m) => <span>{m.bets}</span> },
              {
                key: 'settlement',
                header: 'Settlement',
                render: (m) => (
                  <Badge tone={m.settlement === 'Settled' ? 'success' : m.settlement === 'Awaiting result' ? 'danger' : m.settlement === 'Voided' ? 'warning' : 'neutral'}>
                    {m.settlement}
                  </Badge>
                ),
              },
            ]}
            rows={data.markets}
            rowKey={(m) => m._id}
            size="sm"
            emptyMessage="No markets."
          />

          <h4 className={styles.heading}>Players and commission</h4>
          {data.players.length === 0 ? <p className={styles.muted}>No bets from your network on this match.</p> : null}
          {data.players.map((line) => (
            <div key={line.player._id} className={styles.player}>
              <div className={styles.playerHead}>
                <span className={styles.strong}>
                  {line.player.name || line.player.username} ({line.player.username})
                </span>
                <span className={styles.muted}>
                  Session stake {money(line.sessionStake)} · Session result {signed(line.sessionResult)} · Match result {signed(line.matchResult)}
                  {line.openBets ? ` · ${line.openBets} open bet(s)` : ''}
                </span>
              </div>
              {line.shares.length ? (
                <DataTable
                  columns={[
                    { key: 'kind', header: 'Type', render: (s) => <Badge tone={s.kind === 'Session' ? 'info' : 'brand'}>{s.kind}</Badge> },
                    { key: 'level', header: 'Level', render: (s) => <span>{s.level}</span> },
                    { key: 'account', header: 'Paid to', render: (s) => <span className={styles.strong}>{s.account.name || s.account.username}</span> },
                    { key: 'base', header: 'On', render: (s) => <span>{money(s.base)}</span> },
                    { key: 'received', header: 'Received', render: (s) => <span>{pct(s.receivedRate)}</span> },
                    { key: 'given', header: 'Passed down', render: (s) => <span>{pct(s.givenRate)}</span> },
                    { key: 'kept', header: 'Kept', render: (s) => <span className={styles.strong}>{pct(s.rate)}</span> },
                    { key: 'amount', header: 'Commission', render: (s) => <span className={styles.strong}>{money(s.commission)}</span> },
                    { key: 'ref', header: 'Txn ID', render: (s) => <span className={styles.muted}>{s.reference || '—'}</span> },
                  ]}
                  rows={line.shares}
                  rowKey={(s) => `${s.kind}-${s.account._id}`}
                  size="sm"
                  emptyMessage=""
                />
              ) : (
                <p className={styles.muted}>{data.event.commissionPaid ? 'No commission on this player.' : 'Commission is paid once every bet of the match is settled.'}</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
