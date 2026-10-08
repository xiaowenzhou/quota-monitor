/**
 * The adapter registry: adapter id to implementation.
 *
 * `declarative` is absent because it is built per configured spec rather than
 * shared; {@link declarativeAdapter} constructs it.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters
 */
import { BALANCE_ADAPTERS } from "./balance.js";
import { SUBSCRIPTION_ADAPTERS } from "./subscription.js";
export { declarativeAdapter, resolvePointer } from "./declarative.js";
/** Every shared adapter, keyed by id. */
const REGISTRY = new Map([...BALANCE_ADAPTERS, ...SUBSCRIPTION_ADAPTERS].map(adapter => [adapter.id, adapter]));
/**
 * The adapter registered under one id.
 * @param id - adapter id resolved from a provider route.
 * @returns the adapter, or `undefined` for `declarative` and unknown ids.
 */
export function adapterFor(id) {
    return REGISTRY.get(id);
}
/**
 * Credential reference names one adapter needs beyond the provider's own key.
 * @param id - adapter id.
 * @returns the reference names, empty when the adapter uses the provider key.
 */
export function credentialRefsFor(id) {
    return REGISTRY.get(id)?.credentialRefs ?? [];
}
//# sourceMappingURL=index.js.map