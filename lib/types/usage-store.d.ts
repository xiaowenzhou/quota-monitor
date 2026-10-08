/**
 * The usage store: folds every readable session log into the report the panel
 * reads, and keeps the per-session fold cached durably.
 *
 * One fold round at a time. A session is re-read only when its log grew, so a
 * steady-state round costs one listing plus the sessions that actually
 * changed. Failures are per session: an unreadable log leaves its cached
 * record intact and the round continues, because one damaged session must not
 * blank the whole report.
 * @module @deepseek-ai/dsh-extension-quota-monitor/usage-store
 */
import type { Context } from '@deepseek-ai/cordis';
import type { QuotaBudgetConfig } from './config.ts';
import type { QuotaPriceTable } from './pricing.ts';
import type { QuotaUsageReport } from './types.ts';
/** What the store derives spend and ceilings from, when a deployment states them. */
export interface QuotaDeriveOptions {
    prices?: QuotaPriceTable;
    budgets?: QuotaBudgetConfig;
}
/**
 * Folds session logs into the usage report and caches each session's fold.
 *
 * The store owns no timer: the service decides when a round runs.
 */
export declare class QuotaUsageStore {
    private readonly ctx;
    private readonly now;
    private readonly derive;
    private readonly folds;
    private table;
    private report;
    private folding;
    private foldedAt;
    /** In-flight round, so concurrent requests share one pass. */
    private round;
    /**
     * @param ctx - Host context carrying the sessionQuery and storageDomain seams.
     * @param now - clock reader, injected so tests drive day boundaries.
     * @param derive - prices and ceilings the report derives spend with.
     */
    constructor(ctx: Context, now: () => number, derive?: QuotaDeriveOptions);
    /** Build the report from the current folds. */
    private build;
    /**
     * Open the durable fold cache and seed the in-memory folds from it.
     *
     * Seeding makes the first report available without reading a single session
     * log, so a restart shows yesterday's figures immediately and refines them
     * when the first round lands.
     * @returns a disposer closing the domain.
     */
    open(): Promise<() => void>;
    /**
     * The most recent report; never blocks on a fold.
     * @returns the last built report, with `folding` raised while a round runs.
     */
    current(): QuotaUsageReport;
    /**
     * Run one fold round, or join the one already running.
     * @returns the report after the round completes.
     */
    refresh(): Promise<QuotaUsageReport>;
    /** Read every session, fold what changed, and rebuild the report. */
    private runRound;
    /** Fold one session, leaving its cached state untouched when the read fails. */
    private foldSession;
    /** Persist one session's fold, tolerating a storage failure. */
    private store;
    /** Drop one session's cached fold, tolerating a storage failure. */
    private forget;
}
//# sourceMappingURL=usage-store.d.ts.map