import { createContext, useContext } from 'react';

/** Settings → Brand, as served by GET /api/branding (invalid colours already dropped). */
export type Branding = {
  brandName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  successColor: string;
};

export type BrandingContextValue = {
  brand: Branding;
  /** Name / initial / tagline with the built-in defaults filled in. */
  name: string;
  initial: string;
  tagline: string;
  /** "Protected by … · © 2026 <name>" and "<name> v2.4.1 · © 2026" for the footers. */
  legal: string;
  build: string;
  /** Re-reads the brand (after Settings → Brand is saved). */
  refresh: () => Promise<void>;
};

export const BrandingContext = createContext<BrandingContextValue | null>(null);

export function useBranding(): BrandingContextValue {
  const value = useContext(BrandingContext);
  if (!value) throw new Error('useBranding must be used inside <BrandingProvider>');
  return value;
}
