import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { APP } from '../config/app';
import { API_BASE_URL } from './api';
import { BrandingContext } from './brandingContext';
import type { Branding, BrandingContextValue } from './brandingContext';

const EMPTY: Branding = {
  brandName: '',
  tagline: '',
  logoUrl: '',
  primaryColor: '',
  accentColor: '',
  backgroundColor: '',
  successColor: '',
};

const STORAGE_KEY = 'bettingweb.branding';
const YEAR = new Date().getFullYear();

// ---------------------------------------------------------------- colour maths

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;
/** Moves a colour toward white (amount > 0) or black (amount < 0). */
const shade = (hex: string, amount: number) =>
  toHex(toRgb(hex).map((c) => (amount > 0 ? c + (255 - c) * amount : c * (1 + amount))));

/** The theme tokens (styles/tokens.css) a brand overrides; anything left empty keeps the default. */
function themeTokens(brand: Branding): Record<string, string> {
  const tokens: Record<string, string> = {};
  if (brand.primaryColor) {
    const primary = brand.primaryColor;
    const light = brand.accentColor || shade(primary, 0.2);
    const dark = shade(primary, -0.18);
    tokens['--color-primary'] = primary;
    tokens['--color-primary-rgb'] = toRgb(primary).join(', ');
    tokens['--color-primary-light'] = light;
    tokens['--color-primary-dark'] = dark;
    tokens['--color-primary-soft'] = `rgba(${toRgb(primary).join(', ')}, 0.08)`;
    tokens['--color-primary-tint'] = `rgba(${toRgb(primary).join(', ')}, 0.15)`;
    tokens['--gradient-brand'] = `linear-gradient(135deg, ${primary} 0%, ${light} 100%)`;
    tokens['--gradient-cta'] = `linear-gradient(173.43deg, ${primary} 0%, ${dark} 100%)`;
  } else if (brand.accentColor) {
    tokens['--color-primary-light'] = brand.accentColor;
  }
  if (brand.backgroundColor) {
    const bg = brand.backgroundColor;
    tokens['--color-bg'] = bg;
    tokens['--color-bg-sidebar'] = shade(bg, 0.02);
    tokens['--color-bg-header'] = shade(bg, 0.05);
    tokens['--color-surface'] = shade(bg, 0.09);
  }
  if (brand.successColor) tokens['--color-success'] = brand.successColor;
  return tokens;
}

let applied: string[] = [];

/** Puts the brand on the page: theme tokens on :root and the browser tab title. */
function applyBranding(brand: Branding) {
  const root = document.documentElement;
  applied.forEach((name) => root.style.removeProperty(name));
  const tokens = themeTokens(brand);
  Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
  applied = Object.keys(tokens);
  const name = brand.brandName || APP.name;
  document.title = brand.tagline ? `${name} — ${brand.tagline}` : name;
}

const readStored = (): Branding => {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return EMPTY;
  }
};

// ---------------------------------------------------------------- context

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Last known brand first, so a reload doesn't flash the default colours.
  const [brand, setBrand] = useState<Branding>(readStored);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branding`);
      if (!res.ok) return;
      const next: Branding = { ...EMPTY, ...(await res.json()).branding };
      setBrand(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable (private window); the brand still applies.
      }
    } catch {
      // Offline: keep what we have.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => applyBranding(brand), [brand]);

  const value = useMemo<BrandingContextValue>(() => {
    const name = brand.brandName || APP.name;
    return {
      brand,
      name,
      initial: (brand.brandName || APP.initial).trim().charAt(0).toUpperCase(),
      tagline: brand.tagline || APP.tagline,
      legal: brand.brandName ? `Protected by 256-bit SSL encryption · © ${YEAR} ${name}` : APP.legal,
      build: brand.brandName ? `${name} v2.4.1 · © ${YEAR}` : APP.build,
      refresh,
    };
  }, [brand, refresh]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
