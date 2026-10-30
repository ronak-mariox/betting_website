import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart } from '../../components/charts/BarChart';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { SectionCard } from '../../components/ui/SectionCard/SectionCard';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { getRole } from '../../config/roles';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { networkApi } from '../../lib/api/network';
import type { MyDashboard } from '../../lib/api/network';
import { cx } from '../../lib/cx';
import { formatRupees, formatRelativeTime, currencySymbol } from '../../lib/format';
import { TXN_TONE, agentOverview, agentStats, commissionWeek } from './agentDashboardData';
import styles from './AgentDashboard.module.css';

/** Money axis: whole units while the figures are small ("₹75"), thousands after that ("₹8.0k"). */
const rupeesCompact = (value: number) =>
  Math.abs(value) < 1000 ? `${currencySymbol()}${Math.round(value)}` : `${currencySymbol()}${(value / 1000).toFixed(1)}k`;

const REFRESH_MS = 30_000;

const COMMISSION_SERIES = [{ name: 'Commission', color: 'var(--color-success)' }];

/**
 * The agent's own dashboard — node 139:114739. An agent runs a single book of
 * players, so this is a different composition from the platform dashboard:
 * every figure comes from `/network/dashboard`, scoped to "my" players.
 */
export function AgentDashboard() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<MyDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const load = () =>
      networkApi
        .myDashboard(accessToken)
        .then((res) => {
          if (!cancelled) setData(res);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
        });
    load();
    // Bets and requests arrive all day; keep the figures current without a reload.
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken]);

  if (!data) {
    return (
      <div className={styles.page}>
        <p className={styles.feedTime}>{error ?? <Loader block />}</p>
      </div>
    );
  }

  const role = user ? getRole(user.roleId) : null;
  const usersPath = role ? `${role.basePath}/users` : null;
  const agentsPath = role?.nav.some((item) => item.segment === 'agent') ? `${role.basePath}/agent` : null;
  const superAgentsPath = role?.nav.some((item) => item.segment === 'super-agent')
    ? `${role.basePath}/super-agent`
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {agentStats(data).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <SectionCard
        title="My Users Overview"
        subtitle={
          data.referralCode
            ? `Share referral code ${data.referralCode} — new app sign-ups using it join your panel`
            : 'User activity breakdown'
        }
        size="md"
        action={
          usersPath ? (
            <Button variant="quiet" size="xs" onClick={() => navigate(usersPath)}>
              View All
            </Button>
          ) : undefined
        }
      >
        <div className={styles.overview}>
          {agentOverview(data).map((tile) => (
            <div key={tile.label} className={styles.tile} style={{ '--tile-color': tile.color } as CSSProperties}>
              <p className={styles.tileLabel}>{tile.label}</p>
              <p className={styles.tileValue}>{tile.value}</p>
              <p className={styles.tileShare}>{tile.share}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {data.superAgents.length > 0 ? (
        <SectionCard
          title="My Super Agents"
          subtitle="Each super agent's network today"
          size="md"
          action={
            superAgentsPath ? (
              <Button variant="quiet" size="xs" onClick={() => navigate(superAgentsPath)}>
                View Super Agents
              </Button>
            ) : undefined
          }
        >
          <div className={styles.agents}>
            <table className={styles.agentsTable}>
              <thead>
                <tr>
                  <th>Super Agent</th>
                  <th>Agents</th>
                  <th>Users</th>
                  <th>Today's Bets</th>
                  <th>Today's Stake</th>
                  <th>Open Exposure</th>
                  <th>Pending Requests</th>
                  <th>Wallet</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.superAgents.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <span className={styles.agentName}>{row.name}</span>
                      <span className={styles.agentId}>{row.username}</span>
                    </td>
                    <td>{row.agents}</td>
                    <td>{row.users}</td>
                    <td>{row.todayBets}</td>
                    <td>{formatRupees(row.todayStake)}</td>
                    <td>{formatRupees(row.exposure)}</td>
                    <td>
                      {row.pendingRequests > 0 ? (
                        <Badge tone="warning">{row.pendingRequests} waiting</Badge>
                      ) : (
                        <span className={styles.agentId}>None</span>
                      )}
                    </td>
                    <td>{formatRupees(row.walletBalance)}</td>
                    <td>
                      <Badge tone={row.status === 'active' ? 'success' : 'danger'}>
                        {row.status === 'active' ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {data.agents.length > 0 ? (
        <SectionCard
          title="My Agents"
          subtitle="How each agent's book is doing today"
          size="md"
          action={
            agentsPath ? (
              <Button variant="quiet" size="xs" onClick={() => navigate(agentsPath)}>
                Manage Agents
              </Button>
            ) : undefined
          }
        >
          <div className={styles.agents}>
            <table className={styles.agentsTable}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Users</th>
                  <th>Today's Bets</th>
                  <th>Today's Stake</th>
                  <th>Open Exposure</th>
                  <th>Pending Requests</th>
                  <th>Wallet</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.agents.map((agent) => (
                  <tr key={agent._id}>
                    <td>
                      <span className={styles.agentName}>{agent.name}</span>
                      <span className={styles.agentId}>{agent.username}</span>
                    </td>
                    <td>{agent.users}</td>
                    <td>{agent.todayBets}</td>
                    <td>{formatRupees(agent.todayStake)}</td>
                    <td>{formatRupees(agent.exposure)}</td>
                    <td>
                      {agent.pendingRequests > 0 ? (
                        <Badge tone="warning">{agent.pendingRequests} waiting</Badge>
                      ) : (
                        <span className={styles.agentId}>None</span>
                      )}
                    </td>
                    <td>{formatRupees(agent.walletBalance)}</td>
                    <td>
                      <Badge tone={agent.status === 'active' ? 'success' : 'danger'}>
                        {agent.status === 'active' ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      <div className={data.restricted?.includes('commission') ? undefined : styles.split}>
        {/* Commission and the ledger follow the Permissions page (held back by the server when not granted). */}
        {data.restricted?.includes('commission') ? null : (
          <SectionCard title="My Commission (7 Days)" subtitle="Paid at the end of each match" size="md">
            <BarChart data={commissionWeek(data)} series={COMMISSION_SERIES} formatValue={rupeesCompact} />
          </SectionCard>
        )}

        <SectionCard title="Recent Activity" size="md">
          {data.activity.length === 0 ? (
            <p className={styles.feedTime}>No activity from your users yet.</p>
          ) : (
            <ul className={styles.feed}>
              {data.activity.map((entry) => (
                <li key={`${entry.at}-${entry.description}`} className={styles.feedItem}>
                  <span className={styles.feedDot} aria-hidden="true" />
                  <div className={styles.feedText}>
                    <p className={styles.feedDescription}>{entry.description}</p>
                    <p className={styles.feedTime}>{formatRelativeTime(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {data.restricted?.includes('wallet') ? null : (
        <SectionCard title="Recent Transactions" size="md">
          {data.transactions.length === 0 ? (
            <p className={styles.feedTime}>No transactions from your users yet.</p>
          ) : (
            <ul className={styles.txns}>
              {data.transactions.map((txn) => (
                <li key={txn.id} className={styles.txn}>
                  <div className={styles.txnText}>
                    <p className={styles.txnUser}>{txn.user}</p>
                    <p className={styles.txnMeta}>
                      {[txn.type, txn.method, formatRelativeTime(txn.at)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className={styles.txnAmount}>
                    <p className={cx(styles.amount, styles[txn.amount >= 0 ? 'in' : 'out'])}>
                      {txn.amount >= 0 ? '+' : '-'}
                      {formatRupees(Math.abs(txn.amount))}
                    </p>
                    <Badge tone={TXN_TONE[txn.status] ?? 'neutral'}>{txn.status === 'Completed' ? 'Success' : txn.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
