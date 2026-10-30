import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CheckCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { TextField } from '../../components/ui/TextField/TextField';
import { ApiRequestError } from '../../lib/api';
import { settingsApi } from '../../lib/api/settings';
import type { PaymentDetails } from '../../lib/api/settings';
import { resizeImageToDataUri } from '../../lib/image';
import { useAuth } from '../auth/authContext';
import styles from './SettingsPage.module.css';

/** Large enough that phones scan it reliably, small enough to load fast on the app. */
const QR_MAX_DIMENSION = 1000;
const QR_QUALITY = 0.92;

/**
 * Settings → Payment Details: the QR code and UPI ID players pay their
 * deposits to. Shown on the app's Deposit screen as soon as it's saved, so
 * the admin can swap them whenever the receiving account changes.
 */
export function PaymentDetailsTab({
  saved,
  onSaved,
}: {
  saved: Partial<PaymentDetails>;
  onSaved: (details: PaymentDetails) => void;
}) {
  const { accessToken } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [qrImage, setQrImage] = useState(saved.qrImage ?? '');
  const [form, setForm] = useState({ upiId: saved.upiId ?? '', payeeName: saved.payeeName ?? '', note: saved.note ?? '' });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const pickQr = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setMessage({ text: 'Choose a PNG, JPG or WebP image of the QR code.', error: true });
      return;
    }
    try {
      setQrImage(await resizeImageToDataUri(file, QR_MAX_DIMENSION, QR_QUALITY));
      setMessage(null);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Could not read the image.', error: true });
    }
  };

  const save = async () => {
    if (!accessToken) return;
    const upiId = form.upiId.trim();
    if (upiId && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
      setMessage({ text: 'Enter a valid UPI ID, e.g. name@bank.', error: true });
      return;
    }
    if (!qrImage && !upiId) {
      setMessage({ text: 'Add a QR code or a UPI ID — players need one of them to pay.', error: true });
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const { paymentDetails } = await settingsApi.updatePaymentDetails(
        { qrImage, upiId, payeeName: form.payeeName.trim(), note: form.note.trim() },
        accessToken,
      );
      onSaved(paymentDetails);
      setMessage({ text: 'Saved — the app now shows these payment details.', error: false });
    } catch (err) {
      setMessage({ text: err instanceof ApiRequestError ? err.message : 'Unable to save the payment details.', error: true });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.pair}>
      <section className={styles.card}>
        <p className={styles.cardTitle}>Deposit QR Code</p>
        <p className={styles.cardSubtitle}>Players scan this on the app’s Deposit screen. Replace it whenever the receiving account changes.</p>
        <div className={styles.fields}>
          {qrImage ? (
            <img
              src={qrImage}
              alt="Current deposit QR code"
              style={{ width: 220, height: 220, objectFit: 'contain', background: '#ffffff', borderRadius: 12, padding: 8 }}
            />
          ) : (
            <p className={styles.cardSubtitle}>No QR code uploaded yet — the app shows only the UPI ID.</p>
          )}
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickQr} />
        </div>
        <div className={styles.cardActions}>
          <Button variant="primary" size="sm" onClick={() => fileInput.current?.click()}>
            {qrImage ? 'Change QR Code' : 'Upload QR Code'}
          </Button>
          {qrImage ? (
            <Button className={styles.secondary} size="sm" onClick={() => setQrImage('')}>
              Remove QR
            </Button>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>UPI Details</p>
        <p className={styles.cardSubtitle}>Shown under the QR, with a copy button.</p>
        <div className={styles.fields}>
          <TextField
            label="UPI ID"
            placeholder="e.g. payments@okaxis"
            value={form.upiId}
            onChange={(event) => setForm((current) => ({ ...current, upiId: event.target.value }))}
          />
          <TextField
            label="Payee Name"
            placeholder="Name shown in the UPI app"
            maxLength={80}
            value={form.payeeName}
            onChange={(event) => setForm((current) => ({ ...current, payeeName: event.target.value }))}
          />
          <TextField
            label="Note for players (optional)"
            placeholder="e.g. Pay only to this UPI ID"
            maxLength={200}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
          {saved.updatedAt ? (
            <p className={styles.cardSubtitle}>Last changed {new Date(saved.updatedAt).toLocaleString('en-IN')}</p>
          ) : null}
          {message ? (
            <p className={styles.cardSubtitle} role={message.error ? 'alert' : 'status'} style={message.error ? { color: 'var(--color-danger)' } : undefined}>
              {message.text}
            </p>
          ) : null}
        </div>
        <div className={styles.cardActions}>
          <Button variant="primary" size="sm" disabled={pending} icon={<CheckCircleIcon size={13.993} />} onClick={save}>
            {pending ? 'Saving…' : 'Save Payment Details'}
          </Button>
        </div>
      </section>
    </div>
  );
}
