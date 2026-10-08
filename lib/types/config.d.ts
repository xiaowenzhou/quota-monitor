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
/** Token prices a deployment states so the panel can derive spend. */
export interface QuotaPricingConfig {
    /** Unit every rule and every derived amount is denominated in. */
    currency: string;
    /** The rules themselves; an empty list leaves every cost figure absent. */
    rules: QuotaPriceRule[];
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
    /** Remaining balance at or below which this provider is `warning`. */
    warningRemaining?: number;
    /** Remaining balance at or below which this provider is `critical`. */
    criticalRemaining?: number;
    /** A configuration-described account read, for a gateway no adapter recognizes. */
    declarative?: QuotaDeclarativeSpec;
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
 * A ceiling is measured against derived spend, so a budget without a single
 * price rule could only ever report `unknown`; that is a configuration mistake
 * rather than a state worth rendering, and it fails here at load.
 * @param config - the validated plugin config.
 * @throws {Error} when a budget is configured with no price rule behind it.
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