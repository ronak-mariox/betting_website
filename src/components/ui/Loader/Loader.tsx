import { cx } from '../../../lib/cx';
import styles from './Loader.module.css';

export type LoaderProps = {
  /** Shown beside the spinner; also read out to screen readers. */
  label?: string;
  /** `block` centres it in its own padded row (empty tables, whole sections). */
  block?: boolean;
};

/**
 * The spinner every "loading" state uses. Renders a <span>, so it can sit
 * inside text (a <p>, a table cell) as well as on its own.
 */
export function Loader({ label = 'Loading…', block = false }: LoaderProps) {
  return (
    <span className={cx(styles.loader, block && styles.block)} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
