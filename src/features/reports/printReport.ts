import type { ReportRow } from '../../lib/api/reports';
import { formatReportCell, formatReportColumnHeader, getReportColumns } from './reportsData';
import { platformTimeZone } from '../../lib/format';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

/**
 * Opens the report as a clean, printable sheet and brings up the browser's
 * print dialog — "Save as PDF" there gives the PDF, a printer the paper copy.
 * Returns false when the browser blocked the new window.
 */
export function printReport({ title, period, rows }: { title: string; period: string; rows: ReportRow[] }): boolean {
  const sheet = window.open('', '_blank', 'width=1000,height=700');
  if (!sheet) return false;
  const columns = getReportColumns(rows);
  const head = columns.map((column) => `<th>${escapeHtml(formatReportColumnHeader(column))}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(String(formatReportCell(row[column])))}</td>`).join('')}</tr>`)
    .join('');
  sheet.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body { font: 12px/1.4 -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { margin: 0 0 16px; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f1f3f5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    tr:nth-child(even) td { background: #fafafa; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(period)} · ${rows.length} record${rows.length === 1 ? '' : 's'} · printed ${escapeHtml(new Date().toLocaleString('en-IN', { timeZone: platformTimeZone() }))}</p>
    ${rows.length ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` : '<p>No records in this range.</p>'}
  </body></html>`);
  sheet.document.close();
  sheet.focus();
  sheet.print();
  return true;
}
