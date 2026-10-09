/**
 * Folding session logs into per-day, per-`provider · model` token totals.
 *
 * Pure functions over event arrays: no IO, no clock reads beyond the injected
 * `now`. The Host service owns reading sessions and persisting the result.
 *
 * Only provider-reported `usage` is folded. A step whose adapter reported no
 * usage contributes nothing rather than an estimate, so every figure the
 * panel shows traces back to a provider's own accounting.
 * @module @deepseek-ai/dsh-extension-quota-monitor/usage-fold
 */
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session';
import type { QuotaBudgetConfig } from './config.ts';
import type { QuotaPriceTable } from './pricing.ts';
import type { QuotaTokenTotals, QuotaUsageReport } from './types.ts';
/**
 * The folded state of one session, cached between rounds.
 *
 * `throughSeq` is the highest raw-log seq already folded; a later round
 * resumes after it. `eventCount` detects a log that was rewritten rather than
 * appended to, which forces a full refold of that session.
 */
export interface SessionFoldState {
    throughSeq: number;
    eventCount: number;
    /** `YYYY-MM-DD` → `provider\u0000model` → totals, as plain JSON for persistence. */
    days: Record<string, Record<string, QuotaFoldCounts>>;
    /**
     * Epoch ms of the latest usage-bearing event folded, or 0 before one. Only
     * usage counts: a session whose log kept growing without a model call has
     * not spent anything since.
     */
    lastActiveAt?: number;
}
/** The five counters persisted per `provider · model` per day. */
export interface QuotaFoldCounts {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
}
/**
 * The local calendar day of an epoch instant, as `YYYY-MM-DD`.
 *
 * Local rather than UTC: a user reading "today" means their own day, and a
 * UTC fold would move eight hours of usage into the wrong bucket for a CN
 * workday.
 * @param epochMs - the instant.
 * @returns the local calendar day.
 */
export declare function localDay(epochMs: number): string;
/**
 * Fold one session's events into a per-day, per-route counter map.
 *
 * Resumes from `previous` when the log only grew; a shorter log, or one whose
 * prefix was rewritten, is refolded from the start because its earlier seqs
 * no longer identify the same events.
 * @param events - the session's raw log events, ascending by seq.
 * @param previous - the fold state from an earlier round, when one exists.
 * @returns the updated fold state.
 */
export declare function foldSessionEvents(events: readonly SessionEvent[], previous: SessionFoldState | undefined): SessionFoldState;
/**
 * Cache-hit share of billed input, 0–100.
 *
 * Denominated by all three input buckets because those are exactly what a
 * request pays for; output is excluded since it is never served from cache.
 * @param totals - the totals to measure.
 * @returns the percentage, or `undefined` when no input was recorded.
 */
export declare function cacheHitPercent(totals: QuotaTokenTotals): number | undefined;
/** What the report builder needs beyond the folded counters. */
export interface QuotaReportOptions {
    /** Current epoch milliseconds, deciding today and this month. */
    now: number;
    /** Epoch ms the fold completed. */
    foldedAt: number;
    /** Whether a fold round is currently running. */
    folding: boolean;
    /** Prices to derive spend from; omitted leaves every cost figure absent. */
    prices?: QuotaPriceTable;
    /** Spend ceilings to measure the derived cost against. */
    budgets?: QuotaBudgetConfig;
    /**
     * Report one provider route alone: its days, its sessions, and its totals.
     * Omitted reports every route together, which is the per-provider comparison.
     */
    provider?: string;
}
/**
 * Merge every session's fold state into the report the panel reads.
 *
 * Sessions are keyed by id so the report can list them; the id is the only
 * session-identifying value that crosses into it, because a title is prompt
 * text and this report is not where prompt text belongs.
 * @param states - per-session id and fold state, in any order.
 * @param options - clock, fold status, prices, and ceilings.
 * @returns the assembled report.
 */
export declare function buildUsageReport(states: Iterable<readonly [SessionId, SessionFoldState]>, options: QuotaReportOptions): QuotaUsageReport;
/**
 * An empty report, served before the first fold completes.
 * @param now - current epoch milliseconds.
 * @param folding - whether the first fold round is already running.
 * @returns a report with zeroed totals and no days.
 */
export declare function emptyUsageReport(now: number, folding: boolean): QuotaUsageReport;
//# sourceMappingURL=usage-fold.d.ts.map