/**
 * The provider breakdown: folded token totals per provider route.
 *
 * The panel's statistics follow one selected route, so this section is how that
 * route is chosen — a row selects it — and it states what the choice costs: a
 * compact view of the selected route against every route's total, or the whole
 * list once the reader asks for it. The range chips pick which scope the rows
 * state, and the rows are ordered by that scope's tokens.
 *
 * The report carries route keys only, so a route the snapshot knows is labelled
 * with its display name and an unknown one falls back to the key itself.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ProviderUsage
 */
import type { QuotaProviderUsage } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The breakdown's props. */
export interface ProviderUsageProps {
    t: QuotaTranslate;
    providers: readonly QuotaProviderUsage[];
    /** Route key → display name, for the routes the snapshot knows. */
    names: Readonly<Record<string, string>>;
    /** The route the panel's statistics follow. */
    selected: string | undefined;
    /** Select a route, which re-scopes the statistics above this section. */
    onSelect: (id: string) => void;
    /** All-time tokens across every route, the denominator of the all-time share. */
    allTimeTokens: number;
    /** Tokens folded for today, the denominator of the today share. */
    todayTokens: number;
    /** Tokens folded for this month, the denominator of the month share. */
    monthTokens: number;
}
export declare function ProviderUsage({ t, providers, names, selected, onSelect, allTimeTokens, todayTokens, monthTokens, }: ProviderUsageProps): import("react").JSX.Element;
//# sourceMappingURL=ProviderUsage.d.ts.map