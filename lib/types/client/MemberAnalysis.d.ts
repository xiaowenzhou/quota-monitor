import type { QuotaProviderEntry } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** Uses the parent snapshot and selection: opening the analysis never triggers another fetch. */
export declare function MemberAnalysis({ t, providers, provider, credential, capturedAt, onSelect, mode }: {
    mode?: 'current' | 'team';
    t: QuotaTranslate;
    providers: readonly QuotaProviderEntry[];
    provider: string | undefined;
    credential: string | undefined;
    capturedAt: number;
    onSelect: (provider: string, credential: string | undefined) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=MemberAnalysis.d.ts.map