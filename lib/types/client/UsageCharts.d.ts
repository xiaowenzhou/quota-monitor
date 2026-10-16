import type { QuotaKeyDayUsage, QuotaKeyModelUsage, QuotaKeyWindow } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
import type { DateRange } from './key-usage-period.ts';
/** Include calendar gaps so adjacent bars never conceal idle or unavailable days. */
export declare function calendarSeries(daily: readonly QuotaKeyDayUsage[], range: DateRange, availableStart: string | undefined, availableEnd: string | undefined): {
    date: string;
    value: number | undefined;
}[];
export declare function UsageCharts({ t, totals, models, daily, range, startDate, endDate, modelNames }: {
    t: QuotaTranslate;
    totals: QuotaKeyWindow | undefined;
    models: readonly QuotaKeyModelUsage[];
    daily: readonly QuotaKeyDayUsage[];
    range: DateRange;
    startDate: string | undefined;
    endDate: string | undefined;
    modelNames?: readonly string[];
}): import("react").JSX.Element;
//# sourceMappingURL=UsageCharts.d.ts.map