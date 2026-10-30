import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import styles from './Button.module.css';

export type ButtonVariant =
  | 'primary'
  | 'subtle'
  | 'selected'
  | 'ghost'
  | 'quiet'
  | 'outline'
  | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the full width of the parent. */
  block?: boolean;
  /** Icon rendered before the label. */
  icon?: ReactNode;
  /** Icon pinned to the trailing edge (used by the selected role chip). */
  trailingIcon?: ReactNode;
};

export function Button({
  variant = 'subtle',
  size = 'sm',
  block = false,
  icon,
  trailingIcon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    >
      {icon}
      <span className={styles.label}>{children}</span>
      {trailingIcon ? <span className={styles.trailing}>{trailingIcon}</span> : null}
    </button>
  );
}
