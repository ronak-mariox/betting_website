/** Joins conditional class names — the one place class merging happens. */
export function cx(...values: unknown[]): string {
  return values.filter((value): value is string => typeof value === 'string' && value !== '').join(' ');
}
