/** Shared axis maths so the area and bar charts tick identically. */

/** Rounds a maximum up to a readable axis top (1, 2, 2.5 or 5 × 10ⁿ). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step =
    normalised <= 1
      ? 1
      : normalised <= 2
        ? 2
        : normalised <= 2.5
          ? 2.5
          : normalised <= 4
            ? 4
            : normalised <= 5
              ? 5
              : normalised <= 8
                ? 8
                : 10;
  return step * magnitude;
}

/** Evenly spaced tick values from 0 to max, low to high. */
export function ticks(max: number, count = 5): number[] {
  return Array.from({ length: count }, (_, index) => (max / (count - 1)) * index);
}

export type Domain = { min: number; max: number; ticks: number[] };

/**
 * Axis range for a set of values, always including 0. All-positive data keeps
 * the classic 0 → niceMax scale; once anything dips below zero (a loss, a net
 * outflow) the range extends downward in the same nice steps, so the line or
 * bar stays inside the plot instead of spilling under the x-axis.
 */
export function domainFor(values: number[], count = 5): Domain {
  const finite = values.filter(Number.isFinite);
  const low = Math.min(0, ...finite);
  const high = Math.max(0, ...finite);

  if (low >= 0) {
    const max = niceMax(high);
    return { min: 0, max, ticks: ticks(max, count) };
  }

  const step = niceMax((high - low) / (count - 1));
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const steps = Math.round((max - min) / step);
  // toPrecision trims float noise (0.30000000000000004) so ticks key and print cleanly.
  return { min, max, ticks: Array.from({ length: steps + 1 }, (_, index) => Number((min + step * index).toPrecision(12))) };
}

/** Compact Indian-style number formatting used on the chart axes. */
export function formatCompact(value: number): string {
  if (value === 0) return '0';
  if (value < 0) return `-${formatCompact(-value)}`;
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}K`;
  return trim(value);
}

function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
