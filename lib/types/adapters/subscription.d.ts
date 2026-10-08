/**
 * Subscription adapters: accounts that meter elapsed-time windows rather than
 * a balance.
 *
 * Every adapter normalizes to {@link QuotaPlanWindow} rows carrying a used
 * share and, when disclosed, a reset instant. A window whose percentage
 * cannot be read is dropped rather than shown as empty, because an empty bar
 * and an unread bar mean opposite things.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/subscription
 */
import type { QuotaAccountReading, QuotaAdapter } from './contract.ts';
/**
 * MiniMax Coding Plan: a rolling session window plus a weekly window.
 *
 * The response reports one row per resource group; the chat row is the one a
 * session actually spends, named either `general` or after the model itself.
 */
export declare const minimaxTokenPlan: QuotaAdapter;
/**
 * Z.ai / GLM Coding Plan: the quota endpoint reports one row per limit, and
 * the optional subscription endpoint supplies the plan label and renewal.
 *
 * The Coding Plan endpoints expect the raw API key, unlike the inference API.
 */
export declare const zaiTokenPlan: QuotaAdapter;
/** Kimi For Coding: `/coding/v1/usages` reports a session limit plus weekly usage. */
export declare const kimiTokenPlan: QuotaAdapter;
/**
 * OpenCode Go: the Bearer usage endpoint reports rolling, weekly, and monthly
 * windows.
 *
 * This endpoint is not part of the documented provider API and may change
 * upstream; a failure is reported as an account status rather than retried
 * against the authenticated dashboard, which would need a browser cookie.
 */
export declare const opencodeGo: QuotaAdapter;
/**
 * Ollama cloud: `/api/usage` reports a session and a weekly window as
 * consumed ratios on a 0–1 scale. There is no balance.
 */
export declare const ollama: QuotaAdapter;
/**
 * Cline Pass plan limits: five-hour, weekly, and monthly used shares, each
 * with its own reset instant.
 *
 * Only the pay-as-you-go credit endpoint is absent; an account without an
 * active plan therefore falls back to the manual allowance.
 */
export declare const clinePlan: QuotaAdapter;
/** Every subscription adapter, keyed for registry assembly. */
export declare const SUBSCRIPTION_ADAPTERS: readonly QuotaAdapter[];
/** Re-exported so the account reading type stays reachable from one module. */
export type { QuotaAccountReading };
//# sourceMappingURL=subscription.d.ts.map