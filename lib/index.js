import { createRequire } from "node:module";
import { Service } from "@deepseek-ai/cordis";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { brandString } from "@deepseek-ai/dsh-brand";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import zs from "@deepseek-ai/schemastery";
import { isAbsolute } from "node:path";
const keyDomainSpec = defineDomain({
	name: "quota_keys",
	version: 1,
	invalidRecords: "backup-and-skip",
	layout: "per-record",
	tables: { providers: domainTable(z.object({
		refs: z.array(z.string()),
		labels: z.record(z.string(), z.string()),
		activeRef: z.string().optional(),
		selectedRef: z.string().optional(),
		mode: z.enum([
			"manual",
			"quota",
			"jev"
		]),
		jevRef: z.string().optional()
	})) }
});
//#endregion
//#region lib/types/parse.js
/**
* Response-reading helpers shared by every adapter: numeric coercion, key
* probing, percent clamping, and epoch normalization.
*
* Every function here refuses rather than guesses. A figure that cannot be
* read returns `undefined`, which the adapters turn into an explicit account
* status — a balance is never defaulted to zero, because "zero remaining" and
* "could not read" mean opposite things to someone deciding whether to keep
* working.
* @module @deepseek-ai/dsh-extension-quota-monitor/parse
*/
/**
* Whether a value is a plain (non-array) object.
* @param value - candidate value.
* @returns true when the value can be indexed by key.
*/
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Coerce a finite number from a number or numeric string.
* @param value - candidate value.
* @returns the number, or `undefined` when it is not finite.
*/
function numberOf(value) {
	if (typeof value === "number") return Number.isFinite(value) ? value : void 0;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : void 0;
	}
}
/**
* First finite number found under any of `keys`, on `value` itself.
* @param value - object to read.
* @param keys - candidate key spellings, in priority order.
* @returns the first readable number, or `undefined`.
*/
function pickNumber(value, keys) {
	if (!isRecord$1(value)) return void 0;
	for (const key of keys) {
		const found = numberOf(value[key]);
		if (found !== void 0) return found;
	}
}
/**
* First non-empty string found under any of `keys`.
* @param value - object to read.
* @param keys - candidate key spellings, in priority order.
* @returns the trimmed string, or `undefined`.
*/
function pickString(value, keys) {
	if (!isRecord$1(value)) return void 0;
	for (const key of keys) {
		const raw = value[key];
		if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
	}
}
/**
* First finite number found under any of `keys`, searching nested objects
* breadth-first. Used only where a gateway nests its figures at an
* undocumented depth; a top-level read is always preferred.
* @param value - value to search.
* @param keys - candidate key spellings, in priority order.
* @param depth - current recursion depth.
* @returns the first readable number, or `undefined`.
*/
function findNumber(value, keys, depth = 0) {
	if (typeof value !== "object" || value === null || depth > 5) return void 0;
	const direct = pickNumber(value, keys);
	if (direct !== void 0) return direct;
	for (const child of Object.values(value)) {
		const nested = findNumber(child, keys, depth + 1);
		if (nested !== void 0) return nested;
	}
}
/**
* Confine a disclosed percentage to 0–100.
*
* Endpoints report overage figures above 100 and, after a refund or clock
* skew, below 0. The panel draws a bar from this number, so it is clamped
* once here rather than at each render.
* @param value - the disclosed percentage.
* @returns the clamped percentage, or `undefined` when unreadable.
*/
function clampPercent(value) {
	const parsed = numberOf(value);
	return parsed === void 0 ? void 0 : Math.max(0, Math.min(100, parsed));
}
/**
* Round to one decimal, the precision the panel displays.
* @param value - the figure to round.
* @returns the rounded figure.
*/
function round1(value) {
	return Math.round(value * 10) / 10;
}
/**
* The object under `key`, read from the body root or a `data` envelope.
* @param body - parsed response body.
* @param key - the property to read.
* @returns the object, or `undefined`.
*/
function objectUnder(body, key) {
	if (!isRecord$1(body)) return void 0;
	if (isRecord$1(body[key])) return body[key];
	const data = body["data"];
	return isRecord$1(data) && isRecord$1(data[key]) ? data[key] : void 0;
}
/**
* The array under `key`, read from the body root or a `data` envelope.
* @param body - parsed response body.
* @param key - the property to read.
* @returns the array, or `undefined`.
*/
function arrayUnder(body, key) {
	if (!isRecord$1(body)) return void 0;
	const direct = body[key];
	if (Array.isArray(direct)) return direct;
	const data = body["data"];
	if (!isRecord$1(data)) return void 0;
	const nested = data[key];
	return Array.isArray(nested) ? nested : void 0;
}
/**
* Interpret an epoch field that may arrive in seconds or milliseconds.
*
* The threshold is the only reliable discriminator: any second-precision
* timestamp of this era is far below it, and any millisecond one far above.
* @param raw - the disclosed epoch.
* @returns epoch milliseconds, or `undefined` when unreadable.
*/
function epochMsOf(raw) {
	const value = numberOf(raw);
	if (value === void 0) return void 0;
	const ms = value > 2e10 ? value : value * 1e3;
	return Number.isNaN(new Date(ms).getTime()) ? void 0 : ms;
}
/**
* Read a reset instant as an ISO string, accepting ISO text or a numeric
* epoch. An instant already in the past is dropped: a countdown to it shows
* nothing.
* @param raw - the disclosed instant.
* @param now - current epoch milliseconds.
* @returns the ISO instant, or `undefined`.
*/
function upcomingIso(raw, now) {
	if (raw === null || raw === void 0 || raw === "") return void 0;
	const ms = typeof raw === "string" && Number.isNaN(Number(raw)) ? new Date(raw).getTime() : epochMsOf(raw);
	if (ms === void 0 || !Number.isFinite(ms) || now >= ms) return void 0;
	return new Date(ms).toISOString();
}
/**
* A reset instant expressed as a remaining duration from now.
* @param raw - remaining milliseconds.
* @param now - current epoch milliseconds.
* @returns the ISO instant, or `undefined`.
*/
function resetFromDuration(raw, now) {
	const ms = numberOf(raw);
	if (ms === void 0 || ms < 0) return void 0;
	const at = new Date(now + ms);
	return Number.isNaN(at.getTime()) ? void 0 : at.toISOString();
}
//#endregion
//#region lib/types/routing.js
/** Jev receives anonymous quota/health metadata only, never prompts or credentials. */
/** An invalid, low-confidence or failed decision always leaves the local choice authoritative. */
async function chooseWithJev(candidates, key, config, fetchImpl = fetch) {
	if (candidates.length < 2) return candidates[0]?.ref;
	const choices = Object.fromEntries(candidates.map((item, i) => [`key_${i}`, {
		headroom: item.headroom,
		...item.resetAt === void 0 ? {} : { resetAt: item.resetAt }
	}]));
	try {
		const response = await fetchImpl("https://openrouter.ai/api/alpha/decisions", {
			method: "POST",
			redirect: "error",
			signal: AbortSignal.timeout(config.jevTimeoutMs),
			headers: {
				authorization: `Bearer ${key}`,
				"content-type": "application/json"
			},
			body: JSON.stringify({
				model: config.jevModel,
				state: { candidates: choices },
				questions: { route: {
					type: "choice",
					instructions: "Choose a healthy key with the most available quota. Consider earlier quota resets when headroom is similar.",
					criteria: Object.fromEntries(Object.keys(choices).map((id) => [id, `Select candidate ${id} from state.candidates`]))
				} }
			})
		});
		if (!response.ok) return void 0;
		const body = await response.json();
		if (!isRecord$1(body) || !isRecord$1(body.answers) || !isRecord$1(body.answers.route)) return void 0;
		const answer = body.answers.route;
		if (typeof answer.confidence !== "number" || !Number.isFinite(answer.confidence) || answer.confidence < config.jevMinConfidence || answer.confidence > 1) return void 0;
		return candidates[Object.keys(choices).indexOf(String(answer.choice))]?.ref;
	} catch {
		return;
	}
}
//#endregion
//#region lib/types/identity.js
/**
* Provider identity policy: which account adapter serves one configured
* provider route.
*
* Resolution follows a strict precedence — an explicit `monitors` entry, then
* a canonical route id, then a canonical base-URL hostname, then unknown. A
* route that resolves to no adapter is never probed with a credential: the
* service may ask the route's own public settings document what it is, and only
* a matched fingerprint earns a keyed read.
*
* Display names never participate: they are presentation, and two deployments
* routinely label the same upstream differently.
* @module @deepseek-ai/dsh-extension-quota-monitor/identity
*/
/**
* Which mode each adapter reports in, so the panel picks its card frame before
* the first read.
*
* `sub2api` and `sub2api-auth` are listed as `balance` because that is the
* frame their wallet answer needs; either may return
* {@link QuotaAccountReading.mode} `subscription` when the gateway answers with
* plan windows instead, and that answer wins.
*/
const ADAPTER_MODES = Object.freeze({
	"deepseek-balance": "balance",
	"openrouter-balance": "balance",
	"moonshot-balance": "balance",
	"zai-balance": "balance",
	"orcarouter-balance": "balance",
	"new-api": "balance",
	"sub2api": "balance",
	"sub2api-auth": "balance",
	"agent-router": "balance",
	"stepcode": "balance",
	"general": "balance",
	"command-code": "subscription",
	"opencode-go": "subscription",
	"zai-token-plan": "subscription",
	"kimi-token-plan": "subscription",
	"minimax-token-plan": "subscription",
	"cline-plan": "subscription",
	"ollama": "subscription",
	"declarative": "balance"
});
/**
* Canonical route ids. A deployment that renames its route falls through to
* the hostname rules below, and an explicit monitor overrides both.
*/
const CANONICAL_ROUTES = Object.freeze({
	"deepseek": "deepseek-balance",
	"deepseek-official": "deepseek-balance",
	"openrouter": "openrouter-balance",
	"orcarouter": "orcarouter-balance",
	"moonshot": "moonshot-balance",
	"moonshotai": "moonshot-balance",
	"moonshotai-cn": "moonshot-balance",
	"kimi": "moonshot-balance",
	"kimi-coding": "kimi-token-plan",
	"kimi-for-coding": "kimi-token-plan",
	"zai": "zai-token-plan",
	"zai-coding": "zai-token-plan",
	"zai-coding-cn": "zai-token-plan",
	"glm": "zai-balance",
	"bigmodel": "zai-balance",
	"command-code": "command-code",
	"commandcode": "command-code",
	"command": "command-code",
	"command-goat": "command-code",
	"opencode": "opencode-go",
	"opencode-zen": "opencode-go",
	"opencode-go": "opencode-go",
	"cline-pass": "cline-plan",
	"minimax": "minimax-token-plan",
	"minimaxi": "minimax-token-plan",
	"minimax-cn": "minimax-token-plan",
	"minimax-coding": "minimax-token-plan",
	"cline": "cline-plan",
	"agent-router": "agent-router",
	"agentrouter": "agent-router",
	"stepcode": "stepcode",
	"passion": "sub2api"
});
/** Exact host or any subdomain of it. */
function domain(suffix) {
	return (hostname) => hostname === suffix || hostname.endsWith(`.${suffix}`);
}
/**
* Hostname rules, evaluated in order. These resolve a route whose id a
* deployment renamed but whose upstream is still recognizable.
*/
const HOST_RULES = Object.freeze([
	{
		adapter: "deepseek-balance",
		matches: domain("deepseek.com")
	},
	{
		adapter: "openrouter-balance",
		matches: domain("openrouter.ai")
	},
	{
		adapter: "orcarouter-balance",
		matches: domain("orcarouter.ai")
	},
	{
		adapter: "moonshot-balance",
		matches: domain("moonshot.cn")
	},
	{
		adapter: "moonshot-balance",
		matches: domain("moonshot.ai")
	},
	{
		adapter: "kimi-token-plan",
		matches: domain("kimi.com")
	},
	{
		adapter: "zai-token-plan",
		matches: domain("z.ai")
	},
	{
		adapter: "zai-balance",
		matches: domain("bigmodel.cn")
	},
	{
		adapter: "minimax-token-plan",
		matches: domain("minimax.io")
	},
	{
		adapter: "minimax-token-plan",
		matches: domain("minimaxi.com")
	},
	{
		adapter: "cline-plan",
		matches: domain("cline.bot")
	},
	{
		adapter: "agent-router",
		matches: domain("agentrouter.org")
	},
	{
		adapter: "agent-router",
		matches: (hostname) => /(^|\.)agentrouter\./.test(hostname)
	},
	{
		adapter: "stepcode",
		matches: domain("air-outer.com")
	},
	{
		adapter: "sub2api",
		matches: domain("passionapi.com")
	},
	{
		adapter: "command-code",
		matches: domain("commandcode.ai")
	},
	{
		adapter: "opencode-go",
		matches: domain("opencode.ai")
	},
	{
		adapter: "ollama",
		matches: domain("ollama.com")
	}
]);
/**
* Hostnames that name this machine or a private network. Ollama is the case
* that forces the check: a local `localhost:11434` daemon shares the cloud
* route id but has no subscription, so treating it as a quota account would
* invent a window that does not exist.
*/
const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;
/**
* Whether a hostname names this machine or a private network.
* @param hostname - lowercased hostname to classify.
* @returns true when the host is loopback, link-local, or RFC 1918.
*/
function isPrivateHostname(hostname) {
	return PRIVATE_HOST.test(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal");
}
/** The lowercased hostname of a configured base URL, or undefined when it is not a URL. */
function hostnameOf(baseURL) {
	if (baseURL === void 0 || baseURL === "") return void 0;
	try {
		return new URL(baseURL).hostname.toLowerCase().replace(/\.$/, "");
	} catch {
		return;
	}
}
/**
* Resolve one configured provider route to its account adapter.
*
* @param id - provider route key.
* @param baseURL - the route's configured base URL, when it has one.
* @param explicitAdapter - adapter named by a `monitors` entry for this route.
* @returns the resolved identity; `adapter` is null when nothing recognizes the route.
*/
function resolveProviderIdentity(id, baseURL, explicitAdapter) {
	if (explicitAdapter !== void 0) return {
		id,
		adapter: explicitAdapter,
		mode: ADAPTER_MODES[explicitAdapter],
		confidence: "explicit"
	};
	const hostname = hostnameOf(baseURL);
	const canonical = CANONICAL_ROUTES[id];
	if (canonical !== void 0) {
		if (hostname !== void 0 && isPrivateHostname(hostname)) return {
			id,
			adapter: null,
			mode: "unsupported",
			confidence: "unknown"
		};
		return {
			id,
			adapter: canonical,
			mode: ADAPTER_MODES[canonical],
			confidence: "canonical-id"
		};
	}
	if (hostname !== void 0 && !isPrivateHostname(hostname)) for (const rule of HOST_RULES) {
		if (!rule.matches(hostname)) continue;
		return {
			id,
			adapter: rule.adapter,
			mode: ADAPTER_MODES[rule.adapter],
			confidence: "canonical-host"
		};
	}
	return {
		id,
		adapter: null,
		mode: "unsupported",
		confidence: "unknown"
	};
}
//#endregion
//#region lib/types/http.js
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
/** Hard cap for one account endpoint round trip. */
const REQUEST_TIMEOUT_MS = 15e3;
/**
* One endpoint failure, carrying the status the account card will show.
* The message is a diagnosis written for the panel; it never embeds a
* response body or a credential.
*/
var QuotaRequestError = class extends Error {
	status;
	/**
	* @param status - the account status this failure maps to.
	* @param message - human-readable diagnosis shown on the card.
	*/
	constructor(status, message) {
		super(message);
		this.status = status;
		this.name = "QuotaRequestError";
	}
};
/**
* Map one HTTP status to an account status.
*
* 404 and 405 mean this deployment does not serve the endpoint, which is what
* lets an adapter chain fall through to its next candidate URL rather than
* reporting the account as broken.
* @param status - HTTP response status code.
* @returns the account status it maps to.
*/
function statusOf(status) {
	if (status === 401 || status === 403) return "unauthorized";
	if (status === 429) return "rate-limited";
	if (status === 404 || status === 405) return "unsupported";
	return status >= 500 ? "unavailable" : "invalid-response";
}
/**
* Whether a failure means "try the next candidate endpoint". Only a missing
* route or a non-JSON reply qualifies: an auth or rate-limit failure is a real
* answer from the right host and must not cause another host to be probed.
* @param error - the failure to classify.
* @returns true when an adapter may fall through to its next URL.
*/
function isFallthrough(error) {
	return error instanceof QuotaRequestError && (error.status === "unsupported" || error.status === "invalid-response");
}
/**
* Reject a URL that must not receive a credential.
* @param url - the resolved endpoint.
* @param allowPlaintext - whether this route's deployment named a plaintext
* endpoint explicitly (see {@link QuotaRequestOptions.allowPlaintext}).
* @param allowedHosts - exact hosts this route may address, empty for no fence.
*/
function assertCredentialTarget(url, allowPlaintext, allowedHosts) {
	if (url.username !== "" || url.password !== "") throw new QuotaRequestError("blocked", "endpoint URL must not embed credentials");
	if (allowedHosts.length > 0 && !allowedHosts.includes(url.host.toLowerCase())) throw new QuotaRequestError("blocked", `endpoint host ${url.host.toLowerCase()} is not among this route's monitors.allowedHosts`);
	if (url.protocol === "https:") return;
	if (url.protocol === "http:" && isPrivateHostname(url.hostname.toLowerCase())) return;
	if (url.protocol === "http:" && allowPlaintext) return;
	throw new QuotaRequestError("blocked", "endpoint must use https (or loopback http); set monitors.<route>.allowPlaintextEndpoint to read a plaintext gateway");
}
/** Read a capped response body as text. */
async function readCappedText(response) {
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > 1048576) throw new QuotaRequestError("invalid-response", "account response exceeds the size limit");
	const text = await response.text();
	if (text.length > 1048576) throw new QuotaRequestError("invalid-response", "account response exceeds the size limit");
	return text;
}
/**
* GET one JSON document from an account endpoint.
*
* @param options - endpoint, credential, and transport controls.
* @returns the parsed JSON value.
* @throws {QuotaRequestError} on a rejected target, transport failure, HTTP error, oversized body, or invalid JSON.
*/
async function requestJson(options) {
	const { url, apiKey, auth = "bearer", headers = {}, timeoutMs = REQUEST_TIMEOUT_MS, allowPlaintext = false, allowedHosts = [] } = options;
	let target;
	try {
		target = new URL(url);
	} catch {
		throw new QuotaRequestError("invalid-response", "endpoint URL is not absolute");
	}
	assertCredentialTarget(target, allowPlaintext, allowedHosts);
	const auths = {};
	if (auth !== "none" && apiKey !== void 0 && apiKey !== "") auths["authorization"] = auth === "bearer" ? `Bearer ${apiKey}` : apiKey;
	const call = options.fetchImpl ?? fetch;
	let response;
	try {
		response = await call(target.href, {
			method: "GET",
			redirect: "manual",
			headers: {
				accept: "application/json",
				...headers,
				...auths
			},
			signal: AbortSignal.timeout(timeoutMs)
		});
	} catch (cause) {
		throw new QuotaRequestError("unavailable", cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError") ? "account endpoint timed out" : "account endpoint unreachable");
	}
	if (response.status >= 300 && response.status < 400) throw new QuotaRequestError("invalid-response", "account endpoint redirected");
	if (!response.ok) throw new QuotaRequestError(statusOf(response.status), `account endpoint returned HTTP ${response.status}`);
	const text = await readCappedText(response);
	try {
		return JSON.parse(text);
	} catch {
		throw new QuotaRequestError("invalid-response", "account endpoint returned invalid JSON");
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
async function requestFirst(urls, build) {
	let last = new QuotaRequestError("unsupported", "no candidate endpoint was configured");
	for (const url of urls) try {
		return await requestJson(build(url));
	} catch (error) {
		if (!isFallthrough(error)) throw error;
		last = error;
	}
	throw last;
}
//#endregion
//#region lib/types/adapters/contract.js
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
function gatewayUsageRow(kind, label, section) {
	if (label === void 0 || !isRecord$1(section)) return void 0;
	const requests = pickNumber(section, [
		"requests",
		"request_count",
		"calls",
		"total_calls"
	]);
	const inputTokens = pickNumber(section, ["input_tokens"]);
	const outputTokens = pickNumber(section, ["output_tokens"]);
	const cacheReadTokens = pickNumber(section, ["cache_read_tokens"]);
	const cacheWriteTokens = pickNumber(section, ["cache_creation_tokens", "cache_write_tokens"]);
	const totalTokens = pickNumber(section, ["total_tokens"]);
	if (requests === void 0 && totalTokens === void 0 && inputTokens === void 0 && outputTokens === void 0 && cacheReadTokens === void 0 && cacheWriteTokens === void 0) return;
	const cost = pickNumber(section, [
		"actual_cost",
		"cost",
		"total_cost"
	]);
	const currency = pickString(section, [
		"cost_currency",
		"currency",
		"unit"
	]);
	return {
		kind,
		label,
		...requests === void 0 ? {} : { requests },
		...inputTokens === void 0 ? {} : { inputTokens },
		...outputTokens === void 0 ? {} : { outputTokens },
		...cacheReadTokens === void 0 ? {} : { cacheReadTokens },
		...cacheWriteTokens === void 0 ? {} : { cacheWriteTokens },
		...totalTokens === void 0 ? {} : { totalTokens },
		...cost === void 0 ? {} : { cost },
		...currency === void 0 ? {} : { currency }
	};
}
/**
* Resolve the credential an adapter sends, or fail with a named reference.
* @param context - the adapter context holding the route's own key.
* @param reference - credential reference override; defaults to the route's.
* @returns the credential value.
* @throws {QuotaRequestError} `not-configured` when no credential resolves.
*/
async function requireKey(context, reference = context.credentialRef) {
	if (reference !== void 0) {
		const resolved = await context.credential(reference);
		if (resolved !== void 0 && resolved !== "") return resolved;
		throw new QuotaRequestError("not-configured", `credential ${reference} is not configured`);
	}
	if (context.apiKey !== void 0 && context.apiKey !== "") return context.apiKey;
	throw new QuotaRequestError("not-configured", "provider has no configured API key");
}
/**
* Build request options that carry the provider's credential.
* @param url - absolute endpoint.
* @param apiKey - credential value.
* @param context - the adapter context supplying the injected fetch, this
* route's plaintext permission, and its host fence.
* @returns the request options.
*/
function bearer(url, apiKey, context) {
	return {
		url,
		apiKey,
		auth: "bearer",
		...context.allowPlaintext === true ? { allowPlaintext: true } : {},
		...context.allowedHosts === void 0 ? {} : { allowedHosts: context.allowedHosts },
		...context.fetchImpl === void 0 ? {} : { fetchImpl: context.fetchImpl }
	};
}
//#endregion
//#region lib/types/adapters/sub2api.js
/**
* Sub2API-family adapters: the published `/v1/usage` protocol, the panel
* balance readable with a provider's own inference key, and the
* credential-free fingerprint that recognizes such a panel.
*
* One gateway family serves three different answers under one protocol — a
* wallet, an aggregate quota, or a subscription's per-period ceilings — so the
* reading declares its own mode instead of the adapter id fixing it.
* @module @deepseek-ai/dsh-extension-quota-monitor/adapters/sub2api
*/
/** Rate-limit window ids the protocol publishes, mapped to the rows the panel labels. */
const WINDOW_KINDS = Object.freeze({
	"5h": "five-hour",
	"1d": "daily",
	"7d": "weekly",
	"30d": "monthly"
});
/**
* Ceiling on the gateway-reported usage rows carried for one account.
*
* A panel lists a handful of them; the cap exists so that a gateway answering
* with an unbounded ledger cannot grow the account payload without limit.
*/
const MAX_USAGE_ROWS = 90;
/** Calendar periods a subscription answer meters, in ascending order. */
const SUBSCRIPTION_PERIODS = Object.freeze([
	Object.freeze(["daily", "daily"]),
	Object.freeze(["weekly", "weekly"]),
	Object.freeze(["monthly", "monthly"])
]);
/** Path serving the fingerprint a real Sub2API panel publishes without a credential. */
const FINGERPRINT_PATH = "/api/v1/settings/public";
/**
* One window from an amount-metered section.
*
* A section without a positive limit is dropped: a bar drawn against no
* ceiling would state a used share the gateway never disclosed.
*/
function amountWindow(kind, section, resetAt, usedKeys = [
	"used",
	"used_usd",
	"usage"
], limitKeys = [
	"limit",
	"limit_usd",
	"total"
]) {
	const limit = pickNumber(section, limitKeys);
	if (limit === void 0 || limit <= 0) return void 0;
	const remaining = pickNumber(section, [
		"remaining",
		"remaining_usd",
		"left"
	]);
	const used = pickNumber(section, usedKeys) ?? (remaining === void 0 ? void 0 : limit - remaining);
	if (used === void 0) return void 0;
	const percentUsed = clampPercent(used / limit * 100);
	if (percentUsed === void 0) return void 0;
	return {
		kind,
		percentUsed: round1(percentUsed),
		...resetAt === void 0 ? {} : { resetAt },
		...remaining === void 0 ? {} : { remaining }
	};
}
/** Whether the answer meters periods rather than a wallet. */
function metersWindows(body) {
	return pickString(body, ["mode"]) === "quota_limited" || isRecord$1(body["subscription"]);
}
/** Windows of an aggregate-quota answer: the quota itself plus each rate limit. */
function quotaWindows(body, now) {
	const windows = [];
	const quota = amountWindow("quota", body["quota"], upcomingIso(body["expires_at"], now));
	if (quota !== void 0) windows.push(quota);
	const limits = body["rate_limits"];
	if (Array.isArray(limits)) for (const entry of limits) {
		if (!isRecord$1(entry)) continue;
		const row = amountWindow(WINDOW_KINDS[pickString(entry, ["window"]) ?? ""] ?? "quota", entry, upcomingIso(entry["reset_at"], now));
		if (row !== void 0) windows.push(row);
	}
	return windows;
}
/** Windows of a subscription answer: one per calendar period it publishes. */
function subscriptionWindows(subscription) {
	const windows = [];
	for (const [period, kind] of SUBSCRIPTION_PERIODS) {
		const row = amountWindow(kind, subscription, void 0, [`${period}_usage_usd`, `${period}_usage`], [`${period}_limit_usd`, `${period}_limit`]);
		if (row !== void 0) windows.push(row);
	}
	return windows;
}
/**
* Read one `/v1/usage` answer in whichever of its three forms arrived.
*
* The gateway reports an expired or disabled key as a field on a 200 answer,
* so that case becomes `unauthorized` here rather than a missing balance.
* @param body - the parsed answer.
* @param now - current epoch milliseconds, for reset countdowns.
* @returns the normalized reading.
* @throws {QuotaRequestError} when the answer discloses no usable figure.
*/
function readSub2apiUsage(body, now) {
	if (!isRecord$1(body)) throw new QuotaRequestError("invalid-response", "Sub2API usage response is not an object");
	if (body["isValid"] === false || body["is_active"] === false) throw new QuotaRequestError("unauthorized", "Sub2API reports this key as inactive");
	const plan = pickString(body, [
		"planName",
		"plan_name",
		"plan"
	]);
	const usage = gatewayUsage(body);
	if (metersWindows(body)) {
		const subscription = body["subscription"];
		const windows = isRecord$1(subscription) ? subscriptionWindows(subscription) : quotaWindows(body, now);
		if (windows.length > 0) return {
			mode: "subscription",
			plan: plan ?? "Sub2API",
			planWindows: Object.freeze(windows),
			...usage.length === 0 ? {} : { usage }
		};
		const metered = pickNumber(body, ["remaining", "balance"]);
		if (metered === void 0) throw new QuotaRequestError("invalid-response", "Sub2API response has no usable quota window");
		return {
			mode: "balance",
			remaining: metered,
			currency: pickString(body, ["unit", "currency"]) ?? "USD",
			...plan === void 0 ? {} : { plan },
			...usage.length === 0 ? {} : { usage }
		};
	}
	const remaining = pickNumber(body, ["balance", "remaining"]);
	if (remaining === void 0) throw new QuotaRequestError("invalid-response", "Sub2API wallet response has no balance figure");
	return {
		mode: "balance",
		remaining,
		currency: pickString(body, ["unit", "currency"]) ?? "USD",
		...plan === void 0 ? {} : { plan },
		...usage.length === 0 ? {} : { usage }
	};
}
/**
* The usage tables the endpoint publishes about this credential.
*
* `/v1/usage` answers with the key's own ledger: one row per day and one per
* model. Reading them is what makes a per-credential split possible at all, and
* the cap keeps a talkative gateway from putting an unbounded payload on the
* wire.
* @param body - the parsed answer.
* @returns the rows, day rows before model rows.
*/
function gatewayUsage(body) {
	const unit = pickString(body, ["unit", "currency"]);
	const rows = [];
	const push = (row) => {
		if (row === void 0) return;
		rows.push(row.currency === void 0 && unit !== void 0 ? {
			...row,
			currency: unit
		} : row);
	};
	for (const entry of arrayUnder(body, "daily_usage") ?? []) push(gatewayUsageRow("day", pickString(entry, ["date", "day"]), entry));
	for (const entry of arrayUnder(body, "model_stats") ?? []) push(gatewayUsageRow("model", pickString(entry, ["model", "model_name"]), entry));
	return Object.freeze(rows.slice(0, MAX_USAGE_ROWS));
}
/** The origin an adapter addresses, so a base URL carrying a path still resolves. */
function originOf$2(context) {
	const base = context.usageBaseURL ?? context.baseURL;
	if (base === void 0 || base === "") throw new QuotaRequestError("not-configured", "provider has no configured base URL");
	try {
		return new URL(base).origin;
	} catch {
		throw new QuotaRequestError("blocked", "configured base URL is not absolute");
	}
}
/**
* Sub2API gateways publishing the `/v1/usage` protocol, including Passion.
*
* The answer decides the mode: a wallet balance, an aggregate quota with its
* rate-limit windows, or a subscription's per-period ceilings.
*/
const sub2api = {
	id: "sub2api",
	async read(context) {
		const key = await requireKey(context);
		return readSub2apiUsage(await requestJson(bearer(`${originOf$2(context)}/v1/usage`, key, context)), context.now());
	}
};
/**
* Sub2API panels, whose dashboard balance the provider's own inference key
* already authorizes.
*
* A panel re-sells upstream subscriptions and serves no `/v1/usage`; its
* balance lives at `/user/balance`, with today's spend beside it. Only a
* missing route or an unreadable body falls through to the published
* protocol — an auth or rate-limit answer is the panel's real answer and must
* not be retried against another path.
*/
const sub2apiAuth = {
	id: "sub2api-auth",
	async read(context) {
		const key = await requireKey(context);
		const origin = originOf$2(context);
		let body;
		try {
			body = await requestJson(bearer(`${origin}/user/balance`, key, context));
		} catch (error) {
			if (!isFallthrough(error)) throw error;
			return readSub2apiUsage(await requestJson(bearer(`${origin}/v1/usage`, key, context)), context.now());
		}
		const remaining = numberOf(isRecord$1(body) ? body["balance"] ?? body["remaining"] : void 0) ?? pickNumber(isRecord$1(body) ? body["data"] : void 0, ["balance", "remaining"]);
		if (remaining === void 0) return readSub2apiUsage(await requestJson(bearer(`${origin}/v1/usage`, key, context)), context.now());
		const plan = pickString(body, ["planName", "plan_name"]);
		return {
			mode: "balance",
			remaining,
			currency: pickString(body, ["unit", "currency"]) ?? "USD",
			...plan === void 0 ? {} : { plan },
			...await todaySpend(origin, key, context)
		};
	}
};
/**
* Today's spend, when the panel publishes it.
*
* Supplementary: a panel that answers the balance but not the usage summary
* still reports its balance, so this read never propagates its failure.
*/
async function todaySpend(origin, key, context) {
	try {
		const body = await requestJson(bearer(`${origin}/api/v1/usage/stats?period=today`, key, context));
		const used = pickNumber(isRecord$1(body) ? body["data"] : void 0, ["total_actual_cost"]) ?? pickNumber(body, ["total_actual_cost"]);
		return used === void 0 ? {} : { used };
	} catch {
		return {};
	}
}
/**
* Whether an origin answers with a real Sub2API panel's public fingerprint.
*
* No credential is sent: the fingerprint path is public, and a gateway this
* build has not recognized must prove what it is before it receives a key.
* @param context - the provider facts, for the origin and the injected fetch.
* @returns true when the answer carries the panel's public settings document.
*/
async function detectSub2apiPanel(context) {
	try {
		const body = await requestJson({
			url: `${originOf$2(context)}${FINGERPRINT_PATH}`,
			auth: "none",
			...context.allowPlaintext === true ? { allowPlaintext: true } : {},
			...context.allowedHosts === void 0 ? {} : { allowedHosts: context.allowedHosts },
			...context.fetchImpl === void 0 ? {} : { fetchImpl: context.fetchImpl }
		});
		if (!isRecord$1(body) || numberOf(body["code"]) !== 0) return false;
		const data = body["data"];
		return isRecord$1(data) && typeof data["affiliate_enabled"] === "boolean";
	} catch {
		return false;
	}
}
//#endregion
//#region lib/types/adapters/stepcode.js
/**
* The StepCode / AgentRouter desk account adapter.
*
* One guarded GET against `{origin}/desk/v1/stepcode/user/info` answers with an
* account summary plus one row per budget pool. The endpoint is not a documented
* public API, so every figure is read from an ordered candidate list: a renamed
* field degrades one row instead of reporting a wrong number, and a section
* disclosing only two of used/total/remaining yields the third.
*
* This is the protocol the StepCode quota tooling reads; `agent-router` remains
* the terse reader shipped for the same path, and a deployment that wants the
* pools, usage share, and billing period picks this adapter by name.
* @module @deepseek-ai/dsh-extension-quota-monitor/adapters/stepcode
*/
/** Path of the desk account endpoint, relative to the gateway origin. */
const ACCOUNT_PATH = "/desk/v1/stepcode/user/info";
/** Key spellings probed for one section's spend. */
const USED_KEYS$1 = [
	"used",
	"used_quota",
	"usage",
	"consumed"
];
/** Key spellings probed for one section's allowance. */
const TOTAL_KEYS$1 = [
	"total",
	"total_quota",
	"quota",
	"limit",
	"budget_limit",
	"binding_quota_limit"
];
/** Key spellings probed for one section's remainder. */
const REMAINING_KEYS$1 = [
	"remaining",
	"remaining_quota",
	"remain_quota",
	"balance",
	"available"
];
/** Key spellings probed for a budget pool's label. */
const POOL_NAME_KEYS$1 = [
	"pool_name",
	"name",
	"channel_name",
	"title",
	"pool_uid",
	"id"
];
/** The origin an adapter addresses, so a base URL carrying a path still resolves. */
function originOf$1(context) {
	const base = context.usageBaseURL ?? context.baseURL;
	if (base === void 0 || base === "") throw new QuotaRequestError("not-configured", "provider has no configured base URL");
	try {
		return new URL(base).origin;
	} catch {
		throw new QuotaRequestError("invalid-response", "configured base URL is not absolute");
	}
}
/**
* Read one section's amounts.
*
* A section disclosing a remainder reports it; one disclosing an allowance and
* a spend reports the difference. A section disclosing only a spend against no
* allowance still reports that spend, because an unmetered plan is a real
* answer and not a missing one.
* @param section - the account summary or one pool row.
* @returns the amounts, or `undefined` when the section discloses none.
*/
function readAmounts$1(section) {
	if (!isRecord$1(section)) return void 0;
	const used = pickNumber(section, USED_KEYS$1);
	const limit = pickNumber(section, TOTAL_KEYS$1);
	const remaining = pickNumber(section, REMAINING_KEYS$1);
	if (used === void 0 && limit === void 0 && remaining === void 0) return void 0;
	const unlimited = section["unlimited"] === true || section["binding_unlimited"] === true;
	const left = remaining ?? (limit !== void 0 && used !== void 0 ? Math.max(0, limit - used) : void 0);
	if (left === void 0) return void 0;
	const spent = used ?? (limit !== void 0 && remaining !== void 0 ? Math.max(0, limit - remaining) : void 0);
	const percentUsed = clampPercent(pickNumber(section, ["usage_percent"])) ?? (limit !== void 0 && limit > 0 && spent !== void 0 ? clampPercent(spent / limit * 100) : void 0);
	const currency = pickString(section, [
		"cost_currency",
		"currency",
		"unit"
	]);
	const periodEnd = pickString(section, ["period_end"]);
	return {
		remaining: left,
		...spent === void 0 ? {} : { used: spent },
		...limit === void 0 ? {} : { limit },
		...percentUsed === void 0 ? {} : { percentUsed: round1(percentUsed) },
		...unlimited ? { unlimited: true } : {},
		...currency === void 0 ? {} : { currency },
		...periodEnd === void 0 ? {} : { periodEnd }
	};
}
/**
* The envelope's own status code, when it carries one.
*
* A 200 wrapping an error code is still an error, so this is checked before any
* figure is read.
* @param body - the parsed answer.
* @throws {QuotaRequestError} when the envelope reports a failure.
*/
function assertEnvelope(body) {
	const code = pickNumber(body, ["code"]);
	if (code === void 0 || code === 200 || code === 0) return;
	const message = pickString(body, ["msg", "message"]) ?? `account endpoint reported code ${code}`;
	throw new QuotaRequestError(code === 401 || code === 403 ? "unauthorized" : "invalid-response", message);
}
/**
* The StepCode desk account: an account summary, its budget pools, and the
* billing period the summary is metered over.
*
* The desk API is served beside the inference API, so this adapter addresses
* the base URL's origin rather than the base URL itself.
*/
const stepcode = {
	id: "stepcode",
	async read(context) {
		const key = await requireKey(context);
		const body = await requestJson(bearer(`${originOf$1(context)}${ACCOUNT_PATH}`, key, context));
		assertEnvelope(body);
		const now = context.now();
		const account = readAmounts$1(objectUnder(body, "usage_summary"));
		const pools = [];
		const usage = [];
		for (const row of arrayUnder(body, "budget_pool_usages") ?? []) {
			const name = pickString(row, POOL_NAME_KEYS$1) ?? `#${pools.length + 1}`;
			const amounts = readAmounts$1(row);
			if (amounts !== void 0) pools.push({
				name,
				remaining: amounts.remaining,
				...amounts.limit === void 0 ? {} : { limit: amounts.limit },
				...amounts.percentUsed === void 0 ? {} : { percentUsed: amounts.percentUsed }
			});
			const usageRow = gatewayUsageRow("pool", name, row);
			if (usageRow !== void 0) usage.push(usageRow);
		}
		if (account === void 0 && pools.length === 0) throw new QuotaRequestError("invalid-response", "StepCode desk response has no usable figures");
		const resetAt = upcomingIso(account?.periodEnd, now);
		const billing = account?.percentUsed === void 0 || resetAt === void 0 ? [] : [{
			kind: "billing",
			percentUsed: account.percentUsed,
			resetAt
		}];
		return {
			mode: "balance",
			remaining: account?.remaining ?? pools.reduce((total, pool) => total + pool.remaining, 0),
			...account?.used === void 0 ? {} : { used: account.used },
			...account?.limit === void 0 ? {} : { limit: account.limit },
			currency: account?.currency ?? "CNY",
			...account?.unlimited === true ? { unlimited: true } : {},
			...billing.length === 0 ? {} : { planWindows: Object.freeze(billing) },
			...pools.length === 0 ? {} : { budgetPools: Object.freeze(pools) },
			...usage.length === 0 ? {} : { usage: Object.freeze(usage) }
		};
	}
};
//#endregion
//#region lib/types/adapters/balance.js
/**
* Balance adapters: accounts that meter money or credits.
*
* Each adapter owns one provider's endpoint and response grammar. A gateway
* that answers in an unrecognized shape raises `invalid-response` rather than
* reporting a zero balance.
* @module @deepseek-ai/dsh-extension-quota-monitor/adapters/balance
*/
/**
* OrcaRouter's OpenAI-compatible billing fallback reports an unmetered
* allowance with this sentinel in all three limit fields.
*/
const ORCA_UNLIMITED_SENTINEL = 1e8;
/** The origin (or configured override) an adapter addresses. */
function originOf(context) {
	const base = context.usageBaseURL ?? context.baseURL;
	if (base === void 0 || base === "") throw new QuotaRequestError("not-configured", "provider has no configured base URL");
	try {
		return new URL(base).origin;
	} catch {
		throw new QuotaRequestError("invalid-response", "configured base URL is not absolute");
	}
}
/**
* DeepSeek official user balance: `{ balance_infos: [{ total_balance, currency }] }`.
* A CNY entry is preferred because that is the account's settlement currency.
*/
const deepseekBalance = {
	id: "deepseek-balance",
	async read(context) {
		const key = await requireKey(context, context.credentialRef);
		const body = await requestJson(bearer(`${originOf(context)}/user/balance`, key, context));
		const raw = isRecord$1(body) ? body["balance_infos"] : void 0;
		const infos = Array.isArray(raw) ? raw : void 0;
		if (infos === void 0 || infos.length === 0) throw new QuotaRequestError("invalid-response", "DeepSeek balance response carries no balance_infos");
		const info = infos.find((entry) => pickString(entry, ["currency"]) === "CNY") ?? infos[0];
		const total = pickNumber(info, ["total_balance"]);
		if (total === void 0) throw new QuotaRequestError("invalid-response", "DeepSeek balance entry has no total_balance");
		return {
			remaining: total,
			currency: pickString(info, ["currency"]) ?? "CNY"
		};
	}
};
/**
* OpenRouter account credits: `/api/v1/credits`, remaining is
* `total_credits - total_usage`.
*
* The endpoint requires a Management Key, so this adapter reads its own
* credential reference rather than the inference key — `/api/v1/key` would
* only describe one key's spending limit, which is not an account balance.
*/
const openrouterBalance = {
	id: "openrouter-balance",
	credentialRefs: ["OPENROUTER_MANAGEMENT_KEY"],
	async read(context) {
		const key = await requireKey(context, context.credentialRef ?? "OPENROUTER_MANAGEMENT_KEY");
		let body;
		try {
			body = await requestJson(bearer(`${originOf(context)}/api/v1/credits`, key, context));
		} catch (error) {
			if (!(error instanceof QuotaRequestError) || ![
				"unauthorized",
				"forbidden",
				"unsupported"
			].includes(error.status)) throw error;
			const result = await requestJson(bearer(`${originOf(context)}/api/v1/key`, key, context));
			const data = isRecord$1(result) ? result["data"] : void 0;
			const used = pickNumber(data, ["usage"]);
			if (used === void 0) throw new QuotaRequestError("invalid-response", "OpenRouter key response has no numeric usage");
			const limit = pickNumber(data, ["limit"]);
			const remaining = pickNumber(data, ["limit_remaining"]) ?? (limit === void 0 ? void 0 : limit - used);
			const accountName = pickString(data, ["label", "name"]);
			return {
				used,
				currency: "USD",
				...limit === void 0 ? {} : { limit },
				...remaining === void 0 ? {} : { remaining },
				...accountName ? { accountName } : {}
			};
		}
		const data = isRecord$1(body) && isRecord$1(body["data"]) ? body["data"] : void 0;
		const limit = pickNumber(data, ["total_credits"]);
		const used = pickNumber(data, ["total_usage"]);
		if (limit === void 0 || used === void 0) throw new QuotaRequestError("invalid-response", "OpenRouter credits response has no numeric totals");
		return {
			remaining: limit - used,
			used,
			limit,
			currency: "USD"
		};
	}
};
/** Moonshot / Kimi API balance: `/v1/users/me/balance`. */
const moonshotBalance = {
	id: "moonshot-balance",
	async read(context) {
		const key = await requireKey(context, context.credentialRef);
		const body = await requestJson(bearer(`${originOf(context)}/v1/users/me/balance`, key, context));
		const data = isRecord$1(body) && isRecord$1(body["data"]) ? body["data"] : void 0;
		const available = pickNumber(data, ["available_balance"]);
		if (available === void 0) throw new QuotaRequestError("invalid-response", "Moonshot balance response has no available_balance");
		return {
			remaining: available,
			currency: pickString(data, ["currency"]) ?? "CNY"
		};
	}
};
/** Z.ai / GLM open-platform balance: `/api/paas/v4/balance`. */
const zaiBalance = {
	id: "zai-balance",
	async read(context) {
		const key = await requireKey(context, context.credentialRef);
		const body = await requestJson(bearer(`${originOf(context)}/api/paas/v4/balance`, key, context));
		const data = isRecord$1(body) && isRecord$1(body["data"]) ? body["data"] : void 0;
		const total = pickNumber(data, ["total_balance", "available_balance"]);
		if (total === void 0) throw new QuotaRequestError("invalid-response", "Z.ai balance response has no numeric balance");
		return {
			remaining: total,
			currency: pickString(data, ["currency"]) ?? "CNY"
		};
	}
};
/** Sum one OrcaRouter credit array, refusing a mixed-currency total. */
function creditTotal(value, currency, label) {
	if (value === void 0 || value === null) return 0;
	if (!Array.isArray(value)) throw new QuotaRequestError("invalid-response", `OrcaRouter ${label} credits are not a list`);
	let total = 0;
	for (const entry of value) {
		if ((pickString(entry, ["unit"])?.toUpperCase() ?? currency) !== currency) throw new QuotaRequestError("invalid-response", `OrcaRouter ${label} credits mix currencies`);
		const amount = pickNumber(entry, ["balance_usd", "balance"]);
		if (amount === void 0 || amount < 0) throw new QuotaRequestError("invalid-response", `OrcaRouter ${label} credits have no numeric balance`);
		total += amount;
	}
	return total;
}
/** The `/v1`-prefixed billing path OrcaRouter serves, preserving a configured path prefix. */
function orcaBillingUrl(baseURL, path) {
	const base = new URL(baseURL);
	const pathname = base.pathname.replace(/\/+$/, "");
	const prefix = pathname === "" ? "/v1" : pathname.endsWith("/v1") ? pathname : `${pathname}/v1`;
	return new URL(`${prefix}${path}`, base.origin).href;
}
/**
* OrcaRouter: the wallet endpoint first, then the documented
* OpenAI-compatible billing pair for deployments that predate it.
*/
const orcarouterBalance = {
	id: "orcarouter-balance",
	async read(context) {
		const key = await requireKey(context, context.credentialRef);
		const base = context.usageBaseURL ?? context.baseURL;
		if (base === void 0 || base === "") throw new QuotaRequestError("not-configured", "provider has no configured base URL");
		try {
			return readOrcaWallet(await requestJson(bearer(orcaBillingUrl(base, "/balance"), key, context)));
		} catch (error) {
			if (!(error instanceof QuotaRequestError) || error.status !== "unsupported") throw error;
		}
		return readOrcaBilling(await requestJson(bearer(orcaBillingUrl(base, "/dashboard/billing/subscription"), key, context)), await requestJson(bearer(orcaBillingUrl(base, "/dashboard/billing/usage"), key, context)));
	}
};
/** Read the OrcaRouter wallet: paid plus free plus promo credits. */
function readOrcaWallet(body) {
	const currency = pickString(body, ["unit"])?.toUpperCase();
	if (currency === void 0) throw new QuotaRequestError("invalid-response", "OrcaRouter wallet response has no currency");
	const paid = pickNumber(body, ["paid_balance"]);
	if (paid === void 0 || paid < 0) throw new QuotaRequestError("invalid-response", "OrcaRouter wallet response has no paid balance");
	const record = isRecord$1(body) ? body : {};
	return {
		remaining: paid + creditTotal(record["free_credit"], currency, "free") + creditTotal(record["promo_credits"], currency, "promo"),
		currency
	};
}
/** Read the OpenAI-compatible billing pair; dashboard usage arrives in cents. */
function readOrcaBilling(subscription, usage) {
	const limit = pickNumber(subscription, ["hard_limit_usd", "soft_limit_usd"]);
	const usedCents = pickNumber(usage, ["total_usage"]);
	if (limit === void 0 || usedCents === void 0 || limit < 0 || usedCents < 0) throw new QuotaRequestError("invalid-response", "OrcaRouter billing response has no numeric quota");
	const used = usedCents / 100;
	const unlimited = limit === ORCA_UNLIMITED_SENTINEL && pickNumber(subscription, ["soft_limit_usd"]) === limit && pickNumber(subscription, ["system_hard_limit_usd"]) === limit;
	return {
		remaining: unlimited ? limit : limit - used,
		used,
		currency: "USD",
		...unlimited ? { unlimited: true } : { limit }
	};
}
/**
* Quota units per currency unit assumed by a new-api deployment that serves no
* `/api/status`, which is what every release before the field published used.
*/
const NEW_API_LEGACY_QUOTA_PER_UNIT = 5e5;
/**
* How this deployment denominates quota, read from its own status document.
*
* A deployment that serves no status route keeps the legacy assumption. A
* deployment that displays a currency this build cannot convert is reported as
* unsupported rather than shown under the wrong unit.
*/
async function newApiQuotaUnit(origin, context) {
	let body;
	try {
		body = await requestJson({
			url: `${origin}/api/status`,
			auth: "none",
			...context.fetchImpl === void 0 ? {} : { fetchImpl: context.fetchImpl }
		});
	} catch (error) {
		if (!(error instanceof QuotaRequestError) || error.status !== "unsupported") throw error;
		return {
			perUnit: NEW_API_LEGACY_QUOTA_PER_UNIT,
			currency: "USD",
			rate: 1
		};
	}
	const data = isRecord$1(body) && isRecord$1(body["data"]) ? body["data"] : body;
	const declared = pickNumber(data, ["quota_per_unit"]);
	const perUnit = declared !== void 0 && declared > 0 ? declared : NEW_API_LEGACY_QUOTA_PER_UNIT;
	const display = (pickString(data, ["quota_display_type"]) ?? "USD").toUpperCase();
	if (display === "USD") return {
		perUnit,
		currency: "USD",
		rate: 1
	};
	if (display !== "CNY") throw new QuotaRequestError("unsupported", `new-api displays quota in unsupported unit ${display}`);
	const rate = pickNumber(data, ["usd_exchange_rate"]);
	if (rate === void 0 || rate <= 0) throw new QuotaRequestError("invalid-response", "new-api reports CNY display without an exchange rate");
	return {
		perUnit,
		currency: "CNY",
		rate
	};
}
/**
* new-api: the per-token usage endpoint first, then the legacy self endpoint,
* with the deployment's own quota denomination applied to both.
*/
const newApi = {
	id: "new-api",
	async read(context) {
		const key = await requireKey(context, context.credentialRef);
		const origin = originOf(context);
		const [body, unit] = await Promise.all([(async () => {
			try {
				return await requestJson(bearer(`${origin}/api/usage/token/`, key, context));
			} catch (error) {
				if (!(error instanceof QuotaRequestError) || error.status !== "unsupported") throw error;
				return await requestJson(bearer(`${origin}/api/user/self`, key, context));
			}
		})(), newApiQuotaUnit(origin, context)]);
		const data = isRecord$1(body) && isRecord$1(body["data"]) ? body["data"] : body;
		const amount = (raw) => raw / unit.perUnit * unit.rate;
		const unlimited = isRecord$1(data) ? data["unlimited_quota"] : void 0;
		if (unlimited === true || unlimited === 1 || unlimited === "true" || unlimited === "1") return {
			unlimited: true,
			remaining: 0,
			currency: unit.currency
		};
		const quota = pickNumber(data, [
			"quota",
			"remain_quota",
			"remaining_quota",
			"total_available"
		]);
		if (quota === void 0) throw new QuotaRequestError("invalid-response", "new-api response has no quota figure");
		const used = pickNumber(data, ["used_quota", "total_used"]);
		const granted = pickNumber(data, ["total_granted"]);
		const plan = pickString(data, ["name", "group"]);
		return {
			remaining: amount(quota),
			currency: unit.currency,
			...used === void 0 ? {} : { used: amount(used) },
			...granted === void 0 ? {} : { limit: amount(granted) },
			...plan === void 0 ? {} : { plan }
		};
	}
};
/** Keys probed for a dashboard's remaining/total/used figures. */
const REMAINING_KEYS = [
	"remaining",
	"remain",
	"remaining_quota",
	"quota_remaining",
	"balance",
	"credits"
];
const TOTAL_KEYS = [
	"total_quota",
	"quota",
	"total",
	"limit"
];
const USED_KEYS = [
	"used_quota",
	"used",
	"usage"
];
/** Read a dashboard body, or `undefined` when it discloses no usable figure. */
function readDashboard(body) {
	const remaining = findNumber(body, REMAINING_KEYS);
	const limit = findNumber(body, TOTAL_KEYS);
	const used = findNumber(body, USED_KEYS);
	if (remaining === void 0 && limit === void 0) return void 0;
	return {
		remaining: remaining ?? Math.max(0, (limit ?? 0) - (used ?? 0)),
		currency: pickString(body, ["unit", "currency"]) ?? "credits",
		...used === void 0 ? {} : { used },
		...limit === void 0 ? {} : { limit }
	};
}
/** Keys probed for an AgentRouter section's remaining/limit/used figures. */
const POOL_REMAINING_KEYS = [
	"remaining",
	"remaining_quota",
	"remain_quota",
	"balance",
	"available"
];
const POOL_LIMIT_KEYS = [
	"limit",
	"total",
	"total_quota",
	"quota",
	"budget",
	"budget_limit"
];
const POOL_USED_KEYS = [
	"used",
	"used_quota",
	"usage",
	"consumed"
];
const POOL_NAME_KEYS = [
	"name",
	"pool_name",
	"budget_pool_name",
	"title",
	"id",
	"pool_id"
];
/**
* Read a section's remaining figure and, when an allowance is disclosed, its
* used share. A section disclosing only a limit and a used figure yields the
* difference, so either side alone still produces a row.
*/
function readAmounts(section) {
	const remaining = pickNumber(section, POOL_REMAINING_KEYS);
	const limit = pickNumber(section, POOL_LIMIT_KEYS);
	const used = pickNumber(section, POOL_USED_KEYS);
	if (remaining === void 0 && limit === void 0) return void 0;
	const left = remaining ?? Math.max(0, (limit ?? 0) - (used ?? 0));
	return {
		remaining: left,
		...limit === void 0 ? {} : { limit },
		...limit === void 0 || limit <= 0 ? {} : { percentUsed: round1(clampPercent((limit - left) / limit * 100) ?? 0) }
	};
}
/** Every balance adapter, keyed for registry assembly. */
const BALANCE_ADAPTERS = Object.freeze([
	deepseekBalance,
	openrouterBalance,
	moonshotBalance,
	zaiBalance,
	orcarouterBalance,
	newApi,
	sub2api,
	sub2apiAuth,
	{
		id: "agent-router",
		async read(context) {
			const key = await requireKey(context, context.credentialRef);
			const body = await requestJson(bearer(`${originOf(context)}/desk/v1/stepcode/user/info`, key, context));
			const summary = objectUnder(body, "usage_summary");
			const pools = [];
			for (const row of arrayUnder(body, "budget_pool_usages") ?? []) {
				const amounts = readAmounts(row);
				if (amounts === void 0) continue;
				pools.push({
					name: pickString(row, POOL_NAME_KEYS) ?? `#${pools.length + 1}`,
					...amounts
				});
			}
			const account = readAmounts(summary);
			if (account === void 0 && pools.length === 0) throw new QuotaRequestError("invalid-response", "AgentRouter account response has no usable figures");
			return {
				remaining: account?.remaining ?? pools.reduce((total, pool) => total + pool.remaining, 0),
				currency: "credits",
				...account?.limit === void 0 ? {} : { limit: account.limit },
				...pools.length === 0 ? {} : { budgetPools: Object.freeze(pools) }
			};
		}
	},
	stepcode,
	{
		id: "general",
		async read(context) {
			const key = await requireKey(context, context.credentialRef);
			const body = await requestJson(bearer(`${originOf(context)}/user/balance`, key, context));
			const reading = readDashboard(body) ?? readDashboard(isRecord$1(body) ? body["data"] : void 0);
			if (reading === void 0) throw new QuotaRequestError("invalid-response", "general balance response carries no balance figure");
			return reading;
		}
	}
]);
//#endregion
//#region lib/types/adapters/command.js
/** Command Code subscription endpoints, verified against shxtmaker/dsh-token-quota.
* No plan-price table: a monthly percentage requires a total disclosed by the API. */
const commandCode = {
	id: "command-code",
	async read(context) {
		const key = await requireKey(context, context.credentialRef);
		const origin = new URL(context.usageBaseURL ?? context.baseURL ?? "https://api.commandcode.ai").origin;
		const get = (path) => requestJson(bearer(`${origin}${path}`, key, context));
		const who = await get("/alpha/whoami");
		const org = isRecord$1(who) && isRecord$1(who.org) ? who.org : void 0;
		const user = isRecord$1(who) && isRecord$1(who.user) ? who.user : who;
		const orgId = pickString(org, ["id"]);
		const query = orgId === void 0 ? "" : `?orgId=${encodeURIComponent(orgId)}`;
		const body = await get(`/alpha/billing/credits${query}`);
		const credits = isRecord$1(body) && isRecord$1(body.credits) ? body.credits : void 0;
		const limits = isRecord$1(body) && isRecord$1(body.windowLimits) ? body.windowLimits : void 0;
		const windows = [];
		const now = context.now();
		for (const [field, kind] of [["fiveHour", "five-hour"], ["weekly", "weekly"]]) {
			const row = limits?.[field];
			const cap = pickNumber(row, ["cap", "limit"]);
			const remaining = pickNumber(row, ["remaining"]);
			const used = pickNumber(row, ["used"]) ?? (cap !== void 0 && remaining !== void 0 ? Math.max(0, cap - remaining) : void 0);
			if (cap === void 0 || cap <= 0 || used === void 0) continue;
			const percentUsed = clampPercent(used / cap * 100);
			if (percentUsed === void 0) continue;
			const resetAt = upcomingIso(isRecord$1(row) ? row.resetAt ?? row.reset : void 0, now);
			windows.push({
				kind,
				percentUsed,
				remaining: Math.max(0, cap - used),
				...resetAt ? { resetAt } : {}
			});
		}
		const remaining = pickNumber(credits, ["monthlyCredits"]);
		const total = pickNumber(credits, ["monthlyLimit", "monthlyCreditsLimit"]);
		if (remaining !== void 0 && total !== void 0 && total > 0) {
			let resetAt;
			try {
				const subscription = await get(`/alpha/billing/subscriptions${query}`);
				const data = isRecord$1(subscription) ? subscription.data : void 0;
				resetAt = upcomingIso(isRecord$1(data) ? data.currentPeriodEnd : void 0, now);
			} catch (error) {
				if (!(error instanceof QuotaRequestError) || error.status !== "unsupported") throw error;
			}
			windows.push({
				kind: "monthly",
				percentUsed: Math.min(100, Math.max(0, (total - remaining) / total * 100)),
				remaining,
				...resetAt ? { resetAt } : {}
			});
		}
		if (!windows.length && remaining === void 0) throw new QuotaRequestError("invalid-response", "Command Code response has no usable quota");
		const accountName = pickString(user, [
			"name",
			"email",
			"id"
		]) ?? pickString(org, ["name", "id"]);
		const planId = pickString(credits, ["planId"]);
		return {
			plan: planId === "individual-goat" ? "GOAT" : planId ?? "Command Code",
			planWindows: windows,
			...remaining === void 0 ? {} : {
				remaining,
				currency: "USD"
			},
			...accountName ? { accountName } : {}
		};
	}
};
//#endregion
//#region lib/types/adapters/subscription.js
/**
* Subscription adapters: accounts that meter elapsed-time windows rather than
* a balance.
*
* Every adapter normalizes to {@link QuotaPlanWindow} rows carrying a used
* share and, when disclosed, a reset instant. A window whose percentage
* cannot be read is dropped rather than shown as empty, because an empty bar
* and an unread bar mean opposite things.
* @module @deepseek-ai/dsh-extension-quota-monitor/adapters/subscription
*/
/** Z.ai Coding Plan hosts, by account region. */
const ZAI_HOSTS = Object.freeze({
	global: "https://api.z.ai",
	"bigmodel-cn": "https://open.bigmodel.cn"
});
/** MiniMax token-plan hosts, by account region. */
const MINIMAX_HOSTS = Object.freeze({
	global: Object.freeze(["https://www.minimax.io", "https://api.minimax.io"]),
	cn: Object.freeze(["https://www.minimaxi.com", "https://api.minimaxi.com"])
});
/** MiniMax paths, newest first. */
const MINIMAX_PATHS = ["/v1/token_plan/remains", "/v1/api/openplatform/coding_plan/remains"];
/**
* Cline Pass window ids mapped to the rows the panel labels. Any other `type`
* is skipped: the endpoint may add windows this build has no row for, and
* dropping one is preferable to labelling it wrongly.
*/
const CLINE_WINDOW_KINDS = Object.freeze({
	five_hour: "five-hour",
	weekly: "weekly",
	monthly: "monthly"
});
/** Build one window from a used share, dropping it when the share is unreadable. */
function windowOf(kind, usedPercent, resetAt, remaining) {
	if (usedPercent === void 0) return void 0;
	return {
		kind,
		percentUsed: round1(usedPercent),
		...resetAt === void 0 ? {} : { resetAt },
		...remaining === void 0 ? {} : { remaining }
	};
}
/** Resolve a credential by reference, failing with the reference name. */
async function requireRef(context, fallback) {
	const reference = context.credentialRef ?? fallback;
	const resolved = await context.credential(reference);
	if (resolved !== void 0 && resolved !== "") return resolved;
	throw new QuotaRequestError("not-configured", `credential ${reference} is not configured`);
}
/**
* Read a MiniMax window share. Newer payloads zero the counters and report
* percentages; older ones do the reverse, and the status sentinel
* (1 normal, 2 exhausted, 3 unlimited) is the last resort so a missing
* percentage never hides the window.
*/
function minimaxRemaining(entry, percentKeys, totalKeys, usageKeys, statusKeys) {
	const percent = clampPercent(pickNumber(entry, percentKeys));
	if (percent !== void 0) return percent;
	const total = pickNumber(entry, totalKeys);
	const usage = pickNumber(entry, usageKeys);
	if (total !== void 0 && total > 0 && usage !== void 0) return clampPercent((1 - usage / total) * 100);
	const status = pickNumber(entry, statusKeys);
	if (status === 2) return 0;
	if (status === 3) return 100;
}
/** Chat-model names MiniMax uses when it does not name the `general` group. */
const MINIMAX_CHAT_MODEL = /^(minimax-m|coding-plan)/i;
/**
* MiniMax Coding Plan: a rolling session window plus a weekly window.
*
* The response reports one row per resource group; the chat row is the one a
* session actually spends, named either `general` or after the model itself.
*/
const minimaxTokenPlan = {
	id: "minimax-token-plan",
	credentialRefs: ["MINIMAX_API_KEY"],
	async read(context) {
		const key = await requireRef(context, "MINIMAX_API_KEY");
		const region = /minimaxi\.com/i.test(context.baseURL ?? "") || /-cn$/i.test(context.id) ? "cn" : "global";
		const configured = context.usageBaseURL;
		const body = await requestFirst(configured !== void 0 ? [configured] : (MINIMAX_HOSTS[region] ?? MINIMAX_HOSTS["global"] ?? []).flatMap((host) => MINIMAX_PATHS.map((path) => `${host}${path}`)), (url) => bearer(url, key, context));
		const statusCode = pickNumber(isRecord$1(body) ? body["base_resp"] : void 0, ["status_code"]);
		if (statusCode !== void 0 && statusCode !== 0) throw new QuotaRequestError("invalid-response", `MiniMax reported status_code ${statusCode}`);
		const rows = arrayUnder(body, "model_remains") ?? [];
		const chat = rows.find((row) => pickString(row, ["model_name", "modelName"])?.toLowerCase() === "general") ?? rows.find((row) => MINIMAX_CHAT_MODEL.test(pickString(row, ["model_name", "modelName"]) ?? ""));
		if (!isRecord$1(chat)) throw new QuotaRequestError("invalid-response", "MiniMax response has no chat-model entry");
		const now = context.now();
		const sessionRemaining = minimaxRemaining(chat, ["current_interval_remaining_percent", "currentIntervalRemainingPercent"], ["current_interval_total_count", "currentIntervalTotalCount"], ["current_interval_usage_count", "currentIntervalUsageCount"], ["current_interval_status", "currentIntervalStatus"]);
		const weeklyRemaining = minimaxRemaining(chat, ["current_weekly_remaining_percent", "currentWeeklyRemainingPercent"], ["current_weekly_total_count", "currentWeeklyTotalCount"], ["current_weekly_usage_count", "currentWeeklyUsageCount"], ["current_weekly_status", "currentWeeklyStatus"]);
		const windows = [windowOf("session", sessionRemaining === void 0 ? void 0 : 100 - sessionRemaining, upcomingIso(chat["current_interval_end_time"] ?? chat["currentIntervalEndTime"], now) ?? resetFromDuration(chat["remains_time"] ?? chat["remainsTime"], now)), windowOf("weekly", weeklyRemaining === void 0 ? void 0 : 100 - weeklyRemaining, upcomingIso(chat["current_weekly_end_time"] ?? chat["currentWeeklyEndTime"], now))].filter((entry) => entry !== void 0);
		if (windows.length === 0) throw new QuotaRequestError("invalid-response", "MiniMax chat entry has no usable quota fields");
		return {
			plan: "MiniMax Coding Plan",
			planWindows: Object.freeze(windows)
		};
	}
};
/** Z.ai limit-window durations, in minutes, from its unit enum. */
function zaiWindowMinutes(limit) {
	const unit = pickNumber(limit, ["unit"]);
	const number = pickNumber(limit, ["number"]);
	if (unit === void 0 || number === void 0 || number <= 0) return void 0;
	if (unit === 5) return number;
	if (unit === 3) return number * 60;
	if (unit === 1) return number * 24 * 60;
	if (unit === 6) return number * 7 * 24 * 60;
}
/** Used share of one Z.ai limit row. */
function zaiUsedPercent(limit) {
	const total = pickNumber(limit, ["usage"]);
	const remaining = pickNumber(limit, ["remaining"]);
	const current = pickNumber(limit, ["currentValue", "current_value"]);
	if (total !== void 0 && total > 0) {
		const used = remaining === void 0 ? current : current === void 0 ? total - remaining : Math.max(total - remaining, current);
		if (used !== void 0) return clampPercent(Math.max(0, Math.min(total, used)) / total * 100);
	}
	return clampPercent(pickNumber(limit, [
		"percentage",
		"usedPercent",
		"used_percent"
	]));
}
/** Title-case a plan label, keeping the GLM acronym uppercase. */
function displayPlan(value) {
	if (value === void 0) return void 0;
	const text = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
	if (text === "") return void 0;
	return text.replace(/\bglm\b/gi, "GLM").replace(/\b\w/g, (char) => char.toUpperCase());
}
/**
* Z.ai / GLM Coding Plan: the quota endpoint reports one row per limit, and
* the optional subscription endpoint supplies the plan label and renewal.
*
* The Coding Plan endpoints expect the raw API key, unlike the inference API.
*/
const zaiTokenPlan = {
	id: "zai-token-plan",
	credentialRefs: ["ZAI_API_KEY"],
	async read(context) {
		const key = await requireRef(context, "ZAI_API_KEY");
		const region = await context.credential("ZAI_API_REGION");
		const cn = /bigmodel\.cn/i.test(context.baseURL ?? "") || /^(cn|bigmodel-cn)$/i.test(region ?? "") || /-cn$/i.test(context.id);
		const host = context.usageBaseURL ?? (cn ? ZAI_HOSTS["bigmodel-cn"] : ZAI_HOSTS["global"]) ?? ZAI_HOSTS["global"];
		const raw = (url) => ({
			url,
			apiKey: key,
			auth: "raw",
			...context.fetchImpl === void 0 ? {} : { fetchImpl: context.fetchImpl }
		});
		const quota = await requestJson(raw(`${host}/api/monitor/usage/quota/limit`));
		let subscription;
		try {
			subscription = await requestJson(raw(`${host}/api/biz/subscription/list`));
		} catch {
			subscription = void 0;
		}
		const limits = arrayUnder(quota, "limits") ?? [];
		const tokenLimits = limits.filter((limit) => ["TOKENS_LIMIT", "CREDIT_LIMIT"].includes((pickString(limit, ["type", "limit_type"]) ?? "").toUpperCase()) && zaiUsedPercent(limit) !== void 0).sort((left, right) => (zaiWindowMinutes(left) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(right) ?? Number.MAX_SAFE_INTEGER));
		const timeLimit = limits.find((limit) => (pickString(limit, ["type", "limit_type"]) ?? "").toUpperCase() === "TIME_LIMIT" && zaiUsedPercent(limit) !== void 0);
		const first = tokenLimits[0];
		const shortest = zaiWindowMinutes(first);
		const session = tokenLimits.length >= 2 ? first : shortest !== void 0 && shortest <= 360 ? first : void 0;
		const weekly = tokenLimits.length >= 2 ? tokenLimits[tokenLimits.length - 1] : session === void 0 ? first : void 0;
		const now = context.now();
		const rows = arrayUnder(subscription, "data") ?? [];
		const renewAt = upcomingIso(isRecord$1(rows[0]) ? rows[0]["next_renew_time"] ?? rows[0]["nextRenewTime"] : void 0, now);
		const windows = [
			session === void 0 ? void 0 : windowOf("session", zaiUsedPercent(session), upcomingIso(isRecord$1(session) ? session["nextResetTime"] ?? session["next_reset_time"] : void 0, now), pickNumber(session, ["remaining"])),
			weekly === void 0 ? void 0 : windowOf("weekly", zaiUsedPercent(weekly), upcomingIso(isRecord$1(weekly) ? weekly["nextResetTime"] ?? weekly["next_reset_time"] : void 0, now), pickNumber(weekly, ["remaining"])),
			timeLimit === void 0 ? void 0 : windowOf("billing", zaiUsedPercent(timeLimit), renewAt)
		].filter((entry) => entry !== void 0);
		if (windows.length === 0) throw new QuotaRequestError("invalid-response", "Z.ai quota response has no usable limit rows");
		return {
			plan: displayPlan(pickString(isRecord$1(rows[0]) ? rows[0] : void 0, [
				"product_name",
				"productName",
				"plan_name",
				"planName",
				"package_name",
				"packageName"
			])) ?? "GLM Coding Plan",
			planWindows: Object.freeze(windows)
		};
	}
};
/** One Kimi limit row: an absolute allowance with its remainder. */
function limitWindow(value, kind, now) {
	const limit = pickNumber(value, ["limit", "total"]);
	const remaining = pickNumber(value, ["remaining"]);
	if (limit === void 0 || remaining === void 0 || limit <= 0) return void 0;
	return windowOf(kind, clampPercent((limit - remaining) / limit * 100), upcomingIso(isRecord$1(value) ? value["resetTime"] ?? value["reset_time"] ?? value["resetsAt"] : void 0, now), remaining);
}
/** Kimi For Coding: `/coding/v1/usages` reports a session limit plus weekly usage. */
const kimiTokenPlan = {
	id: "kimi-token-plan",
	credentialRefs: ["KIMI_API_KEY"],
	async read(context) {
		const key = await requireRef(context, "KIMI_API_KEY");
		const body = await requestJson(bearer(context.usageBaseURL ?? "https://api.kimi.com/coding/v1/usages", key, context));
		const data = isRecord$1(body) && isRecord$1(body["data"]) ? body["data"] : body;
		const now = context.now();
		const windows = [(arrayUnder(data, "limits") ?? []).map((row) => limitWindow(isRecord$1(row) && isRecord$1(row["detail"]) ? row["detail"] : row, "session", now)).find((entry) => entry !== void 0), limitWindow(isRecord$1(data) ? data["usage"] : void 0, "weekly", now)].filter((entry) => entry !== void 0);
		if (windows.length === 0) throw new QuotaRequestError("invalid-response", "Kimi usage response has no usable limit rows");
		return {
			plan: pickString(data, ["plan", "planName"]) ?? "Kimi For Coding",
			planWindows: Object.freeze(windows)
		};
	}
};
/**
* Read one OpenCode Go window. The Bearer endpoint reports `percent` on a
* 0–100 scale; the dashboard embeds a 0–1 ratio under a `usagePercent`-style
* name, which is why only the ratio-named fields are scaled.
*/
function goWindow(value, kind, now) {
	if (!isRecord$1(value)) return void 0;
	const named = value["usagePercent"] ?? value["usedPercent"] ?? value["percentUsed"] ?? value["percentage"] ?? value["percent"];
	let used = clampPercent(named);
	if (used === void 0) {
		const spent = pickNumber(value, ["used", "consumed"]);
		const limit = pickNumber(value, [
			"limit",
			"total",
			"quota"
		]);
		if (spent === void 0 || limit === void 0 || limit <= 0) return void 0;
		used = clampPercent(spent / limit * 100);
	} else if (used <= 1 && value["percent"] === void 0 && named !== void 0) used = clampPercent(used * 100);
	const seconds = pickNumber(value, [
		"resetInSec",
		"resetInSeconds",
		"resetSeconds"
	]);
	const resetAt = seconds === void 0 ? upcomingIso(value["resetAt"] ?? value["resetsAt"] ?? value["nextReset"], now) : resetFromDuration(Math.max(0, seconds) * 1e3, now);
	return windowOf(kind, used, resetAt);
}
/** Every subscription adapter, keyed for registry assembly. */
const SUBSCRIPTION_ADAPTERS = Object.freeze([
	minimaxTokenPlan,
	zaiTokenPlan,
	kimiTokenPlan,
	{
		id: "opencode-go",
		credentialRefs: ["OPENCODE_GO_API_KEY"],
		async read(context) {
			const key = await requireRef(context, "OPENCODE_GO_API_KEY");
			const body = await requestJson(bearer(context.usageBaseURL ?? "https://opencode.ai/zen/go/v1/usage", key, context));
			const usage = isRecord$1(body) && isRecord$1(body["usage"]) ? body["usage"] : body;
			const now = context.now();
			const windows = [
				goWindow(isRecord$1(usage) ? usage["rolling"] : void 0, "session", now),
				goWindow(isRecord$1(usage) ? usage["weekly"] : void 0, "weekly", now),
				goWindow(isRecord$1(usage) ? usage["monthly"] : void 0, "monthly", now)
			].filter((entry) => entry !== void 0);
			if (windows.length === 0) throw new QuotaRequestError("invalid-response", "OpenCode Go usage response has no usable windows");
			const accountName = pickString(body, ["name", "email"]) ?? pickString(isRecord$1(body) ? body["user"] : void 0, [
				"name",
				"email",
				"id"
			]);
			return {
				plan: pickString(body, ["plan"]) ?? (context.baseURL?.includes("/zen/v1") ? "Zen" : "Go"),
				planWindows: Object.freeze(windows),
				...accountName ? { accountName } : {}
			};
		}
	},
	{
		id: "ollama",
		credentialRefs: ["OLLAMA_API_KEY"],
		async read(context) {
			const key = await requireRef(context, "OLLAMA_API_KEY");
			const body = await requestJson(bearer(context.usageBaseURL ?? "https://ollama.com/api/usage", key, context));
			const limits = isRecord$1(body) ? body["limits"] : void 0;
			const ratio = (value) => {
				const parsed = numberOf(isRecord$1(value) ? value["usage"] : void 0);
				return parsed === void 0 ? void 0 : clampPercent(parsed * 100);
			};
			const windows = [windowOf("session", ratio(isRecord$1(limits) ? limits["session"] : void 0), void 0), windowOf("weekly", ratio(isRecord$1(limits) ? limits["weekly"] : void 0), void 0)].filter((entry) => entry !== void 0);
			if (windows.length === 0) throw new QuotaRequestError("invalid-response", "Ollama usage response has no usable windows");
			return {
				plan: "Ollama",
				planWindows: Object.freeze(windows)
			};
		}
	},
	{
		id: "cline-plan",
		async read(context) {
			const key = context.credentialRef === void 0 ? context.apiKey : await context.credential(context.credentialRef);
			if (key === void 0 || key === "") throw new QuotaRequestError("not-configured", "provider has no configured API key");
			const base = context.usageBaseURL ?? context.baseURL;
			if (base === void 0 || base === "") throw new QuotaRequestError("not-configured", "provider has no configured base URL");
			const body = await requestJson(bearer(`${base}/users/me/plan/usage-limits`, key, context));
			const now = context.now();
			const windows = [];
			for (const row of arrayUnder(body, "limits") ?? []) {
				const type = pickString(row, ["type"]);
				const kind = type === void 0 ? void 0 : CLINE_WINDOW_KINDS[type];
				if (kind === void 0) continue;
				const entry = windowOf(kind, clampPercent(pickNumber(row, ["percentUsed"])), upcomingIso(isRecord$1(row) ? row["resetsAt"] : void 0, now));
				if (entry !== void 0) windows.push(entry);
			}
			if (windows.length === 0) throw new QuotaRequestError("invalid-response", "Cline Pass response has no recognized plan window");
			windows.sort((left, right) => right.percentUsed - left.percentUsed);
			const accountName = pickString(body, ["name", "email"]) ?? pickString(isRecord$1(body) ? body["user"] : void 0, [
				"name",
				"email",
				"id"
			]);
			return {
				plan: "Cline Pass",
				planWindows: Object.freeze(windows),
				...accountName ? { accountName } : {}
			};
		}
	}
]);
//#endregion
//#region lib/types/adapters/declarative.js
/**
* The declarative adapter: a configuration-described account read for a
* gateway no built-in adapter recognizes.
*
* The configuration names an endpoint and JSON Pointers to the figures. It is
* data, not code — no expression is evaluated — so a custom monitor can reach
* a new gateway without widening what this plugin can execute.
* @module @deepseek-ai/dsh-extension-quota-monitor/adapters/declarative
*/
/**
* Resolve one RFC 6901 JSON Pointer.
*
* @param document - the parsed response body.
* @param pointer - the pointer, `""` for the whole document.
* @returns the referenced value, or `undefined` when the path is absent.
*/
function resolvePointer(document, pointer) {
	if (pointer === "") return document;
	if (!pointer.startsWith("/")) return void 0;
	let current = document;
	for (const raw of pointer.slice(1).split("/")) {
		const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
		if (Array.isArray(current)) {
			if (!/^\d+$/.test(token)) return void 0;
			current = current[Number(token)];
			continue;
		}
		if (typeof current !== "object" || current === null) return void 0;
		if (!Object.hasOwn(current, token)) return void 0;
		current = current[token];
	}
	return current;
}
/** The absolute URL a declarative spec addresses. */
function specUrl(spec, context) {
	try {
		return new URL(spec.url).href;
	} catch {
		const base = context.usageBaseURL ?? context.baseURL;
		if (base === void 0 || base === "") throw new QuotaRequestError("not-configured", "declarative monitor has no absolute URL or base URL");
		try {
			return new URL(spec.url, `${base}/`).href;
		} catch {
			throw new QuotaRequestError("invalid-response", "declarative monitor URL cannot be resolved");
		}
	}
}
/**
* Build the declarative adapter for one configured spec.
* @param spec - the configured endpoint and pointers.
* @returns an adapter reading exactly that spec.
*/
function declarativeAdapter(spec) {
	return {
		id: "declarative",
		async read(context) {
			const key = context.credentialRef === void 0 ? context.apiKey : await context.credential(context.credentialRef);
			const auth = spec.auth ?? "bearer";
			if (auth !== "none" && (key === void 0 || key === "")) throw new QuotaRequestError("not-configured", "declarative monitor has no configured credential");
			const body = await requestJson({
				url: specUrl(spec, context),
				auth,
				...key === void 0 ? {} : { apiKey: key },
				...context.allowPlaintext === true ? { allowPlaintext: true } : {},
				...context.allowedHosts === void 0 ? {} : { allowedHosts: context.allowedHosts },
				...context.fetchImpl === void 0 ? {} : { fetchImpl: context.fetchImpl }
			});
			const read = (pointer) => pointer === void 0 ? void 0 : numberOf(resolvePointer(body, pointer));
			const remaining = read(spec.remainingPointer);
			const used = read(spec.usedPointer);
			const limit = read(spec.limitPointer);
			const now = context.now();
			const windows = [];
			for (const window of spec.windows ?? []) {
				const percentUsed = clampPercent(resolvePointer(body, window.percentUsedPointer));
				if (percentUsed === void 0) continue;
				const resetRaw = window.resetAtPointer === void 0 ? void 0 : resolvePointer(body, window.resetAtPointer);
				const resetAt = typeof resetRaw === "string" && !Number.isNaN(new Date(resetRaw).getTime()) && new Date(resetRaw).getTime() > now ? new Date(resetRaw).toISOString() : void 0;
				windows.push({
					kind: window.kind,
					percentUsed,
					...resetAt === void 0 ? {} : { resetAt }
				});
			}
			if (remaining === void 0 && limit === void 0 && windows.length === 0) throw new QuotaRequestError("invalid-response", "declarative monitor pointers matched no figure");
			return {
				...remaining === void 0 ? limit === void 0 ? {} : { remaining: Math.max(0, limit - (used ?? 0)) } : { remaining },
				...used === void 0 ? {} : { used },
				...limit === void 0 ? {} : { limit },
				...spec.currency === void 0 ? {} : { currency: spec.currency },
				...windows.length === 0 ? {} : { planWindows: Object.freeze(windows) }
			};
		}
	};
}
//#endregion
//#region lib/types/adapters/index.js
/**
* The adapter registry: adapter id to implementation.
*
* `declarative` is absent because it is built per configured spec rather than
* shared; {@link declarativeAdapter} constructs it.
* @module @deepseek-ai/dsh-extension-quota-monitor/adapters
*/
/** Every shared adapter, keyed by id. */
const REGISTRY = new Map([
	...BALANCE_ADAPTERS,
	...SUBSCRIPTION_ADAPTERS,
	commandCode
].map((adapter) => [adapter.id, adapter]));
/**
* The adapter registered under one id.
* @param id - adapter id resolved from a provider route.
* @returns the adapter, or `undefined` for `declarative` and unknown ids.
*/
function adapterFor(id) {
	return REGISTRY.get(id);
}
/**
* Credential reference names one adapter needs beyond the provider's own key.
* @param id - adapter id.
* @returns the reference names, empty when the adapter uses the provider key.
*/
function credentialRefsFor(id) {
	return REGISTRY.get(id)?.credentialRefs ?? [];
}
//#endregion
//#region lib/types/config.js
/**
* Plugin configuration: refresh cadence, warning thresholds, gateway
* detection, token prices, spend ceilings, and per-provider monitor overrides.
*
* Every deployment-varying choice lives here rather than as a constant in the
* service. Refresh intervals differ between a laptop watching one account and
* a shared host watching several; warning thresholds are currency- and
* plan-specific and cannot have a universal default; and a token price is set
* by whichever gateway a deployment actually buys from, so this plugin ships
* no price list of its own.
* @module @deepseek-ai/dsh-extension-quota-monitor/config
*/
/** Shortest accepted refresh interval; below this the panel would rate-limit upstream accounts. */
const MIN_INTERVAL_MS = 1e4;
/** Longest accepted refresh interval (24 hours). */
const MAX_INTERVAL_MS = 864e5;
/**
* The credential-reference grammar this plugin accepts in configuration.
*
* The credentials seam owns the name space, but its own validator is not
* imported here: a plugin may be installed twice in one process, and a marker
* that only one installation's module registry can reproduce would then reject
* valid names. The grammar is fixed, so this copy is the configuration's own
* acceptance rule and a name it rejects never reaches the seam.
*/
const CREDENTIAL_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Every adapter id, as a schema literal set so a typo fails at load. */
const adapterId = zs.union([
	zs.const("deepseek-balance"),
	zs.const("openrouter-balance"),
	zs.const("moonshot-balance"),
	zs.const("zai-balance"),
	zs.const("orcarouter-balance"),
	zs.const("new-api"),
	zs.const("sub2api"),
	zs.const("sub2api-auth"),
	zs.const("agent-router"),
	zs.const("stepcode"),
	zs.const("general"),
	zs.const("command-code"),
	zs.const("opencode-go"),
	zs.const("zai-token-plan"),
	zs.const("kimi-token-plan"),
	zs.const("minimax-token-plan"),
	zs.const("cline-plan"),
	zs.const("ollama"),
	zs.const("declarative")
]);
/** Window roles a declarative monitor may describe. */
const windowKind = zs.union([
	zs.const("session"),
	zs.const("five-hour"),
	zs.const("daily"),
	zs.const("weekly"),
	zs.const("monthly"),
	zs.const("billing"),
	zs.const("quota")
]);
const declarativeWindow = zs.object({
	kind: windowKind.required(),
	percentUsedPointer: zs.string().required(),
	resetAtPointer: zs.string()
});
const declarativeSpec = zs.object({
	url: zs.string().required(),
	auth: zs.union([
		zs.const("bearer"),
		zs.const("raw"),
		zs.const("none")
	]),
	remainingPointer: zs.string(),
	usedPointer: zs.string(),
	limitPointer: zs.string(),
	currency: zs.string(),
	windows: zs.array(declarativeWindow)
});
/**
* An object section a deployment may leave out entirely.
*
* A schemastery object node carries `{}` as its own default, so nesting one
* directly would resolve an omitted section to an empty object and then fail
* its required fields. A single-member union carries no default, which is what
* keeps the key absent.
* @param inner - the section schema.
* @returns the same schema with no implicit empty-object fallback.
*/
function optionalSection(inner) {
	return zs.union([inner]);
}
const monitorEntry = zs.object({
	adapter: adapterId,
	usageBaseURL: zs.string(),
	credentialRef: zs.string(),
	credentialRefs: zs.array(zs.string()),
	activeRef: zs.string(),
	allowPlaintextEndpoint: zs.boolean(),
	allowedHosts: zs.array(zs.string()),
	warningRemaining: zs.number(),
	criticalRemaining: zs.number(),
	declarative: optionalSection(declarativeSpec)
});
/** One price document reference, as written in configuration. */
const priceImport = zs.object({
	path: zs.string().required(),
	currency: zs.string()
});
/** One price rule, as written in configuration. */
const priceRule = zs.object({
	provider: zs.string(),
	model: zs.string(),
	from: zs.string(),
	inputPerMillion: zs.number().min(0).required(),
	outputPerMillion: zs.number().min(0).required(),
	cacheReadPerMillion: zs.number().min(0),
	cacheWritePerMillion: zs.number().min(0)
});
/**
* The plugin config schema.
*
* The threshold defaults suit a small prepaid account denominated in CNY or
* USD; a deployment on another scale overrides them per provider.
*
* Object and dict nodes already fall back to `{}`, so an omitted `refresh`,
* `thresholds`, or `monitors` resolves through the per-field defaults below.
*/
const Config = zs.object({
	refresh: zs.object({
		enabled: zs.boolean().default(true),
		activeMs: zs.natural().min(MIN_INTERVAL_MS).max(MAX_INTERVAL_MS).default(6e4),
		backgroundMs: zs.natural().min(MIN_INTERVAL_MS).max(MAX_INTERVAL_MS).default(3e5)
	}),
	thresholds: zs.object({
		warningRemaining: zs.number().default(10),
		criticalRemaining: zs.number().default(2),
		warningPercentUsed: zs.number().min(0).max(100).default(80),
		criticalPercentUsed: zs.number().min(0).max(100).default(95)
	}),
	detection: zs.object({ enabled: zs.boolean().default(true) }),
	pricing: zs.object({
		currency: zs.string().default("USD"),
		rules: zs.array(priceRule).default([]),
		imports: zs.array(priceImport).default([]),
		fuzzyMatch: zs.boolean().default(false)
	}),
	budgets: zs.object({
		daily: zs.number().min(0),
		monthly: zs.number().min(0),
		warningPercent: zs.number().min(0).max(100).default(80),
		criticalPercent: zs.number().min(0).default(100)
	}),
	routing: zs.object({
		maxAgeMs: zs.natural().min(1e4).max(MAX_INTERVAL_MS).default(3e5),
		cooldownMs: zs.natural().min(1e3).max(MAX_INTERVAL_MS).default(6e4),
		jevTimeoutMs: zs.natural().min(100).max(3e4).default(3e3),
		jevMinConfidence: zs.number().min(0).max(1).default(.6),
		jevModel: zs.string().default("typesafe/jev-1.13")
	}),
	monitors: zs.dict(monitorEntry)
});
/**
* Reject a configuration whose parts contradict each other.
*
* A ceiling is measured against derived spend, so a budget with no price behind
* it — neither an inline rule nor an imported document — could only ever report
* `unknown`; that is a configuration mistake rather than a state worth
* rendering, and it fails here at load.
*
* A monitored credential list has to name readable credentials: a name outside
* the reference grammar could never resolve, and a repeat would draw the same
* reading twice while hiding that the deployment expected another key.
*
* Routing writes the chosen key's value into one reference, so that reference
* must not be a monitored key — that would destroy the key it was chosen from —
* and there is nothing to choose between below two monitored keys.
* @param config - the validated plugin config.
* @throws {Error} when a budget is configured with no price behind it, a
* monitored credential list carries an invalid or repeated reference, or a
* routing reference is unusable.
*/
function assertConsistent(config) {
	if ((config.budgets.daily !== void 0 || config.budgets.monthly !== void 0) && config.pricing.rules.length === 0 && config.pricing.imports.length === 0) throw new Error("quota monitor: budgets require pricing.rules or pricing.imports to measure spend against");
	for (const source of config.pricing.imports) if (!isAbsolute(source.path)) throw new Error(`quota monitor: pricing.imports path "${source.path}" must be absolute`);
	if (config.budgets.criticalPercent < config.budgets.warningPercent) throw new Error("quota monitor: budgets.criticalPercent must not be below budgets.warningPercent");
	for (const [id, entry] of Object.entries(config.monitors)) {
		const refs = entry.credentialRefs;
		if (refs === void 0) continue;
		for (const ref of refs) if (!CREDENTIAL_REF_PATTERN.test(ref)) throw new Error(`quota monitor: monitors.${id}.credentialRefs names "${ref}", which is not a credential reference`);
		if (new Set(refs).size !== refs.length) throw new Error(`quota monitor: monitors.${id}.credentialRefs repeats a credential reference`);
	}
	for (const [id, entry] of Object.entries(config.monitors)) {
		const active = entry.activeRef;
		if (active === void 0) continue;
		if (!CREDENTIAL_REF_PATTERN.test(active)) throw new Error(`quota monitor: monitors.${id}.activeRef names "${active}", which is not a credential reference`);
		const refs = entry.credentialRefs ?? [];
		if (refs.includes(active)) throw new Error(`quota monitor: monitors.${id}.activeRef names a monitored credential, so routing would overwrite that key`);
		if (refs.length < 2) throw new Error(`quota monitor: monitors.${id}.activeRef needs at least two credentialRefs entries to route among`);
	}
}
/**
* The monitor override configured for one provider route.
* @param config - the validated plugin config.
* @param id - provider route key.
* @returns the entry, or `undefined` when the route has no override.
*/
function resolveMonitor(config, id) {
	return config.monitors[id];
}
//#endregion
//#region lib/types/export.js
/**
* Building the three documents the panel offers for download: a per-day
* breakdown, a per-session breakdown, and the whole report as JSON.
*
* Pure functions over a {@link QuotaUsageReport}. Nothing here reads a session
* log or an account endpoint, so an export can only ever disclose what the
* panel already shows.
*
* Two rules govern every CSV cell. Each is quoted, because a route id or a
* currency code may contain a comma. Each text cell that starts with `=`, `+`,
* `-`, or `@` is prefixed with an apostrophe, because a spreadsheet would
* otherwise evaluate it as a formula.
* @module @deepseek-ai/dsh-extension-quota-monitor/export
*/
/** Version of the JSON export layout, so a consumer can branch on it. */
const EXPORT_SCHEMA_VERSION = "1.0.0";
/**
* Byte-order mark, so a spreadsheet opens the file as UTF-8 rather than in the
* host's legacy code page.
*/
const BOM = "﻿";
/** Cell values a spreadsheet would evaluate rather than display. */
const FORMULA_START = /^[\t\r\n ]*[=+\-@]/;
/** Quote one cell, escaping quotes and defusing a formula in a text cell. */
function cell(value, text = false) {
	if (value === void 0) return "\"\"";
	const raw = typeof value === "number" ? String(value) : value;
	return `"${(text && FORMULA_START.test(raw) ? `'${raw}` : raw).replaceAll("\"", "\"\"")}"`;
}
/** Join rows with CRLF and a trailing terminator, as RFC 4180 specifies. */
function csv(rows) {
	return BOM + rows.map((row) => row.join(",")).join("\r\n") + "\r\n";
}
/** Column order of the per-day export. */
const DAILY_HEADER = Object.freeze([
	"date",
	"provider",
	"model",
	"calls",
	"input_tokens",
	"cache_read_tokens",
	"cache_write_tokens",
	"output_tokens",
	"total_tokens",
	"estimated_cost",
	"currency",
	"unpriced_calls"
]);
/** Column order of the per-session export. */
const SESSIONS_HEADER = Object.freeze([
	"session_id",
	"routes",
	"calls",
	"input_tokens",
	"cache_read_tokens",
	"cache_write_tokens",
	"output_tokens",
	"total_tokens",
	"estimated_cost",
	"currency",
	"last_active"
]);
/**
* One row per day and route.
*
* Day totals are left out: a consumer that wants them sums the rows, whereas a
* file mixing totals with their parts double-counts under any naive sum.
*/
function dailyCsv(report) {
	const rows = [DAILY_HEADER.map((name) => cell(name, true))];
	for (const day of report.days) for (const row of day.models) rows.push([
		cell(day.date, true),
		cell(row.provider, true),
		cell(row.model, true),
		cell(row.calls),
		cell(row.inputTokens),
		cell(row.cacheReadTokens),
		cell(row.cacheWriteTokens),
		cell(row.outputTokens),
		cell(row.totalTokens),
		cell(row.cost?.amount),
		cell(row.cost === void 0 ? void 0 : row.cost.currency, true),
		cell(row.cost?.unpricedCalls)
	]);
	return csv(rows);
}
/** One row per session, with its routes joined so no total is duplicated. */
function sessionsCsv(report) {
	const rows = [SESSIONS_HEADER.map((name) => cell(name, true))];
	for (const session of report.sessions) rows.push([
		cell(session.id, true),
		cell(session.routes.join(" | "), true),
		cell(session.calls),
		cell(session.inputTokens),
		cell(session.cacheReadTokens),
		cell(session.cacheWriteTokens),
		cell(session.outputTokens),
		cell(session.totalTokens),
		cell(session.cost?.amount),
		cell(session.cost === void 0 ? void 0 : session.cost.currency, true),
		cell(session.lastActiveAt > 0 ? new Date(session.lastActiveAt).toISOString() : void 0, true)
	]);
	return csv(rows);
}
/**
* The provider rows a JSON export carries: which routes were watched and how
* each read ended.
*
* No balance, no plan window, and no credential reference: an export is a file
* that gets attached to a bug report, and an account's remaining funds are not
* something this plugin should put there. The panel remains the place to read
* them.
*/
function providerRows(providers) {
	return providers.map((entry) => ({
		id: entry.id,
		name: entry.name,
		mode: entry.mode,
		adapter: entry.adapter,
		status: entry.status,
		...entry.warning === void 0 ? {} : { warning: entry.warning }
	}));
}
/**
* Build one export document.
*
* The kind is looked up in a table keyed by every {@link QuotaExportKind}, so
* adding a kind without building it fails to compile.
* @param kind - which document to build.
* @param report - the folded usage report to render.
* @param providers - the watched provider routes, for the JSON document.
* @param now - current epoch milliseconds, stamped as the export time.
* @returns the document, ready for the browser to save.
*/
function buildExport(kind, report, providers, now) {
	return {
		"daily-csv": () => ({
			kind,
			filename: "dsh-quota-daily.csv",
			mediaType: "text/csv; charset=utf-8",
			content: dailyCsv(report)
		}),
		"sessions-csv": () => ({
			kind,
			filename: "dsh-quota-sessions.csv",
			mediaType: "text/csv; charset=utf-8",
			content: sessionsCsv(report)
		}),
		"report-json": () => ({
			kind,
			filename: "dsh-quota-report.json",
			mediaType: "application/json; charset=utf-8",
			content: `${JSON.stringify({
				schemaVersion: EXPORT_SCHEMA_VERSION,
				exportedAt: new Date(now).toISOString(),
				usage: report,
				providers: providerRows(providers)
			}, void 0, 2)}\n`
		})
	}[kind]();
}
//#endregion
//#region lib/types/price-import.js
/**
* Loading price rules from documents a deployment keeps outside the config.
*
* A catalog is configuration too, but restating 170 models inline is not how
* anyone maintains one: this reads a JSON file per configured import, so the
* file can be replaced (a vendor catalog, a generated table) without touching
* the profile patch. Two shapes are understood:
*
* 1. this plugin's own — `{ currency?, rules: [...] }`, or a bare rule array,
*    where each rule uses the same field names `pricing.rules` does;
* 2. the published vendor catalog — `{ providers: { <vendor>: { models: {
*    <model>: { input, output, cachedInput?, cacheWrite? } } } } }`, whose
*    amounts are USD per million tokens and whose vendor names are not DSH
*    route ids, so an imported rule matches by model alone.
*
* Amounts are never converted. A document whose unit differs from the
* configured `pricing.currency` is a configuration error and fails at load,
* because a silent factor-of-seven mispricing is worse than a refused start.
* @module @deepseek-ai/dsh-extension-quota-monitor/price-import
*/
/** The unit the published vendor catalog is denominated in. */
const CATALOG_CURRENCY = "USD";
/** Largest catalog document accepted, so a wrong path cannot exhaust memory. */
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
/** Whether a value is a plain object to index into. */
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** A finite, non-negative price, or undefined. */
function amountOf(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
/** A non-empty trimmed string, or undefined. */
function textOf(value) {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
/**
* One rule from a document entry, or `undefined` when it prices nothing.
* @param entry - the candidate rule object.
* @returns the rule in this plugin's vocabulary.
*/
function ruleOf(entry) {
	if (!isRecord(entry)) return void 0;
	const inputPerMillion = amountOf(entry["inputPerMillion"]);
	const outputPerMillion = amountOf(entry["outputPerMillion"]);
	if (inputPerMillion === void 0 || outputPerMillion === void 0) return void 0;
	const model = textOf(entry["model"]);
	const provider = textOf(entry["provider"]);
	const from = textOf(entry["from"]);
	const cacheReadPerMillion = amountOf(entry["cacheReadPerMillion"]);
	const cacheWritePerMillion = amountOf(entry["cacheWritePerMillion"]);
	return {
		...provider === void 0 ? {} : { provider },
		...model === void 0 ? {} : { model },
		...from === void 0 ? {} : { from },
		inputPerMillion,
		outputPerMillion,
		...cacheReadPerMillion === void 0 ? {} : { cacheReadPerMillion },
		...cacheWritePerMillion === void 0 ? {} : { cacheWritePerMillion }
	};
}
/**
* Rules of a published vendor catalog.
*
* The catalog states a vendor and a model id per entry, and states no route:
* the same model is resold under routes whose ids say nothing about the vendor,
* so an imported rule is matched by model alone. Context-length tiers and
* off-peak rates the catalog may carry are not modelled here and are ignored.
* @param providers - the catalog's `providers` object.
* @returns one rule per priced model.
*/
function catalogRules(providers) {
	const rules = [];
	for (const vendor of Object.values(providers)) {
		if (!isRecord(vendor) || !isRecord(vendor["models"])) continue;
		for (const [model, entry] of Object.entries(vendor["models"])) {
			if (!isRecord(entry)) continue;
			const inputPerMillion = amountOf(entry["input"]);
			const outputPerMillion = amountOf(entry["output"]);
			if (inputPerMillion === void 0 || outputPerMillion === void 0) continue;
			const cacheReadPerMillion = amountOf(entry["cachedInput"]);
			const cacheWritePerMillion = amountOf(entry["cacheWrite"]);
			rules.push({
				model,
				inputPerMillion,
				outputPerMillion,
				...cacheReadPerMillion === void 0 ? {} : { cacheReadPerMillion },
				...cacheWritePerMillion === void 0 ? {} : { cacheWritePerMillion }
			});
		}
	}
	return rules;
}
/**
* Parse one price document.
*
* @param text - the document's text.
* @param path - the path it was read from, named in every error.
* @param declared - the unit the import entry states, when it states one.
* @returns the unit the document resolves to and the rules it carries.
* @throws {Error} when the document is not one of the understood shapes.
*/
function parsePriceDocument(text, path, declared) {
	if (text.length > MAX_DOCUMENT_BYTES) throw new Error(`quota monitor: price document "${path}" exceeds ${MAX_DOCUMENT_BYTES} bytes`);
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		throw new Error(`quota monitor: price document "${path}" is not valid JSON`, { cause: error });
	}
	if (Array.isArray(parsed)) {
		const document = { rules: rulesFrom(parsed, path) };
		if (declared !== void 0) document.currency = declared;
		return document;
	}
	if (!isRecord(parsed)) throw new Error(`quota monitor: price document "${path}" must be an object or an array of rules`);
	if (isRecord(parsed["providers"])) return {
		currency: declared ?? CATALOG_CURRENCY,
		rules: catalogRules(parsed["providers"])
	};
	const document = { rules: rulesFrom(parsed["rules"], path) };
	const unit = textOf(parsed["currency"]) ?? declared;
	if (unit !== void 0) document.currency = unit;
	return document;
}
/**
* Rules from a document's `rules` array.
* @param value - the candidate array.
* @param path - the document path, named in the error.
* @returns the readable rules.
* @throws {Error} when the value is not an array.
*/
function rulesFrom(value, path) {
	if (!Array.isArray(value)) throw new Error(`quota monitor: price document "${path}" carries neither a "rules" array nor a "providers" catalog`);
	const rules = [];
	for (const entry of value) {
		const rule = ruleOf(entry);
		if (rule !== void 0) rules.push(rule);
	}
	return rules;
}
/**
* Build the effective price table: configured rules first, then every import.
*
* Configured rules keep the tie on an equally specific match, so a deployment
* can override one model of an imported catalog without restating it.
* @param config - the plugin configuration.
* @param readText - reads one document, injected so tests need no filesystem.
* @returns the table, or `undefined` when the deployment stated no prices at all.
* @throws {Error} when a document is unreadable, malformed, or denominated in a
* unit other than the configured currency.
*/
async function loadPriceTable(config, readText) {
	const { currency, rules, imports, fuzzyMatch } = config.pricing;
	if (rules.length === 0 && imports.length === 0) return void 0;
	const imported = [];
	for (const source of imports) {
		const document = parsePriceDocument(await readText(source.path), source.path, source.currency);
		assertCurrency(document.currency, source, currency);
		imported.push(...document.rules);
	}
	return {
		currency,
		rules: Object.freeze([...rules, ...imported]),
		fuzzyMatch
	};
}
/**
* Refuse an import denominated in another unit.
* @param stated - the unit the document resolved to, when it resolved to one.
* @param source - the import entry.
* @param currency - the configured pricing currency.
* @throws {Error} when the two disagree.
*/
function assertCurrency(stated, source, currency) {
	if (stated === void 0 || stated.toUpperCase() === currency.toUpperCase()) return;
	throw new Error(`quota monitor: price document "${source.path}" is denominated in ${stated} while pricing.currency is ${currency}; amounts are never converted — set pricing.currency to the unit the document states, or import a document in that unit`);
}
//#endregion
//#region ../../util/values/lib/index.js
/**
* Lazily scanned view of one JSON object's top-level fields, built from text
* that may still be streaming or from an already parsed object. Nothing is
* scanned until a reader asks; the view remembers every question it answered
* and reports changed answers when the owner refreshes for publication.
* Used for model tool-call arguments: a row reads the fields it
* cares about at whatever granularity it displays, at every stage of the call.
* @module @deepseek-ai/dsh-util-values/src/partial-json
*/
const SIMPLE_ESCAPES = {
	"\"": "\"",
	"\\": "\\",
	"/": "/",
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	"
};
const CONTENT_ESCAPE = /[\\\u0000-\u001f]/u;
function isWhitespace(c) {
	return c === " " || c === "\n" || c === "\r" || c === "	";
}
function isHex(c) {
	return c >= "0" && c <= "9" || c >= "a" && c <= "f" || c >= "A" && c <= "F";
}
(class PartialArguments {
	/** The view of a call with no arguments available. */
	static EMPTY = PartialArguments.fromObject({});
	/**
	* View finished argument text without scanning it until a reader asks.
	* @param text - the complete argument JSON text.
	* @returns a sealed view.
	*/
	static fromText(text) {
		const view = new PartialArguments();
		view.append(text);
		view.sealed = true;
		return view;
	}
	/**
	* View an already parsed argument payload, such as a PTC dispatch object.
	* @param value - the parsed argument value.
	* @returns a sealed view; a non-object payload has no fields.
	*/
	static fromObject(value) {
		const view = new PartialArguments();
		view.object = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		view.sealed = true;
		return view;
	}
	/**
	* The source: text so far or a parsed object, plus whether it can still grow.
	* These are the only enumerable fields, so two views over the same source
	* compare equal structurally however far each has been read.
	*/
	chunks = [];
	object;
	sealed = false;
	#ends = [];
	#size = 0;
	#consumed = 0;
	#mode = "root";
	#escape = false;
	#keyStart = 0;
	#keyEscaped = false;
	#key = "";
	#current = null;
	#nestedEnds = [];
	#nestedInString = false;
	#invalidAt;
	#invalidValue = false;
	#entries = /* @__PURE__ */ new Map();
	#order = [];
	#reads = /* @__PURE__ */ new Map();
	/** Whether this view rejects further appends; does not scan text or register reads. */
	get isSealed() {
		return this.sealed;
	}
	/** Whether indexing or a content read found invalid JSON; unread value contents are not validated. */
	get invalid() {
		this.scan();
		return this.#mode === "invalid" || this.#invalidValue;
	}
	/**
	* Retain streamed argument text without scanning or comparing observed answers.
	* @param fragment - the text following every fragment appended before.
	*/
	append(fragment) {
		if (this.sealed) throw new Error("PartialArguments: cannot append to a sealed view");
		if (fragment.length === 0) return;
		this.chunks.push(fragment);
		this.#size += fragment.length;
		this.#ends.push(this.#size);
	}
	/**
	* Reconcile a streamed prefix with authoritative complete text without joining the fragments.
	* @param text - the final argument text, which replaces missing or conflicting deltas.
	* @returns this view sealed with its caches retained when every character matches; otherwise a new sealed view.
	*/
	settle(text) {
		if (this.object !== void 0 || text.length !== this.#size) return PartialArguments.fromText(text);
		let offset = 0;
		for (const chunk of this.chunks) {
			if (!text.startsWith(chunk, offset)) return PartialArguments.fromText(text);
			offset += chunk.length;
		}
		this.chunks = text.length === 0 ? [] : [text];
		this.#ends = text.length === 0 ? [] : [text.length];
		this.sealed = true;
		return this;
	}
	/**
	* Compare observed answers and advance their publication baseline. Unread views remain unscanned.
	* @returns whether any observed answer changed since its first read or the preceding refresh.
	*/
	refresh() {
		if (this.#reads.size === 0) return false;
		this.scan();
		let changed = false;
		let completions = false;
		for (const read of this.#reads.values()) {
			if (read.completion) {
				completions = true;
				continue;
			}
			changed = this.refreshRead(read) || changed;
		}
		if (completions) {
			for (const read of this.#reads.values()) if (read.completion) changed = this.refreshRead(read) || changed;
		}
		if (this.sealed) this.#reads.clear();
		return changed;
	}
	refreshRead(read) {
		const now = read.answer();
		if (Object.is(now, read.last)) return false;
		read.last = now;
		return true;
	}
	/**
	* Check whether no further fields can arrive.
	* @returns whether the outer object closed, indexing failed, or the view is sealed; unread values are not validated.
	*/
	closed() {
		return this.remember("closed", "", () => this.closedNow());
	}
	/**
	* List discovered fields in first-appearance order.
	* @returns top-level keys seen so far, in first-appearance order.
	*/
	keys() {
		return this.remember("keys", "", () => this.keysNow(), (keys) => keys.length);
	}
	/**
	* Check whether a top-level field has appeared.
	* @param key - argument name.
	* @returns whether the field has appeared (a string opened or another value began).
	*/
	has(key) {
		return this.remember("has", key, () => this.hasNow(key));
	}
	/**
	* Check whether a field's closing delimiter has arrived, without validating its contents.
	* @param key - argument name.
	* @returns whether its delimiter arrived and no content reader has reported an error for this value.
	*/
	complete(key) {
		return this.remember("complete", key, () => this.completeNow(key));
	}
	/**
	* Read string length without materializing its text.
	* @param key - argument name.
	* @param options - change granularity for a streaming string.
	* @returns decoded UTF-16 length of the string field so far; undefined when absent or not a string.
	*/
	stringLength(key, options) {
		const step = Math.max(1, Math.floor(options?.step ?? 1));
		const offset = options?.offset ?? 0;
		return this.remember(`length:${step}:${offset}`, key, () => this.lengthNow(key), (length) => length === void 0 ? void 0 : Math.ceil((length + offset) / step));
	}
	/**
	* Check a string against a decoded UTF-16 length limit without materializing it.
	* @param key - argument name.
	* @param maxLength - decoded UTF-16 limit, floored to at least zero.
	* @returns whether the string is longer than the limit; false when absent or not a string.
	*/
	stringExceeds(key, maxLength) {
		const limit = Math.max(0, Math.floor(maxLength));
		return this.remember(`exceeds:${limit}`, key, () => (this.lengthNow(key, limit + 1) ?? 0) > limit);
	}
	/**
	* Read a decoded string, including a streaming prefix.
	* @param key - argument name.
	* @returns the string field's decoded text so far; undefined when absent or not a string.
	*/
	text(key) {
		return this.remember("text", key, () => this.textNow(key));
	}
	/**
	* Read at most the first decoded UTF-16 units of a string.
	* @param key - argument name.
	* @param maxLength - maximum decoded UTF-16 length, floored to at least one.
	* @returns the bounded string prefix; undefined when absent or not a string.
	*/
	textPrefix(key, maxLength) {
		const limit = Math.max(1, Math.floor(maxLength));
		return this.remember(`prefix:${limit}`, key, () => this.textPrefixNow(key, limit));
	}
	/**
	* Read a completed non-string argument.
	* @param key - argument name.
	* @returns the parsed non-string value once it closed; undefined while open, absent, or a string.
	*/
	value(key) {
		return this.remember("value", key, () => this.valueNow(key));
	}
	/** Answer a question and, on a streaming view, remember it for change detection. */
	remember(kind, key, read, comparison) {
		this.scan();
		const result = read();
		if (!this.sealed) {
			const id = `${kind}/${key}`;
			if (!this.#reads.has(id)) this.#reads.set(id, {
				completion: kind === "complete",
				answer: comparison === void 0 ? read : () => comparison(read()),
				last: comparison === void 0 ? result : comparison(result)
			});
		}
		return result;
	}
	closedNow() {
		return this.sealed || this.#mode === "closed" || this.#mode === "invalid";
	}
	keysNow() {
		return this.object === void 0 ? this.#order : Object.keys(this.object);
	}
	hasNow(key) {
		return this.object === void 0 ? this.#entries.has(key) : Object.hasOwn(this.object, key);
	}
	completeNow(key) {
		if (this.object !== void 0) return Object.hasOwn(this.object, key);
		const entry = this.#entries.get(key);
		return entry !== void 0 && entry.end >= 0 && (entry.kind === "string" ? entry.invalidAt === void 0 : !entry.invalid);
	}
	lengthNow(key, limit = Number.POSITIVE_INFINITY) {
		if (this.object !== void 0) {
			const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
			return typeof field === "string" ? field.length : void 0;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "string") return void 0;
		if (entry.text !== void 0 && entry.text.at === entry.end) return entry.text.length;
		const read = entry.length ??= {
			at: entry.start,
			length: 0,
			text: ""
		};
		this.readString(entry, read, limit, false);
		return read.length;
	}
	textNow(key) {
		if (this.object !== void 0) {
			const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
			return typeof field === "string" ? field : void 0;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "string") return void 0;
		if (entry.text === void 0 && entry.end >= 0 && entry.needsDecoding && entry.invalidAt === void 0) {
			let text;
			try {
				text = JSON.parse(`"${this.slice(entry.start, entry.end)}"`);
			} catch (_error) {}
			if (text !== void 0) entry.text = {
				at: entry.end,
				length: text.length,
				text
			};
		}
		const read = entry.text ??= {
			at: entry.start,
			length: 0,
			text: ""
		};
		this.readString(entry, read, Number.POSITIVE_INFINITY, true);
		return read.text;
	}
	textPrefixNow(key, maxLength) {
		if (this.object !== void 0) {
			const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
			return typeof field === "string" ? field.slice(0, maxLength) : void 0;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "string") return void 0;
		const prefixes = entry.prefixes ??= /* @__PURE__ */ new Map();
		let read = prefixes.get(maxLength);
		if (read === void 0) {
			read = {
				at: entry.start,
				length: 0,
				text: ""
			};
			prefixes.set(maxLength, read);
		}
		this.readString(entry, read, maxLength, true);
		return read.text;
	}
	valueNow(key) {
		if (this.object !== void 0) {
			if (!Object.hasOwn(this.object, key)) return void 0;
			const field = this.object[key];
			return typeof field === "string" ? void 0 : field;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "value" || entry.end < 0 || entry.invalid) return void 0;
		if (entry.parsed === void 0) try {
			entry.parsed = JSON.parse(this.slice(entry.start, entry.end));
		} catch (_error) {
			entry.invalid = true;
			this.#invalidValue = true;
		}
		return entry.parsed;
	}
	chunkAt(at) {
		let low = 0;
		let high = this.#ends.length;
		while (low < high) {
			const mid = low + high >>> 1;
			if (this.#ends[mid] <= at) low = mid + 1;
			else high = mid;
		}
		return low;
	}
	/** Materialize only a requested range, never the cumulative source. */
	slice(start, end) {
		if (start >= end) return "";
		const first = this.chunkAt(start);
		const last = this.chunkAt(end - 1);
		const base = first === 0 ? 0 : this.#ends[first - 1];
		if (first === last) return this.chunks[first].slice(start - base, end - base);
		const parts = [this.chunks[first].slice(start - base)];
		for (let i = first + 1; i < last; i++) parts.push(this.chunks[i]);
		parts.push(this.chunks[last].slice(0, end - this.#ends[last - 1]));
		return parts.join("");
	}
	readString(entry, read, limit, materialize) {
		const end = Math.min(entry.end < 0 ? this.#consumed : entry.end, entry.invalidAt ?? Number.POSITIVE_INFINITY, this.#invalidAt ?? Number.POSITIVE_INFINITY);
		if (!entry.needsDecoding) {
			const length = Math.min(end - read.at, limit - read.length);
			if (length <= 0) return;
			if (materialize) read.text += this.slice(read.at, read.at + length);
			read.at += length;
			read.length += length;
			return;
		}
		let chunkIndex = this.chunkAt(read.at);
		while (read.at < end && read.length < limit) {
			const base = chunkIndex === 0 ? 0 : this.#ends[chunkIndex - 1];
			const chunk = this.chunks[chunkIndex];
			const remaining = chunk.slice(read.at - base, Math.min(chunk.length, end - base));
			const boundary = remaining.search(CONTENT_ESCAPE);
			const length = Math.min(boundary < 0 ? remaining.length : boundary, limit - read.length);
			if (length > 0) {
				if (materialize) read.text += remaining.slice(0, length);
				read.at += length;
				read.length += length;
				if (read.at === base + chunk.length) chunkIndex++;
				continue;
			}
			const type = remaining.length > 1 ? remaining[1] : read.at + 1 < end ? this.chunks[chunkIndex + 1][0] : void 0;
			let decoded;
			let width = 2;
			if (remaining[0] === "\\" && type === void 0 && entry.end < 0) return;
			if (remaining[0] === "\\" && type === "u") {
				const hex = this.slice(read.at + 2, Math.min(end, read.at + 6));
				let valid = true;
				for (let i = 0; i < hex.length; i++) if (!isHex(hex[i])) valid = false;
				if (valid) {
					if (hex.length < 4 && entry.end < 0) return;
					if (hex.length === 4) decoded = String.fromCharCode(Number.parseInt(hex, 16));
				}
				width = 6;
			} else if (remaining[0] === "\\" && type !== void 0) decoded = SIMPLE_ESCAPES[type];
			if (decoded === void 0) {
				entry.invalidAt = read.at;
				this.#invalidValue = true;
				return;
			}
			if (materialize) read.text += decoded;
			read.length++;
			read.at += width;
			while (chunkIndex < this.chunks.length && read.at >= this.#ends[chunkIndex]) chunkIndex++;
		}
	}
	/** Locate new field ranges without decoding or parsing their contents. */
	scan() {
		if (this.object !== void 0 || this.#consumed === this.#size) return;
		for (let i = this.chunkAt(this.#consumed); i < this.chunks.length && this.#invalidAt === void 0; i++) {
			const pending = this.chunks[i];
			const base = i === 0 ? 0 : this.#ends[i - 1];
			for (let index = this.#consumed - base; index < pending.length && this.#mode !== "invalid"; index++) {
				if (this.#mode === "string" || this.#mode === "nested" && this.#nestedInString) {
					const end = this.stringBoundary(pending, index);
					this.#consumed += end - index;
					index = end;
					if (index === pending.length) break;
				}
				this.step(pending[index], this.#consumed);
				this.#consumed++;
			}
		}
	}
	/** Only raw quotes and their preceding backslash runs can terminate a string. */
	stringBoundary(fragment, start) {
		let at = start;
		while (true) {
			const quote = fragment.indexOf("\"", at);
			const end = quote < 0 ? fragment.length : quote;
			if (this.#mode === "string") {
				const entry = this.#current;
				if (!entry.needsDecoding && CONTENT_ESCAPE.test(fragment.slice(at, end))) entry.needsDecoding = true;
			}
			let slashStart = end;
			while (slashStart > at && fragment[slashStart - 1] === "\\") slashStart--;
			const escaped = (end - slashStart) % 2 === 1 !== (slashStart === at && this.#escape);
			this.#escape = quote < 0 && escaped;
			if (quote < 0 || !escaped) return end;
			at = quote + 1;
		}
	}
	step(c, at) {
		switch (this.#mode) {
			case "root":
				if (isWhitespace(c)) return;
				if (c === "{") {
					this.#mode = "key-or-end";
					return;
				}
				this.fail();
				return;
			case "key-or-end":
				if (isWhitespace(c)) return;
				if (c === "}") {
					this.#mode = "closed";
					return;
				}
				if (c === "\"") {
					this.beginKey(at);
					return;
				}
				this.fail();
				return;
			case "key-only":
				if (isWhitespace(c)) return;
				if (c === "\"") {
					this.beginKey(at);
					return;
				}
				this.fail();
				return;
			case "key":
				this.stepKey(c, at);
				return;
			case "colon":
				if (isWhitespace(c)) return;
				if (c === ":") {
					this.#mode = "value";
					return;
				}
				this.fail();
				return;
			case "value":
				this.beginValue(c, at);
				return;
			case "string": {
				const entry = this.#current;
				entry.end = at;
				this.#current = null;
				this.#mode = "comma-or-end";
				return;
			}
			case "scalar":
				this.stepScalar(c, at);
				return;
			case "nested":
				this.stepNested(c, at);
				return;
			case "comma-or-end":
				if (isWhitespace(c)) return;
				if (c === ",") {
					this.#mode = "key-only";
					return;
				}
				if (c === "}") {
					this.#mode = "closed";
					return;
				}
				this.fail();
				return;
			case "closed":
				if (isWhitespace(c)) return;
				this.fail();
				return;
			/* v8 ignore next 2 -- scan() stops stepping once the view is invalid. */
			case "invalid": return;
			/* v8 ignore next 2 -- Every scanner mode has a handler above. */
			default: assertNever(this.#mode);
		}
	}
	fail() {
		this.#invalidAt = this.#consumed;
		this.#mode = "invalid";
		this.#current = null;
	}
	beginKey(at) {
		this.#mode = "key";
		this.#keyStart = at + 1;
		this.#keyEscaped = false;
		this.#escape = false;
	}
	stepKey(c, at) {
		if (c < " ") {
			this.fail();
			return;
		}
		if (this.#escape) {
			this.#escape = false;
			return;
		}
		if (c === "\\") {
			this.#escape = true;
			this.#keyEscaped = true;
			return;
		}
		if (c !== "\"") return;
		const raw = this.slice(this.#keyStart, at);
		if (this.#keyEscaped) try {
			this.#key = JSON.parse(`"${raw}"`);
		} catch (_error) {
			this.fail();
			return;
		}
		else this.#key = raw;
		this.#mode = "colon";
	}
	open(entry) {
		if (!this.#entries.has(this.#key)) this.#order.push(this.#key);
		this.#entries.set(this.#key, entry);
		this.#current = entry;
	}
	beginValue(c, at) {
		if (isWhitespace(c)) return;
		if (c === "\"") {
			this.open({
				kind: "string",
				start: at + 1,
				end: -1,
				needsDecoding: false,
				invalidAt: void 0,
				length: void 0,
				text: void 0,
				prefixes: void 0
			});
			this.#escape = false;
			this.#mode = "string";
			return;
		}
		if (c === "}" || c === "," || c === ":" || c === "]") {
			this.fail();
			return;
		}
		this.open({
			kind: "value",
			start: at,
			end: -1,
			parsed: void 0,
			invalid: false
		});
		if (c === "{" || c === "[") {
			this.#mode = "nested";
			this.#nestedEnds = [c === "{" ? "}" : "]"];
			this.#nestedInString = false;
			this.#escape = false;
			return;
		}
		this.#mode = "scalar";
	}
	stepScalar(c, at) {
		if (c !== "," && c !== "}" && !isWhitespace(c)) return;
		this.closeValue(at);
		this.#mode = c === "," ? "key-only" : c === "}" ? "closed" : "comma-or-end";
	}
	stepNested(c, at) {
		if (this.#nestedInString) {
			this.#nestedInString = false;
			return;
		}
		if (c === "\"") {
			this.#nestedInString = true;
			return;
		}
		if (c === "{" || c === "[") {
			this.#nestedEnds.push(c === "{" ? "}" : "]");
			return;
		}
		if (c === "}" || c === "]") {
			if (this.#nestedEnds.pop() !== c) {
				this.fail();
				return;
			}
			if (this.#nestedEnds.length === 0) {
				this.closeValue(at + 1);
				this.#mode = "comma-or-end";
			}
		}
	}
	closeValue(end) {
		const entry = this.#current;
		entry.end = end;
		this.#current = null;
	}
});
/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
/**
* Mark an unreachable closed-union branch.
* @param value - impossible value; an unhandled typed variant fails at the call site.
* @param context - optional switch-site label included in the failure message.
* @returns never; a runtime value that escaped its type always throws.
*/
function assertNever(value, context) {
	const rendered = JSON.stringify(value) ?? String(value);
	throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
/**
* Deep-freeze an object graph in place while leaving live AbortSignal objects mutable.
* @param value - value to freeze.
* @returns the same value after every reachable enumerable child is frozen.
*/
function deepFreeze(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	const pending = [{
		kind: "visit",
		node: value
	}];
	while (pending.length > 0) {
		const task = pending.pop();
		/* v8 ignore next -- the loop condition guarantees one pending task. */
		if (task === void 0) continue;
		if (task.kind === "property") {
			pending.push({
				kind: "visit",
				node: task.source[task.key]
			});
			continue;
		}
		const node = task.node;
		if (node === null || typeof node !== "object") continue;
		if (node instanceof AbortSignal) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		Object.freeze(node);
		const keys = Object.keys(node);
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) continue;
			pending.push({
				kind: "property",
				source: node,
				key
			});
		}
	}
	return value;
}
//#endregion
//#region ../../util/timeout/lib/index.js
/** Largest delay Node schedules without clamping it to one millisecond. */
const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region ../../llm/llm/lib/index.js
/**
* Detach and deep-freeze a message whose identity already exists.
* @param message - complete message, including its stable identity.
* @returns an immutable snapshot that preserves the identity.
*/
function freezeMessage(message) {
	return deepFreeze(structuredClone(message));
}
/**
* Harness error base with a stable machine-routable code and chained cause.
* Package errors extend it so tool results and replay can retain failure class.
* @module @deepseek-ai/dsh-llm/error
*/
/**
* Base class for all harness errors. Carries a `code` (stable, programmatic —
* e.g. `NO_ADAPTER`, `INVALID_ARGS`) distinct from the
* human-readable `message`, and supports `cause` chaining via the standard
* `ErrorOptions`. `name` defaults to the subclass constructor name.
*/
var HarnessError = class extends Error {
	/** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
	code;
	constructor(message, code, options) {
		super(message, options);
		this.code = code;
		this.name = new.target.name;
	}
};
/**
* Canonical provider-neutral code for a response that completed normally but
* carried no content blocks at all. Providers occasionally emit a degenerate
* completion (a terminal stop with zero output); adapters classify it as this
* failure instead of yielding an empty assistant message, because an empty
* message silently ends the turn with nothing for the user or the loop to act
* on. The attempt produced nothing durable, so retry policy treats it as safe
* to repeat.
*/
const EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
/**
* Provider-owned request-retry policy configuration and resolution.
*
* Adapters expose one resolved policy per registered provider route; the
* optional dsh-llm-retry plugin executes it on the agent's failed-step extension point.
*
* @module @deepseek-ai/dsh-llm/retry-policy
*/
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 1e4;
const DEFAULT_JITTER_RATIO = .1;
const DEFAULT_RETRYABLE_CODES = Object.freeze([
	EMPTY_RESPONSE_CODE,
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
const backoffSchema = zs.object({
	initialDelayMs: zs.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
	maxDelayMs: zs.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
	jitterRatio: zs.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
const normalPolicySchema = zs.object({
	mode: zs.const("normal").required(),
	maxRetries: zs.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
	retryableCodes: zs.array(zs.string()).default([...DEFAULT_RETRYABLE_CODES]),
	backoff: backoffSchema
});
const alwaysPolicySchema = zs.object({
	mode: zs.const("always").required(),
	backoff: backoffSchema
});
zs.union([normalPolicySchema, alwaysPolicySchema]);
const NORMAL_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const ALWAYS_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const BACKOFF_KEYS = new Set([
	"initialDelayMs",
	"maxDelayMs",
	"jitterRatio"
]);
function validateKeys(value, allowed, path) {
	for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${path}: unknown key "${key}"`);
}
function resolveBackoff(config, path) {
	if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path);
	const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
	const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
	const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
	if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > 2147483647) throw new Error(`${path}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > 2147483647) throw new Error(`${path}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (initialDelayMs > maxDelayMs) throw new Error(`${path}.initialDelayMs must be less than or equal to maxDelayMs`);
	if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) throw new Error(`${path}.jitterRatio must be between 0 and 1`);
	return Object.freeze({
		initialDelayMs,
		maxDelayMs,
		jitterRatio
	});
}
/**
* Validate, default, and detach one provider-owned retry policy.
* @param config - optional provider configuration; omission selects normal defaults.
* @param path - diagnostic path naming the provider config that owns the value.
* @returns an immutable policy safe to capture in provider registration state.
*/
function resolveRetryPolicy(config, path) {
	if (config === void 0) return Object.freeze({
		mode: "normal",
		maxRetries: DEFAULT_MAX_RETRIES,
		retryableCodes: DEFAULT_RETRYABLE_CODES,
		...resolveBackoff(void 0, `${path}.backoff`)
	});
	switch (config.mode) {
		case "normal": {
			validateKeys(config, NORMAL_POLICY_KEYS, path);
			const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
			const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
			if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error(`${path}.maxRetries must be a non-negative safe integer`);
			if (retryableCodes.length === 0) throw new Error(`${path}.retryableCodes must not be empty`);
			if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) throw new Error(`${path}.retryableCodes must contain only non-empty strings`);
			if (new Set(retryableCodes).size !== retryableCodes.length) throw new Error(`${path}.retryableCodes must not contain duplicates`);
			return Object.freeze({
				mode: "normal",
				maxRetries,
				retryableCodes: Object.freeze([...retryableCodes]),
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		}
		case "always":
			validateKeys(config, ALWAYS_POLICY_KEYS, path);
			return Object.freeze({
				mode: "always",
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		default: throw new Error(`${path}.mode must be "normal" or "always"`);
	}
}
/**
* Field-wise equality over {@link LlmCallConfig} — the comparison a caller
* runs to decide whether a proposed configuration is a real change (worth a
* logged header snapshot) or the held one restated.
* @param a - one configuration.
* @param b - the other.
* @returns whether every field (including the `stop` list, element-wise) matches.
*/
function callConfigEquals(a, b) {
	if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
	if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
	return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
/**
* Normalization for values thrown by a final LLM adapter boundary.
*
* @module @deepseek-ai/dsh-llm/adapter-failure
*/
/**
* Detach serializable provider facts from a value thrown by an adapter.
* @param value - arbitrary value thrown during adapter dispatch or iteration.
* @returns immutable provider-neutral facts suitable for a terminal finish chunk.
* @internal
*/
function normalizeLlmFailure(value) {
	const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
	const carried = ownFailureSnapshot(error);
	if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
	return Object.freeze({
		message: errorMessage(error),
		code: harnessErrorCode(error)
	});
}
/** Render a non-Error throw without letting hostile coercion escape normalization. */
function thrownMessage(value) {
	try {
		const message = String(value);
		return message.length > 0 ? message : "LLM adapter failed";
	} catch (_hostileThrownValue) {
		return "LLM adapter failed";
	}
}
/** Read a foreign error's own data-backed `code` without invoking accessors. */
function ownErrorCode(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "code");
		return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Snapshot an own data property without invoking an SDK-defined accessor. */
function ownFailureSnapshot(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
		return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Validate and detach an arbitrary serializable failure payload. */
function failureSnapshot(value) {
	if (typeof value !== "object" || value === null) return void 0;
	try {
		const candidate = value;
		const message = candidate.message;
		const code = candidate.code;
		const status = candidate.status;
		const providerRetryAfterMs = candidate.providerRetryAfterMs;
		const requestId = candidate.requestId;
		const offloadImages = candidate.offloadImages;
		if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0) || offloadImages !== void 0 && (!Number.isSafeInteger(offloadImages) || offloadImages <= 0)) return void 0;
		return Object.freeze({
			message,
			code,
			...status === void 0 ? {} : { status },
			...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
			...requestId === void 0 ? {} : { requestId },
			...offloadImages === void 0 ? {} : { offloadImages }
		});
	} catch (_sdkFailureGetter) {
		return;
	}
}
/** Read an SDK error message without letting an accessor replace the primary failure. */
function errorMessage(error) {
	try {
		const message = error.message;
		if (typeof message === "string" && message.length > 0) return message;
	} catch (_sdkMessageGetter) {}
	return "LLM adapter failed";
}
/** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. */
function harnessErrorCode(error) {
	return error instanceof HarnessError ? error.code : "UNKNOWN";
}
function quoted(value) {
	return JSON.stringify(value);
}
/**
* Stable text shown to a model that cannot accept one durable image reference.
* @param ref - durable normalized attachment omitted from the request.
* @returns deterministic text-only placeholder.
*/
function textOnlyImageText(ref) {
	return `[image omitted because this model accepts text only; attachment sha256:${String(ref.attachmentId).slice(7, 15)}]`;
}
/**
* True when typed model content contains an image block. This is the one image
* walk shared by every image policy (capability gating, text-only
* serialization, compaction survey), so a consumer cannot silently diverge.
* @param content - typed model content blocks.
* @returns whether any block is an image.
*/
function contentHasImage(content) {
	return content.some((block) => block.type === "image");
}
/**
* True when typed model content contains a file block.
* Reads current content on every call without retaining scan results.
* @param content - typed model content blocks.
* @returns whether any block is a file.
*/
function contentHasFile(content) {
	for (const block of content) if (block.type === "file") return true;
	return false;
}
/**
* Stable model-facing handle for one durable file reference: the address of
* the verbatim stored copy and the instruction to read it on demand. This is
* the only representation a provider ever receives for a file.
* @param ref - durable verbatim file reference.
* @param readonlyPath - execution-world path of the stored copy, when resolvable.
* @returns deterministic handle text naming the file, its size, and its address.
*/
function fileHandleText(ref, readonlyPath) {
	const digest = String(ref.attachmentId).slice(7, 15);
	const identity = `File ${quoted(ref.name)} (${ref.bytes} bytes, sha256:${digest})`;
	if (readonlyPath === void 0) return `[${identity} was uploaded, but the current execution environment cannot access a readable path. Report that limitation if its contents are needed; do not claim to have read it.]`;
	return `[${identity}: verbatim read-only copy saved at ${quoted(readonlyPath)}. Read that path with your file tools when its contents are needed; copy it to a writable location before modifying it. When delegating file work, include this saved path in the delegation prompt; only subagents sharing this execution environment can read it.]`;
}
/** Replace every file occurrence with handle text. */
function replaceFilesWithHandles(blocks, resolvePath) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "file") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: fileHandleText(block.attachment, resolvePath(block.attachment))
			});
			continue;
		}
		next?.push(block);
	}
	return next ?? blocks;
}
function projectFilesToText(messages, resolvePath) {
	if (!messages.some((message) => contentHasFile(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceFilesWithHandles(message.content, resolvePath);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
/** Replace every image occurrence for a text-only model. */
function replaceImagesForTextModel(blocks) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "image") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: textOnlyImageText(block.attachment)
			});
			continue;
		}
		next?.push(block);
	}
	return next ?? blocks;
}
function projectImagesForTextModel(messages) {
	if (!messages.some((message) => contentHasImage(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceImagesForTextModel(message.content);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
function withoutDeveloperMessages(messages) {
	const retained = messages.filter((message) => message.role !== "developer");
	return retained.length === messages.length ? messages : retained;
}
function toolDeclarations(tools, mode, history) {
	const declarations = new Map(history.tools.map((tool) => [tool.name, tool]));
	for (const update of history.updates) for (const tool of update.additions) if (!declarations.has(tool.name)) declarations.set(tool.name, {
		...tool,
		deferLoading: true
	});
	switch (mode) {
		case "in-history": return declarations;
		case "addition-only": {
			const activeNames = new Set(tools?.map((tool) => tool.name));
			for (const name of declarations.keys()) if (!activeNames.has(name)) declarations.delete(name);
			return declarations;
		}
		/* v8 ignore next 2 -- closed-union exhaustiveness guard */
		default: return assertNever(mode);
	}
}
/**
* Construct provider declarations from session-folded history without changing logged active tools.
* Unsupported routes and incomplete history use current declarations without developer updates.
* Explicitly deferred baseline tools become available only after their first retained addition.
* @param messages - complete request inputs, or the prefix selected for an auxiliary call.
* @param tools - currently active tool schemas.
* @param toolUpdate - the resolved route's update mode.
* @param history - immutable state folded from committed headers and developer messages.
* @returns provider declarations and the corresponding filtered history.
*/
function projectToolUpdates(messages, tools, toolUpdate, history) {
	if (toolUpdate === void 0) {
		let immediateTools = tools;
		if (tools?.some((tool) => tool.deferLoading === true)) immediateTools = tools.map(({ deferLoading: _loading, ...tool }) => tool);
		return {
			messages: withoutDeveloperMessages(messages),
			tools: immediateTools
		};
	}
	if (history === void 0) return {
		messages: withoutDeveloperMessages(messages),
		tools
	};
	const messageIds = new Set(messages.flatMap((message) => message.role === "developer" ? [message.id] : []));
	if (history.updates.some((update) => !messageIds.has(update.messageId))) return {
		messages: withoutDeveloperMessages(messages),
		tools
	};
	const declarations = toolDeclarations(tools, toolUpdate, history);
	const updateIds = new Set(history.updates.map((update) => update.messageId));
	const offered = new Set(history.tools.filter((tool) => !tool.deferLoading).map((tool) => tool.name));
	const projectedMessages = [];
	for (const message of messages) {
		if (message.role !== "developer") {
			projectedMessages.push(message);
			continue;
		}
		if (!updateIds.has(message.id)) continue;
		const content = message.content.filter((block) => {
			switch (block.type) {
				case "tool-addition":
					if (!declarations.has(block.toolName) || offered.has(block.toolName)) return false;
					offered.add(block.toolName);
					return true;
				case "tool-removal":
					if (toolUpdate !== "in-history") return false;
					return offered.delete(block.toolName);
				default: return true;
			}
		});
		if (content.length === 0) continue;
		if (content.length === message.content.length) projectedMessages.push(message);
		else projectedMessages.push({
			...message,
			content
		});
	}
	return {
		messages: projectedMessages.length === messages.length && projectedMessages.every((message, index) => message === messages[index]) ? messages : projectedMessages,
		tools: [...declarations.values()]
	};
}
/**
* Centralize the non-secret product identity every provider request sends as `User-Agent`, keeping
* adapters from drifting. See
* `docs/subsystems/llm-streaming.md#appidentity--app-attribution`.
*
* App-attribution vocabulary for provider requests.
* @module @deepseek-ai/dsh-llm/attribution
*/
const { version } = createRequire(import.meta.url)("../package.json");
/**
* The last raw chunk of one never-packed type, scanning backwards and stopping at the first hit.
* @param stream - compact records from one durable Assistant settlement.
* @param type - chunk type that only appears as a raw record.
* @returns the stream's final chunk of that type, or undefined when it has none.
*/
function lastAssistantStreamChunk(stream, type) {
	for (let index = stream.length - 1; index >= 0; index -= 1) {
		const record = stream[index];
		if (record.type === "chunk" && record.chunk.type === type) return record.chunk;
	}
}
/**
* LLM service: adapter registry with a waterfall-interceptable streaming call
* API. Exports the `LlmRuntime` default, the abstract `LlmAdapter` for
* provider backends, and `BlockAssembler` for chunk assembly.
*
* @module @deepseek-ai/dsh-llm
*/
var __runInitializers$1 = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate$1 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Typed error for LLM-related failures. Extends {@link HarnessError}, so the
* `code` string (e.g. `AUTH`, `RATE_LIMIT`, `NO_ADAPTER`) is shared taxonomy.
*/
var LlmError = class extends HarnessError {
	/** Serializable facts retained beside this live Error. */
	failure;
	/**
	* @param message - non-empty human-readable failure summary.
	* @param code - non-empty stable provider-neutral machine code.
	* @param options - optional cause and validated serializable provider facts.
	*/
	constructor(message, code, options) {
		if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
		if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
		if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
		if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
		if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
		super(message, code, options);
		this.name = "LlmError";
		this.failure = Object.freeze({
			message,
			code,
			...options?.status === void 0 ? {} : { status: options.status },
			...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
			...options?.requestId === void 0 ? {} : { requestId: options.requestId },
			...options?.offloadImages === void 0 ? {} : { offloadImages: options.offloadImages }
		});
	}
};
(() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listProviders_decorators;
	let _listConfigurableProviders_decorators;
	let _remoteDiscoverModels_decorators;
	return class LlmRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listProviders_decorators = [Remote];
			_listConfigurableProviders_decorators = [Remote];
			_remoteDiscoverModels_decorators = [Remote("discoverModels")];
			__esDecorate$1(this, null, _listProviders_decorators, {
				kind: "method",
				name: "listProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listProviders" in obj,
					get: (obj) => obj.listProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _listConfigurableProviders_decorators, {
				kind: "method",
				name: "listConfigurableProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listConfigurableProviders" in obj,
					get: (obj) => obj.listConfigurableProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _remoteDiscoverModels_decorators, {
				kind: "method",
				name: "remoteDiscoverModels",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteDiscoverModels" in obj,
					get: (obj) => obj.remoteDiscoverModels
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		adapters = (__runInitializers$1(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		directory = /* @__PURE__ */ new Map();
		discoveries = /* @__PURE__ */ new Map();
		constructor(ctx) {
			super(ctx, "llm");
		}
		/** Notify topology observers without letting one broken listener veto the commit. */
		emitAdaptersUpdated() {
			for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) try {
				const returned = listener();
				if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
					this.warnAdaptersListenerFailure(error);
				});
			} catch (error) {
				this.warnAdaptersListenerFailure(error);
			}
		}
		/** Contained-listener diagnostic shared by the sync and async failure paths. */
		warnAdaptersListenerFailure(error) {
			this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
			this.ctx.logger.warn(error);
		}
		/**
		* Register an adapter for the given provider routes. Throws `LlmError` with code
		* `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
		* Disposed with the fiber.
		* @param providers - every provider route this adapter should serve.
		* @param adapter - the adapter that streams calls for those providers.
		* @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
		*/
		registerAdapter(providers, adapter) {
			const owned = /* @__PURE__ */ new Set();
			let released = false;
			const dispose = this.ctx.effect(function* () {
				if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
				this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
				yield () => {
					released = true;
					for (const provider of owned) this.adapters.delete(provider);
					owned.clear();
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerAdapter()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (released) throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
				this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
			};
			return handle;
		}
		/**
		* Validate one candidate route set for `adapter`, treating routes this
		* registration already holds as available. Nothing is mutated: a rejected
		* candidate leaves the registry exactly as it was.
		*/
		prepareRoutes(providers, adapter, owned) {
			const unique = /* @__PURE__ */ new Set();
			const registrations = [];
			for (const provider of providers) {
				if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
				if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
				const info = adapter.providerInfo(provider);
				if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
				unique.add(provider);
				const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
				registrations.push({
					adapter,
					provider: {
						id: info.id,
						name: info.name
					},
					retryPolicy
				});
			}
			return registrations;
		}
		/**
		* Swap this registration's routes for the prepared ones in one synchronous
		* section, so no observer can see the registry between the release and the
		* re-registration. The route set's one mutation point is also where
		* `llm/adapters-updated` is published, so a `replace` announces itself
		* exactly like a first registration.
		*/
		commitRoutes(owned, registrations) {
			for (const provider of owned) this.adapters.delete(provider);
			owned.clear();
			for (const registration of registrations) {
				this.adapters.set(registration.provider.id, registration);
				owned.add(registration.provider.id);
			}
			this.emitAdaptersUpdated();
		}
		/**
		* Describe provider routes with a registered adapter.
		* @returns detached provider metadata in registration order.
		*/
		listProviders() {
			return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
		}
		/**
		* Declare provider routes an adapter plugin can activate through
		* configuration. Registration is all-or-nothing: an empty list, invalid
		* entry, or a provider already declared by any registration throws
		* `LlmError` without registering the rest. Disposed with the fiber.
		* @param entries - every configurable provider this plugin owns.
		* @returns a handle that withdraws all of them, and can atomically replace them.
		*/
		registerConfigurableProviders(entries) {
			let held = [];
			let disposed = false;
			/**
			* Validate a candidate set in full against everything this registration
			* does not already hold, then publish it. Nothing is written until the
			* whole set passes, so a refused candidate leaves the current entries in
			* place — the property that makes `replace` a swap rather than a
			* delete-then-add that can strand the directory empty.
			*/
			const commit = (candidates) => {
				const detached = [];
				const own = new Set(held.map((entry) => entry.provider));
				for (const entry of candidates) {
					if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
					if (entry.settingsPath.some((segment) => segment.length === 0)) throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
					if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
					detached.push({
						...entry,
						settingsPath: [...entry.settingsPath]
					});
				}
				for (const entry of held) this.directory.delete(entry.provider);
				for (const entry of detached) this.directory.set(entry.provider, entry);
				held = detached;
				this.emitAdaptersUpdated();
			};
			const dispose = this.ctx.effect(function* () {
				if (entries.length === 0) throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
				commit(entries);
				yield () => {
					disposed = true;
					for (const entry of held) this.directory.delete(entry.provider);
					held = [];
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerConfigurableProviders()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (disposed) throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
				commit(next);
			};
			return handle;
		}
		/**
		* List every declared configurable provider, registered or dormant.
		* @returns detached directory entries in declaration order.
		*/
		listConfigurableProviders() {
			return [...this.directory.values()].map((entry) => ({
				...entry,
				settingsPath: [...entry.settingsPath]
			}));
		}
		/**
		* Offer to interrogate provider endpoints on behalf of the settings
		* namespace this plugin owns. The namespace is the key because that is what
		* a configuration surface already holds from the configurable-provider
		* directory, and because a provider being *added* has no route to name yet.
		* Disposed with the fiber.
		* @param settingsNs - the namespace whose profiles this discovery serves.
		* @param discover - interrogates one endpoint and must honor the supplied signal.
		* @returns the disposer that withdraws the offer.
		*/
		registerModelDiscovery(settingsNs, discover) {
			const dispose = this.ctx.effect(function* () {
				if (settingsNs.length === 0) throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
				if (this.discoveries.has(settingsNs)) throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
				this.discoveries.set(settingsNs, discover);
				yield () => {
					this.discoveries.delete(settingsNs);
				};
			}.bind(this), "llm.registerModelDiscovery()");
			return () => void dispose();
		}
		/**
		* Interrogate one provider endpoint for the models it advertises. The
		* request describes a draft, not a stored route, so nothing here reads or
		* writes settings or credentials — the caller owns both, and the reply is
		* candidate metadata a surface may offer for adoption.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - the endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation.
		* @returns the advertised models, deduplicated in endpoint order.
		*/
		async discoverModels(settingsNs, request, signal) {
			const discover = this.discoveries.get(settingsNs);
			if (discover === void 0) throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
			if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
			const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
			const seen = /* @__PURE__ */ new Set();
			const models = [];
			for (const model of discovered) {
				if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
				seen.add(model.id);
				models.push({
					id: model.id,
					...model.name === void 0 ? {} : { name: model.name },
					...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
					...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
					...model.inputModalities === void 0 ? {} : { inputModalities: [...model.inputModalities] }
				});
			}
			return models;
		}
		/**
		* Remote adapter for one draft provider interrogation.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation supplied by the Remote carrier.
		* @returns advertised models in endpoint order.
		* @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
		*/
		async remoteDiscoverModels(settingsNs, request, signal) {
			try {
				return await this.discoverModels(settingsNs, request, signal);
			} catch (error) {
				throw new RemoteError("llm/model-discovery-rejected", error instanceof Error ? error.message : String(error), {
					settingsNs,
					...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
				}, { cause: error });
			}
		}
		/**
		* Resolve the retry policy captured when one provider route was registered.
		* @param provider - registered provider route to inspect.
		* @returns the provider-owned policy, with normal defaults already resolved.
		*/
		providerRetryPolicy(provider) {
			return this.registration(provider).retryPolicy;
		}
		/**
		* Resolve provider-side request-image pricing for one exact route, or
		* `undefined` when the provider is unregistered or declares none. Unknown
		* providers degrade to `undefined` rather than throwing because callers
		* price durable history whose route may no longer be mounted.
		* @param provider - provider route named by a request header.
		* @param model - exact model id named by the same header.
		* @returns the owning adapter's image pricing for the route, when declared.
		*/
		imageRequestPricing(provider, model) {
			return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
		}
		/**
		* Resolve the exact text one durable file occurrence contributes to every
		* provider request in the current execution environment.
		* @param ref - durable verbatim file reference from model history.
		* @returns the same deterministic handle text used at adapter dispatch.
		*/
		fileRequestText(ref) {
			return fileHandleText(ref, this.fileReadPath(ref));
		}
		/** Detach typed adapter-owned modality metadata. */
		detachedModalities(modalities) {
			return modalities === void 0 ? void 0 : [...modalities];
		}
		/**
		* Discover models advertised by one registered provider. Catalog membership
		* does not constrain core routing. Catalog-driven entry points may restrict
		* selection and submission to the advertised models.
		* @param provider - registered provider route to inspect.
		* @returns detached model metadata in adapter-preferred order.
		*/
		async listModels(provider) {
			const models = await this.registration(provider).adapter.listModels(provider);
			const seen = /* @__PURE__ */ new Set();
			return models.map((model) => {
				if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
				seen.add(model.id);
				const inputModalities = this.detachedModalities(model.inputModalities);
				return {
					provider: model.provider,
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...inputModalities === void 0 ? {} : { inputModalities }
				};
			});
		}
		/**
		* Resolve and validate all metadata from the adapter that owns one exact
		* route. The result is detached from adapter-owned objects; catalog
		* membership remains advisory and does not control request routing.
		* @param provider - registered provider route to inspect.
		* @param model - exact model id passed to the adapter.
		* @param signal - optional cancellation for adapter-owned asynchronous lookup.
		* @returns exact model identity plus available context and reasoning metadata.
		*/
		async resolveModelInfo(provider, model, signal) {
			return this.resolveModelInfoFor(this.registration(provider), model, signal);
		}
		async resolveModelInfoFor(registration, model, signal) {
			const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
			return this.normalizeModelInfo(registration, model, resolved);
		}
		/** Validate and detach one adapter-returned exact model result. */
		normalizeModelInfo(registration, model, resolved) {
			const provider = registration.provider.id;
			if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") throw new LlmError(`adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const context = resolved.context;
			if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) throw new LlmError(`adapter returned invalid context metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_CONTEXT");
			const inputModalities = this.detachedModalities(resolved.inputModalities);
			const systemPromptUpdate = resolved.systemPromptUpdate;
			if (systemPromptUpdate !== void 0 && systemPromptUpdate !== "in-history") throw new LlmError(`adapter returned invalid system prompt update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const toolUpdate = resolved.toolUpdate;
			if (toolUpdate !== void 0 && toolUpdate !== "in-history" && toolUpdate !== "addition-only") throw new LlmError(`adapter returned invalid tool update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const defaultMaxTokens = resolved.defaultMaxTokens;
			if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) throw new LlmError(`adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`, "INVALID_MODEL_MAX_TOKENS");
			const info = {
				provider,
				id: model,
				name: resolved.name,
				...resolved.description === void 0 ? {} : { description: resolved.description },
				...inputModalities === void 0 ? {} : { inputModalities },
				...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
				...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
				...resolved.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: resolved.systemPromptUpdate },
				...resolved.toolUpdate === void 0 ? {} : { toolUpdate: resolved.toolUpdate }
			};
			const reasoning = resolved.reasoning;
			if (reasoning === void 0) return info;
			if (reasoning.efforts.length === 0) throw new LlmError(`adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			const seen = /* @__PURE__ */ new Set();
			const efforts = reasoning.efforts.map((effort) => {
				if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) throw new LlmError(`adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
				seen.add(effort.id);
				return {
					id: effort.id,
					name: effort.name,
					...effort.description === void 0 ? {} : { description: effort.description }
				};
			});
			if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) throw new LlmError(`adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			return {
				...info,
				reasoning: {
					efforts,
					...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
				}
			};
		}
		/**
		* Validate a conversation call config against its exact model capability and
		* materialize adapter-configured defaults. Unsupported explicit efforts
		* reject before provider I/O; no clamping or aliasing is performed. This
		* standalone query does not bind a later dispatch; use {@link prepareCall}
		* when logging and streaming must share one adapter registration.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a detached config only when a default must be materialized.
		*/
		async resolveCallConfig(config, signal) {
			return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
		}
		async resolveCallFor(registration, config, signal) {
			const info = await this.resolveModelInfoFor(registration, config.model, signal);
			return this.resolveCallWithInfo(config, info);
		}
		/** Validate request controls against one already-bound exact model result. */
		resolveCallWithInfo(config, info) {
			const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? {
				...config,
				maxTokens: info.defaultMaxTokens
			} : config;
			const reasoning = info.reasoning;
			const requested = defaulted.reasoningEffort;
			let resolvedConfig = defaulted;
			if (reasoning === void 0) {
				if (requested !== void 0) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`, "UNSUPPORTED_REASONING_EFFORT");
			} else {
				const effective = requested ?? reasoning.defaultEffort;
				if (effective !== void 0) {
					if (!reasoning.efforts.some((effort) => effort.id === effective)) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`, "UNSUPPORTED_REASONING_EFFORT");
					if (requested !== effective) resolvedConfig = {
						...defaulted,
						reasoningEffort: effective
					};
				}
			}
			return {
				config: resolvedConfig,
				...info.context === void 0 ? {} : { context: info.context },
				modelInfo: info
			};
		}
		/**
		* Resolve one call under its current adapter registration. The returned
		* one-shot handle keeps that registration across header logging and dispatch,
		* so HMR cannot combine one adapter's capability result with another adapter.
		* An optional synchronous callback selects concrete controls using captured
		* model metadata. Defaults and validation apply to its result. Callback
		* failures and cancellation reject preparation before dispatch.
		* @param config - provider/model route and optional concrete request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @param configure - pure control selection, called once before defaults and validation.
		* @returns a prepared config and its registration-bound stream entry point.
		*/
		async prepareCall(config, signal, configure) {
			signal?.throwIfAborted();
			const { provider, model, ...controls } = config;
			const registration = this.registration(provider);
			const adapterCall = await registration.adapter.prepareCall(provider, model, signal);
			signal?.throwIfAborted();
			const modelInfo = this.normalizeModelInfo(registration, model, adapterCall.model);
			const proposed = configure === void 0 ? config : {
				...configure(deepFreeze(structuredClone(controls)), deepFreeze(modelInfo)),
				provider,
				model
			};
			signal?.throwIfAborted();
			const resolved = this.resolveCallWithInfo(proposed, modelInfo);
			const resolvedConfig = deepFreeze(structuredClone(resolved.config));
			const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
			const adapterDefaults = deepFreeze({
				...proposed.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
				...proposed.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
			});
			let dispatched = false;
			return Object.freeze({
				config: resolvedConfig,
				retryPolicy: registration.retryPolicy,
				adapterDefaults,
				...context === void 0 ? {} : { context },
				...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
				...modelInfo.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: modelInfo.systemPromptUpdate },
				...modelInfo.toolUpdate === void 0 ? {} : { toolUpdate: modelInfo.toolUpdate },
				stream: (options) => {
					if (dispatched) throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
					if (!callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
					dispatched = true;
					return this.streamWithRegistration(options, {
						registration,
						config: resolvedConfig,
						modelInfo,
						dispatch: (options) => adapterCall.stream(options)
					});
				}
			});
		}
		registration(provider) {
			const registration = this.adapters.get(provider);
			if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
			return registration;
		}
		/** Remove replay state whose historical route is owned by another adapter. */
		forAdapter(options, adapter) {
			const messages = options.messages.map((message) => {
				if (message.role !== "assistant") return message;
				const source = message.source;
				if (source.replayState === void 0) return message;
				if (this.adapters.get(source.provider)?.adapter === adapter) return message;
				return freezeMessage({
					...message,
					source: {
						kind: "model",
						provider: source.provider,
						model: source.model
					}
				});
			});
			if (messages.every((message, index) => message === options.messages[index])) return options;
			const filtered = {
				...options,
				messages
			};
			return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
		}
		/**
		* Resolve the current execution-world read path of one durable file
		* reference through the mounted attachment and filesystem providers.
		*/
		fileReadPath(ref) {
			let hostPath;
			try {
				hostPath = this.ctx.get("attachments")?.fileHostPath(ref);
			} catch {
				return;
			}
			if (hostPath === void 0) return void 0;
			return this.ctx.get("fs")?.processPathFromHostPath(hostPath);
		}
		/**
		* Final adapter boundary. Adapter selection, dispatch, iterator construction,
		* and iteration failures become one terminal failure chunk. Middleware and
		* downstream consumer failures remain thrown plugin or consumer errors.
		*/
		async *adapterStream(options, prepared) {
			let iterator;
			try {
				const registration = prepared?.registration ?? this.registration(options.provider);
				const adapter = registration.adapter;
				let modelInfo;
				let resolvedConfig;
				let dispatch;
				if (prepared === void 0) {
					const adapterCall = await adapter.prepareCall(options.provider, options.model, options.signal);
					modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
					resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
					dispatch = (options) => adapterCall.stream(options);
				} else {
					modelInfo = prepared.modelInfo;
					resolvedConfig = prepared.config;
					dispatch = prepared.dispatch;
				}
				if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
				const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({
					...options,
					...resolvedConfig
				}) : {
					...options,
					...resolvedConfig
				};
				let projectedMessages = resolvedOptions.messages;
				if (projectedMessages.some((message) => contentHasFile(message.content))) projectedMessages = projectFilesToText(projectedMessages, (ref) => this.fileReadPath(ref));
				if (modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && projectedMessages.some((message) => contentHasImage(message.content))) projectedMessages = projectImagesForTextModel(projectedMessages);
				const projectedTools = projectToolUpdates(projectedMessages, resolvedOptions.tools, modelInfo.toolUpdate, resolvedOptions.toolHistory);
				projectedMessages = projectedTools.messages;
				let projectedOptions = resolvedOptions;
				if (projectedMessages !== resolvedOptions.messages || projectedTools.tools !== resolvedOptions.tools) {
					projectedOptions = {
						...resolvedOptions,
						messages: projectedMessages,
						...projectedTools.tools === void 0 ? {} : { tools: projectedTools.tools }
					};
					if (Object.isFrozen(resolvedOptions)) deepFreeze(projectedOptions);
				}
				iterator = dispatch(this.forAdapter(projectedOptions, adapter))[Symbol.asyncIterator]();
			} catch (error) {
				yield adapterFailureChunk(error, options.signal);
				return;
			}
			let completed = false;
			try {
				while (true) {
					let item;
					try {
						const next = await iterator.next();
						item = next.done ? { done: true } : {
							done: false,
							value: next.value
						};
					} catch (error) {
						completed = true;
						yield adapterFailureChunk(error, options.signal);
						return;
					}
					if (item.done) {
						completed = true;
						return;
					}
					yield item.value;
				}
			} finally {
				if (!completed) {
					const close = iterator.return?.bind(iterator);
					if (close) await close();
				}
			}
		}
		/**
		* Stream one model call as raw chunks (token-level deltas). Replay state is
		* retained only when the same adapter instance owns its historical provider
		* and the target provider. Final adapter selection remains fixed through
		* asynchronous exact-model resolution and dispatch. Adapter selection,
		* dispatch, and iteration failures become terminal `error` or `aborted`
		* finish chunks; middleware, nested-call, cleanup, and consumer failures
		* remain thrown.
		* @param options - the full request; `options.provider` selects the adapter.
		* @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
		*/
		stream(options) {
			return this.streamWithRegistration(options);
		}
		streamWithRegistration(options, prepared) {
			return this.ctx.waterfall(this, "llm/stream", options, () => this.adapterStream(options, prepared));
		}
	};
})();
/** Convert one adapter throw into the stream protocol's terminal outcome. */
function adapterFailureChunk(error, signal) {
	const failure = normalizeLlmFailure(error);
	return {
		type: "finish",
		reason: signal?.aborted || failure.code === "ABORTED" ? {
			kind: "aborted",
			failure
		} : {
			kind: "error",
			failure
		}
	};
}
//#endregion
//#region lib/types/pricing.js
/**
* Price matching and cost derivation for folded token counters.
*
* Prices are configuration, never a shipped table: a relay resells the same
* model at its own rate, and a stale built-in list would report a confident
* wrong figure. A deployment states its rules, and a call no rule covers is
* counted as unpriced rather than charged zero.
*
* A rule applies from a local calendar day, and a cost is always derived for
* the day whose counters it prices, so a price change never re-rates history.
* @module @deepseek-ai/dsh-extension-quota-monitor/pricing
*/
/** Tokens divided by this many give the per-rule price unit. */
const PER_UNIT = 1e6;
/** Whether a rule's model pattern covers one model id. */
function modelMatches(pattern, model) {
	if (pattern === void 0) return true;
	if (!pattern.endsWith("*")) return pattern === model;
	return model.startsWith(pattern.slice(0, -1));
}
/**
* A model id reduced to the characters two spellings of it share.
*
* Vendors, catalogs, and routes punctuate the same model differently —
* `gpt5.6 luna (go)` and `gpt-5.6-luna` are one model. Bracketed notes are
* dropped before punctuation, because they qualify a deployment rather than
* name the model.
* @param model - the model id to reduce.
* @returns the comparable form.
*/
function normalizeModel(model) {
	return model.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "");
}
/**
* The id after its last `/`, when a route prefixes the model name.
*
* `cline-pass/deepseek-v4.1-flash` names the model a vendor catalog lists as
* `deepseek-v4.1-flash`, so the leaf is the second spelling worth comparing.
* @param model - the model id as a request reported it.
* @returns the leaf id, or the id itself when it carries no prefix.
*/
function modelLeaf(model) {
	const cut = model.lastIndexOf("/");
	return cut === -1 ? model : model.slice(cut + 1);
}
/** The normalized counterpart of {@link modelMatches}, also trying a prefixed id's leaf. */
function modelMatchesNormalized(pattern, model) {
	if (pattern === void 0) return true;
	const subjects = [...new Set([normalizeModel(model), normalizeModel(modelLeaf(model))])].filter((subject) => subject !== "");
	if (subjects.length === 0) return false;
	if (!pattern.endsWith("*")) {
		const wanted = normalizeModel(pattern);
		return wanted !== "" && subjects.includes(wanted);
	}
	const prefix = normalizeModel(pattern.slice(0, -1));
	return prefix !== "" && subjects.some((subject) => subject.startsWith(prefix));
}
/**
* How narrowly a rule names its route. A rule naming both a provider and an
* exact model outranks one naming a model family, which outranks a
* provider-wide rule, which outranks a catch-all.
*/
function specificity(rule) {
	return (rule.provider === void 0 ? 0 : 4) + (rule.model === void 0 ? 0 : rule.model.endsWith("*") ? 1 : 2);
}
/**
* The rule that prices one route on one day.
*
* Ties on specificity go to the latest `from` at or before `day`, so adding a
* new price leaves earlier days on the rule that was in force then.
* @param table - the configured price table.
* @param provider - provider route key of the counters being priced.
* @param model - model id of the counters being priced.
* @param day - local calendar day (`YYYY-MM-DD`) the counters belong to.
* @returns the matching rule, or `undefined` when none covers the route.
*/
function priceFor(table, provider, model, day) {
	return selectRule(table, provider, model, day, modelMatches) ?? (table.fuzzyMatch ? selectRule(table, provider, model, day, modelMatchesNormalized) : void 0);
}
/**
* The best rule under one model-comparison policy.
* @param table - the configured price table.
* @param provider - provider route key.
* @param model - model id.
* @param day - local calendar day the counters belong to.
* @param matches - how a rule's model pattern is compared.
* @returns the matching rule, or `undefined` when none covers the route.
*/
function selectRule(table, provider, model, day, matches) {
	let best;
	for (const rule of table.rules) {
		if (rule.provider !== void 0 && rule.provider !== provider) continue;
		if (!matches(rule.model, model)) continue;
		if (rule.from !== void 0 && rule.from > day) continue;
		if (best === void 0) {
			best = rule;
			continue;
		}
		const rank = specificity(rule) - specificity(best);
		if (rank > 0 || rank === 0 && (rule.from ?? "") >= (best.from ?? "")) best = rule;
	}
	return best;
}
/**
* The amount one rule charges for a set of counters.
*
* Cache-read and cache-write tokens fall back to the input rate, because a
* provider that meters them without publishing a separate price bills them as
* input.
* @param rule - the matched rule.
* @param counts - the token counters to price.
* @returns the amount in the table's currency.
*/
function costOf(rule, counts) {
	const cacheRead = rule.cacheReadPerMillion ?? rule.inputPerMillion;
	const cacheWrite = rule.cacheWritePerMillion ?? rule.inputPerMillion;
	return (counts.inputTokens * rule.inputPerMillion + counts.outputTokens * rule.outputPerMillion + counts.cacheReadTokens * cacheRead + counts.cacheWriteTokens * cacheWrite) / PER_UNIT;
}
/**
* Accumulates derived spend across one scope, tracking the calls it could not
* price so the panel can say the amount is partial.
*
* Constructed without a table when the deployment configured no prices; every
* add is then inert and {@link view} reports nothing, which is how a report
* carries no cost figures at all rather than a column of zeros.
*/
var QuotaCostAccumulator = class {
	table;
	amount = 0;
	unpriced = 0;
	/** @param table - the price table every added row is matched against, or undefined to derive nothing. */
	constructor(table) {
		this.table = table;
	}
	/**
	* Add one day's counters for one route.
	* @param provider - provider route key.
	* @param model - model id.
	* @param day - local calendar day the counters belong to.
	* @param calls - calls behind the counters, counted as unpriced when no rule matches.
	* @param counts - the token counters.
	*/
	add(provider, model, day, calls, counts) {
		if (this.table === void 0) return;
		const rule = priceFor(this.table, provider, model, day);
		if (rule === void 0) {
			this.unpriced += calls;
			return;
		}
		this.amount += costOf(rule, counts);
	}
	/**
	* Fold another accumulator's totals into this one.
	* @param view - the figure to add, or undefined to add nothing.
	*/
	addView(view) {
		if (this.table === void 0 || view === void 0) return;
		this.amount += view.amount;
		this.unpriced += view.unpricedCalls;
	}
	/**
	* The accumulated figure, rounded to the precision a per-million rate needs.
	* @returns the figure, or undefined when no prices were configured.
	*/
	view() {
		if (this.table === void 0) return void 0;
		return {
			amount: Math.round(this.amount * 1e6) / 1e6,
			currency: this.table.currency,
			unpricedCalls: this.unpriced
		};
	}
};
//#endregion
//#region lib/types/usage-fold.js
/**
* Folding session logs into per-day, per-`provider · model` token totals.
*
* Pure functions over event arrays: no IO, no clock reads beyond the injected
* `now`. The Host service owns reading sessions and persisting the result.
*
* Only provider-reported `usage` is folded. A step whose adapter reported no
* usage contributes nothing rather than an estimate, so every figure the
* panel shows traces back to a provider's own accounting.
* @module @deepseek-ai/dsh-extension-quota-monitor/usage-fold
*/
/**
* A zeroed provider accumulator.
* @param provider - the route key.
* @param prices - the price table, or undefined to derive nothing.
* @returns the accumulator, dated before every real day.
*/
function emptyProvider(provider, prices) {
	return {
		provider,
		all: emptyScope(prices),
		today: emptyScope(prices),
		month: emptyScope(prices),
		models: /* @__PURE__ */ new Set(),
		lastDay: ""
	};
}
/**
* A zeroed scope.
* @param prices - the price table, or undefined to derive nothing.
* @returns the scope.
*/
function emptyScope(prices) {
	return {
		calls: 0,
		totals: emptyTotals(),
		cost: new QuotaCostAccumulator(prices)
	};
}
/**
* Add one route-day's counters into a scope.
* @param scope - the scope to add into.
* @param provider - provider route key.
* @param model - model id.
* @param date - the day the counters belong to, deciding the rate that applies.
* @param counts - the folded counters.
*/
function addToScope(scope, provider, model, date, counts) {
	scope.calls += counts.calls;
	addCounts(scope.totals, counts);
	scope.cost.add(provider, model, date, counts.calls, counts);
}
/** Separator for the composite `provider · model` key; never appears in either id. */
const KEY_SEP = "\0";
/**
* The local calendar day of an epoch instant, as `YYYY-MM-DD`.
*
* Local rather than UTC: a user reading "today" means their own day, and a
* UTC fold would move eight hours of usage into the wrong bucket for a CN
* workday.
* @param epochMs - the instant.
* @returns the local calendar day.
*/
function localDay(epochMs) {
	const date = new Date(epochMs);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}
/** A zeroed counter row. */
function emptyCounts() {
	return {
		calls: 0,
		inputTokens: 0,
		outputTokens: 0,
		cacheReadTokens: 0,
		cacheWriteTokens: 0
	};
}
/** Read a non-negative safe integer, or 0. */
function countOf(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}
/**
* Replay provider-reported usage, excluding the last fork-inherited prefix.
*
* Request headers identify the billed route; context records supply a fallback
* for logs with no header. The latest sample replaces a settlement for the same
* turn and step until a retry boundary opens a separate attempt. Reasoning is
* already part of output and is never added again.
*
* Full replay also detects same-length rewrites and corrections across refreshes.
* @param events - the complete raw session log, ascending by seq.
* @param previous - cached result; replay deliberately does not trust its cursor.
* @returns the corrected per-day and per-route counters.
*/
function foldSessionEvents(events, previous) {
	const days = /* @__PURE__ */ new Map();
	let throughSeq = -1;
	let lastActiveAt = 0;
	let inheritedCut = -1;
	for (const event of events) if (event.type === "session/end-seed" && event.data.inherited === true) inheritedCut = event.seq;
	let route;
	let hasHeader = false;
	let last;
	for (const event of events) {
		if (event.type === "request/header") {
			route = {
				provider: event.data.header.config.provider,
				model: event.data.header.config.model
			};
			hasHeader = true;
		} else if (event.type === "request/context" && !hasHeader) route = {
			provider: event.data.provider,
			model: event.data.model
		};
		if (event.seq <= inheritedCut) continue;
		if (String(event.type) === "llm/retry-started") {
			if (last !== void 0 && "turn" in event.data && "step" in event.data && last.turn === event.data.turn && last.step === event.data.step) last = void 0;
			continue;
		}
		if (event.type !== "assistant/message" && event.type !== "assistant/attempt") continue;
		const usage = event.type === "assistant/message" && event.data.usage !== void 0 ? event.data.usage : lastAssistantStreamChunk(event.data.stream ?? [], "usage")?.usage;
		if (usage === void 0) continue;
		const date = localDay(event.time);
		const key = `${route?.provider ?? "unknown"}${KEY_SEP}${route?.model ?? "unknown"}`;
		const next = {
			calls: 1,
			inputTokens: countOf(usage.inputTokens),
			outputTokens: countOf(usage.outputTokens),
			cacheReadTokens: countOf(usage.cacheReadTokens),
			cacheWriteTokens: countOf(usage.cacheWriteTokens)
		};
		const { turn, step } = event.data;
		if (last !== void 0 && turn !== void 0 && step !== void 0 && last.turn === turn && last.step === step) {
			const oldDay = days.get(last.date);
			const old = oldDay?.get(last.key);
			if (old !== void 0) {
				old.calls -= 1;
				old.inputTokens -= last.counts.inputTokens;
				old.outputTokens -= last.counts.outputTokens;
				old.cacheReadTokens -= last.counts.cacheReadTokens;
				old.cacheWriteTokens -= last.counts.cacheWriteTokens;
				if (old.calls === 0) oldDay?.delete(last.key);
				if (oldDay !== void 0 && oldDay.size === 0) days.delete(last.date);
			}
		}
		const byRoute = days.get(date) ?? /* @__PURE__ */ new Map();
		days.set(date, byRoute);
		const counts = byRoute.get(key) ?? emptyCounts();
		byRoute.set(key, counts);
		counts.calls += 1;
		counts.inputTokens += next.inputTokens;
		counts.outputTokens += next.outputTokens;
		counts.cacheReadTokens += next.cacheReadTokens;
		counts.cacheWriteTokens += next.cacheWriteTokens;
		last = {
			turn,
			step,
			date,
			key,
			counts: next
		};
		throughSeq = event.seq;
		lastActiveAt = Math.max(lastActiveAt, event.time);
	}
	return {
		accountingVersion: 3,
		throughSeq,
		eventCount: events.length,
		days: Object.fromEntries(Array.from(days, ([date, byRoute]) => [date, Object.fromEntries(byRoute)])),
		...lastActiveAt > 0 ? { lastActiveAt } : {}
	};
}
/** The wire figures one scope contributes to a provider row. */
function scopeFigures(scope) {
	const cost = scope.cost.view();
	const hitPercent = cacheHitPercent(scope.totals);
	return {
		calls: scope.calls,
		tokens: scope.totals.totalTokens,
		...hitPercent === void 0 ? {} : { cacheHitPercent: hitPercent },
		...cost === void 0 ? {} : { cost }
	};
}
/** A zeroed totals row. */
function emptyTotals() {
	return {
		inputTokens: 0,
		outputTokens: 0,
		cacheReadTokens: 0,
		cacheWriteTokens: 0,
		totalTokens: 0
	};
}
/** Add one counter row into a totals row. */
function addCounts(totals, counts) {
	totals.inputTokens += counts.inputTokens;
	totals.outputTokens += counts.outputTokens;
	totals.cacheReadTokens += counts.cacheReadTokens;
	totals.cacheWriteTokens += counts.cacheWriteTokens;
	totals.totalTokens += counts.inputTokens + counts.outputTokens + counts.cacheReadTokens + counts.cacheWriteTokens;
}
/**
* Cache-hit share of billed input, 0–100.
*
* Denominated by all three input buckets because those are exactly what a
* request pays for; output is excluded since it is never served from cache.
* @param totals - the totals to measure.
* @returns the percentage, or `undefined` when no input was recorded.
*/
function cacheHitPercent(totals) {
	const billed = totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens;
	if (billed <= 0) return void 0;
	return Math.round(totals.cacheReadTokens / billed * 1e3) / 10;
}
/**
* One budget window, measured against derived spend.
*
* A window whose spend rests on unpriced calls still reports the amount it
* could derive, alongside how many calls it could not price, so a percentage is
* never presented as complete when it is not.
*/
function budgetWindow(limit, cost, budgets) {
	if (limit === void 0 || limit <= 0) return void 0;
	const spent = cost?.amount ?? 0;
	const unpricedCalls = cost?.unpricedCalls ?? 0;
	const percentUsed = Math.round(spent / limit * 1e3) / 10;
	return {
		limit,
		spent,
		percentUsed,
		status: unpricedCalls > 0 && spent === 0 ? "unknown" : percentUsed >= budgets.criticalPercent ? "critical" : percentUsed >= budgets.warningPercent ? "warning" : "normal",
		unpricedCalls
	};
}
/**
* Merge every session's fold state into the report the panel reads.
*
* Sessions are keyed by id so the report can list them; the id is the only
* session-identifying value that crosses into it, because a title is prompt
* text and this report is not where prompt text belongs.
* @param states - per-session id and fold state, in any order.
* @param options - clock, fold status, prices, and ceilings.
* @returns the assembled report.
*/
function buildUsageReport(states, options) {
	const { now, foldedAt, folding, prices, budgets, provider: only } = options;
	const byDay = /* @__PURE__ */ new Map();
	const byProvider = /* @__PURE__ */ new Map();
	const byModel = /* @__PURE__ */ new Map();
	const sessions = [];
	let sessionCount = 0;
	for (const [id, state] of states) {
		sessionCount += 1;
		const session = emptyTotals();
		const routes = /* @__PURE__ */ new Set();
		const sessionCost = new QuotaCostAccumulator(prices);
		let calls = 0;
		for (const [date, perRoute] of Object.entries(state.days)) for (const [key, counts] of Object.entries(perRoute)) {
			const [provider = "unknown", model = "unknown"] = key.split(KEY_SEP);
			if (only !== void 0 && provider !== only) continue;
			const day = byDay.get(date) ?? {
				date,
				calls: 0,
				models: /* @__PURE__ */ new Map()
			};
			byDay.set(date, day);
			const row = day.models.get(key) ?? {
				provider,
				model,
				calls: 0,
				inputTokens: 0,
				outputTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0
			};
			day.models.set(key, row);
			row.calls += counts.calls;
			row.inputTokens += counts.inputTokens;
			row.outputTokens += counts.outputTokens;
			row.cacheReadTokens += counts.cacheReadTokens;
			row.cacheWriteTokens += counts.cacheWriteTokens;
			day.calls += counts.calls;
			addCounts(session, counts);
			routes.add(`${provider}/${model}`);
			sessionCost.add(provider, model, date, counts.calls, counts);
			calls += counts.calls;
		}
		if (session.totalTokens <= 0) continue;
		const cost = sessionCost.view();
		sessions.push({
			id,
			calls,
			...session,
			routes: Object.freeze([...routes].sort((left, right) => left.localeCompare(right))),
			lastActiveAt: state.lastActiveAt ?? 0,
			...cost === void 0 ? {} : { cost }
		});
	}
	const today = localDay(now);
	const monthPrefix = today.slice(0, 7);
	const todayTotals = emptyTotals();
	const monthTotals = emptyTotals();
	const allTimeTotals = emptyTotals();
	const todayCost = new QuotaCostAccumulator(prices);
	const monthCost = new QuotaCostAccumulator(prices);
	const allTimeCost = new QuotaCostAccumulator(prices);
	const days = [];
	for (const day of [...byDay.values()].sort((left, right) => left.date.localeCompare(right.date))) {
		const dayTotals = emptyTotals();
		const dayCost = new QuotaCostAccumulator(prices);
		const models = [];
		for (const row of day.models.values()) {
			const counts = row;
			addCounts(dayTotals, counts);
			addCounts(allTimeTotals, counts);
			allTimeCost.add(row.provider, row.model, day.date, row.calls, counts);
			dayCost.add(row.provider, row.model, day.date, row.calls, counts);
			if (day.date === today) {
				addCounts(todayTotals, counts);
				todayCost.add(row.provider, row.model, day.date, row.calls, counts);
			}
			if (day.date.startsWith(monthPrefix)) {
				addCounts(monthTotals, counts);
				monthCost.add(row.provider, row.model, day.date, row.calls, counts);
			}
			const rowCost = new QuotaCostAccumulator(prices);
			rowCost.add(row.provider, row.model, day.date, row.calls, counts);
			const cost = rowCost.view();
			const provider = byProvider.get(row.provider) ?? emptyProvider(row.provider, prices);
			byProvider.set(row.provider, provider);
			addToScope(provider.all, row.provider, row.model, day.date, counts);
			provider.models.add(row.model);
			if (day.date > provider.lastDay) provider.lastDay = day.date;
			if (day.date === today) addToScope(provider.today, row.provider, row.model, day.date, counts);
			if (day.date.startsWith(monthPrefix)) addToScope(provider.month, row.provider, row.model, day.date, counts);
			const modelKey = row.provider + KEY_SEP + row.model;
			const modelSummary = byModel.get(modelKey) ?? {
				provider: row.provider,
				model: row.model,
				all: emptyScope(prices),
				today: emptyScope(prices),
				month: emptyScope(prices)
			};
			byModel.set(modelKey, modelSummary);
			addToScope(modelSummary.all, row.provider, row.model, day.date, counts);
			if (day.date === today) addToScope(modelSummary.today, row.provider, row.model, day.date, counts);
			if (day.date.startsWith(monthPrefix)) addToScope(modelSummary.month, row.provider, row.model, day.date, counts);
			models.push({
				provider: row.provider,
				model: row.model,
				calls: row.calls,
				inputTokens: row.inputTokens,
				outputTokens: row.outputTokens,
				cacheReadTokens: row.cacheReadTokens,
				cacheWriteTokens: row.cacheWriteTokens,
				totalTokens: row.inputTokens + row.outputTokens + row.cacheReadTokens + row.cacheWriteTokens,
				...cost === void 0 ? {} : { cost }
			});
		}
		models.sort((left, right) => right.totalTokens - left.totalTokens);
		const cost = dayCost.view();
		days.push({
			date: day.date,
			calls: day.calls,
			...dayTotals,
			...cost === void 0 ? {} : { cost },
			models: Object.freeze(models)
		});
	}
	sessions.sort((left, right) => right.lastActiveAt - left.lastActiveAt || right.totalTokens - left.totalTokens);
	const providers = [];
	for (const entry of byProvider.values()) {
		const all = scopeFigures(entry.all);
		const todayFigures = scopeFigures(entry.today);
		const monthFigures = scopeFigures(entry.month);
		providers.push({
			provider: entry.provider,
			calls: all.calls,
			...entry.all.totals,
			...all.cacheHitPercent === void 0 ? {} : { cacheHitPercent: all.cacheHitPercent },
			...all.cost === void 0 ? {} : { cost: all.cost },
			todayCalls: todayFigures.calls,
			todayTokens: todayFigures.tokens,
			...todayFigures.cacheHitPercent === void 0 ? {} : { todayCacheHitPercent: todayFigures.cacheHitPercent },
			...todayFigures.cost === void 0 ? {} : { todayCost: todayFigures.cost },
			monthCalls: monthFigures.calls,
			monthTokens: monthFigures.tokens,
			...monthFigures.cacheHitPercent === void 0 ? {} : { monthCacheHitPercent: monthFigures.cacheHitPercent },
			...monthFigures.cost === void 0 ? {} : { monthCost: monthFigures.cost },
			models: entry.models.size,
			lastDay: entry.lastDay
		});
	}
	providers.sort((left, right) => right.totalTokens - left.totalTokens || right.calls - left.calls || left.provider.localeCompare(right.provider));
	const modelSummaries = [...byModel.values()].map((entry) => {
		const rule = prices === void 0 ? void 0 : priceFor(prices, entry.provider, entry.model, today);
		return {
			provider: entry.provider,
			model: entry.model,
			all: modelScope(entry.all),
			today: modelScope(entry.today),
			month: modelScope(entry.month),
			...rule === void 0 || prices === void 0 ? {} : { rate: {
				currency: prices.currency,
				inputPerMillion: rule.inputPerMillion,
				outputPerMillion: rule.outputPerMillion,
				cacheReadPerMillion: rule.cacheReadPerMillion ?? rule.inputPerMillion,
				cacheWritePerMillion: rule.cacheWritePerMillion ?? rule.inputPerMillion,
				...rule.from === void 0 ? {} : { from: rule.from }
			} }
		};
	});
	modelSummaries.sort((left, right) => right.all.totalTokens - left.all.totalTokens || left.provider.localeCompare(right.provider) || left.model.localeCompare(right.model));
	const hitPercent = cacheHitPercent(todayTotals);
	const today$ = todayCost.view();
	const month$ = monthCost.view();
	const allTime$ = allTimeCost.view();
	return {
		today,
		todayTotals,
		monthTotals,
		allTimeTotals,
		...hitPercent === void 0 ? {} : { todayCacheHitPercent: hitPercent },
		...today$ === void 0 ? {} : { todayCost: today$ },
		...month$ === void 0 ? {} : { monthCost: month$ },
		...allTime$ === void 0 ? {} : { allTimeCost: allTime$ },
		...budgetsOf(budgets, prices, today$, month$),
		models: Object.freeze(modelSummaries),
		providers: Object.freeze(providers),
		days: Object.freeze(days),
		sessions: Object.freeze(sessions),
		sessionCount,
		foldedAt,
		folding
	};
}
/** Materialize the four token buckets, estimated cost and input cache ratio. */
function modelScope(scope) {
	const cost = scope.cost.view();
	const hit = cacheHitPercent(scope.totals);
	return {
		...scope.totals,
		calls: scope.calls,
		...cost === void 0 ? {} : { cost },
		...hit === void 0 ? {} : { cacheHitPercent: hit }
	};
}
/**
* The budget section, present only when a ceiling is configured.
*
* Ceilings are denominated in the price table's own currency, so the section
* carries that currency rather than one of its own.
*/
function budgetsOf(budgets, prices, todayCost, monthCost) {
	if (budgets === void 0 || prices === void 0) return {};
	const daily = budgetWindow(budgets.daily, todayCost, budgets);
	const monthly = budgetWindow(budgets.monthly, monthCost, budgets);
	if (daily === void 0 && monthly === void 0) return {};
	return { budgets: {
		currency: prices.currency,
		...daily === void 0 ? {} : { daily },
		...monthly === void 0 ? {} : { monthly }
	} };
}
/**
* An empty report, served before the first fold completes.
* @param now - current epoch milliseconds.
* @param folding - whether the first fold round is already running.
* @returns a report with zeroed totals and no days.
*/
function emptyUsageReport(now, folding) {
	return buildUsageReport([], {
		now,
		foldedAt: 0,
		folding
	});
}
//#endregion
//#region lib/types/usage-domain.js
/**
* The `quota_usage` storage domain: one record per session holding that
* session's folded token counters and the seq the fold reached.
*
* Only counters and route ids are stored. No prompt text, tool output, file
* path, or credential enters this domain — it is derived accounting, and a
* lost or discarded record costs only a refold.
* @module @deepseek-ai/dsh-extension-quota-monitor/usage-domain
*/
/** The five counters folded per `provider · model` per day. */
const foldCounts = z.object({
	calls: z.number().int().nonnegative(),
	inputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative(),
	cacheReadTokens: z.number().int().nonnegative(),
	cacheWriteTokens: z.number().int().nonnegative()
});
/**
* The usage-fold domain.
*
* `invalidRecords: 'backup-and-skip'`: a record that fails validation is
* disposable derived data, so it must never cost the boot — the domain layer
* moves it aside and the session is refolded from its log.
*
* Domain version 2 added `lastActiveAt`. The optional accounting revision
* preserves backend compatibility; the store seeds only revision 3 counters
* and reconstructs older records from the authoritative session logs.
*/
const usageDomainSpec = defineDomain({
	name: "quota_usage",
	version: 2,
	compatibleVersions: [1],
	invalidRecords: "backup-and-skip",
	layout: "per-record",
	tables: { sessions: domainTable(z.object({
		accountingVersion: z.literal(3).optional(),
		throughSeq: z.number().int().gte(-1),
		eventCount: z.number().int().nonnegative(),
		days: z.record(z.string(), z.record(z.string(), foldCounts)),
		lastActiveAt: z.number().int().nonnegative().optional()
	})) }
});
/**
* Widen a stored record to the in-memory fold state.
* @param record - the validated stored record.
* @returns the fold state.
*/
function stateOf(record) {
	return {
		...record.accountingVersion === void 0 ? {} : { accountingVersion: record.accountingVersion },
		throughSeq: record.throughSeq,
		eventCount: record.eventCount,
		days: record.days,
		...record.lastActiveAt === void 0 ? {} : { lastActiveAt: record.lastActiveAt }
	};
}
//#endregion
//#region lib/types/usage-store.js
/**
* The usage store: folds every readable session log into the report the panel
* reads, and keeps the per-session fold cached durably.
*
* One fold round at a time. Each readable log is replayed so equal-length
* corrections and later settlement replacements remain visible. Unchanged
* counter records avoid redundant persistence. Failures are per session: an unreadable log leaves its cached
* record intact and the round continues, because one damaged session must not
* blank the whole report.
* @module @deepseek-ai/dsh-extension-quota-monitor/usage-store
*/
/** How many sessions are read concurrently during one fold round. */
const READ_CONCURRENCY = 4;
/**
* Folds session logs into the usage report and caches each session's fold.
*
* The store owns no timer: the service decides when a round runs.
*/
var QuotaUsageStore = class {
	ctx;
	now;
	derive;
	folds = /* @__PURE__ */ new Map();
	table;
	report;
	folding = false;
	foldedAt = 0;
	/** In-flight round, so concurrent requests share one pass. */
	round;
	/**
	* @param ctx - Host context carrying the sessionQuery and storageDomain seams.
	* @param now - clock reader, injected so tests drive day boundaries.
	* @param derive - prices and ceilings the report derives spend with.
	*/
	constructor(ctx, now, derive = {}) {
		this.ctx = ctx;
		this.now = now;
		this.derive = derive;
		this.report = emptyUsageReport(now(), false);
	}
	/**
	* Build the report from the current folds.
	* @param foldedAt - epoch ms the fold last completed.
	* @param provider - report this route alone; absent reports every route.
	* @returns the assembled report.
	*/
	build(foldedAt, provider) {
		return buildUsageReport(this.folds, {
			now: this.now(),
			foldedAt,
			folding: this.folding,
			...this.derive.prices === void 0 ? {} : { prices: this.derive.prices },
			...this.derive.budgets === void 0 ? {} : { budgets: this.derive.budgets },
			...provider === void 0 ? {} : { provider }
		});
	}
	/**
	* Replace the price table the report derives spend with.
	*
	* Imported documents are re-read while the plugin runs, so the table is not
	* fixed at construction: the report is rebuilt here so the next read already
	* prices with the new rules.
	* @param table - the current table, or undefined when the deployment states no prices.
	*/
	setPrices(table) {
		const { prices: _replaced, ...rest } = this.derive;
		this.derive = table === void 0 ? rest : {
			...rest,
			prices: table
		};
		this.report = this.build(this.foldedAt);
	}
	/**
	* Open the durable fold cache and seed the in-memory folds from it.
	*
	* Seeding makes the first report available without reading a single session
	* log, so a restart shows yesterday's figures immediately and refines them
	* when the first round lands.
	* @returns a disposer closing the domain.
	*/
	async open() {
		const domain = await this.ctx.storageDomain.open(usageDomainSpec);
		this.table = domain.table("sessions");
		for (const [id, record] of this.table.entries()) if (record.accountingVersion === 3) this.folds.set(id, stateOf(record));
		this.report = this.build(0);
		return () => {
			domain.close();
		};
	}
	/**
	* The most recent report; never blocks on a fold.
	*
	* A filtered report is rebuilt from the in-memory folds on each read: it costs
	* one pass over route-day rows, and keeping every reader's selection cached
	* would outlive the selection that asked for it.
	* @param provider - report this route alone; absent reports every route.
	* @returns the report, with `folding` raised while a round runs.
	*/
	current(provider) {
		if (provider !== void 0) return this.build(this.foldedAt, provider);
		if (this.report.today !== localDay(this.now())) this.report = this.build(this.foldedAt);
		return {
			...this.report,
			folding: this.folding
		};
	}
	/**
	* Run one fold round, or join the one already running.
	* @param provider - report this route alone; absent reports every route.
	* @returns the report after the round completes.
	*/
	async refresh(provider) {
		this.round ??= this.runRound().finally(() => {
			this.round = void 0;
		});
		await this.round;
		return this.current(provider);
	}
	/** Read every session, fold what changed, and rebuild the report. */
	async runRound() {
		this.folding = true;
		try {
			const ids = (await this.ctx.sessionQuery.listSessions()).map((record) => record.header.id);
			const live = new Set(ids);
			for (const id of [...this.folds.keys()]) {
				if (live.has(id)) continue;
				this.folds.delete(id);
				await this.forget(id);
			}
			for (let index = 0; index < ids.length; index += READ_CONCURRENCY) await Promise.all(ids.slice(index, index + READ_CONCURRENCY).map((id) => this.foldSession(id)));
			this.foldedAt = this.now();
			this.report = this.build(this.foldedAt);
			return this.report;
		} finally {
			this.folding = false;
		}
	}
	/** Fold one session, leaving its cached state untouched when the read fails. */
	async foldSession(id) {
		let events;
		try {
			({events} = await this.ctx.sessionQuery.readSession(id));
		} catch (error) {
			this.ctx.logger.debug(`quota monitor: session "${id}" could not be read for usage folding: ${String(error)}`);
			return;
		}
		const previous = this.folds.get(id);
		const next = foldSessionEvents(events, previous);
		if (JSON.stringify(next) === JSON.stringify(previous)) return;
		this.folds.set(id, next);
		await this.store(id, next);
	}
	/** Persist one session's fold, tolerating a storage failure. */
	async store(id, state) {
		if (this.table === void 0) return;
		try {
			await this.table.put(id, state);
		} catch (error) {
			this.ctx.logger.warn(`quota monitor: usage fold for "${id}" could not be persisted: ${String(error)}`);
		}
	}
	/** Drop one session's cached fold, tolerating a storage failure. */
	async forget(id) {
		if (this.table === void 0) return;
		try {
			await this.table.delete(id);
		} catch (error) {
			this.ctx.logger.warn(`quota monitor: usage fold for "${id}" could not be deleted: ${String(error)}`);
		}
	}
};
//#endregion
//#region lib/types/index.js
/**
* Quota monitor Host half: per-provider token accounting over the
* `llm/stream` waterfall, account reads through the adapter registry,
* historical usage folded from persisted session logs, derived spend and
* budgets, downloadable exports, and the Remote face (`quotaMonitor/*`) the
* browser panel calls.
*
* Credentials never leave this process. An account reading carries figures
* and a status; the API key, cookie, or management token that produced it is
* resolved here and discarded.
*
* Spend is derived only from prices a deployment configured. This plugin ships
* no price list, because a price belongs to whichever gateway a deployment buys
* from and a stale built-in figure would be reported as fact.
* @module @deepseek-ai/dsh-extension-quota-monitor
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Delay before the first background round, so boot is not spent on network calls. */
const INITIAL_DELAY_MS = 2e3;
/** Well-known base URLs used when a provider profile stores none. */
const DEFAULT_BASE_URLS = Object.freeze({
	"deepseek-official": "https://api.deepseek.com",
	"deepseek": "https://api.deepseek.com",
	"minimax-cn": "https://www.minimaxi.com",
	"minimax": "https://www.minimax.io"
});
/** A profile with nothing configured. */
const EMPTY_PROFILE = Object.freeze({});
/**
* How much room one reading leaves, as a comparable share.
*
* A plan window states its own share, a balance with a disclosed total divides
* out, and a bare balance is compared against the largest bare balance on the
* route: `scale` carries that maximum, because two wallets are only comparable
* by their own figures. Readings that state no figure at all score nothing and
* are left out of the choice.
* @param account - one credential's latest reading.
* @param scale - largest bare balance among the readings being compared.
* @returns the share in 0..1, or undefined when the reading states no figure.
*/
function headroomOf(account, scale) {
	if (account.unlimited === true) return 1;
	if (account.remaining !== void 0 && account.remaining <= 0) return 0;
	const windows = account.planWindows;
	if (windows !== void 0 && windows.length > 0) {
		const worst = Math.max(...windows.map((window) => window.percentUsed));
		return Math.max(0, Math.min(1, 1 - worst / 100));
	}
	const remaining = account.remaining;
	if (remaining === void 0) return void 0;
	const used = account.used;
	if (used !== void 0 && used + remaining > 0) return remaining / (used + remaining);
	if (scale <= 0) return remaining > 0 ? 1 : 0;
	return Math.min(1, remaining / scale);
}
/**
* Cache key of one monitored credential.
*
* A route watched through several keys holds one reading per key, so the route
* id alone cannot address the map; the NUL separator cannot appear in either
* part, so two different slots never collide.
* @param slot - the route and its credential reference.
* @returns a key unique among a route's monitored credentials.
*/
function accountKey(slot) {
	return slot.credentialRef === void 0 ? slot.id : `${slot.id}\u0000${slot.credentialRef}`;
}
/**
* Token usage plus account monitoring for every configured LLM provider.
* Serves the browser panel through the Gateway as the `quotaMonitor`
* namespace.
*/
let QuotaMonitorService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _getSnapshot_decorators;
	let _getAccount_decorators;
	let _readPendingAccounts_decorators;
	let _refreshAccounts_decorators;
	let _getUsage_decorators;
	let _exportUsage_decorators;
	let _setBalances_decorators;
	let _resetStats_decorators;
	let _manageKey_decorators;
	return class QuotaMonitorService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_getSnapshot_decorators = [Remote("getSnapshot")];
			_getAccount_decorators = [Remote("getAccount")];
			_readPendingAccounts_decorators = [Remote("readPendingAccounts")];
			_refreshAccounts_decorators = [Remote("refreshAccounts")];
			_getUsage_decorators = [Remote("getUsage")];
			_exportUsage_decorators = [Remote("exportUsage")];
			_setBalances_decorators = [Remote("setBalances")];
			_resetStats_decorators = [Remote("resetStats")];
			_manageKey_decorators = [Remote("manageKey")];
			__esDecorate(this, null, _getSnapshot_decorators, {
				kind: "method",
				name: "getSnapshot",
				static: false,
				private: false,
				access: {
					has: (obj) => "getSnapshot" in obj,
					get: (obj) => obj.getSnapshot
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getAccount_decorators, {
				kind: "method",
				name: "getAccount",
				static: false,
				private: false,
				access: {
					has: (obj) => "getAccount" in obj,
					get: (obj) => obj.getAccount
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readPendingAccounts_decorators, {
				kind: "method",
				name: "readPendingAccounts",
				static: false,
				private: false,
				access: {
					has: (obj) => "readPendingAccounts" in obj,
					get: (obj) => obj.readPendingAccounts
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _refreshAccounts_decorators, {
				kind: "method",
				name: "refreshAccounts",
				static: false,
				private: false,
				access: {
					has: (obj) => "refreshAccounts" in obj,
					get: (obj) => obj.refreshAccounts
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getUsage_decorators, {
				kind: "method",
				name: "getUsage",
				static: false,
				private: false,
				access: {
					has: (obj) => "getUsage" in obj,
					get: (obj) => obj.getUsage
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _exportUsage_decorators, {
				kind: "method",
				name: "exportUsage",
				static: false,
				private: false,
				access: {
					has: (obj) => "exportUsage" in obj,
					get: (obj) => obj.exportUsage
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setBalances_decorators, {
				kind: "method",
				name: "setBalances",
				static: false,
				private: false,
				access: {
					has: (obj) => "setBalances" in obj,
					get: (obj) => obj.setBalances
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _resetStats_decorators, {
				kind: "method",
				name: "resetStats",
				static: false,
				private: false,
				access: {
					has: (obj) => "resetStats" in obj,
					get: (obj) => obj.resetStats
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _manageKey_decorators, {
				kind: "method",
				name: "manageKey",
				static: false,
				private: false,
				access: {
					has: (obj) => "manageKey" in obj,
					get: (obj) => obj.manageKey
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		config = __runInitializers(this, _instanceExtraInitializers);
		static inject = [
			"llm",
			"settings",
			"credentials",
			"sessionQuery",
			"storageDomain"
		];
		static Config = Config;
		usage = /* @__PURE__ */ new Map();
		names = /* @__PURE__ */ new Map();
		profiles = /* @__PURE__ */ new Map();
		/**
		* Readings keyed by route and monitored credential ({@link accountKey}), so a
		* route watched through several keys keeps one reading per key.
		*/
		accounts = /* @__PURE__ */ new Map();
		manual = /* @__PURE__ */ new Map();
		usageStore;
		/**
		* Prices this deployment stated, or undefined when it stated none. Rebuilt
		* whenever an imported document changes, so the field is the current table
		* rather than the one the constructor resolved.
		*/
		prices;
		/**
		* Fingerprint outcome per route and base URL, so an unrecognized gateway is
		* asked what it is at most once per configuration.
		*/
		detected = /* @__PURE__ */ new Map();
		/**
		* The credential the panel is showing, refreshed at the active interval.
		* Absent until the panel asks for a reading.
		*/
		focused;
		/**
		* Credential routing state per route, one entry for each monitor naming an
		* `activeRef`. Absent for every other route, which the monitor only reads.
		*/
		routers = /* @__PURE__ */ new Map();
		managed = /* @__PURE__ */ new Map();
		keyTable;
		cooldowns = /* @__PURE__ */ new Map();
		decisions = /* @__PURE__ */ new Map();
		locks = /* @__PURE__ */ new Map();
		/** Serialize credential changes with requests that consume that credential. */
		async lockRoute(id) {
			const previous = this.locks.get(id) ?? Promise.resolve();
			let release = () => {};
			const current = new Promise((resolve) => {
				release = resolve;
			});
			this.locks.set(id, current);
			await previous;
			return () => {
				release();
				if (this.locks.get(id) === current) this.locks.delete(id);
			};
		}
		/**
		* @param ctx - Host context carrying the llm, settings, credentials, session
		* query, and storage seams.
		* @param config - validated plugin config.
		*/
		constructor(ctx, config) {
			super(ctx, "quotaMonitor");
			this.config = config;
			assertConsistent(config);
			for (const [id, entry] of Object.entries(config.monitors)) {
				if (entry.activeRef === void 0) continue;
				this.routers.set(id, {
					activeRef: entry.activeRef,
					value: void 0,
					credentialRef: void 0,
					wired: void 0,
					refused: false
				});
			}
			this.prices = config.pricing.rules.length === 0 ? void 0 : {
				currency: config.pricing.currency,
				rules: config.pricing.rules,
				fuzzyMatch: config.pricing.fuzzyMatch
			};
			const priced = config.pricing.rules.length > 0 || config.pricing.imports.length > 0;
			this.usageStore = new QuotaUsageStore(ctx, () => Date.now(), {
				...this.prices === void 0 ? {} : { prices: this.prices },
				...priced ? { budgets: config.budgets } : {}
			});
		}
		/** Attach the stream tap, open the usage cache, and schedule background rounds. */
		async [Service.init]() {
			this.refresh();
			await this.reloadPrices(true);
			const stopStream = this.ctx.on("llm/stream", (options, next) => this.tapStream(options, next));
			const stopTopology = this.ctx.on("llm/adapters-updated", () => {
				this.refresh();
			});
			const closeUsage = await this.usageStore.open();
			const keys = await this.ctx.storageDomain.open(keyDomainSpec);
			this.keyTable = keys.table("providers");
			for (const [id, state] of this.keyTable.entries()) {
				this.managed.set(id, state);
				if (state.activeRef !== void 0) this.routers.set(id, {
					activeRef: state.activeRef,
					value: void 0,
					credentialRef: void 0,
					wired: void 0,
					refused: false
				});
			}
			this.ctx.effect(() => () => {
				keys.close();
			}, "quota-monitor.keys");
			await this.identifyRoutedCredentials();
			const timers = [];
			if (this.config.refresh.enabled) {
				const initial = setTimeout(() => {
					this.runBackgroundRound();
				}, INITIAL_DELAY_MS);
				const background = setInterval(() => {
					this.runBackgroundRound();
				}, this.config.refresh.backgroundMs);
				const active = setInterval(() => {
					this.refreshFocusedAccount();
				}, this.config.refresh.activeMs);
				timers.push(initial, background, active);
			}
			this.ctx.effect(() => () => {
				stopStream();
				stopTopology();
				for (const timer of timers) {
					clearTimeout(timer);
					clearInterval(timer);
				}
				closeUsage();
			}, "quota-monitor.dispose");
		}
		/**
		* Whole-registry view: the provider selector, per-process usage rows, and
		* the manual balance table.
		* @returns the snapshot served to the panel.
		*/
		getSnapshot() {
			return this.snapshot();
		}
		/**
		* Read one provider's account.
		* @param request - the provider route, the credential reference to read, and
		* whether to bypass the cached reading. An absent reference reads the route's
		* first monitored credential.
		* @returns the account, including a non-`ok` status when it cannot be read.
		*/
		async getAccount(request) {
			const slot = this.slotFor(request);
			this.focused = slot;
			const cached = this.accounts.get(accountKey(slot));
			if (cached !== void 0 && request.refresh !== true) return cached;
			return this.readAccount(slot);
		}
		/**
		* Read every monitored credential that has no cached reading yet, and answer
		* with the resulting snapshot.
		*
		* This is what opening the panel needs: every key a deployment monitors
		* states its own figure, while the readings a previous round already took are
		* served from cache rather than queried again.
		* @returns the snapshot carrying the readings.
		*/
		async readPendingAccounts() {
			await this.readRouteAccounts((slot) => !this.accounts.has(accountKey(slot)));
			return this.snapshot();
		}
		/**
		* Re-read every monitored credential of every known route.
		* @returns the snapshot carrying the new readings.
		*/
		async refreshAccounts() {
			await this.readRouteAccounts();
			return this.snapshot();
		}
		/**
		* The folded historical usage report.
		* @param request - `refresh: true` forces a fold round before answering;
		* `provider` reports that route alone instead of every route together.
		* @returns the report, with `folding` set while a round runs.
		*/
		async getUsage(request) {
			if (request.refresh === true) return this.usageStore.refresh(request.provider);
			return this.usageStore.current(request.provider);
		}
		/**
		* Build one downloadable document from the current report.
		* @param request - which document to build.
		* @returns the document, with its filename and media type.
		*/
		exportUsage(request) {
			return buildExport(request.kind, this.usageStore.current(), this.providerEntries(), Date.now());
		}
		/**
		* Replace the manual balance fallbacks.
		* @param request - provider id → total allowance; a non-finite value clears the entry.
		* @returns the resulting manual balance table.
		*/
		setBalances(request) {
			for (const [id, raw] of Object.entries(request.balances)) {
				const value = typeof raw === "number" ? raw : Number(raw);
				if (!Number.isFinite(value)) this.manual.delete(id);
				else this.manual.set(id, value);
			}
			return this.balancesView();
		}
		/**
		* Zero the per-process usage counters.
		* @param request - restrict the reset to one provider route, or clear every bucket.
		* @returns the post-reset snapshot.
		*/
		resetStats(request) {
			for (const [id, bucket] of this.usage) {
				if (request.provider !== void 0 && id !== request.provider) continue;
				bucket.calls = 0;
				bucket.inputTokens = 0;
				bucket.outputTokens = 0;
				bucket.cacheReadTokens = 0;
				bucket.cacheWriteTokens = 0;
				bucket.reasoningTokens = 0;
				bucket.errorCount = 0;
				bucket.lastCallAt = 0;
				bucket.lastModel = "";
			}
			return this.snapshot();
		}
		/** Write-only key management. Removing a slot detaches it without deleting the credential. */
		async manageKey(request) {
			this.refresh();
			if (!this.names.has(request.provider)) throw new Error("Unknown provider");
			const unlock = await this.lockRoute(request.provider);
			try {
				const id = request.provider;
				const previous = this.managed.get(id);
				const state = previous === void 0 ? {
					refs: this.slotsOf(id).flatMap((slot) => slot.credentialRef === void 0 ? [] : [slot.credentialRef]),
					labels: {},
					mode: this.routers.has(id) ? "quota" : "manual",
					...this.routers.get(id) === void 0 ? {} : { activeRef: this.routers.get(id).activeRef }
				} : {
					...previous,
					refs: [...previous.refs],
					labels: { ...previous.labels }
				};
				const ref = request.credentialRef;
				const name = request.name?.trim().slice(0, 120);
				if (request.action === "add") {
					const source = ref ?? `QUOTA_KEY_${randomUUID().replaceAll("-", "_")}`;
					if (!CREDENTIAL_REF_PATTERN.test(source)) throw new Error("Invalid credential reference");
					if (source === state.activeRef || state.refs.includes(source)) throw new Error("Credential already monitored or reserved for routing");
					if (request.key !== void 0) {
						if (!request.key.trim()) throw new Error("Key must not be empty");
						if (await this.resolveApiKey(source) !== void 0) throw new Error("Credential reference already exists");
						await this.ctx.credentials.set(brandString(source), request.key.trim());
					} else if (await this.resolveApiKey(source) === void 0) throw new Error("Credential is not configured");
					state.refs.push(source);
					if (name) state.labels[source] = name;
				} else if (request.action === "routing") {
					if (![
						"manual",
						"quota",
						"jev"
					].includes(request.mode ?? "")) throw new Error("Invalid routing mode");
					state.mode = request.mode;
					if (state.mode === "manual") {
						const selectedRef = this.routers.get(id)?.credentialRef ?? state.selectedRef ?? state.refs[0];
						if (selectedRef !== void 0) state.selectedRef = selectedRef;
					}
					if (request.jevKey?.trim()) {
						const jevRef = state.jevRef ?? `QUOTA_JEV_${randomUUID().replaceAll("-", "_")}`;
						await this.ctx.credentials.set(brandString(jevRef), request.jevKey.trim());
						state.jevRef = jevRef;
					}
					if (state.mode === "jev" && (state.jevRef === void 0 || await this.resolveApiKey(state.jevRef) === void 0)) throw new Error("Configure a Jev OpenRouter key first");
				} else {
					if (ref === void 0 || !state.refs.includes(ref)) throw new Error("Key is not monitored by this provider");
					if (request.action === "rename") if (name) state.labels[ref] = name;
					else delete state.labels[ref];
					else if (request.action === "remove") {
						if (state.refs.length < 2) throw new Error("Keep at least one key");
						if (this.routers.get(id)?.credentialRef === ref || this.profileOf(id).apiKeyEnv === ref) throw new Error("Switch away from the active key first");
						state.refs = state.refs.filter((item) => item !== ref);
						delete state.labels[ref];
						this.accounts.delete(accountKey({
							id,
							credentialRef: ref
						}));
					} else if (request.action === "activate") {
						if (await this.resolveApiKey(ref) === void 0) throw new Error("Credential is not configured");
						state.mode = "manual";
						state.selectedRef = ref;
					} else throw new Error("Invalid key action");
				}
				await this.saveKeys(id, state);
				if (request.action === "activate" || request.action === "routing" && state.mode !== "manual") {
					await this.wireRouter(id, state);
					await this.routeCredential(id);
				}
				return this.snapshot();
			} finally {
				unlock();
			}
		}
		async saveKeys(id, state) {
			if (this.keyTable === void 0) throw new Error("Key storage is not ready");
			await this.keyTable.put(id, state);
			this.managed.set(id, state);
		}
		/** Preserve the original key and wire a dedicated credential into the provider profile. */
		async wireRouter(id, state) {
			const descriptor = this.profiles.get(id);
			if (descriptor === void 0) throw new Error("This provider does not expose editable credential settings");
			const original = this.profileOf(id).apiKeyEnv;
			if (typeof original !== "string" || !CREDENTIAL_REF_PATTERN.test(original)) throw new Error("Provider must use a named API credential");
			const activeRef = state.activeRef ?? `QUOTA_ACTIVE_${randomUUID().replaceAll("-", "_")}`;
			if (state.refs.includes(activeRef)) throw new Error("Routing credential must differ from monitored keys");
			if (original !== activeRef) {
				const value = await this.resolveApiKey(original);
				if (value === void 0) throw new Error("Provider credential is unavailable");
				await this.ctx.credentials.set(brandString(activeRef), value);
				state.activeRef = activeRef;
				await this.saveKeys(id, state);
				const section = this.ctx.settings.describe().find((row) => row.ns === descriptor.settingsNs);
				if (section === void 0) throw new Error("Provider settings are unavailable");
				await this.ctx.settings.mutate(descriptor.settingsNs, [{
					op: "set",
					path: [...descriptor.settingsPath, "apiKeyEnv"],
					value: activeRef
				}], section.revision);
			}
			this.routers.set(id, {
				activeRef,
				value: void 0,
				credentialRef: void 0,
				wired: void 0,
				refused: false
			});
		}
		/** Refold usage, then re-read every monitored credential. */
		async runBackgroundRound() {
			await this.reloadPrices(false);
			await this.usageStore.refresh();
			await this.readRouteAccounts();
		}
		/** Re-read only the credential the panel is showing. */
		async refreshFocusedAccount() {
			if (this.focused === void 0) return;
			await this.readAccount(this.focused);
		}
		/**
		* Read monitored credentials route by route.
		*
		* Routes proceed together while one route's credentials are read in order, so
		* a gateway monitoring several keys is not asked all of them at once.
		* @param pending - which slots to read; absent reads every monitored slot.
		*/
		async readRouteAccounts(pending) {
			this.refresh();
			await Promise.all([...this.names.keys()].map(async (id) => {
				for (const slot of this.slotsOf(id)) {
					if (pending !== void 0 && !pending(slot)) continue;
					await this.readAccount(slot);
				}
			}));
		}
		/**
		* The monitored credentials of one route, in read order.
		*
		* A configured `credentialRefs` list replaces the route's own credential
		* entirely; otherwise the route has one slot, read with the monitor override
		* or with the provider key its profile names.
		* @param id - provider route key.
		* @returns one slot per monitored credential.
		*/
		slotsOf(id) {
			const configured = this.managed.get(id)?.refs ?? resolveMonitor(this.config, id)?.credentialRefs;
			if (configured !== void 0 && configured.length > 0) return configured.map((credentialRef) => ({
				id,
				credentialRef
			}));
			const credentialRef = this.credentialRefOf(id);
			return [credentialRef === void 0 ? { id } : {
				id,
				credentialRef
			}];
		}
		/** The credential reference one route's own account read uses, when one is named. */
		credentialRefOf(id) {
			const configured = resolveMonitor(this.config, id)?.credentialRef;
			if (configured !== void 0) return configured;
			const fromProfile = this.profileOf(id).apiKeyEnv;
			return typeof fromProfile === "string" && CREDENTIAL_REF_PATTERN.test(fromProfile) ? fromProfile : void 0;
		}
		/**
		* Point one route's credential at the healthiest monitored key.
		*
		* Runs before the request that authenticates with it, and only when this
		* route routes at all: the value the process last saw is compared first, so a
		* steady route costs one credential resolution per request and no write.
		*
		* A route whose profile does not authenticate with the routing reference is
		* reported once and then left untouched — the choice would have no effect on
		* the request, and rotating a credential nothing reads is worse than saying
		* so. What is written is the value of one of the monitored keys, read from
		* the same seam the route would have read it from.
		* @param id - provider route key about to serve a request.
		*/
		async routeCredential(id) {
			const router = this.routers.get(id);
			if (router === void 0 || router.refused) return;
			if (router.wired === void 0) {
				this.refresh();
				const named = this.profileOf(id).apiKeyEnv;
				router.wired = named === router.activeRef;
				if (!router.wired) {
					router.refused = true;
					this.ctx.logger.error(`quota monitor: monitors.${id}.activeRef names ${router.activeRef}, but route ${id} authenticates with ${typeof named === "string" ? named : "no named credential"}; leaving its credential untouched`);
					return;
				}
			}
			const state = this.managed.get(id);
			if (state?.mode !== "manual") for (const slot of this.slotsOf(id)) {
				const reading = this.accounts.get(accountKey(slot));
				if ((state !== void 0 || reading !== void 0) && (reading === void 0 || Date.now() - reading.fetchedAt > this.config.routing.maxAgeMs || reading.planWindows?.some((window) => window.resetAt !== void 0 && Date.parse(window.resetAt) <= Date.now()))) await this.readAccount(slot);
			}
			let chosen = state?.mode === "manual" ? this.slotsOf(id).find((slot) => slot.credentialRef === state.selectedRef) : this.healthiestSlot(id);
			this.decisions.set(id, state?.mode === "manual" ? "manual" : "quota");
			if (state?.mode === "jev") {
				const candidates = this.routeCandidates(id);
				const key = state.jevRef === void 0 ? void 0 : await this.resolveApiKey(state.jevRef);
				const ref = key === void 0 ? void 0 : await chooseWithJev(candidates, key, this.config.routing);
				if (ref !== void 0) chosen = {
					id,
					credentialRef: ref
				};
				this.decisions.set(id, ref === void 0 ? "jev-fallback" : "jev");
			}
			if (chosen?.credentialRef === void 0) {
				if (state !== void 0 && state.mode !== "manual") throw new Error(`quota monitor: no healthy key available for ${id}`);
				return;
			}
			const value = await this.resolveApiKey(chosen.credentialRef);
			if (value === void 0) return;
			const current = router.value ?? await this.resolveApiKey(router.activeRef);
			router.value = current;
			if (current === value) {
				router.credentialRef = chosen.credentialRef;
				return;
			}
			try {
				await this.ctx.credentials.set(brandString(router.activeRef), value);
			} catch (error) {
				router.refused = true;
				this.ctx.logger.error(`quota monitor: cannot route ${id} through ${router.activeRef}: ${String(error)}`);
				return;
			}
			router.value = value;
			router.credentialRef = chosen.credentialRef;
			this.ctx.logger.info(`quota monitor: ${id} now authenticates with ${chosen.credentialRef}`);
		}
		/**
		* The monitored credential of one route with the most room left.
		*
		* Readings that state no figure are not candidates, so a route with no
		* reading yet — and every key that could not be read — leaves the route
		* exactly as the deployment configured it rather than guessing.
		* @param id - provider route key.
		* @returns the chosen credential's slot, or undefined when none states a figure.
		*/
		routeCandidates(id) {
			const readings = this.slotsOf(id).flatMap((slot) => {
				const account = this.accounts.get(accountKey(slot));
				if (slot.credentialRef === void 0 || account?.status !== "ok" || Date.now() - account.fetchedAt > this.config.routing.maxAgeMs || (this.cooldowns.get(accountKey(slot)) ?? 0) > Date.now()) return [];
				return [{
					ref: slot.credentialRef,
					account
				}];
			});
			const scale = Math.max(0, ...readings.map((item) => item.account.remaining ?? 0));
			return readings.flatMap(({ ref, account }) => {
				const headroom = headroomOf(account, scale);
				if (headroom === void 0 || headroom <= 0 || !Number.isFinite(headroom)) return [];
				const resetAt = account.planWindows?.map((window) => window.resetAt).filter((value) => value !== void 0).sort()[0];
				return [{
					ref,
					headroom,
					...resetAt === void 0 ? {} : { resetAt }
				}];
			}).sort((a, b) => b.headroom - a.headroom);
		}
		healthiestSlot(id) {
			const ref = this.routeCandidates(id)[0]?.ref;
			return ref === void 0 ? void 0 : {
				id,
				credentialRef: ref
			};
		}
		/**
		* Recognize which monitored credential a routing route already authenticates
		* with, so the panel can name it before the process has routed anything.
		*
		* A route set up before this process started holds one of the monitored keys
		* already; matching the values is the only way to name it, because the stored
		* value is opaque and the reference it came from was forgotten by then.
		*/
		async identifyRoutedCredentials() {
			for (const [id, router] of this.routers) {
				const value = await this.resolveApiKey(router.activeRef);
				router.value = value;
				router.credentialRef = await this.matchingCredential(id, value);
			}
		}
		/**
		* The monitored credential of one route whose stored value is one value.
		* @param id - provider route key.
		* @param value - credential value to match, or undefined to match nothing.
		* @returns the credential reference, or undefined when none matches.
		*/
		async matchingCredential(id, value) {
			if (value === void 0) return void 0;
			for (const slot of this.slotsOf(id)) {
				if (slot.credentialRef === void 0) continue;
				if (await this.resolveApiKey(slot.credentialRef) === value) return slot.credentialRef;
			}
		}
		/**
		* The monitored credential one account request names.
		* @param request - provider route and optional credential reference.
		* @returns the slot, defaulting to the route's first monitored credential.
		*/
		slotFor(request) {
			this.refresh();
			if (!this.names.has(request.provider)) throw new Error("Provider is not currently registered");
			const slots = this.slotsOf(request.provider);
			const slot = request.credentialRef === void 0 ? slots[0] : slots.find((item) => item.credentialRef === request.credentialRef);
			if (slot === void 0) throw new Error("Key is not monitored by this provider");
			return slot;
		}
		/**
		* Run one provider's adapter for one monitored credential and cache the
		* reading.
		*
		* Every failure becomes an account with a status: the panel states why a
		* figure is missing instead of drawing a zero.
		* @param slot - the route and the credential reference to read it with.
		* @returns the reading, cached under this credential.
		*/
		async readAccount(slot) {
			this.refresh();
			const { id, credentialRef } = slot;
			const name = this.names.get(id) ?? id;
			const fetchedAt = Date.now();
			const entry = resolveMonitor(this.config, id);
			const profile = this.profileOf(id);
			const baseURL = trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id];
			const identity = resolveProviderIdentity(id, baseURL, entry?.adapter);
			const base = {
				id,
				name,
				mode: identity.mode,
				status: "unsupported",
				adapter: identity.adapter ?? "none",
				...credentialRef === void 0 ? {} : { credentialRef },
				fetchedAt
			};
			const apiKey = await this.resolveApiKey(profile.apiKeyEnv);
			const context = {
				id,
				now: () => Date.now(),
				credential: (reference) => this.resolveApiKey(reference),
				...baseURL === void 0 ? {} : { baseURL },
				...apiKey === void 0 ? {} : { apiKey },
				...entry?.usageBaseURL === void 0 ? {} : { usageBaseURL: entry.usageBaseURL },
				...credentialRef === void 0 ? {} : { credentialRef },
				...entry?.allowPlaintextEndpoint === true ? { allowPlaintext: true } : {},
				...entry?.allowedHosts === void 0 ? {} : { allowedHosts: entry.allowedHosts.map((host) => host.toLowerCase()) }
			};
			const adapter = this.adapterFor(identity.adapter, entry) ?? await this.detectAdapter(identity.adapter, context);
			if (adapter === void 0) return this.publish({
				...base,
				reason: "this provider publishes no account endpoint",
				...this.manualOf(id)
			});
			const mode = ADAPTER_MODES[adapter.id];
			try {
				const reading = await adapter.read(context);
				return this.publish(this.accountOf(base, adapter, reading.mode ?? mode, reading, entry));
			} catch (error) {
				const status = error instanceof QuotaRequestError ? error.status : "unavailable";
				const reason = error instanceof QuotaRequestError ? error.message : "account read failed";
				const missing = status === "not-configured" ? credentialRefsFor(adapter.id) : [];
				return this.publish({
					...base,
					mode,
					adapter: adapter.id,
					status,
					reason,
					...missing.length === 0 ? {} : { missingCredentials: missing },
					...this.manualOf(id)
				});
			}
		}
		/** Assemble one successful reading into an account row. */
		accountOf(base, adapter, mode, reading, entry) {
			const warning = this.warningOf(reading, entry);
			return {
				...base,
				mode,
				adapter: adapter.id,
				status: "ok",
				...reading.accountName === void 0 ? {} : { accountName: reading.accountName },
				...reading.remaining === void 0 ? {} : { remaining: reading.remaining },
				...reading.used === void 0 ? {} : { used: reading.used },
				...reading.limit === void 0 ? {} : { limit: reading.limit },
				...reading.currency === void 0 ? {} : { currency: reading.currency },
				...reading.unlimited === void 0 ? {} : { unlimited: reading.unlimited },
				...reading.plan === void 0 ? {} : { plan: reading.plan },
				...reading.planWindows === void 0 ? {} : { planWindows: reading.planWindows },
				...reading.budgetPools === void 0 ? {} : { budgetPools: reading.budgetPools },
				...reading.usage === void 0 ? {} : { usage: reading.usage },
				...warning === void 0 ? {} : { warning }
			};
		}
		/**
		* Severity of a reading, from the configured thresholds.
		*
		* A balance account compares its remainder against absolute amounts; a
		* subscription account compares the tightest window's used share, since
		* there is no amount to compare.
		*/
		warningOf(reading, entry) {
			if (reading.unlimited === true) return "normal";
			const windows = reading.planWindows;
			if (windows !== void 0 && windows.length > 0) {
				const used = Math.max(...windows.map((window) => window.percentUsed));
				if (used >= this.config.thresholds.criticalPercentUsed) return "critical";
				return used >= this.config.thresholds.warningPercentUsed ? "warning" : "normal";
			}
			const remaining = reading.remaining;
			if (remaining === void 0) return void 0;
			const critical = entry?.criticalRemaining ?? this.config.thresholds.criticalRemaining;
			const warning = entry?.warningRemaining ?? this.config.thresholds.warningRemaining;
			if (remaining <= critical) return "critical";
			return remaining <= warning ? "warning" : "normal";
		}
		/** Cache one account reading under its route and credential and return it. */
		publish(account) {
			this.accounts.set(accountKey(account), account);
			return account;
		}
		/** The adapter one provider runs, including a configured declarative spec. */
		adapterFor(id, entry) {
			if (entry?.declarative !== void 0) return declarativeAdapter(entry.declarative);
			return id === null ? void 0 : adapterFor(id);
		}
		/**
		* Ask an unrecognized gateway what it is, and run the matching adapter.
		*
		* Only a route no rule resolved reaches this, and only when it already holds
		* a credential — a gateway this build cannot name and cannot authenticate
		* against has nothing to disclose. The question itself carries no credential,
		* and its answer is remembered so the request is not repeated every round.
		*/
		async detectAdapter(resolved, context) {
			if (resolved !== null || !this.config.detection.enabled) return void 0;
			if (context.apiKey === void 0 && context.credentialRef === void 0) return void 0;
			const key = `${context.id}\u0000${context.usageBaseURL ?? context.baseURL ?? ""}`;
			let answer = this.detected.get(key);
			if (answer === void 0) {
				answer = detectSub2apiPanel(context);
				this.detected.set(key, answer);
			}
			return await answer ? adapterFor("sub2api-auth") : void 0;
		}
		/** The manual allowance fallback for one provider, when the user entered one. */
		manualOf(id) {
			const estimate = manualBalanceEstimate(this.manual.get(id), this.totalTokensOf(id));
			return estimate === null ? {} : { manual: estimate };
		}
		/** Tokens observed this process for one provider route. */
		totalTokensOf(id) {
			const bucket = this.usage.get(id);
			if (bucket === void 0) return 0;
			return bucket.inputTokens + bucket.outputTokens + bucket.cacheReadTokens + bucket.cacheWriteTokens;
		}
		/**
		* Count one streaming call per provider, forwarding chunks unchanged.
		*
		* A route that routes its credentials is pointed at the healthiest key first:
		* the adapter resolves the credential when it starts the request, which is
		* after this generator's first step and before its first chunk.
		*/
		tapStream(options, next) {
			const id = options.provider || "unknown";
			const bucket = this.bucketFor(id, this.names.get(id) ?? id);
			const service = this;
			return (async function* () {
				const unlock = service.routers.has(id) ? await service.lockRoute(id) : () => {};
				let servingRef;
				try {
					if (options.signal?.aborted) throw options.signal.reason;
					if (service.routers.has(id)) await service.routeCredential(id);
					servingRef = service.routers.get(id)?.credentialRef;
					let counted = false;
					for await (const chunk of next()) {
						if (!counted) {
							counted = true;
							bucket.calls += 1;
							bucket.lastCallAt = Date.now();
							bucket.lastModel = options.model;
						}
						if (chunk.type === "usage") service.addUsage(bucket, chunk.usage);
						yield chunk;
					}
				} catch (error) {
					bucket.errorCount += 1;
					if (servingRef !== void 0 && !options.signal?.aborted) service.cooldowns.set(accountKey({
						id,
						credentialRef: servingRef
					}), Date.now() + service.config.routing.cooldownMs);
					throw error;
				} finally {
					unlock();
				}
			})();
		}
		/** Accumulate one usage report into a bucket. */
		addUsage(bucket, usage) {
			bucket.inputTokens += usage.inputTokens || 0;
			bucket.outputTokens += usage.outputTokens || 0;
			bucket.cacheReadTokens += usage.cacheReadTokens ?? 0;
			bucket.cacheWriteTokens += usage.cacheWriteTokens ?? 0;
			bucket.reasoningTokens += usage.reasoningTokens ?? 0;
		}
		/**
		* Reload the price table, including every configured document.
		*
		* A deployment that keeps prices in a file edits that file, not the profile
		* patch: re-reading on each round is what makes the edit take effect without
		* a restart. The table is replaced only when it actually changed, so a
		* steady-state round costs one read per document and no report rebuild.
		* @param failLoud - whether an unreadable document throws instead of being
		* logged. True at load, where it is a configuration error; false afterwards,
		* where keeping the last good table beats blanking every cost figure.
		*/
		async reloadPrices(failLoud) {
			let next;
			try {
				next = await loadPriceTable(this.config, (path) => readFile(path, "utf8"));
			} catch (error) {
				if (failLoud) throw error;
				this.ctx.logger.warn(`quota monitor: keeping the previous price table: ${String(error)}`);
				return;
			}
			const before = this.prices === void 0 ? "" : JSON.stringify(this.prices);
			const after = next === void 0 ? "" : JSON.stringify(next);
			this.prices = next;
			if (before === after) return;
			this.usageStore.setPrices(next);
		}
		/** Reconcile live routes and profiles; historical usage is deliberately retained. */
		refresh() {
			const llm = this.ctx.llm;
			this.names.clear();
			this.profiles.clear();
			for (const provider of llm.listProviders()) this.noteProvider(provider);
			for (const entry of llm.listConfigurableProviders()) this.profiles.set(entry.provider, entry);
			if (this.focused !== void 0 && !this.names.has(this.focused.id)) this.focused = void 0;
		}
		noteProvider(provider) {
			if (provider.id === "") return;
			this.names.set(provider.id, provider.name || provider.id);
			this.bucketFor(provider.id, provider.name || provider.id);
		}
		bucketFor(id, name) {
			let bucket = this.usage.get(id);
			if (bucket === void 0) {
				bucket = {
					name,
					calls: 0,
					inputTokens: 0,
					outputTokens: 0,
					cacheReadTokens: 0,
					cacheWriteTokens: 0,
					reasoningTokens: 0,
					errorCount: 0,
					lastCallAt: 0,
					lastModel: ""
				};
				this.usage.set(id, bucket);
			} else if (name !== "") bucket.name = name;
			return bucket;
		}
		/** Resolve the settings section backing one configurable provider. */
		profileOf(id) {
			const entry = this.profiles.get(id);
			if (entry === void 0) return EMPTY_PROFILE;
			const section = this.settingsSection(entry.settingsNs, entry.settingsPath);
			if (typeof section !== "object" || section === null) return EMPTY_PROFILE;
			const record = section;
			return {
				baseURL: record["baseURL"],
				apiKeyEnv: record["apiKeyEnv"]
			};
		}
		/**
		* One settings section, read from whichever settings surface this deployment
		* runs.
		*
		* The namespace-document API exposes `get(ns)`; the forms API that replaced it
		* exposes `describe()`, whose rows carry the same live values keyed by profile
		* entry id. A plugin loaded into a deployment it was not built against must
		* read either one, so both are addressed structurally rather than through the
		* settings seam's own method types.
		* @param ns - namespace (profile entry id) owning the section.
		* @param path - path from that section to one provider's profile.
		* @returns the section, or `undefined` when this deployment cannot supply it.
		*/
		settingsSection(ns, path) {
			const settings = this.ctx.settings;
			let section;
			try {
				if (typeof settings.get === "function") section = settings.get(brandString(ns));
				else if (typeof settings.describe === "function") section = settings.describe().find((row) => row.ns === ns)?.value;
				else return;
			} catch {
				return;
			}
			for (const key of path) {
				if (typeof section !== "object" || section === null) return void 0;
				section = section[key];
			}
			return section;
		}
		/** Current credential value for one reference name, or undefined. */
		async resolveApiKey(reference) {
			if (typeof reference !== "string" || !CREDENTIAL_REF_PATTERN.test(reference)) return void 0;
			try {
				return (await this.ctx.credentials.resolve(brandString(reference)))?.value;
			} catch {
				return;
			}
		}
		/** The provider selector entries, one per known route. */
		providerEntries() {
			const entries = [];
			for (const [id, name] of this.names) {
				const monitor = resolveMonitor(this.config, id);
				const profile = this.profileOf(id);
				const identity = resolveProviderIdentity(id, trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id], monitor?.adapter);
				const adapter = monitor?.declarative !== void 0 ? "declarative" : identity.adapter;
				const slots = this.slotsOf(id);
				const router = this.routers.get(id);
				const account = slots[0] === void 0 ? void 0 : this.accounts.get(accountKey(slots[0]));
				const accounts = [];
				for (const slot of slots) {
					const reading = this.accounts.get(accountKey(slot));
					if (reading !== void 0) accounts.push(reading);
				}
				entries.push({
					id,
					name,
					mode: account?.mode ?? (adapter === null ? "unsupported" : ADAPTER_MODES[adapter]),
					adapter: account?.adapter ?? adapter ?? "none",
					status: account?.status ?? "unsupported",
					...account?.warning === void 0 ? {} : { warning: account.warning },
					credentialRefs: slots.flatMap((slot) => slot.credentialRef === void 0 ? [] : [slot.credentialRef]),
					...router?.credentialRef !== void 0 ? { activeCredentialRef: router.credentialRef } : router === void 0 && typeof profile.apiKeyEnv === "string" && slots.some((slot) => slot.credentialRef === profile.apiKeyEnv) ? { activeCredentialRef: profile.apiKeyEnv } : {},
					keyNames: this.managed.get(id)?.labels ?? {},
					routing: {
						mode: this.managed.get(id)?.mode ?? (router === void 0 ? "manual" : "quota"),
						wired: router !== void 0 && profile.apiKeyEnv === router.activeRef && !router.refused,
						...router === void 0 ? {} : { activeRef: router.activeRef },
						jevConfigured: this.managed.get(id)?.jevRef !== void 0,
						...this.decisions.get(id) === void 0 ? {} : { lastDecision: this.decisions.get(id) }
					},
					accounts
				});
			}
			return entries;
		}
		/** Assemble the snapshot from the current accounting maps. */
		snapshot() {
			this.refresh();
			const rows = [];
			const aggregate = {
				calls: 0,
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0
			};
			for (const [id, bucket] of this.usage) {
				const totalTokens = bucket.inputTokens + bucket.outputTokens + bucket.cacheReadTokens + bucket.cacheWriteTokens;
				rows.push({
					id,
					name: bucket.name,
					calls: bucket.calls,
					inputTokens: bucket.inputTokens,
					outputTokens: bucket.outputTokens,
					cacheReadTokens: bucket.cacheReadTokens,
					cacheWriteTokens: bucket.cacheWriteTokens,
					reasoningTokens: bucket.reasoningTokens,
					totalTokens,
					errorCount: bucket.errorCount,
					lastCallAt: bucket.lastCallAt,
					lastModel: bucket.lastModel,
					balance: manualBalanceEstimate(this.manual.get(id), totalTokens)
				});
				aggregate.calls += bucket.calls;
				aggregate.inputTokens += bucket.inputTokens;
				aggregate.outputTokens += bucket.outputTokens;
				aggregate.totalTokens += bucket.inputTokens + bucket.outputTokens;
			}
			return {
				capturedAt: Date.now(),
				providers: this.providerEntries(),
				rows,
				balances: this.balancesView(),
				aggregate
			};
		}
		/** The manual balance table as a plain object. */
		balancesView() {
			return Object.fromEntries(this.manual);
		}
	};
})();
/**
* Rough spend estimate behind a manually entered allowance.
* @param total - the manual allowance, or undefined when none was entered.
* @param totalTokens - tokens observed this process.
* @returns the estimate, or null without a manual figure.
*/
function manualBalanceEstimate(total, totalTokens) {
	if (total === void 0) return null;
	const spent = totalTokens / 1e6;
	return {
		total,
		spent,
		remaining: Math.max(0, total - spent),
		pct: total > 0 ? spent / total * 100 : 0
	};
}
/** Trim trailing slashes off a stored base URL. */
function trimBaseURL(raw) {
	if (typeof raw !== "string") return void 0;
	const trimmed = raw.trim().replace(/\/+$/, "");
	return trimmed === "" ? void 0 : trimmed;
}
//#endregion
export { Config, QuotaMonitorService, QuotaMonitorService as default };
