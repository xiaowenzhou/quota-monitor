/**
 * The declarative adapter: a configuration-described account read for a
 * gateway no built-in adapter recognizes.
 *
 * The configuration names an endpoint and JSON Pointers to the figures. It is
 * data, not code — no expression is evaluated — so a custom monitor can reach
 * a new gateway without widening what this plugin can execute.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/declarative
 */
import type { QuotaPlanWindowKind } from '../types.ts';
import type { QuotaAdapter } from './contract.ts';
/** One declarative window: its role plus the pointer to its used share. */
export interface QuotaDeclarativeWindow {
    /** Which allowance period this window reports, as the panel labels it. */
    kind: QuotaPlanWindowKind;
    /** JSON Pointer to the window's used share, 0–100. */
    percentUsedPointer: string;
    /** JSON Pointer to the window's reset instant. */
    resetAtPointer?: string;
}
/** A configuration-described account read. */
export interface QuotaDeclarativeSpec {
    /** Absolute endpoint URL, or a path resolved against the provider base URL. */
    url: string;
    /** How the credential is presented. */
    auth?: 'bearer' | 'raw' | 'none';
    /** JSON Pointer to the remaining balance. */
    remainingPointer?: string;
    /** JSON Pointer to the cumulative spend. */
    usedPointer?: string;
    /** JSON Pointer to the total allowance. */
    limitPointer?: string;
    /** Literal unit label for the figures above. */
    currency?: string;
    /** Windows to read, for a subscription-style gateway. */
    windows?: QuotaDeclarativeWindow[];
}
/**
 * Resolve one RFC 6901 JSON Pointer.
 *
 * @param document - the parsed response body.
 * @param pointer - the pointer, `""` for the whole document.
 * @returns the referenced value, or `undefined` when the path is absent.
 */
export declare function resolvePointer(document: unknown, pointer: string): unknown;
/**
 * Build the declarative adapter for one configured spec.
 * @param spec - the configured endpoint and pointers.
 * @returns an adapter reading exactly that spec.
 */
export declare function declarativeAdapter(spec: QuotaDeclarativeSpec): QuotaAdapter;
//# sourceMappingURL=declarative.d.ts.map