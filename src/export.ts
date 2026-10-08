/**
 * Building the three documents the panel offers for download: a per-day
 * breakdown, a per-session breakdown, and the whole report as JSON.
 *
 * Pure functions over a {@link QuotaUsageReport}. Nothing here reads a session
 * log or an account endpoint, so an export can only ever disclose what the
 * panel already shows.
 *
 * Two rules govern every CSV cell. Each is quoted, because a route id or a
 * currency code may contain a comma. Each text cell that starts with `=`, `+`,
 * `-`, or `@` is prefixed with an apostrophe, because a spreadsheet would
 * otherwise evaluate it as a formula.
 * @module @deepseek-ai/dsh-extension-quota-monitor/export
 */

import type {
  QuotaExportDocument,
  QuotaExportKind,
  QuotaProviderEntry,
  QuotaUsageReport,
} from './types.ts'

/** Version of the JSON export layout, so a consumer can branch on it. */
export const EXPORT_SCHEMA_VERSION = '1.0.0'

/**
 * Byte-order mark, so a spreadsheet opens the file as UTF-8 rather than in the
 * host's legacy code page.
 */
const BOM = '\uFEFF'

/** Cell values a spreadsheet would evaluate rather than display. */
const FORMULA_START = /^[\t\r\n ]*[=+\-@]/

/** Quote one cell, escaping quotes and defusing a formula in a text cell. */
function cell(value: string | number | undefined, text = false): string {
  if (value === undefined) return '""'
  const raw = typeof value === 'number' ? String(value) : value
  const guarded = text && FORMULA_START.test(raw) ? `'${raw}` : raw
  return `"${guarded.replaceAll('"', '""')}"`
}

/** Join rows with CRLF and a trailing terminator, as RFC 4180 specifies. */
function csv(rows: readonly string[][]): string {
  return BOM + rows.map(row => row.join(',')).join('\r\n') + '\r\n'
}

/** Column order of the per-day export. */
const DAILY_HEADER = Object.freeze([
  'date',
  'provider',
  'model',
  'calls',
  'input_tokens',
  'cache_read_tokens',
  'cache_write_tokens',
  'output_tokens',
  'total_tokens',
  'estimated_cost',
  'currency',
  'unpriced_calls',
])

/** Column order of the per-session export. */
const SESSIONS_HEADER = Object.freeze([
  'session_id',
  'routes',
  'calls',
  'input_tokens',
  'cache_read_tokens',
  'cache_write_tokens',
  'output_tokens',
  'total_tokens',
  'estimated_cost',
  'currency',
  'last_active',
])

/**
 * One row per day and route.
 *
 * Day totals are left out: a consumer that wants them sums the rows, whereas a
 * file mixing totals with their parts double-counts under any naive sum.
 */
function dailyCsv(report: QuotaUsageReport): string {
  const rows: string[][] = [DAILY_HEADER.map(name => cell(name, true))]
  for (const day of report.days) {
    for (const row of day.models) {
      rows.push([
        cell(day.date, true),
        cell(row.provider, true),
        cell(row.model, true),
        cell(row.calls),
        cell(row.inputTokens),
        cell(row.cacheReadTokens),
        cell(row.cacheWriteTokens),
        cell(row.outputTokens),
        cell(row.totalTokens),
        cell(row.cost?.amount),
        cell(row.cost === undefined ? undefined : row.cost.currency, true),
        cell(row.cost?.unpricedCalls),
      ])
    }
  }
  return csv(rows)
}

/** One row per session, with its routes joined so no total is duplicated. */
function sessionsCsv(report: QuotaUsageReport): string {
  const rows: string[][] = [SESSIONS_HEADER.map(name => cell(name, true))]
  for (const session of report.sessions) {
    rows.push([
      cell(session.id, true),
      cell(session.routes.join(' | '), true),
      cell(session.calls),
      cell(session.inputTokens),
      cell(session.cacheReadTokens),
      cell(session.cacheWriteTokens),
      cell(session.outputTokens),
      cell(session.totalTokens),
      cell(session.cost?.amount),
      cell(session.cost === undefined ? undefined : session.cost.currency, true),
      cell(session.lastActiveAt > 0 ? new Date(session.lastActiveAt).toISOString() : undefined, true),
    ])
  }
  return csv(rows)
}

/**
 * The provider rows a JSON export carries: which routes were watched and how
 * each read ended.
 *
 * No balance, no plan window, and no credential reference: an export is a file
 * that gets attached to a bug report, and an account's remaining funds are not
 * something this plugin should put there. The panel remains the place to read
 * them.
 */
function providerRows(providers: readonly QuotaProviderEntry[]): readonly unknown[] {
  return providers.map(entry => ({
    id: entry.id,
    name: entry.name,
    mode: entry.mode,
    adapter: entry.adapter,
    status: entry.status,
    ...entry.warning === undefined ? {} : { warning: entry.warning },
  }))
}

/**
 * Build one export document.
 *
 * The kind is looked up in a table keyed by every {@link QuotaExportKind}, so
 * adding a kind without building it fails to compile.
 * @param kind - which document to build.
 * @param report - the folded usage report to render.
 * @param providers - the watched provider routes, for the JSON document.
 * @param now - current epoch milliseconds, stamped as the export time.
 * @returns the document, ready for the browser to save.
 */
export function buildExport(
  kind: QuotaExportKind,
  report: QuotaUsageReport,
  providers: readonly QuotaProviderEntry[],
  now: number,
): QuotaExportDocument {
  const builders: Readonly<Record<QuotaExportKind, () => QuotaExportDocument>> = {
    'daily-csv': () => ({
      kind,
      filename: 'dsh-quota-daily.csv',
      mediaType: 'text/csv; charset=utf-8',
      content: dailyCsv(report),
    }),
    'sessions-csv': () => ({
      kind,
      filename: 'dsh-quota-sessions.csv',
      mediaType: 'text/csv; charset=utf-8',
      content: sessionsCsv(report),
    }),
    'report-json': () => ({
      kind,
      filename: 'dsh-quota-report.json',
      mediaType: 'application/json; charset=utf-8',
      content: `${JSON.stringify({
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: new Date(now).toISOString(),
        usage: report,
        providers: providerRows(providers),
      }, undefined, 2)}\n`,
    }),
  }
  return builders[kind]()
}
