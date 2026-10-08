/**
 * Display formatting shared by the panel's rows.
 *
 * These functions only format; they never decide what a figure means. An
 * absent number renders as an em dash rather than a zero, so a missing
 * reading is visibly distinct from a real zero.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/format
 */
import type { QuotaCostView } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/**
 * Compact token figure: `1.23M`, `4.5k`, or a plain integer.
 * @param value - the token count.
 * @returns the formatted figure.
 */
export declare function fmtTokens(value: number | undefined | null): string;
/**
 * A plain integer with grouping separators.
 * @param value - the count.
 * @returns the formatted figure.
 */
export declare function fmtNumber(value: number | undefined | null): string;
/**
 * A money or credit amount, with its unit when one was reported.
 * @param value - the amount.
 * @param currency - the unit label reported beside it.
 * @returns the formatted amount.
 */
export declare function fmtAmount(value: number | undefined | null, currency?: string): string;
/**
 * A wall-clock time of day, for an "updated at" line.
 * @param epochMs - the instant.
 * @returns the formatted time, or the placeholder at epoch zero.
 */
export declare function fmtTime(epochMs: number | undefined): string;
/**
 * A percentage with one decimal.
 * @param value - the percentage.
 * @returns the formatted percentage.
 */
export declare function fmtPercent(value: number | undefined): string;
/**
 * A derived spend figure with its unit.
 *
 * A partial amount is still shown: the calls that carry no price are reported
 * beside it, which says more than hiding the figure entirely.
 * @param cost - the derived figure, when the Host reported one.
 * @returns the formatted amount.
 */
export declare function fmtCost(cost: QuotaCostView | undefined): string;
/**
 * A date and time, for a session's last activity.
 * @param epochMs - the instant.
 * @returns the formatted stamp, or the placeholder at epoch zero.
 */
export declare function fmtDateTime(epochMs: number | undefined): string;
/**
 * The first characters of a provider name, for its avatar tile.
 * @param name - the provider's display name.
 * @returns one or two characters, or the placeholder for an empty name.
 */
export declare function initialsOf(name: string): string;
/**
 * The countdown line under a plan window.
 *
 * The remaining duration is recomputed at render rather than stored, because
 * the panel re-renders on every refresh and a stored countdown would drift.
 * @param t - the panel's namespace-bound translate.
 * @param resetAt - ISO instant the window resets.
 * @returns the line, or `undefined` when no reset was reported.
 */
export declare function resetLabel(t: QuotaTranslate, resetAt: string | undefined): string | undefined;
//# sourceMappingURL=format.d.ts.map