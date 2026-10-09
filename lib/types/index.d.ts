/**
 * Quota monitor Host half: per-provider token accounting over the
 * `llm/stream` waterfall, account reads through the adapter registry,
 * historical usage folded from persisted session logs, derived spend and
 * budgets, downloadable exports, and the Remote face (`quotaMonitor/*`) the
 * browser panel calls.
 *
 * Credentials never leave this process. An account reading carries figures
 * and a status; the API key, cookie, or management token that produced it is
 * resolved here and discarded.
 *
 * Spend is derived only from prices a deployment configured. This plugin ships
 * no price list, because a price belongs to whichever gateway a deployment buys
 * from and a stale built-in figure would be reported as fact.
 * @module @deepseek-ai/dsh-extension-quota-monitor
 */
import { Context, Service } from '@deepseek-ai/cordis';
import zs from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { QuotaMonitorConfig, QuotaMonitorConfigInput } from './config.ts';
import type { QuotaAccount, QuotaAccountRequest, QuotaExportDocument, QuotaExportRequest, QuotaResetStatsRequest, QuotaSetBalancesRequest, QuotaSnapshot, QuotaUsageReport, QuotaUsageRequest } from './types.ts';
export type * from './types.ts';
export type { QuotaMonitorConfig, QuotaMonitorConfigInput, QuotaMonitorEntry } from './config.ts';
export type { QuotaPriceRule, QuotaPriceTable } from './pricing.ts';
export { Config } from './config.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        quotaMonitor: QuotaMonitorService;
    }
}
/**
 * Token usage plus account monitoring for every configured LLM provider.
 * Serves the browser panel through the Gateway as the `quotaMonitor`
 * namespace.
 */
export declare class QuotaMonitorService extends TypertRemoteService {
    config: QuotaMonitorConfig;
    static inject: string[];
    static Config: zs<QuotaMonitorConfigInput, QuotaMonitorConfig>;
    private readonly usage;
    private readonly names;
    private readonly profiles;
    private readonly accounts;
    private readonly manual;
    private readonly usageStore;
    /**
     * Prices this deployment stated, or undefined when it stated none. Rebuilt
     * whenever an imported document changes, so the field is the current table
     * rather than the one the constructor resolved.
     */
    private prices;
    /**
     * Fingerprint outcome per route and base URL, so an unrecognized gateway is
     * asked what it is at most once per configuration.
     */
    private readonly detected;
    /** Provider whose account the panel is showing, refreshed at the active interval. */
    private focused;
    /**
     * @param ctx - Host context carrying the llm, settings, credentials, session
     * query, and storage seams.
     * @param config - validated plugin config.
     */
    constructor(ctx: Context, config: QuotaMonitorConfig);
    /** Attach the stream tap, open the usage cache, and schedule background rounds. */
    protected [Service.init](): Promise<void>;
    /**
     * Whole-registry view: the provider selector, per-process usage rows, and
     * the manual balance table.
     * @returns the snapshot served to the panel.
     */
    getSnapshot(): QuotaSnapshot;
    /**
     * Read one provider's account.
     * @param request - the provider and whether to bypass the cached reading.
     * @returns the account, including a non-`ok` status when it cannot be read.
     */
    getAccount(request: QuotaAccountRequest): Promise<QuotaAccount>;
    /**
     * The folded historical usage report.
     * @param request - `refresh: true` forces a fold round before answering;
     * `provider` reports that route alone instead of every route together.
     * @returns the report, with `folding` set while a round runs.
     */
    getUsage(request: QuotaUsageRequest): Promise<QuotaUsageReport>;
    /**
     * Build one downloadable document from the current report.
     * @param request - which document to build.
     * @returns the document, with its filename and media type.
     */
    exportUsage(request: QuotaExportRequest): QuotaExportDocument;
    /**
     * Replace the manual balance fallbacks.
     * @param request - provider id → total allowance; a non-finite value clears the entry.
     * @returns the resulting manual balance table.
     */
    setBalances(request: QuotaSetBalancesRequest): Record<string, number>;
    /**
     * Zero the per-process usage counters.
     * @param request - restrict the reset to one provider route, or clear every bucket.
     * @returns the post-reset snapshot.
     */
    resetStats(request: QuotaResetStatsRequest): QuotaSnapshot;
    /** Refold usage and refresh the focused provider's account. */
    private runBackgroundRound;
    /** Re-read only the account the panel is showing. */
    private refreshFocusedAccount;
    /**
     * Run one provider's adapter and cache the reading.
     *
     * Every failure becomes an account with a status: the panel states why a
     * figure is missing instead of drawing a zero.
     */
    private readAccount;
    /** Assemble one successful reading into an account row. */
    private accountOf;
    /**
     * Severity of a reading, from the configured thresholds.
     *
     * A balance account compares its remainder against absolute amounts; a
     * subscription account compares the tightest window's used share, since
     * there is no amount to compare.
     */
    private warningOf;
    /** Cache one account reading and return it. */
    private publish;
    /** The adapter one provider runs, including a configured declarative spec. */
    private adapterFor;
    /**
     * Ask an unrecognized gateway what it is, and run the matching adapter.
     *
     * Only a route no rule resolved reaches this, and only when it already holds
     * a credential — a gateway this build cannot name and cannot authenticate
     * against has nothing to disclose. The question itself carries no credential,
     * and its answer is remembered so the request is not repeated every round.
     */
    private detectAdapter;
    /** The manual allowance fallback for one provider, when the user entered one. */
    private manualOf;
    /** Tokens observed this process for one provider route. */
    private totalTokensOf;
    /** Count one streaming call per provider, forwarding chunks unchanged. */
    private tapStream;
    /** Accumulate one usage report into a bucket. */
    private addUsage;
    /**
     * Reload the price table, including every configured document.
     *
     * A deployment that keeps prices in a file edits that file, not the profile
     * patch: re-reading on each round is what makes the edit take effect without
     * a restart. The table is replaced only when it actually changed, so a
     * steady-state round costs one read per document and no report rebuild.
     * @param failLoud - whether an unreadable document throws instead of being
     * logged. True at load, where it is a configuration error; false afterwards,
     * where keeping the last good table beats blanking every cost figure.
     */
    private reloadPrices;
    /** Re-read the provider registry and configurable-provider directory. */
    private refresh;
    private noteProvider;
    private bucketFor;
    /** Resolve the settings section backing one configurable provider. */
    private profileOf;
    /**
     * One settings section, read from whichever settings surface this deployment
     * runs.
     *
     * The namespace-document API exposes `get(ns)`; the forms API that replaced it
     * exposes `describe()`, whose rows carry the same live values keyed by profile
     * entry id. A plugin loaded into a deployment it was not built against must
     * read either one, so both are addressed structurally rather than through the
     * settings seam's own method types.
     * @param ns - namespace (profile entry id) owning the section.
     * @param path - path from that section to one provider's profile.
     * @returns the section, or `undefined` when this deployment cannot supply it.
     */
    private settingsSection;
    /** Current credential value for one reference name, or undefined. */
    private resolveApiKey;
    /** The provider selector entries, one per known route. */
    private providerEntries;
    /** Assemble the snapshot from the current accounting maps. */
    private snapshot;
    /** The manual balance table as a plain object. */
    private balancesView;
}
export default QuotaMonitorService;
//# sourceMappingURL=index.d.ts.map