/**
 * Balance-endpoint probing: one HTTPS GET per attempt plus the six response
 * grammars the monitor recognizes (DeepSeek official, new-api, Sub2API-style
 * dashboards, MiniMax coding-plan windows, Cline Pass plan limits, and
 * AgentRouter desk accounts).
 *
 * Probes run from the Host process with Node's own TLS stack — unlike the
 * dynamic-plugin predecessor, no Python sidecar is involved.
 * @module @deepseek-ai/dsh-extension-quota-monitor/probe
 */
import type { QuotaProbeSuccess } from './types.ts';
/**
 * GET one JSON document with a Bearer credential.
 * @param url - absolute HTTPS endpoint.
 * @param apiKey - provider credential sent as the bearer token.
 * @returns the parsed JSON object, or `undefined` on transport or parse failure.
 */
export declare function fetchJson(url: string, apiKey: string): Promise<object | undefined>;
/**
 * DeepSeek official user balance: `{ balance_infos: [{ total_balance, currency }] }`.
 * @param body - parsed endpoint response.
 */
export declare function parseDeepSeekBalance(body: unknown): QuotaProbeSuccess | undefined;
/**
 * new-api `/api/user/self`: `{ data: { quota } }` in 1/500000-dollar units.
 * @param body - parsed endpoint response.
 */
export declare function parseNewApiQuota(body: unknown): QuotaProbeSuccess | undefined;
/**
 * Sub2API-style dashboard: remaining/total/used credits under assorted key
 * spellings. There is no universal endpoint, so absence returns `undefined`
 * and the caller reports an unrecognized-endpoint failure.
 * @param body - parsed endpoint response.
 */
export declare function parseSub2ApiQuota(body: unknown): QuotaProbeSuccess | undefined;
/**
 * MiniMax 5h rolling window: `{ model_remains: [...] }` (also nested under
 * `data`). The panel shows the tightest model's remaining percent and its
 * reset instant — that is the window the user actually budgets against.
 * @param body - parsed endpoint response.
 */
export declare function parseMiniMaxWindow(body: unknown): QuotaProbeSuccess | undefined;
/**
 * Cline Pass plan limits: `{ limits: [{ type, percentUsed, resetsAt }] }`
 * (also nested under `data`). `type` is one of `five_hour`, `weekly`, and
 * `monthly`; any other window is skipped. The envelope reports the tightest
 * window, which is the one that stops a session first.
 * @param body - parsed endpoint response.
 * @returns the probe view, or `undefined` when no recognized window is disclosed.
 */
export declare function parseClinePlanLimits(body: unknown): QuotaProbeSuccess | undefined;
/**
 * AgentRouter desk account: `{ usage_summary: {...}, budget_pool_usages: [...] }`
 * (also nested under `data`). The endpoint discloses no unit, so the figures
 * are reported verbatim under the neutral `credits` label; the account row
 * carries the summary remainder and each pool keeps its own remainder.
 * @param body - parsed endpoint response.
 * @returns the probe view, or `undefined` when neither section carries a figure.
 */
export declare function parseAgentRouterAccount(body: unknown): QuotaProbeSuccess | undefined;
//# sourceMappingURL=probe.d.ts.map