import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from '../../icons';
import { cx } from '../../../lib/cx';
import styles from './Drawer.module.css';

export type DrawerProps = {
  /** Identity block shown on the left of the header. */
  header: ReactNode;
  /** Optional tab strip pinned under the header. */
  tabs?: ReactNode;
  /** Controls rendered next to the close button. */
  actions?: ReactNode;
  label: string;
  /** Sheet width in px — 560 for users, 600 for franchises. */
  width?: number;
  /** 'raised' paints the sheet on the card surface (match drawer). */
  surface?: 'default' | 'raised';
  /** Extra class for the header band, e.g. the match drawer's gradient. */
  headerClassName?: string;
  /** 'stack' lets the header run full width with the close button in the corner. */
  headerLayout?: 'row' | 'stack';
  onClose: () => void;
  children: ReactNode;
};

/** Right-hand sheet used for record detail. */
export function Drawer({
  header,
  tabs,
  actions,
  label,
  width = 560,
  surface = 'default',
  headerClassName,
  headerLayout = 'row',
  onClose,
  children,
}: DrawerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <aside
        className={cx(styles.panel, surface === 'raised' && styles.raised)}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={cx(styles.head, headerLayout === 'stack' && styles.stack, headerClassName)}>
          {header}
          <div className={styles.headActions}>
            {actions}
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <CloseIcon size={15.999} />
            </button>
          </div>
        </div>
        {tabs ? <div className={styles.tabs}>{tabs}</div> : null}
        <div className={styles.body}>{children}</div>
      </aside>
    </div>
  );
}
