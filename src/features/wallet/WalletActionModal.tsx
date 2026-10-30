import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  RefreshIcon,
  TransactionsIcon,
} from '../../components/icons';
import type { IconProps } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextAreaField } from '../../components/ui/TextField/TextAreaField';
import { TextField } from '../../components/ui/TextField/TextField';
import styles from './WalletActionModal.module.css';
import type { ComponentType } from 'react';
import { withCurrency } from '../../lib/format';

export type WalletAction = 'Manual Credit' | 'Manual Debit' | 'Transfer' | 'Adjustment';

type ActionSpec = {
  icon: ComponentType<IconProps>;
  rgb: string;
  /** Solid confirm button colour; yellow needs dark text. */
  darkLabel?: boolean;
  /** Transfer also picks a destination user. */
  destination?: boolean;
};

const ACTIONS: Record<WalletAction, ActionSpec> = {
  'Manual Credit': { icon: ArrowDownIcon, rgb: '34, 197, 94' },
  'Manual Debit': { icon: ArrowUpIcon, rgb: '239, 68, 68' },
  Transfer: { icon: TransactionsIcon, rgb: '33, 150, 243', destination: true },
  Adjustment: { icon: RefreshIcon, rgb: '250, 204, 21', darkLabel: true },
};

export type WalletUserOption = { id: string; label: string };

export type WalletActionSubmit = { userId: string; toUserId?: string; amount: number; note: string; direction?: 'credit' | 'debit' };

export type WalletActionModalProps = {
  action: WalletAction;
  onClose: () => void;
  onConfirm: () => void;
  /** Accounts the operation can target. */
  users: WalletUserOption[];
  /** The API call to run on confirm. */
  onSubmit: (values: WalletActionSubmit) => Promise<void>;
};

/**
 * One dialog for all four manual wallet operations — nodes 117:35363,
 * 119:36414, 119:37465 and 119:38529 differ only by accent, icon and the
 * extra destination field on Transfer.
 */
export function WalletActionModal({ action, onClose, onConfirm, users, onSubmit }: WalletActionModalProps) {
  const spec = ACTIONS[action];
  const Icon = spec.icon;
  const [form, setForm] = useState({ user: '', amount: '', destination: '', note: '', direction: 'credit' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const userOptions = users.map((user) => user.label);
  const idFor = (label: string) => users.find((user) => user.label === label)?.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = idFor(form.user);
    const toUserId = spec.destination ? idFor(form.destination) : undefined;
    const amount = Number(form.amount);
    if (!userId) return setError('Select a user.');
    if (spec.destination && !toUserId) return setError('Select a destination user.');
    if (!(amount > 0)) return setError('Enter an amount greater than zero.');
    // Every correction keeps its reason on the ledger entry.
    if (form.note.trim().length < 3) return setError('Write the reason for this entry.');
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        userId,
        toUserId,
        amount,
        note: form.note.trim(),
        ...(action === 'Adjustment' ? { direction: form.direction as 'credit' | 'debit' } : {}),
      });
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={action}
      subtitle="Manual wallet operation"
      width={500}
      leading={
        <span
          className={styles.tile}
          style={
            {
              '--action-bg': `rgba(${spec.rgb}, 0.09)`,
              '--action-color': `rgb(${spec.rgb})`,
            } as CSSProperties
          }
        >
          <Icon size={17.999} />
        </span>
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ '--action-color': `rgb(${spec.rgb})` } as CSSProperties}>
        <div className={styles.fields}>
          <SelectField
            label="Select User *"
            options={userOptions}
            placeholder="— Search and select user —"
            value={form.user}
            onChange={(event) => set('user')(event.target.value)}
          />
          <TextField
            className={styles.amount}
            style={{ borderColor: `rgba(${spec.rgb}, 0.25)` }}
            label={withCurrency('Amount (₹) *')}
            labelCase="caps"
            inputMode="numeric"
            placeholder="Enter amount"
            value={form.amount}
            onChange={(event) => set('amount')(event.target.value)}
          />
          {spec.destination ? (
            <SelectField
              label="Transfer to User *"
              options={userOptions}
              placeholder="— Select destination user —"
              value={form.destination}
              onChange={(event) => set('destination')(event.target.value)}
            />
          ) : null}
          {action === 'Adjustment' ? (
            <SelectField
              label="Direction *"
              options={['Add to balance', 'Deduct from balance']}
              value={form.direction === 'debit' ? 'Deduct from balance' : 'Add to balance'}
              onChange={(event) => set('direction')(event.target.value === 'Deduct from balance' ? 'debit' : 'credit')}
            />
          ) : null}
          <TextAreaField
            label="Reason *"
            placeholder="Why this entry is made (kept on the ledger)..."
            value={form.note}
            onChange={(event) => set('note')(event.target.value)}
          />
        </div>

        {error ? <p role="alert">{error}</p> : null}

        <div className={styles.footer}>
          <Button
            disabled={pending}
            className={`${styles.confirm} ${spec.darkLabel ? styles.confirmDark : ''}`}
            style={{ backgroundColor: `rgb(${spec.rgb})` }}
            type="submit"
            size="sm"
            icon={<CheckCircleIcon size={13.993} />}
          >
            {pending ? 'Saving…' : `Confirm ${action}`}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
