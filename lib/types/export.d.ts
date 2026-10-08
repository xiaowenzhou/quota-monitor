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
import type { QuotaExportDocument, QuotaExportKind, QuotaProviderEntry, QuotaUsageReport } from './types.ts';
/** Version of the JSON export layout, so a consumer can branch on it. */
export declare const EXPORT_SCHEMA_VERSION = "1.0.0";
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
export declare function buildExport(kind: QuotaExportKind, report: QuotaUsageReport, providers: readonly QuotaProviderEntry[], now: number): QuotaExportDocument;
//# sourceMappingURL=export.d.ts.map