import type { ReactNode } from 'react';
import type { QuotaExportDocument, QuotaExportKind, QuotaUsageReport } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
export interface LocalStatsProps {
    t: QuotaTranslate;
    usage: QuotaUsageReport | undefined;
    allUsage: QuotaUsageReport | undefined;
    names: Readonly<Record<string, string>>;
    provider: string | undefined;
    scopeName: string | undefined;
    month: string | undefined;
    selectedDay: string | undefined;
    onSelectDay: (date: string) => void;
    onMonthChange: (month: string) => void;
    onExport: (kind: QuotaExportKind) => Promise<QuotaExportDocument | undefined>;
    onReset: () => void;
}
/** Local accounting keeps its own surfaces while the panel owns its selection. */
export declare function LocalStats({ t, usage, allUsage, names, provider, scopeName, month, selectedDay, onSelectDay, onMonthChange, onExport, onReset, }: LocalStatsProps): ReactNode;
//# sourceMappingURL=LocalStats.d.ts.map