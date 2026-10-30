import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import styles from './SectionCard.module.css';

export type SectionCardProps = {
  title: string;
  subtitle?: string;
  /** Control rendered on the right of the header (tabs, buttons, legends). */
  action?: ReactNode;
  /** 'sm' = 15px chart title, 'md' = 18px section title. */
  size?: 'sm' | 'md';
  /** Padding above the body; the Figma cards use 16px or 20px. */
  bodySpacing?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** The card chrome shared by every dashboard panel and table. */
export function SectionCard({
  title,
  subtitle,
  action,
  size = 'sm',
  bodySpacing,
  className,
  style,
  children,
}: SectionCardProps) {
  return (
    <section className={cx(styles.card, styles[size], className)} style={style}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className={styles.body} style={bodySpacing ? { paddingTop: bodySpacing } : undefined}>
        {children}
      </div>
    </section>
  );
}
