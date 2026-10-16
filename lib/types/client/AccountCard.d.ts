/**
 * The selected provider's balance, plan windows, key management and read status.
 * Provider selection belongs to the page toolbar.
 *
 * A non-`ok` status renders its reason instead of a figure. The card never
 * substitutes zero for a number it could not read.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/AccountCard
 */
import type { QuotaKeyRequest, QuotaAccount, QuotaProviderEntry } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The card's props. */
export interface AccountCardProps {
    t: QuotaTranslate;
    providers: readonly QuotaProviderEntry[];
    selected: string | undefined;
    /** Credential reference of the shown reading; absent is the route's own key. */
    selectedCredential: string | undefined;
    account: QuotaAccount | undefined;
    manualTotal: number | undefined;
    manualRemaining: number | undefined;
    onSelect: (id: string, credentialRef: string | undefined) => void;
    onManage: (request: QuotaKeyRequest) => Promise<void>;
    onRefresh: () => void;
    onManualChange: (id: string, value: number) => void;
}
export declare function AccountCard({ t, providers, selected, selectedCredential, account, manualTotal, manualRemaining, onSelect, onManage, onRefresh, onManualChange, }: AccountCardProps): import("react").JSX.Element;
//# sourceMappingURL=AccountCard.d.ts.map