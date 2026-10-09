/**
 * Loading price rules from documents a deployment keeps outside the config.
 *
 * A catalog is configuration too, but restating 170 models inline is not how
 * anyone maintains one: this reads a JSON file per configured import, so the
 * file can be replaced (a vendor catalog, a generated table) without touching
 * the profile patch. Two shapes are understood:
 *
 * 1. this plugin's own — `{ currency?, rules: [...] }`, or a bare rule array,
 *    where each rule uses the same field names `pricing.rules` does;
 * 2. the published vendor catalog — `{ providers: { <vendor>: { models: {
 *    <model>: { input, output, cachedInput?, cacheWrite? } } } } }`, whose
 *    amounts are USD per million tokens and whose vendor names are not DSH
 *    route ids, so an imported rule matches by model alone.
 *
 * Amounts are never converted. A document whose unit differs from the
 * configured `pricing.currency` is a configuration error and fails at load,
 * because a silent factor-of-seven mispricing is worse than a refused start.
 * @module @deepseek-ai/dsh-extension-quota-monitor/price-import
 */
import type { QuotaMonitorConfig } from './config.ts';
import type { QuotaPriceRule, QuotaPriceTable } from './pricing.ts';
/** A document, split into the unit it states and the rules it carries. */
interface PriceDocument {
    currency?: string;
    rules: QuotaPriceRule[];
}
/**
 * Parse one price document.
 *
 * @param text - the document's text.
 * @param path - the path it was read from, named in every error.
 * @param declared - the unit the import entry states, when it states one.
 * @returns the unit the document resolves to and the rules it carries.
 * @throws {Error} when the document is not one of the understood shapes.
 */
export declare function parsePriceDocument(text: string, path: string, declared?: string): PriceDocument;
/**
 * Build the effective price table: configured rules first, then every import.
 *
 * Configured rules keep the tie on an equally specific match, so a deployment
 * can override one model of an imported catalog without restating it.
 * @param config - the plugin configuration.
 * @param readText - reads one document, injected so tests need no filesystem.
 * @returns the table, or `undefined` when the deployment stated no prices at all.
 * @throws {Error} when a document is unreadable, malformed, or denominated in a
 * unit other than the configured currency.
 */
export declare function loadPriceTable(config: QuotaMonitorConfig, readText: (path: string) => Promise<string>): Promise<QuotaPriceTable | undefined>;
export {};
//# sourceMappingURL=price-import.d.ts.map