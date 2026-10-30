import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { TextField } from '../../components/ui/TextField/TextField';
import { ApiRequestError } from '../../lib/api';
import type { CreateEventPayload } from '../../lib/api/events';
import styles from '../users/AddUserModal.module.css';

export type EventFormModalProps = {
  onClose: () => void;
  onCreate: (payload: CreateEventPayload) => Promise<void>;
};

/** Only cricket is open for betting for now, so every event is a cricket event. */
const EMPTY = { sport: 'Cricket', name: '', league: '', emoji: '🏏', startTime: '' };

/** Add Event dialog — there's no design node for this yet, so it borrows the standard form-dialog chrome. */
export function EventFormModal({ onClose, onCreate }: EventFormModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.sport.trim() || !form.name.trim() || !form.startTime) {
      setError('Sport, event name and start time are required.');
      return;
    }
    const startTime = new Date(form.startTime);
    if (Number.isNaN(startTime.getTime())) {
      setError('Start time is invalid.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onCreate({
        sport: form.sport.trim(),
        name: form.name.trim(),
        league: form.league.trim(),
        emoji: form.emoji.trim() || '🏆',
        startTime: startTime.toISOString(),
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal title="Add Event" subtitle="Create a new sporting fixture" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className={styles.grid} style={{ paddingTop: 0 }}>
          <TextField label="Sport *" labelCase="caps" value={form.sport} readOnly disabled />
          <TextField
            label="Event Name *"
            labelCase="caps"
            placeholder="e.g. India vs Australia"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
          />
          <TextField
            label="League / Series"
            labelCase="caps"
            placeholder="e.g. IPL 2024 · Match 48"
            value={form.league}
            onChange={(e) => set('league')(e.target.value)}
          />
          <TextField
            label="Emoji"
            labelCase="caps"
            placeholder="🏆"
            value={form.emoji}
            onChange={(e) => set('emoji')(e.target.value)}
          />
          <TextField
            label="Start Time *"
            labelCase="caps"
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => set('startTime')(e.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger)', margin: '0 0 8px', fontSize: 12 }}>
            {error}
          </p>
        ) : null}

        <div className={styles.footer}>
          <Button
            className={styles.submit}
            type="submit"
            variant="primary"
            size="sm"
            icon={<CheckCircleIcon size={13.993} />}
            disabled={pending}
          >
            {pending ? 'Creating…' : 'Add Event'}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
