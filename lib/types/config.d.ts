/**
 * Plugin configuration: refresh cadence, warning thresholds, gateway
 * detection, token prices, spend ceilings, and per-provider monitor overrides.
 *
 * Every deployment-varying choice lives here rather than as a constant in the
 * service. Refresh intervals differ between a laptop watching one account and
 * a shared host watching several; warning thresholds are currency- and
 * plan-specific and cannot have a universal default; and a token price is set
 * by whichever gateway a deployment actually buys from, so this plugin ships
 * no price list of its own.
 * @module @deepseek-ai/dsh-extension-quota-monitor/config
 */
import zs from '@deepseek-ai/schemastery';
import type { QuotaAdapterId } from './identity.ts';
import type { QuotaDeclarativeSpec } from './adapters/declarative.ts';
import type { QuotaPriceRule } from './pricing.ts';
/**
 * The credential-reference grammar this plugin accepts in configuration.
 *
 * The credentials seam owns the name space, but its own validator is not
 * imported here: a plugin may be installed twice in one process, and a marker
 * that only one installation's module registry can reproduce would then reject
 * valid names. The grammar is fixed, so this copy is the configuration's own
 * acceptance rule and a name it rejects never reaches the seam.
 */
export declare const CREDENTIAL_REF_PATTERN: RegExp;
/** How often accounts and usage are re-read. */
export interface QuotaRefreshConfig {
    /**
     * Whether the Host runs background rounds at all. When false the panel
     * still reads on demand, so an operator who wants zero unattended network
     * traffic keeps the feature without the polling.
     */
    enabled: boolean;
    /** Interval for re-reading the account the panel is currently showing. */
    activeMs: number;
    /** Interval for refolding usage and refreshing in the background. */
    backgroundMs: number;
}
/** Severity thresholds applied to a reading. */
export interface QuotaThresholdConfig {
    /** Remaining balance at or below which a balance account is `warning`. */
    warningRemaining: number;
    /** Remaining balance at or below which a balance account is `critical`. */
    criticalRemaining: number;
    /** Used share at or above which a subscription window is `warning`. */
    warningPercentUsed: number;
    /** Used share at or above which a subscription window is `critical`. */
    criticalPercentUsed: number;
}
/** Whether an unrecognized gateway may be asked what it is. */
export interface QuotaDetectionConfig {
    /**
     * Whether a route no rule recognized is fingerprinted through its own public
     * settings document. The probe carries no credential, but it is still an
     * unattended request to a third-party host, so a deployment that wants none
     * turns it off and configures `monitors.<id>.adapter` instead.
     */
    enabled: boolean;
}
/**
 * One price document to load rules from.
 *
 * Prices are still configuration rather than a shipped table, but a deployment
 * that keeps a catalog of its own should not have to restate it inline: the
 * file is re-read on every background round, so editing it takes effect without
 * a restart. A rule written in `pricing.rules` always outranks an imported one.
 */
export interface QuotaPriceImport {
    /** Absolute path of a JSON price document. */
    path: string;
    /**
     * Unit the document's amounts are denominated in. Absent, the document must
     * state one itself or define it through a format that carries it (the
     * `providers` catalog is USD), and a unit differing from `pricing.currency`
     * fails at load rather than mispricing every figure.
     */
    currency?: string;
}
/** Token prices a deployment states so the panel can derive spend. */
export interface QuotaPricingConfig {
    /** Unit every rule and every derived amount is denominated in. */
    currency: string;
    /** The rules themselves; an empty list leaves every cost figure absent. */
    rules: QuotaPriceRule[];
    /** Documents to load further rules from, re-read on every background round. */
    imports: QuotaPriceImport[];
    /**
     * Whether a model with no exact match may fall back to a normalized
     * comparison (case, spaces, hyphens, dots, and bracketed notes ignored). A
     * deployment importing a vendor catalog usually wants this on; it stays off
     * by default because a normalized hit is an inference, not a statement.
     */
    fuzzyMatch: boolean;
}
/**
 * Spend ceilings measured against derived cost.
 *
 * Both windows are denominated in {@link QuotaPricingConfig.currency}, and a
 * ceiling without any price rule cannot be evaluated, so configuring one
 * without the other fails at load. An omitted ceiling disables its window.
 */
export interface QuotaBudgetConfig {
    /** Ceiling for the local calendar day. */
    daily?: number;
    /** Ceiling for the local calendar month. */
    monthly?: number;
    /** Used share of a ceiling at or above which the window is `warning`. */
    warningPercent: number;
    /** Used share of a ceiling at or above which the window is `critical`. */
    criticalPercent: number;
}
/** One provider's monitor override. */
export interface QuotaMonitorEntry {
    /** Force a specific adapter, overriding route-id and hostname resolution. */
    adapter?: QuotaAdapterId;
    /** Account endpoint base, when it differs from the inference base URL. */
    usageBaseURL?: string;
    /** Credential reference the adapter reads, when it differs from the provider key. */
    credentialRef?: string;
    /**
     * Credential references this route's account is read with, one reading each.
     *
     * Naming several is how one provider route is monitored key by key: the
     * endpoint returns what that key itself has left, so a deployment that spreads
     * traffic across keys sees each key's own figure. Non-empty replaces
     * {@link credentialRef} and the provider's own key entirely; empty or absent
     * leaves the route read once with its own credential.
     */
    credentialRefs?: string[];
    /**
     * Credential reference this monitor keeps pointed at the healthiest monitored
     * credential, so each model request authenticates with that key.
     *
     * The route's own profile has to name this reference as its `apiKeyEnv`: the
     * monitor writes the chosen key's value there and never writes a monitored
     * credential, so the keys themselves stay as the deployment stored them.
     * Requires at least two {@link credentialRefs} entries and must not be one of
     * them. Absent, every monitored credential stays read-only.
     */
    activeRef?: string;
    /**
     * Whether this route's account endpoint may be reached over plaintext `http:`
     * although its host is not on this machine.
     *
     * An intranet gateway is routinely addressed by an address that carries no
     * more trust than any other, and the credential has to travel to it either
     * way. Naming that route here is the operator's explicit approval, and the
     * permission covers this route alone: every other route still requires TLS or
     * loopback. Absent, no plaintext request is made.
     */
    allowPlaintextEndpoint?: boolean;
    /**
     * Exact hosts this route may send its credential to, as `host` or
     * `host:port`, lowercased. Empty or absent leaves the route unfenced beyond
     * the transport rule; naming hosts is how a deployment keeps a copied
     * configuration from carrying its key to some other gateway.
     */
    allowedHosts?: string[];
    /** Remaining balance at or below which this provider is `warning`. */
    warningRemaining?: number;
    /** Remaining balance at or below which this provider is `critical`. */
    criticalRemaining?: number;
    /** A configuration-described account read, for a gateway no adapter recognizes. */
    declarative?: QuotaDeclarativeSpec;
}
export interface QuotaRoutingConfig {
    maxAgeMs: number;
    cooldownMs: number;
    jevTimeoutMs: number;
    jevMinConfidence: number;
    jevModel: string;
}
/** The plugin's validated configuration. */
export interface QuotaMonitorConfig {
    /** How often accounts and usage are re-read without an operator asking. */
    refresh: QuotaRefreshConfig;
    /** When a reading turns amber or red. */
    thresholds: QuotaThresholdConfig;
    /** Whether an unrecognized gateway may be fingerprinted. */
    detection: QuotaDetectionConfig;
    /** Token prices, and the currency every derived amount is denominated in. */
    pricing: QuotaPricingConfig;
    /** Spend ceilings measured against those derived amounts. */
    budgets: QuotaBudgetConfig;
    routing: QuotaRoutingConfig;
    /** Provider route key → monitor override. */
    monitors: Record<string, QuotaMonitorEntry>;
}
/**
 * The configuration a deployment writes.
 *
 * Every field has a default, so a deployment states only what it overrides and
 * {@link Config} returns the complete {@link QuotaMonitorConfig}.
 */
export interface QuotaMonitorConfigInput {
    refresh?: Partial<QuotaRefreshConfig>;
    thresholds?: Partial<QuotaThresholdConfig>;
    detection?: Partial<QuotaDetectionConfig>;
    pricing?: Partial<QuotaPricingConfig>;
    budgets?: Partial<QuotaBudgetConfig>;
    routing?: Partial<QuotaRoutingConfig>;
    monitors?: Record<string, QuotaMonitorEntry>;
}
/**
 * The plugin config schema.
 *
 * The threshold defaults suit a small prepaid account denominated in CNY or
 * USD; a deployment on another scale overrides them per provider.
 *
 * Object and dict nodes already fall back to `{}`, so an omitted `refresh`,
 * `thresholds`, or `monitors` resolves through the per-field defaults below.
 */
export declare const Config: zs<QuotaMonitorConfigInput, QuotaMonitorConfig>;
/**
 * Reject a configuration whose parts contradict each other.
 *
 * A ceiling is measured against derived spend, so a budget with no price behind
 * it — neither an inline rule nor an imported document — could only ever report
 * `unknown`; that is a configuration mistake rather than a state worth
 * rendering, and it fails here at load.
 *
 * A monitored credential list has to name readable credentials: a name outside
 * the reference grammar could never resolve, and a repeat would draw the same
 * reading twice while hiding that the deployment expected another key.
 *
 * Routing writes the chosen key's value into one reference, so that reference
 * must not be a monitored key — that would destroy the key it was chosen from —
 * and there is nothing to choose between below two monitored keys.
 * @param config - the validated plugin config.
 * @throws {Error} when a budget is configured with no price behind it, a
 * monitored credential list carries an invalid or repeated reference, or a
 * routing reference is unusable.
 */
export declare function assertConsistent(config: QuotaMonitorConfig): void;
/**
 * The monitor override configured for one provider route.
 * @param config - the validated plugin config.
 * @param id - provider route key.
 * @returns the entry, or `undefined` when the route has no override.
 */
export declare function resolveMonitor(config: QuotaMonitorConfig, id: string): QuotaMonitorEntry | undefined;
//# sourceMappingURL=config.d.ts.map