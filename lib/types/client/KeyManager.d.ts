import type { QuotaKeyRequest, QuotaProviderEntry } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
export declare function KeyManager({ t, entry, selected, onSelect, onManage }: {
    t: QuotaTranslate;
    entry: QuotaProviderEntry;
    selected: string | undefined;
    onSelect: (ref: string) => void;
    onManage: (request: QuotaKeyRequest) => Promise<void>;
}): import("react").JSX.Element;
//# sourceMappingURL=KeyManager.d.ts.map