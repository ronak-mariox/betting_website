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
import { partnershipApi } from '../../lib/api/partnership';
import type { ApiPartner, ApiPartnerStatus, CreatePartnerPayload } from '../../lib/api/partnership';
import { PARTNER_STATUSES, PARTNER_TYPES } from './partnershipData';
import styles from './PartnerFormModal.module.css';

export type PartnerFormModalProps = {
  /** The partner being edited, or null for a new one. */
  partner: ApiPartner | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * One dialog for both partner form states — Add Partnership (node 119:51060)
 * and Edit Partnership (node 119:54518).
 */
export function PartnerFormModal({ partner, onClose, onSaved }: PartnerFormModalProps) {
  const { accessToken } = useAuth();
  const isEdit = partner !== null;

  const [form, setForm] = useState({
    name: partner?.name ?? '',
    type: partner?.type || PARTNER_TYPES[0],
    revShare: String(partner?.revShare ?? ''),
    monthlyFee: String(partner?.monthlyFee ?? ''),
    contact: partner?.contact ?? '',
    email: partner?.email ?? '',
    website: partner?.website ?? '',
    status: partner?.status ?? ('Pending' as ApiPartnerStatus),
    apiKey: partner?.apiKey ?? '',
    notes: partner?.notes ?? '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seeded partners may carry a type outside the curated list — keep it selectable.
  const typeOptions = PARTNER_TYPES.includes(form.type as (typeof PARTNER_TYPES)[number])
    ? PARTNER_TYPES
    : [form.type, ...PARTNER_TYPES];

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    if (!form.name.trim()) {
      setError('Partner name is required.');
      return;
    }

    const payload: CreatePartnerPayload = {
      name: form.name.trim(),
      type: form.type,
      revShare: Number(form.revShare) || 0,
      monthlyFee: Number(form.monthlyFee) || 0,
      contact: form.contact.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      status: form.status,
      notes: form.notes,
    };
    // The list returns a masked key; only send it when the user actually typed a new one.
    if (form.apiKey && form.apiKey !== partner?.apiKey) payload.apiKey = form.apiKey;

    setPending(true);
    setError(null);
    try {
      if (isEdit) await partnershipApi.updatePartner(partner._id, payload, accessToken);
      else await partnershipApi.createPartner(payload, accessToken);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Partnership' : 'Add Partnership'} width={560} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <TextField
            fieldClassName={styles.wide}
            label="Partner Name"
            labelCase="caps"
            placeholder="e.g. Diamond Exchange"
            value={form.name}
            onChange={(event) => set('name')(event.target.value)}
          />
          <SelectField
            label="Partner Type"
            options={typeOptions}
            placeholder={null}
            value={form.type}
            onChange={(event) => set('type')(event.target.value)}
          />
          <TextField
            label="Revenue Share %"
            labelCase="caps"
            type="number"
            value={form.revShare}
            onChange={(event) => set('revShare')(event.target.value)}
          />
          <TextField
            label="Monthly Fee"
            labelCase="caps"
            type="number"
            value={form.monthlyFee}
            onChange={(event) => set('monthlyFee')(event.target.value)}
          />
          <TextField
            label="Contact Person"
            labelCase="caps"
            placeholder="Name"
            value={form.contact}
            onChange={(event) => set('contact')(event.target.value)}
          />
          <TextField
            label="Email"
            labelCase="caps"
            type="email"
            placeholder="partner@example.com"
            value={form.email}
            onChange={(event) => set('email')(event.target.value)}
          />
          <TextField
            label="Website"
            labelCase="caps"
            placeholder="https://..."
            value={form.website}
            onChange={(event) => set('website')(event.target.value)}
          />
          <SelectField
            label="Status"
            options={PARTNER_STATUSES}
            placeholder={null}
            value={form.status}
            onChange={(event) => set('status')(event.target.value)}
          />
          <TextField
            fieldClassName={styles.wide}
            label="API Key / Token"
            labelCase="caps"
            placeholder="API key or integration token"
            value={form.apiKey}
            onChange={(event) => set('apiKey')(event.target.value)}
          />
          <TextAreaField
            fieldClassName={styles.wide}
            label="Notes"
            placeholder="Integration notes, SLA terms..."
            value={form.notes}
            onChange={(event) => set('notes')(event.target.value)}
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
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Partnership'}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
