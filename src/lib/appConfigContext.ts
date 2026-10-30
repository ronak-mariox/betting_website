import { createContext, useContext } from 'react';

/** A published CMS item served with the config (banners, staff announcements). */
export type ConfigItem = {
  _id: string;
  kind: string;
  title: string;
  body: string;
  imageUrl: string;
  link: string;
  updatedAt: string;
};

/** GET /api/app-config?audience=staff — Platform Settings and CMS content the panels show. */
export type AppConfig = {
  platformName: string;
  currency: { code: string; symbol: string };
  timezone: string;
  support: { email: string; phone: string; whatsapp: string; telegram: string; hours: string };
  wallet: { processingHours: number | null; maxWithdrawalPerDay: number | null };
  appLink: string;
  referralBonusPercent: number;
  marquee: string;
  banners: ConfigItem[];
  announcements: ConfigItem[];
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  platformName: '',
  currency: { code: 'INR', symbol: '₹' },
  timezone: 'Asia/Kolkata',
  support: { email: '', phone: '', whatsapp: '', telegram: '', hours: '' },
  wallet: { processingHours: null, maxWithdrawalPerDay: null },
  appLink: '',
  referralBonusPercent: 0,
  marquee: '',
  banners: [],
  announcements: [],
};

export const AppConfigContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useAppConfig(): AppConfig {
  return useContext(AppConfigContext);
}
