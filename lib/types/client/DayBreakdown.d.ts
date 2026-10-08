/**
 * The selected day's breakdown: one row per `provider · model`, ordered by
 * token total, with the derived spend when prices are configured.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/DayBreakdown
 */
import type { QuotaDayUsage } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The breakdown's props. */
export interface DayBreakdownProps {
    t: QuotaTranslate;
    date: string | undefined;
    day: QuotaDayUsage | undefined;
}
export declare function DayBreakdown({ t, date, day }: DayBreakdownProps): import("react").JSX.Element;
//# sourceMappingURL=DayBreakdown.d.ts.map