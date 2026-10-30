import type { CSSProperties } from 'react';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Dot } from '../../../components/ui/Dot/Dot';
import { SectionCard } from '../../../components/ui/SectionCard/SectionCard';
import type { HealthMetric, LiveMatch, RiskAlert } from '../dashboardData';
import styles from './widgets.module.css';

export function LiveMatchesPanel({ matches }: { matches: LiveMatch[] }) {
  return (
    <SectionCard
      title="Live Matches"
      subtitle={`${matches.length} matches in play`}
      size="md"
      bodySpacing={20}
      action={
        <span className={styles.tileTitle} style={{ color: 'var(--color-live)' }}>
          <Dot tone="live" />
          LIVE
        </span>
      }
    >
      <div className={styles.stack}>
        {matches.map((match) => (
          <article key={match.id} className={styles.tile}>
            <div>
              <p className={styles.tileTitle}>
                <span>{match.sport}</span>
                {match.title}
                <Dot tone="live" size={6} />
              </p>
              <p className={styles.tileMeta}>{match.meta}</p>
            </div>
            <div>
              <p className={styles.tileValue}>{match.exposure}</p>
              <p className={styles.tileOdds}>{match.odds}</p>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

/** rgb triplets so one rule can tint both the background and the border. */
const ALERT_RGB: Record<RiskAlert['tone'], string> = {
  danger: '239, 68, 68',
  warning: '250, 204, 21',
  info: '41, 182, 246',
};

export function RiskAlertsPanel({ alerts }: { alerts: RiskAlert[] }) {
  return (
    <SectionCard title="Risk Alerts" subtitle="Current risk signals" size="md" bodySpacing={20}>
      <div className={styles.stack}>
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={styles.alert}
            style={
              {
                '--alert-bg': `rgba(${ALERT_RGB[alert.tone]}, 0.08)`,
                '--alert-border': `rgba(${ALERT_RGB[alert.tone]}, 0.2)`,
              } as CSSProperties
            }
          >
            <span aria-hidden="true">{alert.emoji}</span>
            <div>
              <p className={styles.alertMessage}>{alert.message}</p>
              <p className={styles.alertAge}>{alert.age}</p>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

/** Badge for the backend's health.status ('Operational' / 'Degraded' / 'No providers'). */
const HEALTH_BADGE: Record<string, { tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  Operational: { tone: 'success', label: 'All Systems OK' },
  Degraded: { tone: 'warning', label: 'Degraded' },
};

export function SystemHealthPanel({ metrics, status }: { metrics: HealthMetric[]; status: string }) {
  const badge = HEALTH_BADGE[status] ?? { tone: 'neutral' as const, label: status };
  return (
    <SectionCard
      title="System Health"
      action={<Badge tone={badge.tone}>{badge.label}</Badge>}
      bodySpacing={16}
    >
      <div className={styles.healthGrid}>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={styles.healthTile}>
              <Icon size={13.994} />
              <div>
                <p className={styles.healthLabel}>{metric.label}</p>
                <p className={styles.healthValue}>{metric.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
