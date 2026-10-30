import { useState } from 'react';
import type { FormEvent } from 'react';
import { TransactionsIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextField } from '../../components/ui/TextField/TextField';
import { PAYMENT_METHODS, PAYMENT_TYPES, RECIPIENT_TYPES } from './walletData';
import styles from './NewPaymentModal.module.css';
import { withCurrency } from '../../lib/format';

export type PaymentRecipientOption = { id: string; label: string; type: (typeof RECIPIENT_TYPES)[number] };

export type NewPaymentSubmit = { recipientId: string; paymentType: string; method: string; amount: number; note: string };

export type NewPaymentModalProps = {
  onClose: () => void;
  onConfirm: () => void;
  /** Staff accounts that can be paid, filtered by the chosen recipient type. */
  recipients: PaymentRecipientOption[];
  /** The API call to run on confirm. */
  onSubmit: (values: NewPaymentSubmit) => Promise<void>;
};

/** Pay a partner — node 119:39582. */
export function NewPaymentModal({ onClose, onConfirm, recipients, onSubmit }: NewPaymentModalProps) {
  const [form, setForm] = useState({
    recipientType: RECIPIENT_TYPES[0] as string,
    recipient: '',
    paymentType: PAYMENT_TYPES[0] as string,
    method: PAYMENT_METHODS[0] as string,
    amount: '',
    note: '',
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typed = recipients.filter((recipient) => recipient.type === form.recipientType);
  const recipientOptions = typed.map((recipient) => recipient.label);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const recipientId = typed.find((recipient) => recipient.label === form.recipient)?.id;
    const amount = Number(form.amount);
    if (!recipientId) return setError('Select a recipient.');
    if (!(amount > 0)) return setError('Enter an amount greater than zero.');
    setPending(true);
    setError(null);
    try {
      await onSubmit({ recipientId, paymentType: form.paymentType, method: form.method, amount, note: form.note.trim() });
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title="New Payment"
      subtitle="Send payment to Super Agent, Agent, or Franchise"
      width={500}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <SelectField
            label="Recipient Type"
            options={RECIPIENT_TYPES}
            placeholder="Super Agent"
            value={form.recipientType}
            onChange={(event) => setForm((current) => ({ ...current, recipientType: event.target.value, recipient: '' }))}
          />
          <SelectField
            label="Select Recipient *"
            options={recipientOptions}
            placeholder="— Select —"
            value={form.recipient}
            onChange={(event) => set('recipient')(event.target.value)}
          />
          <SelectField
            label="Payment Type"
            options={PAYMENT_TYPES}
            placeholder="Credit"
            value={form.paymentType}
            onChange={(event) => set('paymentType')(event.target.value)}
          />
          <SelectField
            label="Payment Method"
            options={PAYMENT_METHODS}
            placeholder="Bank Transfer"
            value={form.method}
            onChange={(event) => set('method')(event.target.value)}
          />
          <TextField
            fieldClassName={styles.wide}
            label={withCurrency('Amount (₹) *')}
            labelCase="caps"
            inputMode="numeric"
            placeholder="Enter amount"
            value={form.amount}
            onChange={(event) => set('amount')(event.target.value)}
          />
          <TextField
            fieldClassName={styles.wide}
            label="Note / Reference"
            labelCase="caps"
            placeholder="e.g. July 2025 commission"
            value={form.note}
            onChange={(event) => set('note')(event.target.value)}
          />
        </div>

        {error ? <p role="alert">{error}</p> : null}

        <div className={styles.footer}>
          <Button
            disabled={pending}
            className={styles.submit}
            type="submit"
            variant="primary"
            size="sm"
            icon={<TransactionsIcon size={13} />}
          >
            {pending ? 'Paying…' : 'Confirm & Pay'}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
