/**
 * The StepCode / AgentRouter desk account adapter.
 *
 * One guarded GET against `{origin}/desk/v1/stepcode/user/info` answers with an
 * account summary plus one row per budget pool, and a second against
 * `{origin}/desk/v2/stepcode/usage/model-tokens?days=N` answers with what that
 * same credential actually spent, per model and per day. Neither endpoint is a
 * documented public API, so every figure is read from an ordered candidate
 * list: a renamed field degrades one row instead of reporting a wrong number,
 * and a section disclosing only two of used/total/remaining yields the third.
 *
 * Both requests carry the credential in their own `Authorization` header, so
 * every figure this adapter returns belongs to exactly one key — which is the
 * only way to tell two keys behind one route apart, because a model request
 * names a route and never the key that served it.
 *
 * The usage request is the secondary one: a deployment whose key may read the
 * account but not the usage series still gets its allowance, with the token
 * detail absent rather than the whole reading failed.
 *
 * This is the protocol the StepCode quota tooling reads; `agent-router` remains
 * the terse reader shipped for the same path, and a deployment that wants the
 * pools, usage share, billing period, and per-key token history picks this
 * adapter by name.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/stepcode
 */
import type { QuotaAdapter } from './contract.ts';
/**
 * The StepCode desk account: an account summary, its budget pools, the billing
 * period the summary is metered over, and what the credential actually spent
 * over the requested window.
 *
 * The desk API is served beside the inference API, so this adapter addresses
 * the base URL's origin rather than the base URL itself.
 */
export declare const stepcode: QuotaAdapter;
//# sourceMappingURL=stepcode.d.ts.map