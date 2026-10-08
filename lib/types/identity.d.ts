/**
 * Provider identity policy: which account adapter serves one configured
 * provider route.
 *
 * Resolution follows a strict precedence — an explicit `monitors` entry, then
 * a canonical route id, then a canonical base-URL hostname, then unknown. A
 * route that resolves to no adapter is never probed with a credential: the
 * service may ask the route's own public settings document what it is, and only
 * a matched fingerprint earns a keyed read.
 *
 * Display names never participate: they are presentation, and two deployments
 * routinely label the same upstream differently.
 * @module @deepseek-ai/dsh-extension-quota-monitor/identity
 */
import type { QuotaAccountMode } from './types.ts';
/** Every account adapter this build can run. */
export type QuotaAdapterId = 'deepseek-balance' | 'openrouter-balance' | 'moonshot-balance' | 'zai-balance' | 'orcarouter-balance' | 'new-api' | 'sub2api' | 'sub2api-auth' | 'agent-router' | 'stepcode' | 'general' | 'opencode-go' | 'zai-token-plan' | 'kimi-token-plan' | 'minimax-token-plan' | 'cline-plan' | 'ollama' | 'declarative';
/**
 * Which mode each adapter reports in, so the panel picks its card frame before
 * the first read.
 *
 * `sub2api` and `sub2api-auth` are listed as `balance` because that is the
 * frame their wallet answer needs; either may return
 * {@link QuotaAccountReading.mode} `subscription` when the gateway answers with
 * plan windows instead, and that answer wins.
 */
export declare const ADAPTER_MODES: Readonly<Record<QuotaAdapterId, QuotaAccountMode>>;
/**
 * Whether a hostname names this machine or a private network.
 * @param hostname - lowercased hostname to classify.
 * @returns true when the host is loopback, link-local, or RFC 1918.
 */
export declare function isPrivateHostname(hostname: string): boolean;
/**
 * How confidently an adapter was selected, for the card's origin line.
 *
 * `fingerprint` names a route no rule recognized whose own public settings
 * document identified it; the service resolves that one, because it costs a
 * request.
 */
export type QuotaIdentityConfidence = 'explicit' | 'canonical-id' | 'canonical-host' | 'fingerprint' | 'unknown';
/** One resolved provider route. */
export interface QuotaProviderIdentity {
    readonly id: string;
    /** The adapter to run, or null when the route has no known account endpoint. */
    adapter: QuotaAdapterId | null;
    mode: QuotaAccountMode;
    confidence: QuotaIdentityConfidence;
}
/**
 * Resolve one configured provider route to its account adapter.
 *
 * @param id - provider route key.
 * @param baseURL - the route's configured base URL, when it has one.
 * @param explicitAdapter - adapter named by a `monitors` entry for this route.
 * @returns the resolved identity; `adapter` is null when nothing recognizes the route.
 */
export declare function resolveProviderIdentity(id: string, baseURL: string | undefined, explicitAdapter: QuotaAdapterId | undefined): QuotaProviderIdentity;
//# sourceMappingURL=identity.d.ts.map