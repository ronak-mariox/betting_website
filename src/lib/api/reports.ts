import { API_BASE_URL, ApiRequestError, apiRequest, rotateTokens } from '../api';

/** Matches backend `REPORT_KINDS` — see backend/src/services/report.service.js. */
export type ReportKindSlug = 'financial' | 'betting' | 'user' | 'wallet' | 'commission' | 'exposure';

/** One row of report output; columns vary per kind, so callers derive headers from the keys. */
export type ReportRow = Record<string, string | number | boolean | null>;

export type ReportPreviewResponse = {
  kind: ReportKindSlug;
  rows: ReportRow[];
  /** Row count — capped at 1000 by the backend (`buildReport(...).limit(1000)`). */
  total: number;
};

export type ReportDateRange = {
  /** ISO 8601 date (e.g. "2024-07-01"); omitted filters are left unbounded. */
  from?: string;
  to?: string;
  /** Rolls dated rows up per period — 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'. */
  groupBy?: string;
};

function rangeQuery(range: ReportDateRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  if (range.groupBy) params.set('groupBy', range.groupBy);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const reportsApi = {
  preview: (kind: ReportKindSlug, range: ReportDateRange, accessToken: string) =>
    apiRequest<ReportPreviewResponse>(`/reports/${kind}/preview${rangeQuery(range)}`, { accessToken }),
};

/**
 * Downloads the CSV export for a report kind and saves it via the browser.
 *
 * The export endpoint returns `text/csv` with `Content-Disposition: attachment`,
 * not JSON, so it can't go through `apiRequest`. Auth is Bearer-header-only
 * (see backend/src/middleware/auth.js), which rules out a plain `<a href>` or
 * `window.open()` — those can't attach an Authorization header — so this
 * fetches the file manually, reads it as a Blob, and triggers the save via a
 * temporary object-URL anchor.
 */
export async function downloadReportCsv(
  kind: ReportKindSlug,
  range: ReportDateRange,
  accessToken: string,
): Promise<void> {
  const download = async (token: string) => {
    try {
      return await fetch(`${API_BASE_URL}/reports/${kind}/export${rangeQuery(range)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new ApiRequestError(0, 'Unable to reach the server. Please check your connection.');
    }
  };

  let response = await download(accessToken);
  if (response.status === 401) {
    // Expired access token: refresh once and try again, like apiRequest does.
    const fresh = await rotateTokens(accessToken);
    if (fresh) response = await download(fresh);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || message;
    } catch {
      // Response wasn't JSON (e.g. a plain-text error) — keep the generic message.
    }
    throw new ApiRequestError(response.status, message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = filenameMatch?.[1]?.trim() || `${kind}-report.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
