import { domainFor, formatCompact } from './chartScale';
import styles from './Chart.module.css';

export type BarSeries = { name: string; color: string };
export type BarGroup = { label: string; values: number[] };

export type BarChartProps = {
  data: BarGroup[];
  series: BarSeries[];
  height?: number;
  /** Axis label formatter; defaults to the compact Indian-style figures. */
  formatValue?: (value: number) => string;
};

const PAD = { top: 6, right: 6, bottom: 26, left: 52 };
const WIDTH = 700;
const BAR_GAP = 4;

/** Grouped columns — deposits vs withdrawals in the wallet-flow panel. */
export function BarChart({ data, series, height = 180, formatValue = formatCompact }: BarChartProps) {
  const { min, max, ticks } = domainFor(data.flatMap((group) => group.values));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;
  const slot = plotWidth / data.length;
  const barWidth = (slot * 0.56 - BAR_GAP * (series.length - 1)) / series.length;

  const y = (value: number) => PAD.top + plotHeight - ((value - min) / (max - min)) * plotHeight;
  const baseline = y(0);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${height}`}
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={series.map((item) => item.name).join(' vs ')}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line className={tick === 0 && min < 0 ? styles.zero : styles.grid} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text className={`${styles.axis} ${styles.axisY}`} x={PAD.left - 8} y={y(tick) + 4}>
            {formatValue(tick)}
          </text>
        </g>
      ))}

      {data.map((group, groupIndex) => {
        const groupWidth = barWidth * series.length + BAR_GAP * (series.length - 1);
        const start = PAD.left + slot * groupIndex + (slot - groupWidth) / 2;

        return (
          <g key={group.label}>
            {group.values.map((value, seriesIndex) => (
              <rect
                key={series[seriesIndex].name}
                x={start + (barWidth + BAR_GAP) * seriesIndex}
                // Negative values hang down from the zero line.
                y={Math.min(y(value), baseline)}
                width={barWidth}
                height={Math.abs(baseline - y(value))}
                rx="3"
                fill={series[seriesIndex].color}
              />
            ))}
            <text
              className={`${styles.axis} ${styles.axisX}`}
              x={PAD.left + slot * groupIndex + slot / 2}
              y={height - 6}
            >
              {group.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Colour key rendered beside a chart title. */
export function ChartLegend({ series }: { series: BarSeries[] }) {
  return (
    <div className={styles.legend}>
      {series.map((item) => (
        <span key={item.name} className={styles.legendItem} style={{ color: item.color }}>
          <span className={styles.legendSwatch} style={{ backgroundColor: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}
