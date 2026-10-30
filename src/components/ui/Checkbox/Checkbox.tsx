import type { InputHTMLAttributes } from 'react';
import { CheckIcon } from '../../icons';
import styles from './Checkbox.module.css';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export function Checkbox({ label, ...rest }: CheckboxProps) {
  return (
    <label className={styles.wrapper}>
      <input className={styles.input} type="checkbox" {...rest} />
      <span className={styles.box} aria-hidden="true">
        <CheckIcon />
      </span>
      {label}
    </label>
  );
}
