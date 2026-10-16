/**
 * The per-key usage page: one card per monitored credential, carrying the
 * allowance that key's own account endpoint reported and the token detail its
 * own usage endpoint reported. Opening a card shows that key's billing period,
 * token split, per-model share, and daily series.
 *
 * A model request names a provider route and never the key that served it, so
 * this page is the only place a per-key figure can come from: every number here
 * was read with that key's own credential. The page derives presentation only —
 * it never folds a key's traffic out of this process's own counters, which
 * cannot attribute a call to a key at all.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/KeyUsagePanel
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { QuotaMonitorApi } from './UsagePanel.tsx';
/** The mounted `ctx.remote.quotaMonitor` face this page talks to. */
export interface KeyUsageInjected {
    quota: QuotaMonitorApi;
    /** The Host's model registry is the current provider directory. */
    subscribeProviders?: (listener: () => void) => () => void;
}
/** Composed props of the page entry: root runtime seat, `t`, and the Host face. */
export type KeyUsagePanelProps = PropsRuntime<'main'> & PropsLocale<'quotaMonitor'> & InjectFace<KeyUsageInjected>;
export declare function KeyUsagePanel({ t, quota, subscribeProviders }: KeyUsagePanelProps): import("react").JSX.Element;
//# sourceMappingURL=KeyUsagePanel.d.ts.map