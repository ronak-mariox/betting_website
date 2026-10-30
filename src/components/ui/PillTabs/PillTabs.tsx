import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx';
import styles from './PillTabs.module.css';

export type PillTab = {
  label: string;
  /** Optional count chip, e.g. "3 pending". */
  badge?: string;
  /** Renders a small status dot after the label (live tabs). */
  dot?: boolean;
  /** rgb triplet for the badge tint; defaults to the brand blue. */
  rgb?: string;
};

export type PillTabsProps = {
  items: readonly PillTab[];
  value: string;
  /** 'md' = wallet console, 'sm' = transactions ledger. */
  size?: 'md' | 'sm';
  /** 'loose' = free-standing tinted pills; 'segmented' = bordered tray, solid active. */
  variant?: 'loose' | 'segmented';
  label: string;
  onChange: (value: string) => void;
};

/** Filled pill tabs that can carry a count chip — used by the ledger screens. */
export function PillTabs({
  items,
  value,
  size = 'md',
  variant = 'loose',
  label,
  onChange,
}: PillTabsProps) {
  return (
    <div
      className={cx(styles.tabs, variant === 'segmented' && styles.segmented)}
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="tab"
          aria-selected={item.label === value}
          className={cx(styles.tab, styles[size], item.label === value && styles.active)}
          onClick={() => onChange(item.label)}
        >
          {item.label}
          {item.dot ? (
            <span
              className={styles.dot}
              style={{ '--dot-color': `rgb(${item.rgb ?? '255, 46, 99'})` } as CSSProperties}
              aria-hidden="true"
            />
          ) : null}
          {item.badge ? (
            <span
              className={styles.badge}
              style={
                {
                  '--badge-bg': `rgba(${item.rgb ?? 'var(--color-primary-rgb)'}, 0.2)`,
                  '--badge-color': `rgb(${item.rgb ?? 'var(--color-primary-rgb)'})`,
                } as CSSProperties
              }
            >
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
