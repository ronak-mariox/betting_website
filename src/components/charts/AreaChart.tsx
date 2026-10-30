import { useId } from 'react';
import { domainFor, formatCompact } from './chartScale';
import styles from './Chart.module.css';

export type ChartPoint = { label: string; value: number };

export type AreaChartProps = {
  data: ChartPoint[];
  color?: string;
  height?: number;
};

const PAD = { top: 6, right: 6, bottom: 26, left: 46 };
const WIDTH = 520;

/** Revenue-style line with a soft gradient fill under it. */
export function AreaChart({ data, color = 'var(--color-primary)', height = 200 }: AreaChartProps) {
  const gradientId = useId();
  const { min, max, ticks } = domainFor(data.map((point) => point.value));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;

  const x = (index: number) => PAD.left + (plotWidth / Math.max(1, data.length - 1)) * index;
  const y = (value: number) => PAD.top + plotHeight - ((value - min) / (max - min)) * plotHeight;

  // The fill closes on the zero line, so losses shade downward from it.
  const baseline = y(0);
  const line = data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(point.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)} ${baseline} L${x(0)} ${baseline} Z`;

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${height}`}
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Revenue trend"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((tick) => (
        <g key={tick}>
          <line className={tick === 0 && min < 0 ? styles.zero : styles.grid} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text className={`${styles.axis} ${styles.axisY}`} x={PAD.left - 8} y={y(tick) + 4}>
            {formatCompact(tick)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path className={styles.line} d={line} stroke={color} />

      {data.map((point, index) => (
        <text
          key={point.label}
          className={`${styles.axis} ${styles.axisX}`}
          x={x(index)}
          y={height - 6}
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}
