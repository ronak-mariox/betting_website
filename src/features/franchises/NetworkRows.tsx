import type { CSSProperties, ReactNode } from 'react';
import { EyeIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { FRANCHISE_STATUS_TONE } from './franchisesData';
import type { NetworkPerson, NetworkStat } from './franchisesData';
import styles from './NetworkRows.module.css';

/** Titled list with a count badge — every network tab uses this header. */
export function NetworkSection({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionTitle}>{title}</p>
        <Badge tone="brand">{count}</Badge>
      </div>
      {children}
    </div>
  );
}

/** A super agent, agent or user row inside a network tab. */
export function NetworkRow({ person, onOpen }: { person: NetworkPerson; onOpen?: () => void }) {
  return (
    <article className={styles.row}>
      <div className={styles.identity}>
        <span className={styles.avatar} style={{ '--avatar-color': person.accent } as CSSProperties}>
          {person.name.slice(0, 1)}
        </span>
        <div>
          <p className={styles.name}>{person.name}</p>
          <p className={styles.meta}>{person.meta}</p>
        </div>
      </div>

      <div className={styles.stats}>
        {person.stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statValue} style={{ '--stat-color': stat.color } as CSSProperties}>
              {stat.value}
            </span>
          </div>
        ))}
        <div className={styles.tail}>
          <Badge tone={FRANCHISE_STATUS_TONE[person.status]}>{person.status}</Badge>
          {/* The design shows this affordance on every row; only the super
              agent record has a detail screen in the hand-off so far. */}
          <button
            type="button"
            className={styles.open}
            aria-label={`Open ${person.name}`}
            title={onOpen ? `Open ${person.name}` : 'Detail view not designed yet'}
            disabled={!onOpen}
            onClick={onOpen}
          >
            <EyeIcon size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

/** Label on the left, coloured figure (and optional delta) on the right. */
export function SummaryRow({ stat, delta }: { stat: NetworkStat; delta?: string }) {
  return (
    <div className={styles.summaryRow}>
      <span>{stat.label}</span>
      <span className={styles.summaryValue}>
        <span className={styles.summaryFigure} style={{ '--stat-color': stat.color } as CSSProperties}>
          {stat.value}
        </span>
        {delta ? <span className={styles.summaryDelta}>{delta}</span> : null}
      </span>
    </div>
  );
}
