import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { notificationsApi } from '../../lib/api/notifications';
import type { ApiNotification, NotificationsResponse } from '../../lib/api/notifications';
import { cx } from '../../lib/cx';
import { formatRelativeTime } from '../../lib/format';
import { notificationStats } from './notificationsData';
import styles from './NotificationsPage.module.css';

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/** Notification centre — node 112:9991. */
export function NotificationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (res: NotificationsResponse) => {
    setItems(res.notifications);
    setUnread(res.unreadCount);
  };

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    notificationsApi
      .list(accessToken)
      .then((res) => {
        if (cancelled) return;
        apply(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const markAllRead = async () => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      apply(await notificationsApi.markAllRead(accessToken));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const clearAll = async () => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await notificationsApi.clear(accessToken);
      apply({ notifications: [], unreadCount: 0 });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {notificationStats(items, unread).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.head}>
          <div className={styles.title}>
            <span className={styles.titleText}>All Notifications</span>
            {unread > 0 ? <span className={styles.count}>{unread} new</span> : null}
          </div>
          <div className={styles.actions}>
            <Button className={styles.quiet} size="xs" disabled={pending || unread === 0} onClick={markAllRead}>
              Mark All Read
            </Button>
            <Button className={styles.quiet} size="xs" disabled={pending || items.length === 0} onClick={clearAll}>
              Clear All
            </Button>
          </div>
        </div>

        {error ? <p className={styles.empty}>{error}</p> : null}

        <div className={styles.list}>
          {items.length === 0 ? (
            <p className={styles.empty}>{loading ? <Loader /> : 'You are all caught up.'}</p>
          ) : (
            items.map((item) => (
              <article key={item._id} className={cx(styles.item, item.unread ? styles.unread : styles.read)}>
                <span className={styles.emoji} aria-hidden="true">
                  {item.emoji || '🔔'}
                </span>
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <p className={cx(styles.itemTitle, item.unread && styles.itemTitleUnread)}>{item.title}</p>
                    <span className={styles.itemTime}>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                  <p className={styles.itemBody}>{item.body}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
