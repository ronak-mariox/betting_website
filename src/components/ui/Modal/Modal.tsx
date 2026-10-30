import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from '../../icons';
import styles from './Modal.module.css';

export type ModalProps = {
  title: string;
  subtitle?: string;
  /** Dialog width in px — 580 for the user/franchise forms, 540/500 elsewhere. */
  width?: number;
  /** Optional element rendered before the title, e.g. a tinted icon tile. */
  leading?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

/** Centred dialog — closes on backdrop click and on Escape. */
export function Modal({ title, subtitle, width = 580, leading, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.heading}>
            {leading}
            <div>
              <h2 className={styles.title}>{title}</h2>
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <CloseIcon size={14.997} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
