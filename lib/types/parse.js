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
/**
 * Whether a value is a plain (non-array) object.
 * @param value - candidate value.
 * @returns true when the value can be indexed by key.
 */
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Coerce a finite number from a number or numeric string.
 * @param value - candidate value.
 * @returns the number, or `undefined` when it is not finite.
 */
export function numberOf(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
/**
 * First finite number found under any of `keys`, on `value` itself.
 * @param value - object to read.
 * @param keys - candidate key spellings, in priority order.
 * @returns the first readable number, or `undefined`.
 */
export function pickNumber(value, keys) {
    if (!isRecord(value))
        return undefined;
    for (const key of keys) {
        const found = numberOf(value[key]);
        if (found !== undefined)
            return found;
    }
    return undefined;
}
/**
 * First non-empty string found under any of `keys`.
 * @param value - object to read.
 * @param keys - candidate key spellings, in priority order.
 * @returns the trimmed string, or `undefined`.
 */
export function pickString(value, keys) {
    if (!isRecord(value))
        return undefined;
    for (const key of keys) {
        const raw = value[key];
        if (typeof raw === 'string' && raw.trim() !== '')
            return raw.trim();
    }
    return undefined;
}
/**
 * First finite number found under any of `keys`, searching nested objects
 * breadth-first. Used only where a gateway nests its figures at an
 * undocumented depth; a top-level read is always preferred.
 * @param value - value to search.
 * @param keys - candidate key spellings, in priority order.
 * @param depth - current recursion depth.
 * @returns the first readable number, or `undefined`.
 */
export function findNumber(value, keys, depth = 0) {
    if (typeof value !== 'object' || value === null || depth > 5)
        return undefined;
    const direct = pickNumber(value, keys);
    if (direct !== undefined)
        return direct;
    for (const child of Object.values(value)) {
        const nested = findNumber(child, keys, depth + 1);
        if (nested !== undefined)
            return nested;
    }
    return undefined;
}
/**
 * Confine a disclosed percentage to 0–100.
 *
 * Endpoints report overage figures above 100 and, after a refund or clock
 * skew, below 0. The panel draws a bar from this number, so it is clamped
 * once here rather than at each render.
 * @param value - the disclosed percentage.
 * @returns the clamped percentage, or `undefined` when unreadable.
 */
export function clampPercent(value) {
    const parsed = numberOf(value);
    return parsed === undefined ? undefined : Math.max(0, Math.min(100, parsed));
}
/**
 * Round to one decimal, the precision the panel displays.
 * @param value - the figure to round.
 * @returns the rounded figure.
 */
export function round1(value) {
    return Math.round(value * 10) / 10;
}
/**
 * The object under `key`, read from the body root or a `data` envelope.
 * @param body - parsed response body.
 * @param key - the property to read.
 * @returns the object, or `undefined`.
 */
export function objectUnder(body, key) {
    if (!isRecord(body))
        return undefined;
    if (isRecord(body[key]))
        return body[key];
    const data = body['data'];
    return isRecord(data) && isRecord(data[key]) ? data[key] : undefined;
}
/**
 * The array under `key`, read from the body root or a `data` envelope.
 * @param body - parsed response body.
 * @param key - the property to read.
 * @returns the array, or `undefined`.
 */
export function arrayUnder(body, key) {
    if (!isRecord(body))
        return undefined;
    const direct = body[key];
    if (Array.isArray(direct))
        return direct;
    const data = body['data'];
    if (!isRecord(data))
        return undefined;
    const nested = data[key];
    return Array.isArray(nested) ? nested : undefined;
}
/**
 * Interpret an epoch field that may arrive in seconds or milliseconds.
 *
 * The threshold is the only reliable discriminator: any second-precision
 * timestamp of this era is far below it, and any millisecond one far above.
 * @param raw - the disclosed epoch.
 * @returns epoch milliseconds, or `undefined` when unreadable.
 */
export function epochMsOf(raw) {
    const value = numberOf(raw);
    if (value === undefined)
        return undefined;
    const ms = value > 20_000_000_000 ? value : value * 1000;
    return Number.isNaN(new Date(ms).getTime()) ? undefined : ms;
}
/**
 * Read a reset instant as an ISO string, accepting ISO text or a numeric
 * epoch. An instant already in the past is dropped: a countdown to it shows
 * nothing.
 * @param raw - the disclosed instant.
 * @param now - current epoch milliseconds.
 * @returns the ISO instant, or `undefined`.
 */
export function upcomingIso(raw, now) {
    if (raw === null || raw === undefined || raw === '')
        return undefined;
    const ms = typeof raw === 'string' && Number.isNaN(Number(raw))
        ? new Date(raw).getTime()
        : epochMsOf(raw);
    if (ms === undefined || !Number.isFinite(ms) || now >= ms)
        return undefined;
    return new Date(ms).toISOString();
}
/**
 * A reset instant expressed as a remaining duration from now.
 * @param raw - remaining milliseconds.
 * @param now - current epoch milliseconds.
 * @returns the ISO instant, or `undefined`.
 */
export function resetFromDuration(raw, now) {
    const ms = numberOf(raw);
    if (ms === undefined || ms < 0)
        return undefined;
    const at = new Date(now + ms);
    return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
}
//# sourceMappingURL=parse.js.map