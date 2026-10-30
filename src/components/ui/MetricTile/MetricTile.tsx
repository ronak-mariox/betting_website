import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx';
import styles from './MetricTile.module.css';

export type MetricTileProps = {
  label: string;
  value: string;
  /** Any CSS colour for the figure; defaults to white. */
  color?: string;
  /**
   * 'md' = bordered drawer tile, 'sm' = inline tile inside a record card,
   * 'lg' = the larger bordered tile the profile wallet totals are drawn with.
   */
  size?: 'md' | 'sm' | 'lg';
  className?: string;
};

/** Label-over-figure tile used by the record drawers and franchise cards. */
export function MetricTile({ label, value, color, size = 'md', className }: MetricTileProps) {
  return (
    <div
      className={cx(styles.tile, styles[size], className)}
      style={color ? ({ '--tile-color': color } as CSSProperties) : undefined}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
