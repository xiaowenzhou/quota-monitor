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
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { SessionFoldState } from './usage-fold.ts';
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
export declare const foldRecord: z.ZodObject<{
    throughSeq: z.ZodNumber;
    eventCount: z.ZodNumber;
    days: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodObject<{
        calls: z.ZodNumber;
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        cacheReadTokens: z.ZodNumber;
        cacheWriteTokens: z.ZodNumber;
    }, z.core.$strip>>>;
    lastActiveAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/** The stored fold record for one session. */
export type QuotaFoldRecord = z.infer<typeof foldRecord>;
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
export declare const usageDomainSpec: {
    name: string;
    version: number;
    compatibleVersions: number[];
    invalidRecords: "backup-and-skip";
    layout: "per-record";
    tables: {
        sessions: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<SessionId, {
            throughSeq: number;
            eventCount: number;
            days: Record<string, Record<string, {
                calls: number;
                inputTokens: number;
                outputTokens: number;
                cacheReadTokens: number;
                cacheWriteTokens: number;
            }>>;
            lastActiveAt?: number | undefined;
        }>;
    };
};
/**
 * Widen a stored record to the in-memory fold state.
 * @param record - the validated stored record.
 * @returns the fold state.
 */
export declare function stateOf(record: QuotaFoldRecord): SessionFoldState;
//# sourceMappingURL=usage-domain.d.ts.map