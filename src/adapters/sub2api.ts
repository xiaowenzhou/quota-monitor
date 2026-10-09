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

import { QuotaRequestError, isFallthrough, requestJson } from '../http.ts'
import { arrayUnder, clampPercent, isRecord, numberOf, pickNumber, pickString, round1, upcomingIso } from '../parse.ts'
import type { JsonRecord } from '../parse.ts'
import type { QuotaGatewayUsage, QuotaPlanWindow, QuotaPlanWindowKind } from '../types.ts'
import { bearer, gatewayUsageRow, requireKey } from './contract.ts'
import type { QuotaAccountReading, QuotaAdapter, QuotaAdapterContext } from './contract.ts'

/** Rate-limit window ids the protocol publishes, mapped to the rows the panel labels. */
const WINDOW_KINDS: Readonly<Record<string, QuotaPlanWindowKind>> = Object.freeze({
  '5h': 'five-hour',
  '1d': 'daily',
  '7d': 'weekly',
  '30d': 'monthly',
})

/**
 * Ceiling on the gateway-reported usage rows carried for one account.
 *
 * A panel lists a handful of them; the cap exists so that a gateway answering
 * with an unbounded ledger cannot grow the account payload without limit.
 */
const MAX_USAGE_ROWS = 90

/** Calendar periods a subscription answer meters, in ascending order. */
const SUBSCRIPTION_PERIODS: readonly (readonly [string, QuotaPlanWindowKind])[] = Object.freeze([
  Object.freeze(['daily', 'daily'] as const),
  Object.freeze(['weekly', 'weekly'] as const),
  Object.freeze(['monthly', 'monthly'] as const),
])

/** Path serving the fingerprint a real Sub2API panel publishes without a credential. */
const FINGERPRINT_PATH = '/api/v1/settings/public'

/**
 * One window from an amount-metered section.
 *
 * A section without a positive limit is dropped: a bar drawn against no
 * ceiling would state a used share the gateway never disclosed.
 */
function amountWindow(
  kind: QuotaPlanWindowKind,
  section: unknown,
  resetAt: string | undefined,
  usedKeys: readonly string[] = ['used', 'used_usd', 'usage'],
  limitKeys: readonly string[] = ['limit', 'limit_usd', 'total'],
): QuotaPlanWindow | undefined {
  const limit = pickNumber(section, limitKeys)
  if (limit === undefined || limit <= 0) return undefined
  const remaining = pickNumber(section, ['remaining', 'remaining_usd', 'left'])
  const used = pickNumber(section, usedKeys) ?? (remaining === undefined ? undefined : limit - remaining)
  if (used === undefined) return undefined
  const percentUsed = clampPercent((used / limit) * 100)
  if (percentUsed === undefined) return undefined
  return {
    kind,
    percentUsed: round1(percentUsed),
    ...resetAt === undefined ? {} : { resetAt },
    ...remaining === undefined ? {} : { remaining },
  }
}

/** Whether the answer meters periods rather than a wallet. */
function metersWindows(body: Record<string, unknown>): boolean {
  return pickString(body, ['mode']) === 'quota_limited' || isRecord(body['subscription'])
}

/** Windows of an aggregate-quota answer: the quota itself plus each rate limit. */
function quotaWindows(body: Record<string, unknown>, now: number): QuotaPlanWindow[] {
  const windows: QuotaPlanWindow[] = []
  const quota = amountWindow('quota', body['quota'], upcomingIso(body['expires_at'], now))
  if (quota !== undefined) windows.push(quota)
  const limits = body['rate_limits']
  if (Array.isArray(limits)) {
    for (const entry of limits) {
      if (!isRecord(entry)) continue
      const kind = WINDOW_KINDS[pickString(entry, ['window']) ?? ''] ?? 'quota'
      const row = amountWindow(kind, entry, upcomingIso(entry['reset_at'], now))
      if (row !== undefined) windows.push(row)
    }
  }
  return windows
}

/** Windows of a subscription answer: one per calendar period it publishes. */
function subscriptionWindows(subscription: Record<string, unknown>): QuotaPlanWindow[] {
  const windows: QuotaPlanWindow[] = []
  for (const [period, kind] of SUBSCRIPTION_PERIODS) {
    const row = amountWindow(kind, subscription, undefined,
      [`${period}_usage_usd`, `${period}_usage`], [`${period}_limit_usd`, `${period}_limit`])
    if (row !== undefined) windows.push(row)
  }
  return windows
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
export function readSub2apiUsage(body: unknown, now: number): QuotaAccountReading {
  if (!isRecord(body)) {
    throw new QuotaRequestError('invalid-response', 'Sub2API usage response is not an object')
  }
  if (body['isValid'] === false || body['is_active'] === false) {
    throw new QuotaRequestError('unauthorized', 'Sub2API reports this key as inactive')
  }

  const plan = pickString(body, ['planName', 'plan_name', 'plan'])
  const usage = gatewayUsage(body)
  if (metersWindows(body)) {
    const subscription = body['subscription']
    const windows = isRecord(subscription) ? subscriptionWindows(subscription) : quotaWindows(body, now)
    if (windows.length > 0) {
      return {
        mode: 'subscription',
        plan: plan ?? 'Sub2API',
        planWindows: Object.freeze(windows),
        ...usage.length === 0 ? {} : { usage },
      }
    }
    // A plan that meters spend without publishing a period ceiling states its
    // remainder on the same answer. Reporting that is the honest reading: the
    // gateway disclosed an allowance, and failing would hide it.
    const metered = pickNumber(body, ['remaining', 'balance'])
    if (metered === undefined) {
      throw new QuotaRequestError('invalid-response', 'Sub2API response has no usable quota window')
    }
    return {
      mode: 'balance',
      remaining: metered,
      currency: pickString(body, ['unit', 'currency']) ?? 'USD',
      ...plan === undefined ? {} : { plan },
      ...usage.length === 0 ? {} : { usage },
    }
  }

  const remaining = pickNumber(body, ['balance', 'remaining'])
  if (remaining === undefined) {
    throw new QuotaRequestError('invalid-response', 'Sub2API wallet response has no balance figure')
  }
  return {
    mode: 'balance',
    remaining,
    currency: pickString(body, ['unit', 'currency']) ?? 'USD',
    ...plan === undefined ? {} : { plan },
    ...usage.length === 0 ? {} : { usage },
  }
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
function gatewayUsage(body: JsonRecord): readonly QuotaGatewayUsage[] {
  // The ledger rows report an amount without restating the unit, which the
  // answer carries once for the whole account.
  const unit = pickString(body, ['unit', 'currency'])
  const rows: QuotaGatewayUsage[] = []
  const push = (row: QuotaGatewayUsage | undefined): void => {
    if (row === undefined) return
    rows.push(row.currency === undefined && unit !== undefined ? { ...row, currency: unit } : row)
  }
  for (const entry of arrayUnder(body, 'daily_usage') ?? []) {
    push(gatewayUsageRow('day', pickString(entry, ['date', 'day']), entry))
  }
  for (const entry of arrayUnder(body, 'model_stats') ?? []) {
    push(gatewayUsageRow('model', pickString(entry, ['model', 'model_name']), entry))
  }
  return Object.freeze(rows.slice(0, MAX_USAGE_ROWS))
}

/** The origin an adapter addresses, so a base URL carrying a path still resolves. */
function originOf(context: QuotaAdapterContext): string {
  const base = context.usageBaseURL ?? context.baseURL
  if (base === undefined || base === '') {
    throw new QuotaRequestError('not-configured', 'provider has no configured base URL')
  }
  try {
    return new URL(base).origin
  } catch {
    throw new QuotaRequestError('blocked', 'configured base URL is not absolute')
  }
}

/**
 * Sub2API gateways publishing the `/v1/usage` protocol, including Passion.
 *
 * The answer decides the mode: a wallet balance, an aggregate quota with its
 * rate-limit windows, or a subscription's per-period ceilings.
 */
export const sub2api: QuotaAdapter = {
  id: 'sub2api',
  async read(context) {
    const key = await requireKey(context)
    const body = await requestJson(bearer(`${originOf(context)}/v1/usage`, key, context))
    return readSub2apiUsage(body, context.now())
  },
}

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
export const sub2apiAuth: QuotaAdapter = {
  id: 'sub2api-auth',
  async read(context) {
    const key = await requireKey(context)
    const origin = originOf(context)

    let body: unknown
    try {
      body = await requestJson(bearer(`${origin}/user/balance`, key, context))
    } catch (error) {
      if (!isFallthrough(error)) throw error
      return readSub2apiUsage(await requestJson(bearer(`${origin}/v1/usage`, key, context)), context.now())
    }

    const remaining = numberOf(isRecord(body) ? body['balance'] ?? body['remaining'] : undefined)
      ?? pickNumber(isRecord(body) ? body['data'] : undefined, ['balance', 'remaining'])
    if (remaining === undefined) {
      return readSub2apiUsage(await requestJson(bearer(`${origin}/v1/usage`, key, context)), context.now())
    }

    const plan = pickString(body, ['planName', 'plan_name'])
    return {
      mode: 'balance',
      remaining,
      currency: pickString(body, ['unit', 'currency']) ?? 'USD',
      ...plan === undefined ? {} : { plan },
      ...await todaySpend(origin, key, context),
    }
  },
}

/**
 * Today's spend, when the panel publishes it.
 *
 * Supplementary: a panel that answers the balance but not the usage summary
 * still reports its balance, so this read never propagates its failure.
 */
async function todaySpend(
  origin: string,
  key: string,
  context: QuotaAdapterContext,
): Promise<{ used?: number }> {
  try {
    const body = await requestJson(bearer(`${origin}/api/v1/usage/stats?period=today`, key, context))
    const used = pickNumber(isRecord(body) ? body['data'] : undefined, ['total_actual_cost'])
      ?? pickNumber(body, ['total_actual_cost'])
    return used === undefined ? {} : { used }
  } catch {
    return {}
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
export async function detectSub2apiPanel(context: QuotaAdapterContext): Promise<boolean> {
  try {
    const body = await requestJson({
      url: `${originOf(context)}${FINGERPRINT_PATH}`,
      auth: 'none',
      ...context.allowPlaintext === true ? { allowPlaintext: true } : {},
      ...context.allowedHosts === undefined ? {} : { allowedHosts: context.allowedHosts },
      ...context.fetchImpl === undefined ? {} : { fetchImpl: context.fetchImpl },
    })
    if (!isRecord(body) || numberOf(body['code']) !== 0) return false
    const data = body['data']
    return isRecord(data) && typeof data['affiliate_enabled'] === 'boolean'
  } catch {
    // A gateway that is not a panel answers in every possible way; none of
    // them is a fingerprint, and none is worth reporting as an account failure.
    return false
  }
}
