/**
 * Sub2API-family adapters: the published `/v1/usage` protocol, the panel
 * balance readable with a provider's own inference key, and the
 * credential-free fingerprint that recognizes such a panel.
 *
 * One gateway family serves three different answers under one protocol — a
 * wallet, an aggregate quota, or a subscription's per-period ceilings — so the
 * reading declares its own mode instead of the adapter id fixing it.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/sub2api
 */
import type { QuotaAccountReading, QuotaAdapter, QuotaAdapterContext } from './contract.ts';
/**
 * Read one `/v1/usage` answer in whichever of its three forms arrived.
 *
 * The gateway reports an expired or disabled key as a field on a 200 answer,
 * so that case becomes `unauthorized` here rather than a missing balance.
 * @param body - the parsed answer.
 * @param now - current epoch milliseconds, for reset countdowns.
 * @returns the normalized reading.
 * @throws {QuotaRequestError} when the answer discloses no usable figure.
 */
export declare function readSub2apiUsage(body: unknown, now: number): QuotaAccountReading;
/**
 * Sub2API gateways publishing the `/v1/usage` protocol, including Passion.
 *
 * The answer decides the mode: a wallet balance, an aggregate quota with its
 * rate-limit windows, or a subscription's per-period ceilings.
 */
export declare const sub2api: QuotaAdapter;
/**
 * Sub2API panels, whose dashboard balance the provider's own inference key
 * already authorizes.
 *
 * A panel re-sells upstream subscriptions and serves no `/v1/usage`; its
 * balance lives at `/user/balance`, with today's spend beside it. Only a
 * missing route or an unreadable body falls through to the published
 * protocol — an auth or rate-limit answer is the panel's real answer and must
 * not be retried against another path.
 */
export declare const sub2apiAuth: QuotaAdapter;
/**
 * Whether an origin answers with a real Sub2API panel's public fingerprint.
 *
 * No credential is sent: the fingerprint path is public, and a gateway this
 * build has not recognized must prove what it is before it receives a key.
 * @param context - the provider facts, for the origin and the injected fetch.
 * @returns true when the answer carries the panel's public settings document.
 */
export declare function detectSub2apiPanel(context: QuotaAdapterContext): Promise<boolean>;
//# sourceMappingURL=sub2api.d.ts.map