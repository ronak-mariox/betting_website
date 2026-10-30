import type { ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

export type BadgeProps = {
  tone?: BadgeTone;
  /** Drops the pill background — used for the risk column. */
  bare?: boolean;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', bare = false, children }: BadgeProps) {
  return <span className={cx(styles.badge, styles[tone], bare && styles.bare)}>{children}</span>;
}
