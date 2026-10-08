/**
 * The month calendar: one cell per day of the shown month, shaded by that
 * day's token total and labelled with its day number, with month navigation
 * and day selection.
 *
 * The calendar is built from the month string alone, so a month with 28, 30,
 * or 31 days and any leading weekday renders without a special case.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsageHeatmap
 */
import type { QuotaDayUsage } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The calendar's props. */
export interface UsageHeatmapProps {
    t: QuotaTranslate;
    days: readonly QuotaDayUsage[];
    month: string | undefined;
    /** The report's own today, so the current day is outlined without a second clock. */
    today: string | undefined;
    selected: string | undefined;
    onSelect: (date: string) => void;
    onMonthChange: (month: string) => void;
}
export declare function UsageHeatmap({ t, days, month, today, selected, onSelect, onMonthChange, }: UsageHeatmapProps): import("react").JSX.Element;
//# sourceMappingURL=UsageHeatmap.d.ts.map