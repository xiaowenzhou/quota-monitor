/**
 * Plan-window vocabulary shared by the account card and the composer pill, so
 * one window kind carries one label wherever it is drawn.
 *
 * Nothing here computes a reading: the Host resolved the windows and their
 * severity, and these helpers only pick which of them a compact surface shows.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/windows
 */
import type { QuotaAccount, QuotaPlanWindow, QuotaPlanWindowKind, QuotaWarningLevel } from '../types.ts';
/** Dictionary key naming each plan window kind. */
export declare const WINDOW_KEYS: Readonly<Record<QuotaPlanWindowKind, 'window.session' | 'window.fiveHour' | 'window.daily' | 'window.weekly' | 'window.monthly' | 'window.billing' | 'window.quota'>>;
/**
 * The windows a compact surface shows: the most spent first.
 *
 * The order a reading carries is the endpoint's own; a pill that has room for
 * two of five windows should state the two closest to their ceiling, because
 * those are the ones that change what the reader does next.
 * @param account - the reading whose windows are ranked.
 * @param limit - how many windows to keep.
 * @returns the worst windows, most spent first.
 */
export declare function worstWindows(account: QuotaAccount, limit: number): readonly QuotaPlanWindow[];
/**
 * The severity a reading draws with.
 *
 * A Host-resolved `warning` wins, because the adapter knows its own scale; a
 * reading that carries none falls back to the spent share of its windows.
 * @param account - the reading to tone.
 * @returns the severity level.
 */
export declare function accountTone(account: QuotaAccount): QuotaWarningLevel;
/**
 * Whether a reading carries any figure worth a compact surface.
 * @param account - the reading to test.
 * @returns true when it states a window or a balance.
 */
export declare function hasFigure(account: QuotaAccount): boolean;
/**
 * The figure a selector chip states for one reading.
 *
 * A balance states what is left, which is the number that ranks keys against
 * each other. A plan states the spent share of its tightest window, because
 * that is the one that runs out first. A reading that could not be read, or
 * that carries no figure at all, states nothing and leaves its dot to say why.
 * @param account - the reading to summarize.
 * @returns the compact figure, or undefined when the reading carries none.
 */
export declare function chipFigure(account: QuotaAccount | undefined): string | undefined;
//# sourceMappingURL=windows.d.ts.map