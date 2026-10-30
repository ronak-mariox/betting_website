import { useBranding } from '../../lib/brandingContext';
import { Dot } from '../../components/ui/Dot/Dot';
import styles from './StatusBar.module.css';
import { formatUptime, usePlatformStatus } from './usePlatformStatus';

/** Bottom status strip: live health metrics on the left, build stamp on the right. */
export function StatusBar({ clock }: { clock: string }) {
  const { build } = useBranding();
  const health = usePlatformStatus();
  const connected = health?.status === 'ok';

  return (
    <footer className={styles.bar}>
      <div className={styles.metrics}>
        <span className={styles.metric}>
          <Dot tone={connected ? 'success' : 'live'} size={5.994} />
          {health ? (connected ? 'API Connected' : 'Database degraded') : 'API Unreachable'}
        </span>
        {health ? (
          <>
            <span className={styles.metric}>DB: {health.dbMs}ms</span>
            <span className={styles.metric}>CPU: {health.cpu}%</span>
            <span className={styles.metric}>Uptime: {formatUptime(health.uptimeSeconds)}</span>
          </>
        ) : null}
      </div>
      <span className={styles.build}>
        {build} · {clock}
      </span>
    </footer>
  );
}
