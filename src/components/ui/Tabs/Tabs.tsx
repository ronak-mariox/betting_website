import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx';
import styles from './Tabs.module.css';

export type TabsVariant = 'pill' | 'solid' | 'underline';

export type TabsProps<T extends string> = {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  variant?: TabsVariant;
  /** Colour of the active tab; defaults to the brand blue. */
  accent?: string;
  className?: string;
  'aria-label'?: string;
};

/** One tab strip: chart ranges, list filters and drawer sections. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'pill',
  accent,
  className,
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  return (
    <div
      className={cx(styles.tabs, styles[variant], className)}
      style={accent ? ({ '--tabs-accent': accent } as CSSProperties) : undefined}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === value}
          className={cx(styles.tab, item === value && styles.active)}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
