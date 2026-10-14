import type { QuotaRoutingConfig } from './config.ts';
export interface RouteCandidate {
    ref: string;
    headroom: number;
    resetAt?: string;
}
/** An invalid, low-confidence or failed decision always leaves the local choice authoritative. */
export declare function chooseWithJev(candidates: readonly RouteCandidate[], key: string, config: QuotaRoutingConfig, fetchImpl?: typeof fetch): Promise<string | undefined>;
//# sourceMappingURL=routing.d.ts.map