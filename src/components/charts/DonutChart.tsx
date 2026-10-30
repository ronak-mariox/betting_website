import { cx } from '../../lib/cx';
import styles from './Chart.module.css';

export type DonutSlice = { label: string; value: number; color: string };

export type DonutChartProps = {
  data: DonutSlice[];
  size?: number;
  /** Ring thickness as a share of the radius. */
  thickness?: number;
  /** Gap between slices, in degrees. */
  gap?: number;
  /** 'row' sits the legend beside the ring; 'stack' puts it underneath. */
  layout?: 'row' | 'stack';
};

/** Exposure-distribution ring with its legend. */
export function DonutChart({
  data,
  size = 159.994,
  thickness = 0.42,
  gap = 2,
  layout = 'row',
}: DonutChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const outer = size / 2 - size * 0.05;
  const stroke = outer * thickness;
  const radius = outer - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const gapLength = (gap / 360) * circumference;

  let offset = 0;

  return (
    <div className={cx(styles.donutRow, layout === 'stack' && styles.donutStack)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((slice) => {
            const length = (slice.value / total) * circumference;
            const dash = `${Math.max(0, length - gapLength)} ${circumference - Math.max(0, length - gapLength)}`;
            const element = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return element;
          })}
        </g>
      </svg>

      <ul className={styles.donutLegend}>
        {data.map((slice) => (
          <li key={slice.label} className={styles.donutLegendItem}>
            <span className={styles.donutSwatch} style={{ backgroundColor: slice.color }} />
            <span className={styles.donutLegendLabel}>{slice.label}</span>
            <span className={styles.donutLegendValue} style={{ color: slice.color }}>
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
