import { useState } from 'react';
import { useAppConfig } from '../../lib/appConfigContext';
import styles from './AnnouncementBar.module.css';

const DISMISSED_KEY = 'bettingweb.dismissedAnnouncements';

const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') as string[];
  } catch {
    return [];
  }
};

/**
 * Above every panel page: the CMS marquee ticker and the announcements /
 * notices published for staff (CMS → target All or Staff). An announcement
 * closed here stays closed on this browser until it's edited again.
 */
export function AnnouncementBar() {
  const { marquee, announcements } = useAppConfig();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const visible = announcements.filter((item) => !dismissed.includes(`${item._id}:${item.updatedAt}`));

  const dismiss = (key: string) => {
    const next = [...dismissed, key].slice(-50);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: closed for this visit only.
    }
  };

  if (!marquee && visible.length === 0) return null;
  return (
    <div className={styles.bar}>
      {marquee ? (
        <div className={styles.marquee} role="marquee" aria-label={marquee}>
          <span className={styles.marqueeText}>{marquee}</span>
        </div>
      ) : null}
      {visible.map((item) => {
        const key = `${item._id}:${item.updatedAt}`;
        return (
          <div key={key} className={styles.notice} role="status">
            <span className={styles.kind}>{item.kind}</span>
            <div className={styles.text}>
              <strong>{item.title}</strong>
              {item.body ? <span> — {item.body}</span> : null}
            </div>
            <button type="button" className={styles.close} aria-label={`Dismiss ${item.title}`} onClick={() => dismiss(key)}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
