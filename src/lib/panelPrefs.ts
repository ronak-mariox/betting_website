import { useSyncExternalStore } from 'react';

/**
 * The signed-in account's display preferences (Profile → Preferences):
 * light / dark theme and menu language. Saved on the account; also cached in
 * this browser so the right theme shows before the account loads.
 */
export type PanelTheme = 'dark' | 'light';
export type PanelLanguage = 'en' | 'hi';
export type DisplayPrefs = { theme: PanelTheme; language: PanelLanguage };

const STORAGE_KEY = 'panel-display-prefs';
const DEFAULTS: DisplayPrefs = { theme: 'dark', language: 'en' };

const read = (): DisplayPrefs => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<DisplayPrefs>;
    return {
      theme: saved.theme === 'light' ? 'light' : 'dark',
      language: saved.language === 'hi' ? 'hi' : 'en',
    };
  } catch {
    return DEFAULTS;
  }
};

let current = read();
const listeners = new Set<() => void>();

const apply = () => {
  document.documentElement.dataset.theme = current.theme;
  document.documentElement.lang = current.language;
};

/** Called once at start-up: paints the cached theme before React renders. */
export function initDisplayPrefs() {
  apply();
}

/** Updates the preferences in this browser (the account copy is saved by the caller). */
export function setDisplayPrefs(next: Partial<DisplayPrefs>) {
  current = {
    theme: next.theme === 'light' || next.theme === 'dark' ? next.theme : current.theme,
    language: next.language === 'hi' || next.language === 'en' ? next.language : current.language,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode: the account copy still applies after the next sign-in.
  }
  apply();
  listeners.forEach((listener) => listener());
}

export function useDisplayPrefs(): DisplayPrefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

/** Menu labels in Hindi; anything without an entry stays in English. */
const HINDI: Record<string, string> = {
  Dashboard: 'डैशबोर्ड',
  Users: 'यूज़र्स',
  Franchise: 'फ्रेंचाइज़ी',
  'Super Agent': 'सुपर एजेंट',
  Agent: 'एजेंट',
  Wallet: 'वॉलेट',
  Transactions: 'लेन-देन',
  Betting: 'बेटिंग',
  'In-Play': 'इन-प्ले',
  'Complete Match': 'पूरे हुए मैच',
  Markets: 'मार्केट्स',
  Risk: 'रिस्क',
  Commission: 'कमीशन',
  Partnership: 'पार्टनरशिप',
  Reports: 'रिपोर्ट्स',
  Analytics: 'एनालिटिक्स',
  CMS: 'CMS',
  Notifications: 'सूचनाएँ',
  Security: 'सुरक्षा',
  Settings: 'सेटिंग्स',
  Profile: 'प्रोफ़ाइल',
  'Support Tickets': 'सपोर्ट टिकट',
  Support: 'सपोर्ट',
  Permissions: 'अनुमतियाँ',
};

export function translateLabel(label: string, language: PanelLanguage): string {
  return language === 'hi' ? HINDI[label] ?? label : label;
}
