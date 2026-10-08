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
/** Shortest accepted refresh interval; below this the panel would rate-limit upstream accounts. */
const MIN_INTERVAL_MS = 10_000;
/** Longest accepted refresh interval (24 hours). */
const MAX_INTERVAL_MS = 86_400_000;
/** Every adapter id, as a schema literal set so a typo fails at load. */
const adapterId = zs.union([
    zs.const('deepseek-balance'),
    zs.const('openrouter-balance'),
    zs.const('moonshot-balance'),
    zs.const('zai-balance'),
    zs.const('orcarouter-balance'),
    zs.const('new-api'),
    zs.const('sub2api'),
    zs.const('sub2api-auth'),
    zs.const('agent-router'),
    zs.const('stepcode'),
    zs.const('general'),
    zs.const('opencode-go'),
    zs.const('zai-token-plan'),
    zs.const('kimi-token-plan'),
    zs.const('minimax-token-plan'),
    zs.const('cline-plan'),
    zs.const('ollama'),
    zs.const('declarative'),
]);
/** Window roles a declarative monitor may describe. */
const windowKind = zs.union([
    zs.const('session'),
    zs.const('five-hour'),
    zs.const('daily'),
    zs.const('weekly'),
    zs.const('monthly'),
    zs.const('billing'),
    zs.const('quota'),
]);
const declarativeWindow = zs.object({
    kind: windowKind.required(),
    percentUsedPointer: zs.string().required(),
    resetAtPointer: zs.string(),
});
const declarativeSpec = zs.object({
    url: zs.string().required(),
    auth: zs.union([zs.const('bearer'), zs.const('raw'), zs.const('none')]),
    remainingPointer: zs.string(),
    usedPointer: zs.string(),
    limitPointer: zs.string(),
    currency: zs.string(),
    windows: zs.array(declarativeWindow),
});
/**
 * An object section a deployment may leave out entirely.
 *
 * A schemastery object node carries `{}` as its own default, so nesting one
 * directly would resolve an omitted section to an empty object and then fail
 * its required fields. A single-member union carries no default, which is what
 * keeps the key absent.
 * @param inner - the section schema.
 * @returns the same schema with no implicit empty-object fallback.
 */
function optionalSection(inner) {
    return zs.union([inner]);
}
const monitorEntry = zs.object({
    adapter: adapterId,
    usageBaseURL: zs.string(),
    credentialRef: zs.string(),
    allowPlaintextEndpoint: zs.boolean(),
    warningRemaining: zs.number(),
    criticalRemaining: zs.number(),
    declarative: optionalSection(declarativeSpec),
});
/** One price rule, as written in configuration. */
const priceRule = zs.object({
    provider: zs.string(),
    model: zs.string(),
    from: zs.string(),
    inputPerMillion: zs.number().min(0).required(),
    outputPerMillion: zs.number().min(0).required(),
    cacheReadPerMillion: zs.number().min(0),
    cacheWritePerMillion: zs.number().min(0),
});
/**
 * The plugin config schema.
 *
 * The threshold defaults suit a small prepaid account denominated in CNY or
 * USD; a deployment on another scale overrides them per provider.
 *
 * Object and dict nodes already fall back to `{}`, so an omitted `refresh`,
 * `thresholds`, or `monitors` resolves through the per-field defaults below.
 */
export const Config = zs.object({
    refresh: zs.object({
        enabled: zs.boolean().default(true),
        activeMs: zs.natural().min(MIN_INTERVAL_MS).max(MAX_INTERVAL_MS).default(60_000),
        backgroundMs: zs.natural().min(MIN_INTERVAL_MS).max(MAX_INTERVAL_MS).default(300_000),
    }),
    thresholds: zs.object({
        warningRemaining: zs.number().default(10),
        criticalRemaining: zs.number().default(2),
        warningPercentUsed: zs.number().min(0).max(100).default(80),
        criticalPercentUsed: zs.number().min(0).max(100).default(95),
    }),
    detection: zs.object({
        enabled: zs.boolean().default(true),
    }),
    pricing: zs.object({
        currency: zs.string().default('USD'),
        rules: zs.array(priceRule).default([]),
    }),
    budgets: zs.object({
        daily: zs.number().min(0),
        monthly: zs.number().min(0),
        warningPercent: zs.number().min(0).max(100).default(80),
        criticalPercent: zs.number().min(0).default(100),
    }),
    monitors: zs.dict(monitorEntry),
});
/**
 * Reject a configuration whose parts contradict each other.
 *
 * A ceiling is measured against derived spend, so a budget without a single
 * price rule could only ever report `unknown`; that is a configuration mistake
 * rather than a state worth rendering, and it fails here at load.
 * @param config - the validated plugin config.
 * @throws {Error} when a budget is configured with no price rule behind it.
 */
export function assertConsistent(config) {
    const budgeted = config.budgets.daily !== undefined || config.budgets.monthly !== undefined;
    if (budgeted && config.pricing.rules.length === 0) {
        throw new Error('quota monitor: budgets require at least one pricing.rules entry to measure spend against');
    }
    if (config.budgets.criticalPercent < config.budgets.warningPercent) {
        throw new Error('quota monitor: budgets.criticalPercent must not be below budgets.warningPercent');
    }
}
/**
 * The monitor override configured for one provider route.
 * @param config - the validated plugin config.
 * @param id - provider route key.
 * @returns the entry, or `undefined` when the route has no override.
 */
export function resolveMonitor(config, id) {
    return config.monitors[id];
}
//# sourceMappingURL=config.js.map