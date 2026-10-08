/**
 * The adapter registry: adapter id to implementation.
 *
 * `declarative` is absent because it is built per configured spec rather than
 * shared; {@link declarativeAdapter} constructs it.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters
 */
import type { QuotaAdapterId } from '../identity.ts';
import type { QuotaAdapter } from './contract.ts';
export type { QuotaAccountReading, QuotaAdapter, QuotaAdapterContext } from './contract.ts';
export { declarativeAdapter, resolvePointer } from './declarative.ts';
export type { QuotaDeclarativeSpec, QuotaDeclarativeWindow } from './declarative.ts';
/**
 * The adapter registered under one id.
 * @param id - adapter id resolved from a provider route.
 * @returns the adapter, or `undefined` for `declarative` and unknown ids.
 */
export declare function adapterFor(id: QuotaAdapterId): QuotaAdapter | undefined;
/**
 * Credential reference names one adapter needs beyond the provider's own key.
 * @param id - adapter id.
 * @returns the reference names, empty when the adapter uses the provider key.
 */
export declare function credentialRefsFor(id: QuotaAdapterId): readonly string[];
//# sourceMappingURL=index.d.ts.map