import type { QuotaModelSummary } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** Input reported by the Host for the panel's selected provider. */
export interface ModelUsageProps {
    t: QuotaTranslate;
    models: readonly QuotaModelSummary[];
    names: Readonly<Record<string, string>>;
}
/**
 * Render model counters by range, with partial spend and current rate labels.
 * @param props - Model summaries, provider names, and localized copy.
 * @returns The model usage table or an empty-state message.
 */
export declare function ModelUsage({ t, models, names }: ModelUsageProps): import("react").JSX.Element;
//# sourceMappingURL=ModelUsage.d.ts.map