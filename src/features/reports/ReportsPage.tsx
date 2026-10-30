import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ExportIcon, EyeIcon, ReportsIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { SectionCard } from '../../components/ui/SectionCard/SectionCard';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { usePermissions } from '../auth/usePermissions';
import { ApiRequestError } from '../../lib/api';
import { downloadReportCsv, reportsApi } from '../../lib/api/reports';
import type { ReportDateRange } from '../../lib/api/reports';
import { printReport } from './printReport';
import { ReportPreviewModal } from './ReportPreviewModal';
import {
  GROUP_BY_OPTIONS,
  NO_GROUPING,
  REPORT_KINDS,
  REPORT_TYPE_OPTIONS,
  reportStats,
} from './reportsData';
import type { ReportKind } from './reportsData';
import styles from './ReportsPage.module.css';

/**
 * Reports console — node 112:8228. Every role's reports are live; the
 * backend limits the rows to the viewer's own network.
 */
export function ReportsPage() {
  const { accessToken } = useAuth();
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof reportsApi.preview>>['rows'] | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    reportsApi
      .preview('financial', {}, accessToken)
      .then((res) => {
        if (!cancelled) setLedger(res.rows);
      })
      .catch(() => {
        if (!cancelled) setLedger([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const [preview, setPreview] = useState<ReportKind | null>(null);
  const [form, setForm] = useState({
    type: REPORT_TYPE_OPTIONS[0],
    from: '',
    to: '',
    groupBy: GROUP_BY_OPTIONS[0],
  });
  const [exportingKind, setExportingKind] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const range = { from: form.from || undefined, to: form.to || undefined };
  /** The builder's range with its grouping — what Generate / Export in the builder use. */
  const builderRange = { ...range, groupBy: form.groupBy === NO_GROUPING ? undefined : form.groupBy };
  const { can } = usePermissions();
  const canExport = can('reportsAnalytics', 'exportData', 'X');
  // The commission report needs the Commission page's view grant as well.
  const kinds = can('finance', 'commission', 'V') ? REPORT_KINDS : REPORT_KINDS.filter((kind) => kind.slug !== 'commission');
  /** The range the open preview was generated with. */
  const [previewRange, setPreviewRange] = useState<ReportDateRange>({});

  const periodLabel = (r: ReportDateRange) =>
    `${r.from || r.to ? `${r.from || '…'} – ${r.to || 'now'}` : 'All time'}${r.groupBy ? ` · grouped ${r.groupBy.toLowerCase()}` : ''}`;

  /** PDF / Print: the report as a printable sheet (Save as PDF in the print dialog). */
  const handlePrint = async (kind: ReportKind, r: ReportDateRange) => {
    if (!accessToken) return;
    setExportError(null);
    setExportingKind(kind.title);
    try {
      const res = await reportsApi.preview(kind.slug, r, accessToken);
      if (!printReport({ title: kind.title, period: periodLabel(r), rows: res.rows })) {
        setExportError('Your browser blocked the print window — allow pop-ups for this site and try again.');
      }
    } catch (err) {
      setExportError(err instanceof ApiRequestError ? err.message : 'Unable to open this report.');
    } finally {
      setExportingKind(null);
    }
  };


  const handleExport = async (kind: ReportKind, r: ReportDateRange = range) => {
    if (!accessToken) return;
    setExportError(null);
    setExportingKind(kind.title);
    try {
      await downloadReportCsv(kind.slug, r, accessToken);
    } catch (err) {
      setExportError(err instanceof ApiRequestError ? err.message : 'Unable to export this report.');
    } finally {
      setExportingKind(null);
    }
  };

  const handleGenerate = () => {
    const match = REPORT_KINDS.find((kind) => kind.title === form.type);
    if (!match) return;
    setPreviewRange(builderRange);
    setPreview(match);
  };

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {reportStats(ledger).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className={styles.kinds}>
        {kinds.map((kind) => (
          <article
            key={kind.title}
            className={styles.kind}
            style={{ '--kind-rgb': kind.rgb } as CSSProperties}
          >
            <div className={styles.kindHead}>
              <span className={styles.kindTile}>
                <kind.icon size={21.996} />
              </span>
              <div className={styles.kindText}>
                <p className={styles.kindTitle}>{kind.title}</p>
                <p className={styles.kindDescription}>{kind.description}</p>
              </div>
            </div>

            <div className={styles.formats}>
              {canExport
                ? kind.formats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      className={styles.formatButton}
                      title={format === 'Excel' ? 'Download as a spreadsheet (CSV)' : 'Open a printable sheet — choose Save as PDF or a printer'}
                      disabled={exportingKind === kind.title}
                      onClick={() => (format === 'Excel' ? handleExport(kind, {}) : handlePrint(kind, {}))}
                    >
                      <Badge tone="brand">{format}</Badge>
                    </button>
                  ))
                : null}
            </div>

            <div className={styles.kindActions}>
              {canExport ? (
                <Button
                  className={styles.exportBtn}
                  variant="primary"
                  size="xs"
                  icon={<ExportIcon size={12} />}
                  disabled={!accessToken || exportingKind === kind.title}
                  onClick={() => handleExport(kind, {})}
                >
                  {exportingKind === kind.title ? 'Exporting…' : 'Export'}
                </Button>
              ) : null}
              <Button
                className={styles.previewBtn}
                size="xs"
                icon={<EyeIcon size={12} />}
                onClick={() => {
                  setPreviewRange({});
                  setPreview(kind);
                }}
              >
                Preview
              </Button>
            </div>
          </article>
        ))}
      </div>

      {exportError ? (
        <p className={styles.formError} role="alert">
          {exportError}
        </p>
      ) : null}

      <SectionCard
        title="Custom Report Builder"
        subtitle="Generate reports with custom date ranges and filters"
        size="md"
        bodySpacing={20}
      >
        <div className={styles.builder}>
          <SelectField
            label="Report Type"
            labelCase="sentence"
            options={kinds.map((kind) => kind.title)}
            placeholder={null}
            value={form.type}
            onChange={(event) => set('type')(event.target.value)}
          />
          <TextField
            label="Date From"
            type="date"
            value={form.from}
            onChange={(event) => set('from')(event.target.value)}
          />
          <TextField
            label="Date To"
            type="date"
            value={form.to}
            onChange={(event) => set('to')(event.target.value)}
          />
          <SelectField
            label="Group By"
            labelCase="sentence"
            options={GROUP_BY_OPTIONS}
            placeholder={null}
            value={form.groupBy}
            onChange={(event) => set('groupBy')(event.target.value)}
          />
        </div>

        <div className={styles.builderActions}>
          <Button
            variant="primary"
            size="sm"
            icon={<ReportsIcon size={13.993} />}
            onClick={handleGenerate}
          >
            Generate Report
          </Button>
          {canExport ? (
            <>
              <Button
                className={styles.pdf}
                size="sm"
                icon={<ExportIcon size={13.993} />}
                disabled={!accessToken || exportingKind === form.type}
                onClick={() => {
                  const match = REPORT_KINDS.find((kind) => kind.title === form.type);
                  if (match) handlePrint(match, builderRange);
                }}
              >
                {exportingKind === form.type ? 'Working…' : 'Export PDF'}
              </Button>
              <Button
                className={styles.excel}
                size="sm"
                icon={<ExportIcon size={13.993} />}
                disabled={!accessToken || exportingKind === form.type}
                onClick={() => {
                  const match = REPORT_KINDS.find((kind) => kind.title === form.type);
                  if (match) handleExport(match, builderRange);
                }}
              >
                {exportingKind === form.type ? 'Working…' : 'Export Excel'}
              </Button>
            </>
          ) : (
            <p className={styles.formError}>Exporting reports needs the "Export Data" permission.</p>
          )}
        </div>
      </SectionCard>

      {preview ? (
        <ReportPreviewModal
          kind={preview}
          range={previewRange}
          canExport={canExport}
          onPrint={(rows) => printReport({ title: preview.title, period: periodLabel(previewRange), rows })}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
