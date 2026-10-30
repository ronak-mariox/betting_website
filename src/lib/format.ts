/** Number and currency formatting shared by every panel. */

const INDIAN = new Intl.NumberFormat('en-IN');

/**
 * Settings → General → Currency / Timezone, set by AppConfigProvider before
 * the panel renders. Amounts are whole units of that currency.
 */
let symbol = '₹';
let lakhCrore = true;
let timeZone = 'Asia/Kolkata';

export function setCurrency(currency: { code: string; symbol: string }) {
  symbol = currency.symbol || '₹';
  // Lakh / crore short forms only where people count that way.
  lakhCrore = ['INR', 'NPR', 'PKR', 'LKR', 'BDT'].includes(currency.code);
}

export function setTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    timeZone = tz;
  } catch {
    timeZone = 'Asia/Kolkata';
  }
}

/** The platform's currency symbol ("₹", "$", "AED "). */
export const currencySymbol = () => symbol;

/** A form label written with ₹ ("Amount (₹)"), shown in the platform's currency. */
export const withCurrency = (label: string) => label.replace(/₹/g, symbol.trim());

export function formatCount(value: number): string {
  return INDIAN.format(Math.round(value));
}

/** Short scale — ₹1.42Cr, ₹18.4L, ₹42,600 (or $1.2M, $184K for other currencies). */
/** Figures a role isn't allowed to see arrive as null (see network.controller.js) and show as "—". */
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (lakhCrore) {
    if (abs >= 10_000_000) return `${symbol}${trim(value / 10_000_000)}Cr`;
    if (abs >= 100_000) return `${symbol}${trim(value / 100_000)}L`;
  } else {
    if (abs >= 1_000_000) return `${symbol}${trim(value / 1_000_000)}M`;
    if (abs >= 100_000) return `${symbol}${trim(value / 1_000)}K`;
  }
  return `${symbol}${INDIAN.format(Math.round(value))}`;
}

/** Full digits with a sign — used in tables and ledgers. */
export function formatMoneyExact(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${symbol}${INDIAN.format(Math.abs(Math.round(value)))}`;
}

/** Full digits and no "+" — balances, limits, stakes. Negative values keep their "-". */
export function formatRupees(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value < 0 ? '-' : ''}${symbol}${INDIAN.format(Math.abs(Math.round(value)))}`;
}

/** Like formatRupees but keeps paise (₹2.5, ₹1,250.75) — commission and ledger amounts aren't whole rupees. */
export function formatRupeesPaise(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value < 0 ? '-' : ''}${symbol}${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

function trim(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/** "2 min ago", "3 hr ago", "5 Sep" — used for bet/activity timestamps. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone });
}

/** "Today 7:30 PM", "Tomorrow 8:00 PM", "12 Sep, 3:30 PM" — event/match start times. */
export function formatStartTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const dayDiff = Math.round((Date.parse(dayKey(date)) - Date.parse(dayKey(new Date()))) / 86_400_000);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone });
  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone })}, ${time}`;
}

/** "YYYY-MM-DD" of a date in the platform's timezone. */
export const dayKey = (date: Date) => date.toLocaleDateString('en-CA', { timeZone });

/** True when the ISO timestamp falls on the platform's today — used for "X today" stat tiles. */
export function isToday(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return dayKey(date) === dayKey(new Date());
}

/** "::ffff:192.168.1.46" -> "192.168.1.46", "::1" -> "This computer" — the address as a person reads it. */
export function formatIp(ip: string | null | undefined): string {
  if (!ip) return '';
  if (ip === '::1' || ip === '127.0.0.1') return 'This computer';
  return ip.replace(/^::ffff:/, '');
}

/** "9811122233" / "+91 9811122233" -> "+91 98111 22233". Anything else is returned as typed. */
export function formatMobile(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : String(value ?? '');
}

/** The platform's timezone (Settings → General) — pass as `timeZone` when showing a timestamp. */
export const platformTimeZone = () => timeZone;

/** Short name of the platform's timezone for labels ("IST", "GMT+4"). */
export const timeZoneLabel = () =>
  new Intl.DateTimeFormat('en-IN', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
