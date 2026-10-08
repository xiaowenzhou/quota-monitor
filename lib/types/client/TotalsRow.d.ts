/**
 * The token totals row: today, this month, and all time, each with its derived
 * spend and its input/output/cache split, followed by the budget windows.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/TotalsRow
 */
import type { QuotaUsageReport } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The totals row's props. */
export interface TotalsRowProps {
    t: QuotaTranslate;
    usage: QuotaUsageReport | undefined;
}
export declare function TotalsRow({ t, usage }: TotalsRowProps): import("react").JSX.Element;
//# sourceMappingURL=TotalsRow.d.ts.map