import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx';
import styles from './ProgressBar.module.css';

export type MeterProps = {
  label: string;
  /** 0–100. */
  percent: number;
  /** Any CSS background — a token or a gradient. */
  fill: string;
  /** Track height in px; 4 for the commission split, 6 for exposure. */
  height?: number;
  className?: string;
};

/** Bare track + fill. ProgressBar adds the label row on top of it. */
export function Meter({ label, percent, fill, height = 4, className }: MeterProps) {
  return (
    <div
      className={cx(styles.track, className)}
      style={{ '--bar-fill': fill, '--bar-height': `${height}px` } as CSSProperties}
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}

export type ProgressBarProps = {
  label: string;
  /** 0–100. */
  percent: number;
  /** Any CSS colour — pass a token, e.g. var(--color-primary). */
  color: string;
};

/** Labelled meter used by the commission split panel. */
export function ProgressBar({ label, percent, color }: ProgressBarProps) {
  return (
    <div style={{ '--bar-color': color } as CSSProperties}>
      <div className={styles.row}>
        <span>{label}</span>
        <span className={styles.value}>{percent}%</span>
      </div>
      <Meter className={styles.spaced} label={label} percent={percent} fill={color} />
    </div>
  );
}
