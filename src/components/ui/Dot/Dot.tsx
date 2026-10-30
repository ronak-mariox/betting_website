import { cx } from '../../../lib/cx';
import styles from './Dot.module.css';

export type DotTone = 'brand' | 'info' | 'live' | 'success' | 'warning' | 'danger';

/** The small status pip used in chips, legends and the status bar. */
export function Dot({ tone = 'brand', size = 8 }: { tone?: DotTone; size?: number }) {
  return <span className={cx(styles.dot, styles[tone])} style={{ width: size, height: size }} />;
}
