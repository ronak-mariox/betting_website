import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx';
import styles from './Switch.module.css';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name — the visible label sits beside the control. */
  label: string;
  /** 'lg' = 44×24 settings toggle, 'md' = 40×22 preference row, 'sm' = 36×20, 'xs' = 28×16 matrix cell. */
  size?: 'lg' | 'md' | 'sm' | 'xs';
  /** Extra class on the track — the permission matrix lifts its knob. */
  className?: string;
  /** Track colour when on; defaults to the brand blue. */
  color?: string;
};

/** Track-and-knob toggle used by the security settings and the IP whitelist. */
export function Switch({ checked, onChange, label, size = 'md', color, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx(styles.track, styles[size], checked && styles.on, className)}
      style={color ? ({ '--switch-on': color } as CSSProperties) : undefined}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  );
}
