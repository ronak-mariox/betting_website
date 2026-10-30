/**
 * The Figma frames stamp 2024, but the footer sits next to a live clock — a
 * frozen year reads as a bug, so it follows the calendar instead.
 */
const YEAR = new Date().getFullYear();

/** Product-level copy from the Figma header/footer — kept in one place. */
export const APP = {
  name: 'BetMaster Pro',
  shortName: 'BetMaster',
  initial: 'B',
  edition: 'Pro Admin v2.4',
  tagline: 'Enterprise Betting Platform · v2.4',
  legal: `Protected by 256-bit SSL encryption · © ${YEAR} BetMaster Pro`,
  build: `BetMaster Pro v2.4.1 · © ${YEAR}`,
} as const;
