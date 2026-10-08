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

import type { QuotaAccountMode } from './types.ts'

/** Every account adapter this build can run. */
export type QuotaAdapterId =
  | 'deepseek-balance'
  | 'openrouter-balance'
  | 'moonshot-balance'
  | 'zai-balance'
  | 'orcarouter-balance'
  | 'new-api'
  | 'sub2api'
  | 'sub2api-auth'
  | 'agent-router'
  | 'stepcode'
  | 'general'
  | 'opencode-go'
  | 'zai-token-plan'
  | 'kimi-token-plan'
  | 'minimax-token-plan'
  | 'cline-plan'
  | 'ollama'
  | 'declarative'

/**
 * Which mode each adapter reports in, so the panel picks its card frame before
 * the first read.
 *
 * `sub2api` and `sub2api-auth` are listed as `balance` because that is the
 * frame their wallet answer needs; either may return
 * {@link QuotaAccountReading.mode} `subscription` when the gateway answers with
 * plan windows instead, and that answer wins.
 */
export const ADAPTER_MODES: Readonly<Record<QuotaAdapterId, QuotaAccountMode>> = Object.freeze({
  'deepseek-balance': 'balance',
  'openrouter-balance': 'balance',
  'moonshot-balance': 'balance',
  'zai-balance': 'balance',
  'orcarouter-balance': 'balance',
  'new-api': 'balance',
  'sub2api': 'balance',
  'sub2api-auth': 'balance',
  'agent-router': 'balance',
  'stepcode': 'balance',
  'general': 'balance',
  'opencode-go': 'subscription',
  'zai-token-plan': 'subscription',
  'kimi-token-plan': 'subscription',
  'minimax-token-plan': 'subscription',
  'cline-plan': 'subscription',
  'ollama': 'subscription',
  'declarative': 'balance',
})

/**
 * Canonical route ids. A deployment that renames its route falls through to
 * the hostname rules below, and an explicit monitor overrides both.
 */
const CANONICAL_ROUTES: Readonly<Record<string, QuotaAdapterId>> = Object.freeze({
  'deepseek': 'deepseek-balance',
  'deepseek-official': 'deepseek-balance',
  'openrouter': 'openrouter-balance',
  'orcarouter': 'orcarouter-balance',
  'moonshot': 'moonshot-balance',
  'moonshotai': 'moonshot-balance',
  'moonshotai-cn': 'moonshot-balance',
  'kimi': 'moonshot-balance',
  'kimi-coding': 'kimi-token-plan',
  'kimi-for-coding': 'kimi-token-plan',
  'zai': 'zai-token-plan',
  'zai-coding': 'zai-token-plan',
  'zai-coding-cn': 'zai-token-plan',
  'glm': 'zai-balance',
  'bigmodel': 'zai-balance',
  'opencode-go': 'opencode-go',
  'minimax': 'minimax-token-plan',
  'minimaxi': 'minimax-token-plan',
  'minimax-cn': 'minimax-token-plan',
  'minimax-coding': 'minimax-token-plan',
  'cline': 'cline-plan',
  'agent-router': 'agent-router',
  'agentrouter': 'agent-router',
  'stepcode': 'stepcode',
  'passion': 'sub2api',
})

/** One hostname rule: the adapter it selects and how to match the host. */
interface HostRule {
  adapter: QuotaAdapterId
  /** Whether `hostname` (already lowercased, dot-stripped) selects this adapter. */
  matches(hostname: string): boolean
}

/** Exact host or any subdomain of it. */
function domain(suffix: string): (hostname: string) => boolean {
  return hostname => hostname === suffix || hostname.endsWith(`.${suffix}`)
}

/**
 * Hostname rules, evaluated in order. These resolve a route whose id a
 * deployment renamed but whose upstream is still recognizable.
 */
const HOST_RULES: readonly HostRule[] = Object.freeze([
  { adapter: 'deepseek-balance', matches: domain('deepseek.com') },
  { adapter: 'openrouter-balance', matches: domain('openrouter.ai') },
  { adapter: 'orcarouter-balance', matches: domain('orcarouter.ai') },
  { adapter: 'moonshot-balance', matches: domain('moonshot.cn') },
  { adapter: 'moonshot-balance', matches: domain('moonshot.ai') },
  { adapter: 'kimi-token-plan', matches: domain('kimi.com') },
  { adapter: 'zai-token-plan', matches: domain('z.ai') },
  { adapter: 'zai-balance', matches: domain('bigmodel.cn') },
  { adapter: 'minimax-token-plan', matches: domain('minimax.io') },
  { adapter: 'minimax-token-plan', matches: domain('minimaxi.com') },
  { adapter: 'cline-plan', matches: domain('cline.bot') },
  { adapter: 'agent-router', matches: domain('agentrouter.org') },
  { adapter: 'agent-router', matches: hostname => /(^|\.)agentrouter\./.test(hostname) },
  { adapter: 'stepcode', matches: domain('air-outer.com') },
  { adapter: 'sub2api', matches: domain('passionapi.com') },
  { adapter: 'opencode-go', matches: domain('opencode.ai') },
  { adapter: 'ollama', matches: domain('ollama.com') },
])

/**
 * Hostnames that name this machine or a private network. Ollama is the case
 * that forces the check: a local `localhost:11434` daemon shares the cloud
 * route id but has no subscription, so treating it as a quota account would
 * invent a window that does not exist.
 */
const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i

/**
 * Whether a hostname names this machine or a private network.
 * @param hostname - lowercased hostname to classify.
 * @returns true when the host is loopback, link-local, or RFC 1918.
 */
export function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOST.test(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')
}

/** The lowercased hostname of a configured base URL, or undefined when it is not a URL. */
function hostnameOf(baseURL: string | undefined): string | undefined {
  if (baseURL === undefined || baseURL === '') return undefined
  try {
    return new URL(baseURL).hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    // A settings profile may hold a bare host fragment rather than an
    // absolute URL; that route simply resolves no hostname rule.
    return undefined
  }
}

/**
 * How confidently an adapter was selected, for the card's origin line.
 *
 * `fingerprint` names a route no rule recognized whose own public settings
 * document identified it; the service resolves that one, because it costs a
 * request.
 */
export type QuotaIdentityConfidence =
  | 'explicit'
  | 'canonical-id'
  | 'canonical-host'
  | 'fingerprint'
  | 'unknown'

/** One resolved provider route. */
export interface QuotaProviderIdentity {
  readonly id: string
  /** The adapter to run, or null when the route has no known account endpoint. */
  adapter: QuotaAdapterId | null
  mode: QuotaAccountMode
  confidence: QuotaIdentityConfidence
}

/**
 * Resolve one configured provider route to its account adapter.
 *
 * @param id - provider route key.
 * @param baseURL - the route's configured base URL, when it has one.
 * @param explicitAdapter - adapter named by a `monitors` entry for this route.
 * @returns the resolved identity; `adapter` is null when nothing recognizes the route.
 */
export function resolveProviderIdentity(
  id: string,
  baseURL: string | undefined,
  explicitAdapter: QuotaAdapterId | undefined,
): QuotaProviderIdentity {
  if (explicitAdapter !== undefined) {
    return { id, adapter: explicitAdapter, mode: ADAPTER_MODES[explicitAdapter], confidence: 'explicit' }
  }

  const hostname = hostnameOf(baseURL)
  const canonical = CANONICAL_ROUTES[id]
  if (canonical !== undefined) {
    // A canonical id names a cloud account, so a route pointing at this
    // machine is a local daemon wearing that name rather than that account.
    if (hostname !== undefined && isPrivateHostname(hostname)) {
      return { id, adapter: null, mode: 'unsupported', confidence: 'unknown' }
    }
    return { id, adapter: canonical, mode: ADAPTER_MODES[canonical], confidence: 'canonical-id' }
  }

  if (hostname !== undefined && !isPrivateHostname(hostname)) {
    for (const rule of HOST_RULES) {
      if (!rule.matches(hostname)) continue
      return { id, adapter: rule.adapter, mode: ADAPTER_MODES[rule.adapter], confidence: 'canonical-host' }
    }
  }

  return { id, adapter: null, mode: 'unsupported', confidence: 'unknown' }
}
