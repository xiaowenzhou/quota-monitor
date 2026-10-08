/**
 * The usage panel: the provider account card, token totals with derived spend
 * and budgets, the month calendar, the selected day's breakdown, the session
 * list, and the export row.
 *
 * Every figure arrives from the `quotaMonitor` Remote face. The panel derives
 * presentation only — it never computes a total the Host did not report, so
 * one authority owns the accounting.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsagePanel
 */
import type { InjectFace, PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { QuotaAccount, QuotaAccountRequest, QuotaExportDocument, QuotaExportRequest, QuotaResetStatsRequest, QuotaSetBalancesRequest, QuotaSnapshot, QuotaUsageReport, QuotaUsageRequest } from '../types.ts';
/** The mounted `ctx.remote.quotaMonitor` face the panel talks to. */
export interface QuotaMonitorApi {
    getSnapshot(): Promise<RemoteResult<QuotaSnapshot>>;
    getAccount(request: QuotaAccountRequest): Promise<RemoteResult<QuotaAccount>>;
    getUsage(request: QuotaUsageRequest): Promise<RemoteResult<QuotaUsageReport>>;
    exportUsage(request: QuotaExportRequest): Promise<RemoteResult<QuotaExportDocument>>;
    setBalances(request: QuotaSetBalancesRequest): Promise<RemoteResult<Record<string, number>>>;
    resetStats(request: QuotaResetStatsRequest): Promise<RemoteResult<QuotaSnapshot>>;
}
/** Owner share handed down by the main-panel entry. */
export interface UsagePanelInjected {
    quota: QuotaMonitorApi;
}
/** Composed props of the panel entry: root runtime seat, `t`, and the Host face. */
export type UsagePanelProps = PropsRuntime<'main'> & PropsLocale<'quotaMonitor'> & InjectFace<UsagePanelInjected>;
/** The panel's namespace-bound translate, threaded into its rows. */
export type QuotaTranslate = TranslateNS<'quotaMonitor'>;
export declare function UsagePanel({ t, quota }: UsagePanelProps): import("react").JSX.Element;
//# sourceMappingURL=UsagePanel.d.ts.map