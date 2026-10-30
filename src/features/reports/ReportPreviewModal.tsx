import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { CloseIcon, ExportIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { downloadReportCsv, reportsApi } from '../../lib/api/reports';
import type { ReportDateRange, ReportRow } from '../../lib/api/reports';
import {
  formatReportCell,
  formatReportColumnHeader,
  getReportColumns,
} from './reportsData';
import type { ReportKind } from './reportsData';
import styles from './ReportPreviewModal.module.css';

export type ReportPreviewModalProps = {
  /** Report kind whose output is being shown. */
  kind: ReportKind;
  /** Date range from the Reports page's builder — only used for the live (super-admin) preview. */
  range: ReportDateRange;
  /** Whether the viewer holds the "Export Data" grant. */
  canExport: boolean;
  /** Opens the rows shown as a printable sheet (PDF / print). */
  onPrint: (rows: ReportRow[]) => void;
  onClose: () => void;
};

/**
 * Sample-output sheet — nodes 119:55473 and 139:84935. Wider than the shared
 * Modal (820px) and washed in the kind's own colour, so it carries its own
 * chrome; the table it shows travels with the kind.
 *
 * Every role's rows are live and scoped to its own network by the backend.
 */
export function ReportPreviewModal({ kind, range, canExport, onPrint, onClose }: ReportPreviewModalProps) {
  const { accessToken } = useAuth();

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    reportsApi
      .preview(kind.slug, range, accessToken)
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : 'Unable to load this report preview.');
        }
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, kind.slug, range.from, range.to, range.groupBy]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleExport = async () => {
    if (!accessToken) return;
    setExportError(null);
    setExporting(true);
    try {
      await downloadReportCsv(kind.slug, range, accessToken);
    } catch (err) {
      setExportError(err instanceof ApiRequestError ? err.message : 'Unable to export this report.');
    } finally {
      setExporting(false);
    }
  };

  const columns = getReportColumns(rows);
  const periodLabel = range.from || range.to ? `${range.from || '…'} – ${range.to || 'now'}` : 'All time';
  const grouping = range.groupBy ? `Grouped ${range.groupBy.toLowerCase()}` : 'Every record';
  const meta = [
    { label: 'Period', value: periodLabel },
    { label: 'Total Records', value: pending ? '…' : String(total) },
    { label: 'Status', value: pending ? 'Loading…' : error ? 'Error' : 'Complete' },
    { label: 'Layout', value: grouping },
  ];

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        style={{ '--preview-rgb': kind.rgb } as CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={`${kind.title} preview`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>{kind.title} — Preview</h2>
            <p className={styles.subtitle}>
              Live data
            </p>
          </div>
          <div className={styles.actions}>
            {canExport ? (
              <>
                <Button size="xs" disabled={pending || Boolean(error)} onClick={() => onPrint(rows)}>
                  Print / PDF
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  icon={<ExportIcon size={12} />}
                  disabled={!accessToken || exporting}
                  onClick={handleExport}
                >
                  {exporting ? 'Exporting…' : 'Export Excel (CSV)'}
                </Button>
              </>
            ) : null}
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        <div className={styles.meta}>
          {meta.map((cell) => (
            <div key={cell.label} className={styles.metaCell}>
              <p className={styles.metaLabel}>{cell.label}</p>
              <p className={styles.metaValue}>{cell.value}</p>
            </div>
          ))}
        </div>

        {exportError ? (
          <p className={styles.subtitle} role="alert">
            {exportError}
          </p>
        ) : null}

        <div className={styles.body}>
          {pending ? (
            <Loader block />
          ) : error ? (
            <p className={styles.subtitle} role="alert">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className={styles.subtitle}>No records in this range.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((head) => (
                    <th key={head} scope="col">
                      {formatReportColumnHeader(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={rowIndex}>
                    {columns.map((column, index) => (
                      <td key={column} className={index === 0 ? styles.rowHead : undefined}>
                        {formatReportCell(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
