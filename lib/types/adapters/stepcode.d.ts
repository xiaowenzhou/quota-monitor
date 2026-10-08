/**
 * The StepCode / AgentRouter desk account adapter.
 *
 * One guarded GET against `{origin}/desk/v1/stepcode/user/info` answers with an
 * account summary plus one row per budget pool. The endpoint is not a documented
 * public API, so every figure is read from an ordered candidate list: a renamed
 * field degrades one row instead of reporting a wrong number, and a section
 * disclosing only two of used/total/remaining yields the third.
 *
 * This is the protocol the StepCode quota tooling reads; `agent-router` remains
 * the terse reader shipped for the same path, and a deployment that wants the
 * pools, usage share, and billing period picks this adapter by name.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/stepcode
 */
import type { QuotaAdapter } from './contract.ts';
/**
 * The StepCode desk account: an account summary, its budget pools, and the
 * billing period the summary is metered over.
 *
 * The desk API is served beside the inference API, so this adapter addresses
 * the base URL's origin rather than the base URL itself.
 */
export declare const stepcode: QuotaAdapter;
//# sourceMappingURL=stepcode.d.ts.map