/**
 * Response-reading helpers shared by every adapter: numeric coercion, key
 * probing, percent clamping, and epoch normalization.
 *
 * Every function here refuses rather than guesses. A figure that cannot be
 * read returns `undefined`, which the adapters turn into an explicit account
 * status — a balance is never defaulted to zero, because "zero remaining" and
 * "could not read" mean opposite things to someone deciding whether to keep
 * working.
 * @module @deepseek-ai/dsh-extension-quota-monitor/parse
 */
/** A plain JSON object, after the two checks that make indexing safe. */
export type JsonRecord = Record<string, unknown>;
/**
 * Whether a value is a plain (non-array) object.
 * @param value - candidate value.
 * @returns true when the value can be indexed by key.
 */
export declare function isRecord(value: unknown): value is JsonRecord;
/**
 * Coerce a finite number from a number or numeric string.
 * @param value - candidate value.
 * @returns the number, or `undefined` when it is not finite.
 */
export declare function numberOf(value: unknown): number | undefined;
/**
 * First finite number found under any of `keys`, on `value` itself.
 * @param value - object to read.
 * @param keys - candidate key spellings, in priority order.
 * @returns the first readable number, or `undefined`.
 */
export declare function pickNumber(value: unknown, keys: readonly string[]): number | undefined;
/**
 * First non-empty string found under any of `keys`.
 * @param value - object to read.
 * @param keys - candidate key spellings, in priority order.
 * @returns the trimmed string, or `undefined`.
 */
export declare function pickString(value: unknown, keys: readonly string[]): string | undefined;
/**
 * First finite number found under any of `keys`, searching nested objects
 * breadth-first. Used only where a gateway nests its figures at an
 * undocumented depth; a top-level read is always preferred.
 * @param value - value to search.
 * @param keys - candidate key spellings, in priority order.
 * @param depth - current recursion depth.
 * @returns the first readable number, or `undefined`.
 */
export declare function findNumber(value: unknown, keys: readonly string[], depth?: number): number | undefined;
/**
 * Confine a disclosed percentage to 0–100.
 *
 * Endpoints report overage figures above 100 and, after a refund or clock
 * skew, below 0. The panel draws a bar from this number, so it is clamped
 * once here rather than at each render.
 * @param value - the disclosed percentage.
 * @returns the clamped percentage, or `undefined` when unreadable.
 */
export declare function clampPercent(value: unknown): number | undefined;
/**
 * Round to one decimal, the precision the panel displays.
 * @param value - the figure to round.
 * @returns the rounded figure.
 */
export declare function round1(value: number): number;
/**
 * The object under `key`, read from the body root or a `data` envelope.
 * @param body - parsed response body.
 * @param key - the property to read.
 * @returns the object, or `undefined`.
 */
export declare function objectUnder(body: unknown, key: string): JsonRecord | undefined;
/**
 * The array under `key`, read from the body root or a `data` envelope.
 * @param body - parsed response body.
 * @param key - the property to read.
 * @returns the array, or `undefined`.
 */
export declare function arrayUnder(body: unknown, key: string): readonly unknown[] | undefined;
/**
 * Interpret an epoch field that may arrive in seconds or milliseconds.
 *
 * The threshold is the only reliable discriminator: any second-precision
 * timestamp of this era is far below it, and any millisecond one far above.
 * @param raw - the disclosed epoch.
 * @returns epoch milliseconds, or `undefined` when unreadable.
 */
export declare function epochMsOf(raw: unknown): number | undefined;
/**
 * Read a reset instant as an ISO string, accepting ISO text or a numeric
 * epoch. An instant already in the past is dropped: a countdown to it shows
 * nothing.
 * @param raw - the disclosed instant.
 * @param now - current epoch milliseconds.
 * @returns the ISO instant, or `undefined`.
 */
export declare function upcomingIso(raw: unknown, now: number): string | undefined;
/**
 * A reset instant expressed as a remaining duration from now.
 * @param raw - remaining milliseconds.
 * @param now - current epoch milliseconds.
 * @returns the ISO instant, or `undefined`.
 */
export declare function resetFromDuration(raw: unknown, now: number): string | undefined;
//# sourceMappingURL=parse.d.ts.map