import type { QuotaKeyUsage, QuotaKeyWindow, QuotaKeyModelUsage, QuotaKeyDayUsage } from '../types.ts';
export type UsagePeriod = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30';
export interface DateRange {
    start: string;
    end: string;
}
/** Desk days are China calendar days, independent of the browser's timezone. */
export declare function periodRange(period: UsagePeriod, now: number): DateRange;
export declare function sumUsage(rows: readonly QuotaKeyWindow[]): QuotaKeyWindow;
export interface PeriodUsage {
    totals: QuotaKeyWindow | undefined;
    models: QuotaKeyModelUsage[];
    daily: QuotaKeyDayUsage[];
    coverage: 'complete' | 'partial' | 'unavailable';
}
/** Missing detail stays unknown; bounds describe the API window, not first activity. */
export declare function sliceUsage(usage: QuotaKeyUsage | undefined, range: DateRange): PeriodUsage;
//# sourceMappingURL=key-usage-period.d.ts.map