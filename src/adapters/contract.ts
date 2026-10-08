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

import { QuotaRequestError } from '../http.ts'
import type { QuotaRequestOptions } from '../http.ts'
import type { QuotaAdapterId } from '../identity.ts'
import type { QuotaAccountMode, QuotaBudgetPool, QuotaPlanWindow } from '../types.ts'

/** What one adapter read from an account endpoint. */
export interface QuotaAccountReading {
  /**
   * Which card frame this reading belongs in, when the answer itself decides.
   * A gateway that serves a wallet until a subscription is active reports its
   * mode per read; every other adapter leaves this absent and keeps the mode
   * its id declares.
   */
  mode?: QuotaAccountMode
  /** Remaining balance in {@link currency} units, for a balance account. */
  remaining?: number
  /** Cumulative spend, when disclosed. */
  used?: number
  /** Total allowance behind `remaining`, when disclosed. */
  limit?: number
  /** Unit label for the figures above. */
  currency?: string
  /** True when the endpoint reports an unmetered allowance. */
  unlimited?: boolean
  /** Plan label of a subscription account. */
  plan?: string
  /** Plan windows, for a subscription account. */
  planWindows?: readonly QuotaPlanWindow[]
  /** Budget pools reported beside the balance. */
  budgetPools?: readonly QuotaBudgetPool[]
}

/** The provider facts an adapter resolves its request from. */
export interface QuotaAdapterContext {
  /** Provider route key. */
  id: string
  /** The route's configured base URL, trailing slashes removed. */
  baseURL?: string
  /**
   * Resolve one credential by reference name.
   * @param reference - credential reference name.
   * @returns the value, or `undefined` when unset.
   */
  credential(reference: string): Promise<string | undefined>
  /** The provider's own inference credential, when the profile names one. */
  apiKey?: string
  /** Endpoint override from an explicit `monitors` entry. */
  usageBaseURL?: string
  /** Credential reference override from an explicit `monitors` entry. */
  credentialRef?: string
  /**
   * Whether this route's endpoint was explicitly allowed to be plaintext by a
   * `monitors` entry, for a gateway reached over `http:` at an address that is
   * not on this machine. Absent means the credential requires TLS.
   */
  allowPlaintext?: boolean
  /** Current epoch milliseconds, injected so window math is testable. */
  now(): number
  /** Injected fetch, so tests drive adapters without network access. */
  fetchImpl?: typeof fetch
}

/** One account adapter. */
export interface QuotaAdapter {
  readonly id: QuotaAdapterId
  /**
   * Credential reference names this adapter needs beyond the provider's own
   * inference key. Reported to the panel when the read cannot proceed.
   */
  readonly credentialRefs?: readonly string[]
  /**
   * Read the account.
   * @param context - the provider facts and injected dependencies.
   * @returns the normalized reading.
   * @throws {QuotaRequestError} when the endpoint cannot be read.
   */
  read(context: QuotaAdapterContext): Promise<QuotaAccountReading>
}

/**
 * Resolve the credential an adapter sends, or fail with a named reference.
 * @param context - the adapter context holding the route's own key.
 * @param reference - credential reference override; defaults to the route's.
 * @returns the credential value.
 * @throws {QuotaRequestError} `not-configured` when no credential resolves.
 */
export async function requireKey(
  context: QuotaAdapterContext,
  reference: string | undefined = context.credentialRef,
): Promise<string> {
  if (reference !== undefined) {
    const resolved = await context.credential(reference)
    if (resolved !== undefined && resolved !== '') return resolved
    throw new QuotaRequestError('not-configured', `credential ${reference} is not configured`)
  }
  if (context.apiKey !== undefined && context.apiKey !== '') return context.apiKey
  throw new QuotaRequestError('not-configured', 'provider has no configured API key')
}

/**
 * Build request options that carry the provider's credential.
 * @param url - absolute endpoint.
 * @param apiKey - credential value.
 * @param context - the adapter context supplying the injected fetch and this
 * route's plaintext permission.
 * @returns the request options.
 */
export function bearer(url: string, apiKey: string, context: QuotaAdapterContext): QuotaRequestOptions {
  return {
    url,
    apiKey,
    auth: 'bearer',
    ...context.allowPlaintext === true ? { allowPlaintext: true } : {},
    ...context.fetchImpl === undefined ? {} : { fetchImpl: context.fetchImpl },
  }
}
