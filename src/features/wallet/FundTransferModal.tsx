import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { TransactionsIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextField } from '../../components/ui/TextField/TextField';
import { ApiRequestError } from '../../lib/api';
import { networkApi } from '../../lib/api/network';
import type { NetworkRole } from '../../lib/api/network';
import { walletApi } from '../../lib/api/wallet';
import { formatRupees, withCurrency } from '../../lib/format';
import { useAuth } from '../auth/authContext';
import styles from './ReviewRequestModal.module.css';

type Recipient = { id: string; label: string };

/** Who can receive a transfer from each panel: everyone below it. */
const RECIPIENT_ROLES: Record<string, { role: NetworkRole; label: string }[]> = {
  franchise: [
    { role: 'super-agent', label: 'Super Agent' },
    { role: 'agent', label: 'Agent' },
    { role: 'player', label: 'User' },
  ],
  'super-agent': [
    { role: 'agent', label: 'Agent' },
    { role: 'player', label: 'User' },
  ],
  agent: [{ role: 'player', label: 'User' }],
};

type Props = {
  /** What the sender holds right now. */
  balance: number;
  onClose: () => void;
  /** Called with the sender's balance after the transfer. */
  onDone: (balance: number) => void;
};

/**
 * Fund Transfer: moves money from the signed-in account's own wallet to an
 * agent or user in its network. Needs the "Fund Transfer" grant.
 */
/** A fresh key per attempt: the server applies one key at most once. */
const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function FundTransferModal({ balance, onClose, onDone }: Props) {
  const { accessToken, user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [form, setForm] = useState({ amount: '', note: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Same key for retries of the same attempt (e.g. after a network error), so money never moves twice. */
  const attemptKey = useRef(newKey());
  const inFlight = useRef(false);

  // Accounts in the network, filtered by name / username as the sender types.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const roles = RECIPIENT_ROLES[user?.roleId ?? ''] ?? [];
    const timer = window.setTimeout(() => {
      Promise.all(
        roles.map(({ role }) =>
          networkApi.list({ role, status: 'active', q: search.trim(), limit: 50 }, accessToken).catch(() => null),
        ),
      ).then((lists) => {
        if (cancelled) return;
        setRecipients(
          lists.flatMap((list, index) =>
            (list?.items ?? []).map((a) => ({ id: a._id, label: `${a.name || a.username} (${a.username}) · ${roles[index].label}` })),
          ),
        );
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accessToken, user?.roleId, search]);

  const amount = Number(form.amount);
  // The chosen account stays selectable even when a new search no longer lists it.
  const options = selected && !recipients?.some((r) => r.id === selected.id) ? [selected, ...(recipients ?? [])] : recipients ?? [];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || inFlight.current) return;
    if (!selected) return setError('Choose who to transfer to.');
    if (!Number.isInteger(amount) || amount <= 0) return setError('Enter a whole rupee amount to transfer.');
    if (amount > balance) return setError(`Your wallet balance is ${formatRupees(balance)}.`);
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await walletApi.transfer(
        { toUserId: selected.id, amount, note: form.note.trim(), idempotencyKey: attemptKey.current },
        accessToken,
      );
      onDone(result.balance);
    } catch (err) {
      // The server answered (e.g. not enough balance): that attempt is over, a corrected one gets a new key.
      if (err instanceof ApiRequestError) attemptKey.current = newKey();
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server — try again, it will not be sent twice.');
      setPending(false);
      inFlight.current = false;
    }
  };

  return (
    <Modal
      title="Fund Transfer"
      subtitle={`From your wallet · ${formatRupees(balance)} available`}
      width={480}
      onClose={onClose}
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField
          label="Search client"
          placeholder="Name or username"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SelectField
          label="Transfer to"
          options={options.map((option) => option.label)}
          placeholder={recipients === null ? 'Loading…' : options.length ? 'Choose an agent or user' : 'No matching active accounts'}
          value={selected?.label ?? ''}
          onChange={(event) => {
            setSelected(options.find((option) => option.label === event.target.value) ?? null);
            attemptKey.current = newKey();
          }}
        />
        <TextField
          label={withCurrency('Amount (₹)')}
          inputMode="numeric"
          placeholder="0"
          value={form.amount}
          onChange={(event) => {
            setForm((current) => ({ ...current, amount: event.target.value.replace(/[^0-9]/g, '') }));
            attemptKey.current = newKey();
          }}
        />
        <TextField
          label="Note (optional)"
          placeholder="e.g. Weekly float"
          maxLength={120}
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
        />

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.footer}>
          <Button className={styles.approve} type="submit" icon={<TransactionsIcon size={14} />} disabled={pending}>
            {pending ? 'Transferring…' : amount > 0 ? `Transfer ${formatRupees(amount)}` : 'Transfer'}
          </Button>
          <Button className={styles.cancel} disabled={pending} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
