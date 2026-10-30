import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircleIcon, PencilIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { TextAreaField } from '../../components/ui/TextField/TextAreaField';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { cmsApi } from '../../lib/api/cms';
import type { CmsContentItem } from '../../lib/api/cms';
import { formatCount } from '../../lib/format';
import { AnnouncementModal } from './AnnouncementModal';
import { CMS_KIND_BY_TAB, CMS_TABS, CONTENT_STATUS_TONE, cmsStats, formatContentDate } from './cmsData';
import type { CmsTab } from './cmsData';
import styles from './CmsPage.module.css';

const TABS = CMS_TABS.map((label) => ({ label }));

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/** CMS console — node 112:9398. */
export function CmsPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<CmsTab>(CMS_TABS[0]);
  const [items, setItems] = useState<CmsContentItem[]>([]);
  const [marquee, setMarquee] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** null = closed, 'new' = Create New, an item = Edit. */
  const [editing, setEditing] = useState<CmsContentItem | 'new' | null>(null);
  const [editingMarquee, setEditingMarquee] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [listRes, marqueeRes] = await Promise.all([cmsApi.list(accessToken), cmsApi.getMarquee(accessToken)]);
      setItems(listRes.items);
      setMarquee(marqueeRes.marqueeText);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      await cmsApi.remove(id, accessToken);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const kind = CMS_KIND_BY_TAB[tab];
  const visible = items.filter((item) => item.kind === kind);

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {cmsStats(items).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.marquee}>
        <span className={styles.marqueeTag}>Marquee</span>
        <p className={styles.marqueeText}>{marquee || (loading ? <Loader /> : 'No marquee text set.')}</p>
        <Button
          variant="primary"
          size="xs"
          icon={<PencilIcon size={12} />}
          onClick={() => setEditingMarquee(true)}
        >
          Edit Marquee
        </Button>
      </section>

      <section className={styles.card}>
        <div className={styles.head}>
          <PillTabs
            items={TABS}
            value={tab}
            label="Content sections"
            onChange={(value) => setTab(value as CmsTab)}
          />
          <Button variant="primary" size="xs" icon={<PlusIcon size={12} />} onClick={() => setEditing('new')}>
            Create New
          </Button>
        </div>

        {error ? <p className={styles.itemBody}>{error}</p> : null}

        <div className={styles.list}>
          {visible.length === 0 ? (
            <p className={styles.itemBody}>{loading ? <Loader /> : 'Nothing here yet.'}</p>
          ) : (
            visible.map((item) => (
              <article key={item._id} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemCode}>{item._id.slice(-6).toUpperCase()}</span>
                    <Badge tone={CONTENT_STATUS_TONE[item.status]}>{item.status}</Badge>
                    <span className={styles.itemTarget}>Target: {item.target || 'All'}</span>
                  </div>
                  <p className={styles.itemTitle}>{item.title}</p>
                  <p className={styles.itemBody}>{item.body}</p>
                </div>

                <div className={styles.itemSide}>
                  <p className={styles.itemViews}>{formatCount(item.views || 0)}</p>
                  <p className={styles.itemViewsLabel}>views</p>
                  <p className={styles.itemDate}>{formatContentDate(item.createdAt)}</p>
                  <div className={styles.itemActions}>
                    <Button
                      className={styles.edit}
                      size="xs"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => setEditing(item)}
                    >
                      <PencilIcon size={12} />
                    </Button>
                    <Button
                      className={styles.delete}
                      size="xs"
                      aria-label={`Delete ${item.title}`}
                      disabled={deletingId === item._id}
                      onClick={() => {
                        if (window.confirm(`Delete "${item.title}"? This can't be undone.`)) void handleDelete(item._id);
                      }}
                    >
                      <TrashIcon size={12} />
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {editing ? (
        <AnnouncementModal
          section={kind}
          kind={kind}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}

      {editingMarquee ? (
        <MarqueeModal
          initial={marquee}
          onClose={() => setEditingMarquee(false)}
          onSaved={(text) => {
            setMarquee(text);
            setEditingMarquee(false);
          }}
        />
      ) : null}
    </div>
  );
}

function MarqueeModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: string;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { accessToken } = useAuth();
  const [text, setText] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      const res = await cmsApi.setMarquee(text.trim(), accessToken);
      onSaved(res.marqueeText);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal title="Edit Marquee" width={520} onClose={onClose}>
      <TextAreaField label="Marquee Text" value={text} onChange={(event) => setText(event.target.value)} />
      {error ? <p role="alert">{error}</p> : null}
      <Button
        variant="primary"
        size="sm"
        disabled={pending}
        icon={<CheckCircleIcon size={13.993} />}
        onClick={save}
      >
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </Modal>
  );
}
