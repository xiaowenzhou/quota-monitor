/**
 * Display formatting shared by the panel's rows.
 *
 * These functions only format; they never decide what a figure means. An
 * absent number renders as an em dash rather than a zero, so a missing
 * reading is visibly distinct from a real zero.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/format
 */
/** Placeholder for a figure the Host did not report. */
const ABSENT = '—';
/**
 * Compact token figure: `1.23M`, `4.5k`, or a plain integer.
 * @param value - the token count.
 * @returns the formatted figure.
 */
export function fmtTokens(value) {
    if (value === undefined || value === null)
        return ABSENT;
    if (Math.abs(value) >= 1e6)
        return `${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3)
        return `${(value / 1e3).toFixed(1)}k`;
    return String(Math.round(value));
}
/**
 * A plain integer with grouping separators.
 * @param value - the count.
 * @returns the formatted figure.
 */
export function fmtNumber(value) {
    if (value === undefined || value === null)
        return ABSENT;
    return Math.round(value).toLocaleString();
}
/**
 * A money or credit amount, with its unit when one was reported.
 * @param value - the amount.
 * @param currency - the unit label reported beside it.
 * @returns the formatted amount.
 */
export function fmtAmount(value, currency) {
    if (value === undefined || value === null)
        return ABSENT;
    const digits = Math.abs(value) >= 100 ? 2 : 4;
    const text = value.toFixed(digits).replace(/\.?0+$/, '');
    return currency === undefined ? text : `${text} ${currency}`;
}
/**
 * A wall-clock time of day, for an "updated at" line.
 * @param epochMs - the instant.
 * @returns the formatted time, or the placeholder at epoch zero.
 */
export function fmtTime(epochMs) {
    if (epochMs === undefined || epochMs <= 0)
        return ABSENT;
    return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
/**
 * A percentage with one decimal.
 * @param value - the percentage.
 * @returns the formatted percentage.
 */
export function fmtPercent(value) {
    return value === undefined ? ABSENT : `${value.toFixed(1)}%`;
}
/**
 * A derived spend figure with its unit.
 *
 * A partial amount is still shown: the calls that carry no price are reported
 * beside it, which says more than hiding the figure entirely.
 * @param cost - the derived figure, when the Host reported one.
 * @returns the formatted amount.
 */
export function fmtCost(cost) {
    if (cost === undefined)
        return ABSENT;
    return `${cost.amount.toFixed(cost.amount >= 100 ? 2 : 4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')} ${cost.currency}`;
}
/**
 * A date and time, for a session's last activity.
 * @param epochMs - the instant.
 * @returns the formatted stamp, or the placeholder at epoch zero.
 */
export function fmtDateTime(epochMs) {
    if (epochMs === undefined || epochMs <= 0)
        return ABSENT;
    const at = new Date(epochMs);
    return `${at.toLocaleDateString()} ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
/**
 * The first characters of a provider name, for its avatar tile.
 * @param name - the provider's display name.
 * @returns one or two characters, or the placeholder for an empty name.
 */
export function initialsOf(name) {
    const trimmed = name.trim();
    if (trimmed === '')
        return ABSENT;
    // A CJK name reads best as its first character alone; a latin one as the
    // initials of its first two words.
    if (/^[^\u0000-\u024f]/.test(trimmed))
        return trimmed.slice(0, 1);
    const words = trimmed.split(/[\s_\-.]+/).filter(word => word !== '');
    return words.length > 1
        ? `${words[0]?.slice(0, 1) ?? ''}${words[1]?.slice(0, 1) ?? ''}`
        : trimmed.slice(0, 2);
}
/**
 * The countdown line under a plan window.
 *
 * The remaining duration is recomputed at render rather than stored, because
 * the panel re-renders on every refresh and a stored countdown would drift.
 * @param t - the panel's namespace-bound translate.
 * @param resetAt - ISO instant the window resets.
 * @returns the line, or `undefined` when no reset was reported.
 */
export function resetLabel(t, resetAt) {
    if (resetAt === undefined)
        return undefined;
    const target = new Date(resetAt).getTime();
    if (Number.isNaN(target))
        return undefined;
    const remaining = target - Date.now();
    if (remaining <= 0)
        return t('reset.expired');
    const at = new Date(target).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const minutes = Math.floor(remaining / 60_000);
    const hours = Math.floor(minutes / 60);
    return hours > 0
        ? t('reset.hours', { at, hours: String(hours), minutes: String(minutes % 60) })
        : t('reset.minutes', { at, minutes: String(minutes) });
}
//# sourceMappingURL=format.js.map