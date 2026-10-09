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
import type { QuotaAccountStatus } from './types.ts';
/** Hard cap for one account endpoint round trip. */
export declare const REQUEST_TIMEOUT_MS = 15000;
/** Largest account response body accepted, in bytes. */
export declare const MAX_BODY_BYTES = 1048576;
/**
 * One endpoint failure, carrying the status the account card will show.
 * The message is a diagnosis written for the panel; it never embeds a
 * response body or a credential.
 */
export declare class QuotaRequestError extends Error {
    readonly status: QuotaAccountStatus;
    /**
     * @param status - the account status this failure maps to.
     * @param message - human-readable diagnosis shown on the card.
     */
    constructor(status: QuotaAccountStatus, message: string);
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
export declare function statusOf(status: number): QuotaAccountStatus;
/**
 * Whether a failure means "try the next candidate endpoint". Only a missing
 * route or a non-JSON reply qualifies: an auth or rate-limit failure is a real
 * answer from the right host and must not cause another host to be probed.
 * @param error - the failure to classify.
 * @returns true when an adapter may fall through to its next URL.
 */
export declare function isFallthrough(error: unknown): boolean;
/** Authorization styles the adapters use. */
export type QuotaAuthScheme = 'bearer' | 'raw' | 'none';
/** One account request. */
export interface QuotaRequestOptions {
    /** Absolute endpoint URL. */
    url: string;
    /** Credential value sent as the Authorization header; omitted for `none`. */
    apiKey?: string;
    /**
     * How the credential is presented. Z.ai's Coding Plan endpoints expect the
     * raw key, unlike its inference API.
     */
    auth?: QuotaAuthScheme;
    /** Extra non-credential headers an adapter needs. */
    headers?: Readonly<Record<string, string>>;
    /** Per-request timeout override. */
    timeoutMs?: number;
    /**
     * Whether a plaintext `http:` endpoint is permitted for this request even
     * though its host is not on this machine. Only an explicit
     * `monitors.<route>.allowPlaintextEndpoint` entry sets it; absent, the
     * credential travels over TLS or to loopback http only.
     */
    allowPlaintext?: boolean;
    /**
     * Exact hosts this request may address, as `host` or `host:port` lowercased.
     * Empty or absent leaves the request unfenced beyond the transport rule; a
     * named list is how a deployment keeps a copied configuration from carrying
     * its credential to a gateway it never named.
     */
    allowedHosts?: readonly string[];
    /** Injected fetch, so tests drive adapters without network access. */
    fetchImpl?: typeof fetch;
}
/**
 * GET one JSON document from an account endpoint.
 *
 * @param options - endpoint, credential, and transport controls.
 * @returns the parsed JSON value.
 * @throws {QuotaRequestError} on a rejected target, transport failure, HTTP error, oversized body, or invalid JSON.
 */
export declare function requestJson(options: QuotaRequestOptions): Promise<unknown>;
/**
 * Try each candidate URL until one answers, falling through only on a missing
 * route or a non-JSON reply.
 * @param urls - candidate endpoints in priority order.
 * @param build - request options for one candidate URL.
 * @returns the first parsed JSON answer.
 * @throws {QuotaRequestError} the last failure when no candidate answers.
 */
export declare function requestFirst(urls: readonly string[], build: (url: string) => QuotaRequestOptions): Promise<unknown>;
//# sourceMappingURL=http.d.ts.map