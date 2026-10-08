/**
 * The declarative adapter: a configuration-described account read for a
 * gateway no built-in adapter recognizes.
 *
 * The configuration names an endpoint and JSON Pointers to the figures. It is
 * data, not code — no expression is evaluated — so a custom monitor can reach
 * a new gateway without widening what this plugin can execute.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/declarative
 */
import { QuotaRequestError, requestJson } from "../http.js";
import { clampPercent, numberOf } from "../parse.js";
/**
 * Resolve one RFC 6901 JSON Pointer.
 *
 * @param document - the parsed response body.
 * @param pointer - the pointer, `""` for the whole document.
 * @returns the referenced value, or `undefined` when the path is absent.
 */
export function resolvePointer(document, pointer) {
    if (pointer === '')
        return document;
    if (!pointer.startsWith('/'))
        return undefined;
    let current = document;
    for (const raw of pointer.slice(1).split('/')) {
        const token = raw.replace(/~1/g, '/').replace(/~0/g, '~');
        if (Array.isArray(current)) {
            // A pointer into an array must be a literal index; `-` addresses the
            // append position, which no read can resolve.
            if (!/^\d+$/.test(token))
                return undefined;
            current = current[Number(token)];
            continue;
        }
        if (typeof current !== 'object' || current === null)
            return undefined;
        if (!Object.hasOwn(current, token))
            return undefined;
        current = current[token];
    }
    return current;
}
/** The absolute URL a declarative spec addresses. */
function specUrl(spec, context) {
    try {
        return new URL(spec.url).href;
    }
    catch {
        const base = context.usageBaseURL ?? context.baseURL;
        if (base === undefined || base === '') {
            throw new QuotaRequestError('not-configured', 'declarative monitor has no absolute URL or base URL');
        }
        try {
            return new URL(spec.url, `${base}/`).href;
        }
        catch {
            throw new QuotaRequestError('invalid-response', 'declarative monitor URL cannot be resolved');
        }
    }
}
/**
 * Build the declarative adapter for one configured spec.
 * @param spec - the configured endpoint and pointers.
 * @returns an adapter reading exactly that spec.
 */
export function declarativeAdapter(spec) {
    return {
        id: 'declarative',
        async read(context) {
            const key = context.credentialRef === undefined
                ? context.apiKey
                : await context.credential(context.credentialRef);
            const auth = spec.auth ?? 'bearer';
            if (auth !== 'none' && (key === undefined || key === '')) {
                throw new QuotaRequestError('not-configured', 'declarative monitor has no configured credential');
            }
            const body = await requestJson({
                url: specUrl(spec, context),
                auth,
                ...key === undefined ? {} : { apiKey: key },
                ...context.allowPlaintext === true ? { allowPlaintext: true } : {},
                ...context.fetchImpl === undefined ? {} : { fetchImpl: context.fetchImpl },
            });
            const read = (pointer) => pointer === undefined ? undefined : numberOf(resolvePointer(body, pointer));
            const remaining = read(spec.remainingPointer);
            const used = read(spec.usedPointer);
            const limit = read(spec.limitPointer);
            const now = context.now();
            const windows = [];
            for (const window of spec.windows ?? []) {
                const percentUsed = clampPercent(resolvePointer(body, window.percentUsedPointer));
                if (percentUsed === undefined)
                    continue;
                const resetRaw = window.resetAtPointer === undefined
                    ? undefined
                    : resolvePointer(body, window.resetAtPointer);
                const resetAt = typeof resetRaw === 'string' && !Number.isNaN(new Date(resetRaw).getTime())
                    && new Date(resetRaw).getTime() > now
                    ? new Date(resetRaw).toISOString()
                    : undefined;
                windows.push({ kind: window.kind, percentUsed, ...resetAt === undefined ? {} : { resetAt } });
            }
            if (remaining === undefined && limit === undefined && windows.length === 0) {
                throw new QuotaRequestError('invalid-response', 'declarative monitor pointers matched no figure');
            }
            return {
                ...remaining === undefined
                    ? limit === undefined ? {} : { remaining: Math.max(0, limit - (used ?? 0)) }
                    : { remaining },
                ...used === undefined ? {} : { used },
                ...limit === undefined ? {} : { limit },
                ...spec.currency === undefined ? {} : { currency: spec.currency },
                ...windows.length === 0 ? {} : { planWindows: Object.freeze(windows) },
            };
        },
    };
}
//# sourceMappingURL=declarative.js.map