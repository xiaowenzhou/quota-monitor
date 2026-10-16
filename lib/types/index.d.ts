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
import type { QuotaAccount, QuotaAccountRequest, QuotaKeyRequest, QuotaExportDocument, QuotaExportRequest, QuotaResetStatsRequest, QuotaSetBalancesRequest, QuotaSnapshot, QuotaUsageReport, QuotaUsageRequest } from './types.ts';
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
    /**
     * Readings keyed by route and monitored credential ({@link accountKey}), so a
     * route watched through several keys keeps one reading per key.
     */
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
    /**
     * The credential the panel is showing, refreshed at the active interval.
     * Absent until the panel asks for a reading.
     */
    private focused;
    /**
     * Credential routing state per route, one entry for each monitor naming an
     * `activeRef`. Absent for every other route, which the monitor only reads.
     */
    private readonly routers;
    private readonly managed;
    private keyTable;
    private readonly cooldowns;
    private readonly decisions;
    private readonly locks;
    /** Serialize credential changes with requests that consume that credential. */
    private lockRoute;
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
     * @param request - the provider route, the credential reference to read, and
     * whether to bypass the cached reading. An absent reference reads the route's
     * first monitored credential.
     * @returns the account, including a non-`ok` status when it cannot be read.
     */
    getAccount(request: QuotaAccountRequest): Promise<QuotaAccount>;
    /** Bound retries of temporary upstream failures to the active refresh interval. */
    private retryDue;
    private transientFailure;
    /**
     * Read missing credentials and retry expired temporary failures, then answer
     * with the resulting snapshot. Successful cached readings are reused.
     * @returns the snapshot carrying the readings.
     */
    readPendingAccounts(): Promise<QuotaSnapshot>;
    /**
     * Re-read every monitored credential of every known route.
     * @returns the snapshot carrying the new readings.
     */
    refreshAccounts(): Promise<QuotaSnapshot>;
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
    /** Write-only key management. Removing a slot detaches it without deleting the credential. */
    manageKey(request: QuotaKeyRequest): Promise<QuotaSnapshot>;
    private saveKeys;
    /** Preserve the original key and wire a dedicated credential into the provider profile. */
    private wireRouter;
    /** Refold usage, then re-read every monitored credential. */
    private runBackgroundRound;
    /** Re-read only the credential the panel is showing. */
    private refreshFocusedAccount;
    /**
     * Read monitored credentials route by route.
     *
     * Routes proceed together while one route's credentials are read in order, so
     * a gateway monitoring several keys is not asked all of them at once.
     * @param pending - which slots to read; absent reads every monitored slot.
     */
    private readRouteAccounts;
    /**
     * The monitored credentials of one route, in read order.
     *
     * A configured `credentialRefs` list replaces the route's own credential
     * entirely; otherwise the route has one slot, read with the monitor override
     * or with the provider key its profile names.
     * @param id - provider route key.
     * @returns one slot per monitored credential.
     */
    private slotsOf;
    /** The credential reference one route's own account read uses, when one is named. */
    private credentialRefOf;
    /**
     * Point one route's credential at the healthiest monitored key.
     *
     * Runs before the request that authenticates with it, and only when this
     * route routes at all: the value the process last saw is compared first, so a
     * steady route costs one credential resolution per request and no write.
     *
     * A route whose profile does not authenticate with the routing reference is
     * reported once and then left untouched — the choice would have no effect on
     * the request, and rotating a credential nothing reads is worse than saying
     * so. What is written is the value of one of the monitored keys, read from
     * the same seam the route would have read it from.
     * @param id - provider route key about to serve a request.
     */
    private routeCredential;
    /**
     * The monitored credential of one route with the most room left.
     *
     * Readings that state no figure are not candidates, so a route with no
     * reading yet — and every key that could not be read — leaves the route
     * exactly as the deployment configured it rather than guessing.
     * @param id - provider route key.
     * @returns the chosen credential's slot, or undefined when none states a figure.
     */
    private routeCandidates;
    private healthiestSlot;
    /**
     * Recognize which monitored credential a routing route already authenticates
     * with, so the panel can name it before the process has routed anything.
     *
     * A route set up before this process started holds one of the monitored keys
     * already; matching the values is the only way to name it, because the stored
     * value is opaque and the reference it came from was forgotten by then.
     */
    private identifyRoutedCredentials;
    /**
     * The monitored credential of one route whose stored value is one value.
     * @param id - provider route key.
     * @param value - credential value to match, or undefined to match nothing.
     * @returns the credential reference, or undefined when none matches.
     */
    private matchingCredential;
    /**
     * The monitored credential one account request names.
     * @param request - provider route and optional credential reference.
     * @returns the slot, defaulting to the route's first monitored credential.
     */
    private slotFor;
    /**
     * Run one provider's adapter for one monitored credential and cache the
     * reading.
     *
     * Every failure becomes an account with a status: the panel states why a
     * figure is missing instead of drawing a zero.
     * @param slot - the route and the credential reference to read it with.
     * @returns the reading, cached under this credential.
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
    /** Cache one account reading under its route and credential and return it. */
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
    /**
     * Count one streaming call per provider, forwarding chunks unchanged.
     *
     * A route that routes its credentials is pointed at the healthiest key first:
     * the adapter resolves the credential when it starts the request, which is
     * after this generator's first step and before its first chunk.
     */
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
    /** Reconcile live routes and profiles; historical usage is deliberately retained. */
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