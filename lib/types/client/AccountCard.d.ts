/**
 * The account card: one provider's balance or plan windows, with the provider
 * selector, the endpoint status, and the manual allowance fallback.
 *
 * A non-`ok` status renders its reason instead of a figure. The card never
 * substitutes zero for a number it could not read.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/AccountCard
 */
import type { QuotaAccount, QuotaProviderEntry } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The card's props. */
export interface AccountCardProps {
    t: QuotaTranslate;
    providers: readonly QuotaProviderEntry[];
    selected: string | undefined;
    account: QuotaAccount | undefined;
    manualTotal: number | undefined;
    manualRemaining: number | undefined;
    onSelect: (id: string) => void;
    onRefresh: () => void;
    onManualChange: (id: string, value: number) => void;
}
export declare function AccountCard({ t, providers, selected, account, manualTotal, manualRemaining, onSelect, onRefresh, onManualChange, }: AccountCardProps): import("react").JSX.Element;
//# sourceMappingURL=AccountCard.d.ts.map