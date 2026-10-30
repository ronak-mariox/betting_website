import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import styles from './TextField.module.css';

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Leading glyph rendered inside the control. */
  icon?: ReactNode;
  error?: string;
  /** 'caps' is the small uppercase form label used in dialogs. */
  labelCase?: 'sentence' | 'caps';
  /** Class for the field wrapper — use this for grid placement. */
  fieldClassName?: string;
};

export function TextField({
  label,
  icon,
  error,
  labelCase = 'sentence',
  className,
  fieldClassName,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cx(styles.field, labelCase === 'caps' && styles.caps, fieldClassName)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <input
          id={id}
          className={cx(styles.input, icon && styles.withIcon, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
