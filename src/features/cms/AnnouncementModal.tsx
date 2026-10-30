import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextAreaField } from '../../components/ui/TextField/TextAreaField';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { cmsApi } from '../../lib/api/cms';
import type { CmsContentItem, CmsKind, CmsStatus } from '../../lib/api/cms';
import { BANNER_LINKS, CMS_STATUSES, CMS_TARGETS } from './cmsData';
import styles from './AnnouncementModal.module.css';

export type AnnouncementModalProps = {
  /** Section label — the title reads "Create New {section}" / "Edit {section}". */
  section: string;
  kind: CmsKind;
  /** The item being edited, or null for a new one. */
  item: CmsContentItem | null;
  onClose: () => void;
  onSaved: () => void;
};

/** Create New dialog — node 119:56306. Also used to edit an existing item. */
export function AnnouncementModal({ section, kind, item, onClose, onSaved }: AnnouncementModalProps) {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({
    title: item?.title ?? '',
    // Older items may hold free text: anything that isn't Players / Staff reads as All.
    target: CMS_TARGETS.some((t) => t.value === item?.target) ? (item?.target as string) : 'All',
    body: item?.body ?? '',
    imageUrl: item?.imageUrl ?? '',
    link: item?.link && !BANNER_LINKS.some((l) => l.value === item.link) ? 'url' : item?.link ?? '',
    url: item?.link && /^https?:/i.test(item.link) ? item.link : '',
    status: item?.status ?? ('Published' as CmsStatus),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    const banner = kind === 'Banner';
    if (banner && form.link === 'url' && !/^https?:\/\/\S+$/i.test(form.url.trim())) {
      setError('Enter the web link (starting with https://) the banner opens.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      target: form.target,
      body: form.body.trim(),
      status: form.status,
      ...(banner ? { imageUrl: form.imageUrl.trim(), link: form.link === 'url' ? form.url.trim() : form.link } : {}),
    };
    setPending(true);
    setError(null);
    try {
      if (item) await cmsApi.update(item._id, payload, accessToken);
      else await cmsApi.create({ kind, ...payload }, accessToken);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal title={item ? `Edit ${section}` : `Create New ${section}`} width={520} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <TextField
            label="Title"
            placeholder="Enter title..."
            value={form.title}
            onChange={(event) => set('title')(event.target.value)}
          />
          <SelectField
            label="Target Audience"
            options={CMS_TARGETS}
            placeholder={null}
            value={form.target}
            onChange={(event) => set('target')(event.target.value)}
          />
          {kind === 'Banner' ? (
            <>
              <TextField
                label="Image URL"
                placeholder="https://… (wide picture, about 3:1)"
                value={form.imageUrl}
                onChange={(event) => set('imageUrl')(event.target.value)}
              />
              <SelectField
                label="On Tap Open"
                options={BANNER_LINKS}
                placeholder={null}
                value={form.link}
                onChange={(event) => set('link')(event.target.value)}
              />
              {form.link === 'url' ? (
                <TextField
                  label="Web Link"
                  placeholder="https://…"
                  value={form.url}
                  onChange={(event) => set('url')(event.target.value)}
                />
              ) : null}
            </>
          ) : null}
          <SelectField
            label="Status"
            options={CMS_STATUSES}
            placeholder={null}
            value={form.status}
            onChange={(event) => set('status')(event.target.value)}
          />
          <TextAreaField
            className={styles.body}
            label="Message Body"
            placeholder="Enter message body..."
            value={form.body}
            onChange={(event) => set('body')(event.target.value)}
          />
        </div>

        {error ? <p role="alert">{error}</p> : null}

        <div className={styles.footer}>
          <Button
            className={styles.submit}
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
            icon={<CheckCircleIcon size={13.993} />}
          >
            {pending ? 'Saving…' : item ? 'Save Changes' : 'Publish'}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
