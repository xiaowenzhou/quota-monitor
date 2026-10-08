/**
 * Balance adapters: accounts that meter money or credits.
 *
 * Each adapter owns one provider's endpoint and response grammar. A gateway
 * that answers in an unrecognized shape raises `invalid-response` rather than
 * reporting a zero balance.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/balance
 */
import { numberOf } from '../parse.ts';
import type { QuotaAdapter } from './contract.ts';
/**
 * DeepSeek official user balance: `{ balance_infos: [{ total_balance, currency }] }`.
 * A CNY entry is preferred because that is the account's settlement currency.
 */
export declare const deepseekBalance: QuotaAdapter;
/**
 * OpenRouter account credits: `/api/v1/credits`, remaining is
 * `total_credits - total_usage`.
 *
 * The endpoint requires a Management Key, so this adapter reads its own
 * credential reference rather than the inference key — `/api/v1/key` would
 * only describe one key's spending limit, which is not an account balance.
 */
export declare const openrouterBalance: QuotaAdapter;
/** Moonshot / Kimi API balance: `/v1/users/me/balance`. */
export declare const moonshotBalance: QuotaAdapter;
/** Z.ai / GLM open-platform balance: `/api/paas/v4/balance`. */
export declare const zaiBalance: QuotaAdapter;
/**
 * OrcaRouter: the wallet endpoint first, then the documented
 * OpenAI-compatible billing pair for deployments that predate it.
 */
export declare const orcarouterBalance: QuotaAdapter;
/**
 * new-api: the per-token usage endpoint first, then the legacy self endpoint,
 * with the deployment's own quota denomination applied to both.
 */
export declare const newApi: QuotaAdapter;
/**
 * AgentRouter desk account: an account summary plus one row per budget pool.
 *
 * The desk API is served beside the inference API, so this adapter addresses
 * the base URL's origin rather than the base URL itself. The endpoint
 * discloses no unit, so its figures keep the neutral `credits` label.
 */
export declare const agentRouter: QuotaAdapter;
/**
 * The CC Switch-style general template: `GET {baseURL}/user/balance` with the
 * provider's own inference key, reading `body.balance`.
 */
export declare const general: QuotaAdapter;
/** Every balance adapter, keyed for registry assembly. */
export declare const BALANCE_ADAPTERS: readonly QuotaAdapter[];
/** Re-exported for the declarative adapter, which shares the numeric coercion. */
export { numberOf };
//# sourceMappingURL=balance.d.ts.map