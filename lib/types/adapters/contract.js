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