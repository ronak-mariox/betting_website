import type { ReactNode } from 'react';
import styles from './SectionLabel.module.css';

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={styles.label}>{children}</p>;
}
