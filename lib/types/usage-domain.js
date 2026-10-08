/**
 * The `quota_usage` storage domain: one record per session holding that
 * session's folded token counters and the seq the fold reached.
 *
 * Only counters and route ids are stored. No prompt text, tool output, file
 * path, or credential enters this domain — it is derived accounting, and a
 * lost or discarded record costs only a refold.
 * @module @deepseek-ai/dsh-extension-quota-monitor/usage-domain
 */
import { z } from 'zod';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
/** The five counters folded per `provider · model` per day. */
const foldCounts = z.object({
    calls: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    cacheWriteTokens: z.number().int().nonnegative(),
});
/**
 * One session's fold record: the resume cursor plus its day map.
 *
 * `eventCount` pairs with `throughSeq` to detect a rewritten log: a shorter
 * log cannot be resumed from a seq its events no longer carry.
 *
 * `lastActiveAt` is the epoch ms of the latest usage-bearing event folded. It
 * is optional because version 1 records predate it; such a record keeps its
 * counters and reports no activity time until its session is next folded.
 */
export const foldRecord = z.object({
    throughSeq: z.number().int().gte(-1),
    eventCount: z.number().int().nonnegative(),
    days: z.record(z.string(), z.record(z.string(), foldCounts)),
    lastActiveAt: z.number().int().nonnegative().optional(),
});
/**
 * The usage-fold domain.
 *
 * `invalidRecords: 'backup-and-skip'`: a record that fails validation is
 * disposable derived data, so it must never cost the boot — the domain layer
 * moves it aside and the session is refolded from its log.
 *
 * Version 2 added `lastActiveAt`. Version 1 records validate unchanged against
 * the current schema, so they are accepted rather than discarded: a refold is
 * cheap but re-reading every session's whole log at once is not.
 */
export const usageDomainSpec = defineDomain({
    name: 'quota_usage',
    version: 2,
    compatibleVersions: [1],
    invalidRecords: 'backup-and-skip',
    layout: 'per-record',
    tables: { sessions: domainTable(foldRecord) },
});
/**
 * Widen a stored record to the in-memory fold state.
 * @param record - the validated stored record.
 * @returns the fold state.
 */
export function stateOf(record) {
    return {
        throughSeq: record.throughSeq,
        eventCount: record.eventCount,
        days: record.days,
        ...record.lastActiveAt === undefined ? {} : { lastActiveAt: record.lastActiveAt },
    };
}
//# sourceMappingURL=usage-domain.js.map