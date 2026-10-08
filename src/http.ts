/**
 * The account-endpoint HTTP layer: one guarded JSON GET plus the failure
 * classification every adapter shares.
 *
 * Requests run from the Host process with Node's own TLS stack. Three rules
 * keep a misconfigured monitor from becoming an exfiltration path: a
 * credential travels only to an absolute `https:` URL (loopback `http:` is
 * allowed for a self-hosted gateway, and one route may name a plaintext
 * endpoint explicitly through `allowPlaintextEndpoint`), redirects are never
 * followed because a redirect would carry the `Authorization` header to an
 * unreviewed host, and the response body is capped so a hostile endpoint
 * cannot exhaust memory.
 * @module @deepseek-ai/dsh-extension-quota-monitor/http
 */

import { isPrivateHostname } from './identity.ts'
import type { QuotaAccountStatus } from './types.ts'

/** Hard cap for one account endpoint round trip. */
export const REQUEST_TIMEOUT_MS = 15_000

/** Largest account response body accepted, in bytes. */
export const MAX_BODY_BYTES = 1_048_576

/**
 * One endpoint failure, carrying the status the account card will show.
 * The message is a diagnosis written for the panel; it never embeds a
 * response body or a credential.
 */
export class QuotaRequestError extends Error {
  /**
   * @param status - the account status this failure maps to.
   * @param message - human-readable diagnosis shown on the card.
   */
  constructor(readonly status: QuotaAccountStatus, message: string) {
    super(message)
    this.name = 'QuotaRequestError'
  }
}

/**
 * Map one HTTP status to an account status.
 *
 * 404 and 405 mean this deployment does not serve the endpoint, which is what
 * lets an adapter chain fall through to its next candidate URL rather than
 * reporting the account as broken.
 * @param status - HTTP response status code.
 * @returns the account status it maps to.
 */
export function statusOf(status: number): QuotaAccountStatus {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 429) return 'rate-limited'
  if (status === 404 || status === 405) return 'unsupported'
  return status >= 500 ? 'unavailable' : 'invalid-response'
}

/**
 * Whether a failure means "try the next candidate endpoint". Only a missing
 * route or a non-JSON reply qualifies: an auth or rate-limit failure is a real
 * answer from the right host and must not cause another host to be probed.
 * @param error - the failure to classify.
 * @returns true when an adapter may fall through to its next URL.
 */
export function isFallthrough(error: unknown): boolean {
  return error instanceof QuotaRequestError
    && (error.status === 'unsupported' || error.status === 'invalid-response')
}

/**
 * Reject a URL that must not receive a credential.
 * @param url - the resolved endpoint.
 * @param allowPlaintext - whether this route's deployment named a plaintext
 * endpoint explicitly (see {@link QuotaRequestOptions.allowPlaintext}).
 */
function assertCredentialTarget(url: URL, allowPlaintext: boolean): void {
  if (url.username !== '' || url.password !== '') {
    throw new QuotaRequestError('blocked', 'endpoint URL must not embed credentials')
  }
  if (url.protocol === 'https:') return
  // A self-hosted gateway on this machine is the one case where plaintext is
  // acceptable without being asked for, because the request never leaves the host.
  if (url.protocol === 'http:' && isPrivateHostname(url.hostname.toLowerCase())) return
  // A routed deployment may state one route's plaintext endpoint on purpose: an
  // intranet gateway addressed by a public-looking address is the case this
  // covers. The operator writes that opt-in per route, so no other route's
  // credential can be sent in the clear by the same mistake.
  if (url.protocol === 'http:' && allowPlaintext) return
  throw new QuotaRequestError(
    'blocked',
    'endpoint must use https (or loopback http); set monitors.<route>.allowPlaintextEndpoint to read a plaintext gateway',
  )
}

/** Read a capped response body as text. */
async function readCappedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new QuotaRequestError('invalid-response', 'account response exceeds the size limit')
  }
  const text = await response.text()
  // A chunked reply declares no length, so the decoded text is the only place
  // the cap can actually be enforced.
  if (text.length > MAX_BODY_BYTES) {
    throw new QuotaRequestError('invalid-response', 'account response exceeds the size limit')
  }
  return text
}

/** Authorization styles the adapters use. */
export type QuotaAuthScheme = 'bearer' | 'raw' | 'none'

/** One account request. */
export interface QuotaRequestOptions {
  /** Absolute endpoint URL. */
  url: string
  /** Credential value sent as the Authorization header; omitted for `none`. */
  apiKey?: string
  /**
   * How the credential is presented. Z.ai's Coding Plan endpoints expect the
   * raw key, unlike its inference API.
   */
  auth?: QuotaAuthScheme
  /** Extra non-credential headers an adapter needs. */
  headers?: Readonly<Record<string, string>>
  /** Per-request timeout override. */
  timeoutMs?: number
  /**
   * Whether a plaintext `http:` endpoint is permitted for this request even
   * though its host is not on this machine. Only an explicit
   * `monitors.<route>.allowPlaintextEndpoint` entry sets it; absent, the
   * credential travels over TLS or to loopback http only.
   */
  allowPlaintext?: boolean
  /** Injected fetch, so tests drive adapters without network access. */
  fetchImpl?: typeof fetch
}

/**
 * GET one JSON document from an account endpoint.
 *
 * @param options - endpoint, credential, and transport controls.
 * @returns the parsed JSON value.
 * @throws {QuotaRequestError} on a rejected target, transport failure, HTTP error, oversized body, or invalid JSON.
 */
export async function requestJson(options: QuotaRequestOptions): Promise<unknown> {
  const { url, apiKey, auth = 'bearer', headers = {}, timeoutMs = REQUEST_TIMEOUT_MS, allowPlaintext = false } = options
  let target: URL
  try {
    target = new URL(url)
  } catch {
    throw new QuotaRequestError('invalid-response', 'endpoint URL is not absolute')
  }
  assertCredentialTarget(target, allowPlaintext)

  const auths: Record<string, string> = {}
  if (auth !== 'none' && apiKey !== undefined && apiKey !== '') {
    auths['authorization'] = auth === 'bearer' ? `Bearer ${apiKey}` : apiKey
  }

  const call = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await call(target.href, {
      method: 'GET',
      // Never follow a redirect: it would resend the Authorization header to
      // a host this configuration never approved.
      redirect: 'manual',
      headers: { accept: 'application/json', ...headers, ...auths },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (cause) {
    const timedOut = cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError')
    throw new QuotaRequestError('unavailable', timedOut ? 'account endpoint timed out' : 'account endpoint unreachable')
  }

  if (response.status >= 300 && response.status < 400) {
    throw new QuotaRequestError('invalid-response', 'account endpoint redirected')
  }
  if (!response.ok) {
    throw new QuotaRequestError(statusOf(response.status), `account endpoint returned HTTP ${response.status}`)
  }

  const text = await readCappedText(response)
  try {
    return JSON.parse(text)
  } catch {
    throw new QuotaRequestError('invalid-response', 'account endpoint returned invalid JSON')
  }
}

/**
 * Try each candidate URL until one answers, falling through only on a missing
 * route or a non-JSON reply.
 * @param urls - candidate endpoints in priority order.
 * @param build - request options for one candidate URL.
 * @returns the first parsed JSON answer.
 * @throws {QuotaRequestError} the last failure when no candidate answers.
 */
export async function requestFirst(
  urls: readonly string[],
  build: (url: string) => QuotaRequestOptions,
): Promise<unknown> {
  let last: unknown = new QuotaRequestError('unsupported', 'no candidate endpoint was configured')
  for (const url of urls) {
    try {
      return await requestJson(build(url))
    } catch (error) {
      if (!isFallthrough(error)) throw error
      last = error
    }
  }
  throw last
}
