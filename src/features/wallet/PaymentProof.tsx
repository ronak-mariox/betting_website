import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { walletApi } from '../../lib/api/wallet';
import type { WalletRequestProof } from '../../lib/api/wallet';
import styles from './PaymentProof.module.css';

type Props = {
  requestId: string;
  /** False for deposits filed before a screenshot was required. */
  attached: boolean;
  /** Read next to the image, so the two can be compared at a glance. */
  amount: string;
  reference: string;
};

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The screenshot of the payment a player attached to their deposit. Loaded
 * only when a request is opened (the image is too large for the list), and
 * shown beside what it has to match: the amount and the transaction id.
 */
export function PaymentProof({ requestId, attached, amount, reference }: Props) {
  const { accessToken } = useAuth();
  const [proof, setProof] = useState<WalletRequestProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!accessToken || !attached) return undefined;
    let cancelled = false;
    walletApi
      .proof(requestId, accessToken)
      .then((res) => {
        if (!cancelled) setProof(res.proof);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to load the screenshot.');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, requestId, attached]);

  return (
    <section className={styles.proof} aria-label="Payment screenshot">
      <header className={styles.head}>
        <p className={styles.title}>Payment screenshot</p>
        {proof ? (
          <a className={styles.link} href={proof.data} download={proof.name || 'payment-screenshot'}>
            Download · {fileSize(proof.size)}
          </a>
        ) : null}
      </header>

      {!attached ? (
        <p className={styles.note}>No screenshot was attached to this request.</p>
      ) : error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : !proof ? (
        <p className={styles.note}><Loader label="Loading screenshot…" /></p>
      ) : (
        <>
          <button
            type="button"
            className={styles.frame}
            onClick={() => setExpanded(true)}
            aria-label="Enlarge screenshot"
          >
            <img
              className={styles.image}
              src={proof.data}
              alt={`Payment screenshot for ${amount}, transaction ${reference}`}
            />
          </button>
          <p className={styles.note}>
            Check that it shows <strong>{amount}</strong> and transaction ID{' '}
            <strong className={styles.mono}>{reference}</strong>. Click the image to enlarge it.
          </p>
          {expanded
            ? createPortal(
                // Over the whole window (the dialog is too narrow to read a receipt in); any click closes it.
                <div
                  className={styles.lightbox}
                  role="dialog"
                  aria-label="Payment screenshot, full size"
                  onClick={(event) => {
                    // The viewer lives inside the dialog's React tree: keep the click from closing that too.
                    event.stopPropagation();
                    setExpanded(false);
                  }}
                >
                  <p className={styles.lightboxBar}>
                    {amount} · <span className={styles.mono}>{reference}</span>
                    <button type="button" className={styles.lightboxClose} aria-label="Close full size screenshot">
                      Close
                    </button>
                  </p>
                  <img
                    className={styles.lightboxImage}
                    src={proof.data}
                    alt={`Payment screenshot for ${amount}, full size`}
                  />
                </div>,
                document.body,
              )
            : null}
        </>
      )}
    </section>
  );
}
