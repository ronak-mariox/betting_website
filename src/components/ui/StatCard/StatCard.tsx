import type { ComponentType, CSSProperties } from 'react';
import { TrendDownIcon, TrendUpIcon } from '../../icons';
import type { IconProps } from '../../icons';
import { cx } from '../../../lib/cx';
import styles from './StatCard.module.css';

export type StatAccent = 'blue' | 'cyan' | 'green' | 'yellow' | 'red' | 'live' | 'violet' | 'neutral';
export type StatTone = 'up' | 'down' | 'flat';

export type StatCardProps = {
  label: string;
  value: string;
  /** Small line under the value, e.g. "2,381 active today". */
  caption?: string;
  /** Comparison line, e.g. "+12.4% vs yesterday". */
  delta?: string;
  tone?: StatTone;
  icon: ComponentType<IconProps>;
  accent?: StatAccent;
  /** Paints the accent wash behind the card. */
  tinted?: boolean;
};

/** rgb triplets so one token can drive the wash, the tile and the glyph. */
const ACCENT_RGB: Record<StatAccent, string> = {
  blue: '33, 150, 243',
  cyan: '41, 182, 246',
  green: '34, 197, 94',
  yellow: '250, 204, 21',
  red: '239, 68, 68',
  live: '255, 46, 99',
  violet: '139, 92, 246',
  neutral: '184, 194, 204',
};

export function StatCard({
  label,
  value,
  caption,
  delta,
  tone = 'flat',
  icon: Icon,
  accent = 'blue',
  tinted = false,
}: StatCardProps) {
  const rgb = ACCENT_RGB[accent];
  const style = {
    '--accent-color': `rgb(${rgb})`,
    '--accent-tile': `rgba(${rgb}, 0.13)`,
    '--accent-wash': `rgba(${rgb}, 0.094)`,
  } as CSSProperties;
  const TrendIcon = tone === 'down' ? TrendDownIcon : TrendUpIcon;

  return (
    <article className={cx(styles.card, tinted && styles.tinted)} style={style}>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {caption ? <p className={styles.caption}>{caption}</p> : null}
        {delta ? (
          <p className={cx(styles.delta, styles[tone])}>
            {tone === 'flat' ? null : <TrendIcon size={12} />}
            {delta}
          </p>
        ) : null}
      </div>
      <span className={styles.tile}>
        <Icon size={19.999} />
      </span>
    </article>
  );
}
