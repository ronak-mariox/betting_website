import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cx } from '../../../lib/cx';
import styles from './TextField.module.css';

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  /** Plain strings, or { value, label } when what's stored differs from what's shown. */
  options: readonly (string | { value: string; label: string })[];
  /** Shown as the empty first entry; null drops it for always-set fields. */
  placeholder?: string | null;
  labelCase?: 'sentence' | 'caps';
};

/** Same field chrome as TextField, backed by a native select. */
export function SelectField({
  label,
  options,
  placeholder = 'Select…',
  labelCase = 'caps',
  className,
  ...rest
}: SelectFieldProps) {
  const id = useId();

  return (
    <div className={cx(styles.field, labelCase === 'caps' && styles.caps)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        <select id={id} className={cx(styles.input, className)} {...rest}>
          {placeholder === null ? null : <option value="">{placeholder}</option>}
          {options.map((option) => {
            const { value, label: text } = typeof option === 'string' ? { value: option, label: option } : option;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
