import type { ButtonHTMLAttributes, ComponentType, CSSProperties } from 'react';
import type { IconProps } from '../../icons';
import styles from './IconButton.module.css';

export type IconButtonTone = 'brand' | 'warning' | 'danger' | 'success';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ComponentType<IconProps>;
  tone?: IconButtonTone;
  label: string;
  size?: number;
};

const TONE_RGB: Record<IconButtonTone, string> = {
  brand: 'var(--color-primary-rgb)',
  warning: '250, 204, 21',
  danger: '239, 68, 68',
  success: '34, 197, 94',
};

/** Tinted square action button — the row actions in list tables. */
export function IconButton({
  icon: Icon,
  tone = 'brand',
  label,
  size = 12.991,
  ...rest
}: IconButtonProps) {
  const rgb = TONE_RGB[tone];
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      title={label}
      style={
        {
          '--tint-bg': `rgba(${rgb}, 0.1)`,
          '--tint-hover': `rgba(${rgb}, 0.2)`,
          '--tint-color': `rgb(${rgb})`,
        } as CSSProperties
      }
      {...rest}
    >
      <Icon size={size} />
    </button>
  );
}
