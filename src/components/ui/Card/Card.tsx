import type { HTMLAttributes } from 'react';
import { cx } from '../../../lib/cx';
import styles from './Card.module.css';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated = false, className, children, ...rest }: CardProps) {
  return (
    <div className={cx(styles.card, elevated && styles.elevated, className)} {...rest}>
      {children}
    </div>
  );
}
