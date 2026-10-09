/**
 * The account-adapter contract.
 *
 * An adapter turns one configured provider route into a normalized
 * {@link QuotaAccountReading}. It owns its endpoints, its credential
 * reference, and its response grammar; it never owns presentation, and it
 * never invents a figure — an unreadable response raises
 * {@link QuotaRequestError} so the card states why.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/contract
 */
import { QuotaRequestError } from "../http.js";
import { isRecord, pickNumber, pickString } from "../parse.js";
/**
 * One usage row an endpoint reported about its own credential.
 *
 * A section that carries no count is dropped rather than reported as zero: a
 * gateway that discloses one table and omits another should not produce an
 * empty row for the table it omits.
 * @param kind - which table the row belongs to.
 * @param label - the row's own label, such as a date, a model, or a pool name.
 * @param section - the response section to read.
 * @returns the row, or `undefined` when the section discloses no figure.
 */
export function gatewayUsageRow(kind, label, section) {
    if (label === undefined || !isRecord(section))
        return undefined;
    const requests = pickNumber(section, ['requests', 'request_count', 'calls', 'total_calls']);
    const inputTokens = pickNumber(section, ['input_tokens']);
    const outputTokens = pickNumber(section, ['output_tokens']);
    const cacheReadTokens = pickNumber(section, ['cache_read_tokens']);
    const cacheWriteTokens = pickNumber(section, ['cache_creation_tokens', 'cache_write_tokens']);
    const totalTokens = pickNumber(section, ['total_tokens']);
    if (requests === undefined && totalTokens === undefined && inputTokens === undefined
        && outputTokens === undefined && cacheReadTokens === undefined && cacheWriteTokens === undefined) {
        return undefined;
    }
    const cost = pickNumber(section, ['actual_cost', 'cost', 'total_cost']);
    const currency = pickString(section, ['cost_currency', 'currency', 'unit']);
    return {
        kind,
        label,
        ...requests === undefined ? {} : { requests },
        ...inputTokens === undefined ? {} : { inputTokens },
        ...outputTokens === undefined ? {} : { outputTokens },
        ...cacheReadTokens === undefined ? {} : { cacheReadTokens },
        ...cacheWriteTokens === undefined ? {} : { cacheWriteTokens },
        ...totalTokens === undefined ? {} : { totalTokens },
        ...cost === undefined ? {} : { cost },
        ...currency === undefined ? {} : { currency },
    };
}
/**
 * Resolve the credential an adapter sends, or fail with a named reference.
 * @param context - the adapter context holding the route's own key.
 * @param reference - credential reference override; defaults to the route's.
 * @returns the credential value.
 * @throws {QuotaRequestError} `not-configured` when no credential resolves.
 */
export async function requireKey(context, reference = context.credentialRef) {
    if (reference !== undefined) {
        const resolved = await context.credential(reference);
        if (resolved !== undefined && resolved !== '')
            return resolved;
        throw new QuotaRequestError('not-configured', `credential ${reference} is not configured`);
    }
    if (context.apiKey !== undefined && context.apiKey !== '')
        return context.apiKey;
    throw new QuotaRequestError('not-configured', 'provider has no configured API key');
}
/**
 * Build request options that carry the provider's credential.
 * @param url - absolute endpoint.
 * @param apiKey - credential value.
 * @param context - the adapter context supplying the injected fetch and this
 * route's plaintext permission.
 * @returns the request options.
 */
export function bearer(url, apiKey, context) {
    return {
        url,
        apiKey,
        auth: 'bearer',
        ...context.allowPlaintext === true ? { allowPlaintext: true } : {},
        ...context.fetchImpl === undefined ? {} : { fetchImpl: context.fetchImpl },
    };
}
//# sourceMappingURL=contract.js.map