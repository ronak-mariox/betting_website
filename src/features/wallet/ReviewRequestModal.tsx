import { useState } from 'react';
import { BanIcon, CheckCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { TextField } from '../../components/ui/TextField/TextField';
import { formatRupees } from '../../lib/format';
import { PaymentProof } from './PaymentProof';
import styles from './ReviewRequestModal.module.css';

export type ReviewRequest = {
  id: string;
  user: string;
  amount: number;
  kind: 'deposit' | 'withdrawal';
  method: string;
  reference: string;
  /** Deposits: whether the player attached a payment screenshot. */
  hasProof: boolean;
  /** True / false for a decision being confirmed; null just to look at the request. */
  approve: boolean | null;
};

type Props = {
  request: ReviewRequest;
  onClose: () => void;
  /** Resolves when the decision is saved; rejects with the message to show. */
  onConfirm: (reason: string) => Promise<void>;
};

/**
 * Approving or rejecting moves (or refuses) real money, so it's confirmed
 * here first with the request's details; a rejection can carry the reason
 * the player will see in the app.
 */
export function ReviewRequestModal({ request, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewing = request.approve === null;
  const verb = request.approve ? 'Approve' : 'Reject';
  const effect = viewing
    ? 'What the user sent with this request.'
    : !request.approve
      ? `The user's balance stays the same${request.kind === 'withdrawal' ? ' and the held amount is released' : ''}.`
      : request.kind === 'deposit'
        ? `${formatRupees(request.amount)} will be added to ${request.user}'s wallet. Approve only after the money has reached you and the screenshot matches.`
        : `${formatRupees(request.amount)} will be deducted from ${request.user}'s wallet. Send the money to the destination below.`;

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the server.');
      setPending(false);
    }
  };

  return (
    <Modal
      title={viewing ? `${request.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} request` : `${verb} ${request.kind}`}
      subtitle={effect}
      width={520}
      onClose={onClose}
    >
      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>User</dt>
          <dd>{request.user}</dd>
        </div>
        <div className={styles.row}>
          <dt>Amount</dt>
          <dd className={styles.amount}>{formatRupees(request.amount)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Method</dt>
          <dd>{request.method}</dd>
        </div>
        <div className={styles.row}>
          <dt>{request.kind === 'deposit' ? 'UTR / Ref' : 'Send to'}</dt>
          <dd className={styles.mono}>{request.reference}</dd>
        </div>
      </dl>

      {request.kind === 'deposit' ? (
        <PaymentProof
          requestId={request.id}
          attached={request.hasProof}
          amount={formatRupees(request.amount)}
          reference={request.reference}
        />
      ) : null}

      {request.approve !== false ? null : (
        <TextField
          label="Reason (shown to the user)"
          placeholder="e.g. UTR did not match"
          maxLength={200}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      )}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.footer}>
        {viewing ? null : (
          <Button
            className={request.approve ? styles.approve : styles.reject}
            icon={request.approve ? <CheckCircleIcon size={14} /> : <BanIcon size={14} />}
            disabled={pending}
            onClick={confirm}
          >
            {pending ? 'Saving…' : `${verb} ${formatRupees(request.amount)}`}
          </Button>
        )}
        <Button className={styles.cancel} disabled={pending} onClick={onClose}>
          {viewing ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </Modal>
  );
}
