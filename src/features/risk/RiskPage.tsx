import { Loader } from '../../components/ui/Loader/Loader';
import { useLiveRefresh } from '../../lib/realtime';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, BanIcon, EyeIcon, RefreshIcon, RiskIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { Meter } from '../../components/ui/ProgressBar/ProgressBar';
import { SectionCard } from '../../components/ui/SectionCard/SectionCard';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { ApiRequestError } from '../../lib/api';
import { riskApi } from '../../lib/api/risk';
import type { ApiRiskPanels, ApiRiskStats } from '../../lib/api/risk';
import { useAuth } from '../auth/authContext';
import { RISK_LEVEL_TONE, RISK_TONE_RGB, mapExposureRows, mapRiskPanels, riskStats } from './riskData';
import type { ExposureRow } from './riskData';
import styles from './RiskPage.module.css';

/** Risk console — node 112:6245. */
export function RiskPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ApiRiskStats | null>(null);
  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [panels, setPanels] = useState<ApiRiskPanels | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Live: exposure, market status and wallet requests refresh this page as they happen.
  useLiveRefresh(['odds', 'matches:changed', 'admin:changed'], () => setReloadKey((key) => key + 1));
  const [rowPending, setRowPending] = useState<string | null>(null);
  const [suspendingAll, setSuspendingAll] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  /** Runs the detection rules now (they also run on the server every 10 minutes). */
  const runScan = async () => {
    if (!accessToken) return;
    setScanning(true);
    setScanNote(null);
    try {
      const { result } = await riskApi.scan(accessToken);
      setScanNote(
        result.newFlags || result.newPatterns
          ? `Scan found ${result.newFlags} new flagged user(s) and ${result.newPatterns} new pattern(s).`
          : 'Scan complete — nothing new.',
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to run the scan.');
    } finally {
      setScanning(false);
    }
  };

  const resolve = async (id: string, kind: 'flag' | 'pattern') => {
    if (!accessToken) return;
    setResolving(id);
    try {
      if (kind === 'flag') await riskApi.resolveFlag(id, accessToken);
      else await riskApi.resolvePattern(id, accessToken);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to resolve this item.');
    } finally {
      setResolving(null);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    Promise.all([riskApi.stats(accessToken), riskApi.exposure(accessToken), riskApi.panels(accessToken)])
      .then(([statsRes, exposureRes, panelsRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats);
        setRows(mapExposureRows(exposureRes.markets, exposureRes.thresholds));
        setPanels(panelsRes);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : 'Unable to load risk data.');
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  const statCards = useMemo(() => (stats ? riskStats(stats) : []), [stats]);
  const panelList = useMemo(() => (panels ? mapRiskPanels(panels) : []), [panels]);
  const criticalIds = useMemo(() => rows.filter((row) => row.level === 'Critical').map((row) => row.id), [rows]);

  const suspendMarket = async (row: ExposureRow) => {
    if (!accessToken) return;
    setRowPending(row.id);
    try {
      await riskApi.suspendExposure(row.id, accessToken);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to suspend this market.');
    } finally {
      setRowPending(null);
    }
  };

  const suspendAllCritical = async () => {
    if (!accessToken || criticalIds.length === 0) return;
    setSuspendingAll(true);
    try {
      await Promise.all(criticalIds.map((id) => riskApi.suspendExposure(id, accessToken)));
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to suspend all critical markets.');
    } finally {
      setSuspendingAll(false);
    }
  };

  const columns: Column<ExposureRow>[] = [
    {
      key: 'market',
      header: 'Market',
      render: (row) => (
        <div className={styles.market}>
          <span className={styles.emoji} aria-hidden="true">
            {row.emoji}
          </span>
          <span className={styles.marketName}>{row.market}</span>
          {row.live ? <span className={styles.liveDot} aria-label="Live" /> : null}
        </div>
      ),
    },
    {
      key: 'exposure',
      header: 'Exposure',
      render: (row) => (
        <span className={styles.exposure} style={{ '--tone-rgb': RISK_TONE_RGB[row.tone] } as CSSProperties}>
          {row.exposure}
        </span>
      ),
    },
    { key: 'limit', header: 'Limit', render: (row) => <span className={styles.limit}>{row.limit}</span> },
    {
      key: 'utilization',
      header: 'Utilization',
      render: (row) => (
        <div className={styles.utilization} style={{ '--tone-rgb': RISK_TONE_RGB[row.tone] } as CSSProperties}>
          <Meter
            className={styles.meter}
            label={`${row.market} utilization`}
            percent={row.utilization}
            fill="rgb(var(--tone-rgb))"
            height={6}
          />
          <span className={styles.percent}>{row.utilization}%</span>
        </div>
      ),
    },
    { key: 'bets', header: 'Active Bets', render: (row) => <span className={styles.bets}>{row.activeBets}</span> },
    {
      key: 'level',
      header: 'Risk Level',
      render: (row) => <Badge tone={RISK_LEVEL_TONE[row.level]}>{row.level}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button
            className={styles.view}
            size="xs"
            aria-label={`View ${row.market}`}
            onClick={() => navigate('../markets', { relative: 'path', state: { eventId: row.eventId } })}
          >
            <EyeIcon size={12} />
          </Button>
          {row.level === 'Critical' ? (
            <Button
              className={styles.suspend}
              size="xs"
              icon={<BanIcon size={12} />}
              onClick={() => suspendMarket(row)}
              disabled={rowPending === row.id}
            >
              {rowPending === row.id ? 'Suspending…' : 'Suspend'}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', margin: 0, fontSize: 12 }}>
          {error}
        </p>
      ) : null}

      <SectionCard
        title="Market Exposure Monitor"
        subtitle="Real-time exposure across active markets"
        size="md"
        bodySpacing={20}
        action={
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
              icon={<RiskIcon size={12} />}
              onClick={suspendAllCritical}
              disabled={suspendingAll || criticalIds.length === 0}
            >
              {suspendingAll ? 'Suspending…' : 'Suspend All Critical'}
            </Button>
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          size="lg"
          emptyMessage={pending ? <Loader block label="Loading exposure…" /> : 'No open exposure right now.'}
        />
      </SectionCard>

      <div className={styles.scanBar}>
        <p className={styles.scanText}>
          {scanNote ?? 'Users and patterns below are found automatically from bets, wallet activity and sign-ins (every 10 minutes).'}
        </p>
        <Button className={styles.refresh} size="xs" icon={<RefreshIcon size={12} />} disabled={scanning} onClick={() => void runScan()}>
          {scanning ? 'Scanning…' : 'Run Scan'}
        </Button>
      </div>

      <div className={styles.panels}>
        {panelList.map((panel) => (
          <section
            key={panel.title}
            className={styles.panel}
            style={{ '--tone-rgb': RISK_TONE_RGB[panel.tone] } as CSSProperties}
          >
            <div className={styles.panelHead}>
              <p className={styles.panelTitle}>{panel.title}</p>
              <span className={styles.panelCount}>{panel.count}</span>
            </div>
            <ul className={styles.panelList}>
              {panel.items.length === 0 ? <li className={styles.panelItem}>Nothing to review.</li> : null}
              {panel.items.map((item) => (
                <li key={item.id} className={styles.panelItem}>
                  <AlertTriangleIcon className={styles.panelIcon} size={12} />
                  <span className={styles.panelText}>
                    {item.text}
                    {item.detail ? <span className={styles.panelDetail}>{item.detail}</span> : null}
                  </span>
                  {item.resolve ? (
                    <button
                      type="button"
                      className={styles.resolve}
                      disabled={resolving !== null}
                      onClick={() => void resolve(item.id, item.resolve!)}
                    >
                      {resolving === item.id ? '…' : 'Resolve'}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
