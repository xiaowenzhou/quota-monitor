/**
 * Wire vocabulary shared by the quota monitor's Host service and browser
 * panel. Plain JSON shapes only: every field crosses the Gateway boundary.
 *
 * Two account modes share one card frame. A `balance` account reports money
 * or credits remaining; a `subscription` account reports elapsed-time windows
 * as used shares. A provider with no public account endpoint reports
 * `unsupported` rather than a guessed zero.
 * @module @deepseek-ai/dsh-extension-quota-monitor/types
 */
/**
 * Which rolling or calendar window a plan limit governs.
 *
 * `session` is the provider's own rolling allowance (MiniMax and Z.ai meter
 * five hours; OpenCode Go and Ollama meter their own session span), so the
 * panel labels it by role rather than by a fixed duration. `billing` is the
 * subscription renewal window, distinct from a calendar month. `quota` is a
 * gateway's single aggregate allowance, which names no period at all.
 */
export type QuotaPlanWindowKind = 'session' | 'five-hour' | 'daily' | 'weekly' | 'monthly' | 'billing' | 'quota';
/** One plan window of a subscription that meters by elapsed time rather than balance. */
export interface QuotaPlanWindow {
    kind: QuotaPlanWindowKind;
    /** Used share of the window, clamped to 0–100. */
    percentUsed: number;
    /** ISO instant at which the window resets, when the endpoint discloses one. */
    resetAt?: string;
    /** Remaining raw allowance, when the endpoint discloses a count rather than only a percentage. */
    remaining?: number;
}
/**
 * One budget pool reported beside an account balance. `name` is the gateway's
 * own label and reaches the panel verbatim.
 */
export interface QuotaBudgetPool {
    name: string;
    /** Remaining amount in the account's {@link QuotaAccount.currency} units. */
    remaining: number;
    /** The pool's allowance, when the endpoint discloses one. */
    limit?: number;
    /** Used share of the pool, clamped to 0–100; absent when no allowance is disclosed. */
    percentUsed?: number;
}
/**
 * Why an account read is not showing a figure. `ok` is the only state that
 * carries one; every other state is reported to the panel verbatim so a
 * missing balance is never drawn as zero.
 *
 * `unsupported` means the provider publishes no account endpoint at all,
 * which is a permanent answer rather than a failure. `blocked` means this
 * plugin refused to send the request — a plaintext endpoint, a private host,
 * or a URL carrying credentials — which is a configuration answer rather than
 * an upstream one.
 */
export type QuotaAccountStatus = 'ok' | 'not-configured' | 'unauthorized' | 'rate-limited' | 'unsupported' | 'invalid-response' | 'blocked' | 'unavailable';
/**
 * Whether an account meters money/credits or elapsed-time windows.
 *
 * A gateway that publishes both — a wallet for pay-as-you-go traffic and a
 * plan window once a subscription is active — reports the mode its own answer
 * carried, so one route can change mode between reads.
 */
export type QuotaAccountMode = 'balance' | 'subscription' | 'unsupported';
/**
 * Severity of a remaining-allowance figure, resolved on the Host so the panel
 * draws one consistent scale across adapters.
 */
export type QuotaWarningLevel = 'normal' | 'warning' | 'critical';
/**
 * One provider account, in either mode. The panel renders exactly one of
 * these at a time — the reference project's single-provider card.
 */
export interface QuotaAccount {
    /** Provider route key this account belongs to. */
    readonly id: string;
    /** Display label for the account card. */
    name: string;
    mode: QuotaAccountMode;
    status: QuotaAccountStatus;
    /** The adapter that produced the reading, for the card's origin line. */
    adapter: string;
    /** Epoch ms of the reading. */
    fetchedAt: number;
    /**
     * Remaining balance in {@link currency} units. Present only for a
     * `balance` account whose status is `ok`.
     */
    remaining?: number;
    /** Cumulative spend, when the endpoint discloses one. */
    used?: number;
    /** Total allowance behind {@link remaining}, when the endpoint discloses one. */
    limit?: number;
    /** Unit label for the three figures above: `CNY`, `USD`, `credits`, … */
    currency?: string;
    /** True when the endpoint reports an unmetered allowance; the panel shows `∞`. */
    unlimited?: boolean;
    /** Plan label of a subscription account (`GLM Coding Plan`, `Go`, …). */
    plan?: string;
    /** Every plan window the endpoint disclosed, tightest first. */
    planWindows?: readonly QuotaPlanWindow[];
    /** Budget pools reported beside the account balance, in endpoint order. */
    budgetPools?: readonly QuotaBudgetPool[];
    /**
     * Usage the endpoint itself reported for the credential it was read with.
     *
     * This is the gateway's own accounting rather than this plugin's fold, so it
     * covers every call that credential made — including calls no process here
     * saw. It is also the only per-credential split available: a model request
     * carries a provider route, never the key that served it, so two keys behind
     * one route can only be told apart by asking each endpoint about its own.
     */
    usage?: readonly QuotaGatewayUsage[];
    /** Severity of the remaining figure, when one could be resolved. */
    warning?: QuotaWarningLevel;
    /**
     * Credential reference names the adapter needed and did not find. Names
     * only — a credential value never crosses this boundary.
     */
    missingCredentials?: readonly string[];
    /** Human-readable diagnosis for a non-`ok` status; never carries response bodies. */
    reason?: string;
    /** Manual allowance the user entered for this provider, when no endpoint answered. */
    manual?: QuotaBalanceEstimate;
}
/**
 * One usage row an account endpoint reported about its own credential.
 *
 * The gateway's accounting, not this plugin's fold: it counts every call that
 * credential made, and it is the only per-credential split available, because a
 * model request names a provider route and never the key that served it.
 */
export interface QuotaGatewayUsage {
    /** Which table the row came from, so the panel groups rows by kind. */
    readonly kind: 'day' | 'model' | 'pool';
    /** The row's own label: a calendar day, a model id, or a pool name. */
    readonly label: string;
    /** Calls or requests the endpoint counted. */
    requests?: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    /** Sum of the four token buckets, when the endpoint reports its own total. */
    totalTokens?: number;
    /** Spend the endpoint reported, denominated in {@link currency}. */
    cost?: number;
    /** Unit `cost` is denominated in, when the row states one. */
    currency?: string;
}
/** Manual balance fallback for one provider id. */
export interface QuotaBalanceEstimate {
    /** The manually entered total allowance. */
    total: number;
    /** Total tokens seen this process, divided by 1M as a rough spend figure. */
    spent: number;
    remaining: number;
    /** Share of the allowance consumed, 0–100. */
    pct: number;
}
/** One entry of the provider selector: identity plus its account summary. */
export interface QuotaProviderEntry {
    readonly id: string;
    name: string;
    mode: QuotaAccountMode;
    /** The adapter that would serve this provider's account read. */
    adapter: string;
    /** Latest known status, so the selector can mark a failing provider. */
    status: QuotaAccountStatus;
    /** Latest known severity, so the selector can mark a draining account. */
    warning?: QuotaWarningLevel;
}
/** Four disjoint token buckets. Reasoning tokens are already inside `outputTokens`. */
export interface QuotaTokenTotals {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    /** Sum of the four buckets. */
    totalTokens: number;
}
/**
 * Spend derived from folded tokens and the configured price rules.
 *
 * Derived, never reported by a provider: it exists only where a deployment
 * configured `pricing.rules`, and the calls no rule covered are counted rather
 * than silently priced at zero.
 */
export interface QuotaCostView {
    /** Amount in {@link currency}, summed over the calls a rule priced. */
    amount: number;
    /** Unit the configured rules are denominated in. */
    currency: string;
    /** Calls no rule priced; a positive count makes {@link amount} partial. */
    unpricedCalls: number;
}
/** One `provider · model` pair's tokens within a day. */
export interface QuotaModelUsage extends QuotaTokenTotals {
    /** Provider route key; the same model under two routes stays two rows. */
    readonly provider: string;
    readonly model: string;
    /** Model calls folded into this row. */
    calls: number;
    /** Derived spend, absent while no price rule is configured. */
    cost?: QuotaCostView;
}
/** One calendar day of folded usage, in the Host's local time zone. */
export interface QuotaDayUsage extends QuotaTokenTotals {
    /** Local calendar day as `YYYY-MM-DD`. */
    readonly date: string;
    calls: number;
    /** Per-`provider · model` breakdown backing the day's drilldown. */
    models: readonly QuotaModelUsage[];
    /** Derived spend for the day, absent while no price rule is configured. */
    cost?: QuotaCostView;
}
/**
 * One session's folded usage.
 *
 * Identified by session id alone: the fold cache stores counters and route ids
 * only, so no conversation title crosses this boundary.
 */
export interface QuotaSessionUsage extends QuotaTokenTotals {
    readonly id: string;
    calls: number;
    /** `provider · model` labels this session spent tokens on, busiest first. */
    routes: readonly string[];
    /** Epoch ms of the latest usage-bearing event folded from this session. */
    lastActiveAt: number;
    /** Derived spend for the session, absent while no price rule is configured. */
    cost?: QuotaCostView;
}
/** Severity of a budget window's used share. */
export type QuotaBudgetStatus = 'normal' | 'warning' | 'critical' | 'unknown';
/**
 * One configured budget window measured against derived spend.
 *
 * `unpricedCalls` above zero forces `unknown`: a ceiling cannot be judged
 * against a partial figure.
 */
export interface QuotaBudgetWindow {
    /** The configured ceiling. */
    limit: number;
    /** Derived spend inside the window. */
    spent: number;
    /** Used share of {@link limit}, clamped to 0–100. */
    percentUsed: number;
    status: QuotaBudgetStatus;
    /** Calls inside the window that no rule priced. */
    unpricedCalls: number;
}
/** The configured budgets, evaluated against the current fold. */
export interface QuotaBudgetView {
    /** Unit both windows are denominated in. */
    currency: string;
    /** The local calendar day's budget, when one is configured. */
    daily?: QuotaBudgetWindow;
    /** The local calendar month's budget, when one is configured. */
    monthly?: QuotaBudgetWindow;
}
/**
 * One provider route's folded tokens across every day the fold has read, with
 * the three scopes the panel switches between.
 *
 * The route key is the finest identity the folded log carries: a request names
 * a provider and a model, never the credential that served it, so two keys
 * behind one route cannot be told apart here.
 */
export interface QuotaProviderUsage extends QuotaTokenTotals {
    /** Provider route key, as model requests reported it. */
    readonly provider: string;
    /** Calls folded across every day for this route. */
    calls: number;
    /** Cache-hit share of this route's billed input, 0–100; absent with no input. */
    cacheHitPercent?: number;
    /** Derived spend across every day, absent while no price rule is configured. */
    cost?: QuotaCostView;
    /** Calls folded for {@link QuotaUsageReport.today} on this route. */
    todayCalls: number;
    /** Tokens folded for {@link QuotaUsageReport.today} on this route. */
    todayTokens: number;
    /** Today's cache-hit share of this route's billed input; absent with no input. */
    todayCacheHitPercent?: number;
    /** Derived spend for {@link QuotaUsageReport.today}, absent while unpriced. */
    todayCost?: QuotaCostView;
    /** Calls folded for the local calendar month containing today. */
    monthCalls: number;
    /** Tokens folded for that month. */
    monthTokens: number;
    /** That month's cache-hit share of this route's billed input; absent with no input. */
    monthCacheHitPercent?: number;
    /** Derived spend for that month, absent while no price rule is configured. */
    monthCost?: QuotaCostView;
    /** Distinct models folded into this route. */
    models: number;
    /** Latest local calendar day carrying usage for this route, `YYYY-MM-DD`. */
    lastDay: string;
}
/**
 * The whole folded usage view: rolling totals plus the per-day series the
 * monthly heatmap and its drilldown read.
 */
export interface QuotaUsageReport {
    /** Local calendar day the `today` figures belong to, as `YYYY-MM-DD`. */
    today: string;
    /** Tokens folded for {@link today}. */
    todayTotals: QuotaTokenTotals;
    /** Tokens folded for the local calendar month containing {@link today}. */
    monthTotals: QuotaTokenTotals;
    /** Tokens folded across every session the fold has read. */
    allTimeTotals: QuotaTokenTotals;
    /** Derived spend for {@link today}, absent while no price rule is configured. */
    todayCost?: QuotaCostView;
    /** Derived spend for the current month, absent while no price rule is configured. */
    monthCost?: QuotaCostView;
    /** Derived spend across every folded day, absent while no price rule is configured. */
    allTimeCost?: QuotaCostView;
    /** The configured budgets, absent while none is configured. */
    budgets?: QuotaBudgetView;
    /**
     * Cache-hit share of today's billed input, 0–100:
     * `cacheRead / (cacheRead + input + cacheWrite)`. Absent with no input.
     */
    todayCacheHitPercent?: number;
    /** Every route carrying usage, busiest first. */
    providers: readonly QuotaProviderUsage[];
    /** Days carrying usage, ascending by date. Days with none are omitted. */
    days: readonly QuotaDayUsage[];
    /** Sessions carrying usage, most recently active first. */
    sessions: readonly QuotaSessionUsage[];
    /** Sessions folded into this report. */
    sessionCount: number;
    /** Epoch ms when the fold last completed, or 0 before the first one. */
    foldedAt: number;
    /** True while a fold round is running, so the panel can show progress. */
    folding: boolean;
}
/** One provider row of the live per-process usage table. */
export interface QuotaProviderRow {
    readonly id: string;
    name: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    errorCount: number;
    lastCallAt: number;
    lastModel: string;
    /** Manual balance estimate, when the user entered one for this provider. */
    balance: QuotaBalanceEstimate | null;
}
/** Whole-registry view served to the browser panel. */
export interface QuotaSnapshot {
    capturedAt: number;
    /** Provider selector entries, in registry order. */
    providers: readonly QuotaProviderEntry[];
    /** Per-process token accounting, one row per provider route. */
    rows: readonly QuotaProviderRow[];
    /** Provider id → manually entered total allowance. */
    balances: Record<string, number>;
    aggregate: {
        calls: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}
/** Request body for `quotaMonitor/getAccount`. */
export interface QuotaAccountRequest {
    /** Provider route whose account is read. */
    provider: string;
    /** Bypass the cached reading and query the endpoint again. */
    refresh?: boolean;
}
/** Request body for `quotaMonitor/getUsage`. */
export interface QuotaUsageRequest {
    /** Run a fold round before answering, instead of serving the cached report. */
    refresh?: boolean;
}
/** Request body for `quotaMonitor/setBalances`. */
export interface QuotaSetBalancesRequest {
    /**
     * Provider id → total allowance. A non-finite value (or an absent entry)
     * clears that provider's manual balance.
     */
    balances: Record<string, number>;
}
/** Request body for `quotaMonitor/resetStats`. */
export interface QuotaResetStatsRequest {
    /** Reset only this provider route; absent resets every bucket. */
    provider?: string | undefined;
}
/** Which projection an export answers with. */
export type QuotaExportKind = 'daily-csv' | 'sessions-csv' | 'report-json';
/** Request body for `quotaMonitor/exportUsage`. */
export interface QuotaExportRequest {
    kind: QuotaExportKind;
}
/**
 * One export document, ready for the browser to offer as a download.
 *
 * Aggregates only: token counters, route ids, session ids, derived spend, and
 * budget state. No credential reference, no upstream response, no prompt text,
 * and no file path enters an export.
 */
export interface QuotaExportDocument {
    kind: QuotaExportKind;
    /** Suggested download name, carrying the export's local calendar day. */
    filename: string;
    /** MIME type matching {@link kind}. */
    mediaType: string;
    /** The document itself. */
    content: string;
}
//# sourceMappingURL=types.d.ts.map