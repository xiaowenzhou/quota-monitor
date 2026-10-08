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

import { QuotaRequestError, requestFirst, requestJson } from '../http.ts'
import {
  arrayUnder,
  clampPercent,
  isRecord,
  numberOf,
  pickNumber,
  pickString,
  resetFromDuration,
  round1,
  upcomingIso,
} from '../parse.ts'
import type { QuotaPlanWindow, QuotaPlanWindowKind } from '../types.ts'
import { bearer } from './contract.ts'
import type { QuotaAccountReading, QuotaAdapter, QuotaAdapterContext } from './contract.ts'

/** Z.ai Coding Plan hosts, by account region. */
const ZAI_HOSTS: Readonly<Record<string, string>> = Object.freeze({
  global: 'https://api.z.ai',
  'bigmodel-cn': 'https://open.bigmodel.cn',
})

/** MiniMax token-plan hosts, by account region. */
const MINIMAX_HOSTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  global: Object.freeze(['https://www.minimax.io', 'https://api.minimax.io']),
  cn: Object.freeze(['https://www.minimaxi.com', 'https://api.minimaxi.com']),
})

/** MiniMax paths, newest first. */
const MINIMAX_PATHS = ['/v1/token_plan/remains', '/v1/api/openplatform/coding_plan/remains'] as const

/**
 * Cline Pass window ids mapped to the rows the panel labels. Any other `type`
 * is skipped: the endpoint may add windows this build has no row for, and
 * dropping one is preferable to labelling it wrongly.
 */
const CLINE_WINDOW_KINDS: Readonly<Record<string, QuotaPlanWindowKind>> = Object.freeze({
  five_hour: 'five-hour',
  weekly: 'weekly',
  monthly: 'monthly',
})

/** Build one window from a used share, dropping it when the share is unreadable. */
function windowOf(
  kind: QuotaPlanWindowKind,
  usedPercent: number | undefined,
  resetAt: string | undefined,
  remaining?: number,
): QuotaPlanWindow | undefined {
  if (usedPercent === undefined) return undefined
  return {
    kind,
    percentUsed: round1(usedPercent),
    ...resetAt === undefined ? {} : { resetAt },
    ...remaining === undefined ? {} : { remaining },
  }
}

/** Resolve a credential by reference, failing with the reference name. */
async function requireRef(context: QuotaAdapterContext, fallback: string): Promise<string> {
  const reference = context.credentialRef ?? fallback
  const resolved = await context.credential(reference)
  if (resolved !== undefined && resolved !== '') return resolved
  throw new QuotaRequestError('not-configured', `credential ${reference} is not configured`)
}

/**
 * Read a MiniMax window share. Newer payloads zero the counters and report
 * percentages; older ones do the reverse, and the status sentinel
 * (1 normal, 2 exhausted, 3 unlimited) is the last resort so a missing
 * percentage never hides the window.
 */
function minimaxRemaining(
  entry: Record<string, unknown>,
  percentKeys: readonly string[],
  totalKeys: readonly string[],
  usageKeys: readonly string[],
  statusKeys: readonly string[],
): number | undefined {
  const percent = clampPercent(pickNumber(entry, percentKeys))
  if (percent !== undefined) return percent
  const total = pickNumber(entry, totalKeys)
  const usage = pickNumber(entry, usageKeys)
  if (total !== undefined && total > 0 && usage !== undefined) {
    return clampPercent((1 - usage / total) * 100)
  }
  const status = pickNumber(entry, statusKeys)
  if (status === 2) return 0
  if (status === 3) return 100
  return undefined
}

/** Chat-model names MiniMax uses when it does not name the `general` group. */
const MINIMAX_CHAT_MODEL = /^(minimax-m|coding-plan)/i

/**
 * MiniMax Coding Plan: a rolling session window plus a weekly window.
 *
 * The response reports one row per resource group; the chat row is the one a
 * session actually spends, named either `general` or after the model itself.
 */
export const minimaxTokenPlan: QuotaAdapter = {
  id: 'minimax-token-plan',
  credentialRefs: ['MINIMAX_API_KEY'],
  async read(context) {
    const key = await requireRef(context, 'MINIMAX_API_KEY')
    const region = /minimaxi\.com/i.test(context.baseURL ?? '') || /-cn$/i.test(context.id) ? 'cn' : 'global'
    const configured = context.usageBaseURL
    const urls = configured !== undefined
      ? [configured]
      : (MINIMAX_HOSTS[region] ?? MINIMAX_HOSTS['global'] ?? []).flatMap(
        host => MINIMAX_PATHS.map(path => `${host}${path}`))
    const body = await requestFirst(urls, url => bearer(url, key, context))

    const statusCode = pickNumber(isRecord(body) ? body['base_resp'] : undefined, ['status_code'])
    if (statusCode !== undefined && statusCode !== 0) {
      throw new QuotaRequestError('invalid-response', `MiniMax reported status_code ${statusCode}`)
    }
    const rows = arrayUnder(body, 'model_remains') ?? []
    const chat = rows.find(row => pickString(row, ['model_name', 'modelName'])?.toLowerCase() === 'general')
      ?? rows.find(row => MINIMAX_CHAT_MODEL.test(pickString(row, ['model_name', 'modelName']) ?? ''))
    if (!isRecord(chat)) {
      throw new QuotaRequestError('invalid-response', 'MiniMax response has no chat-model entry')
    }

    const now = context.now()
    const sessionRemaining = minimaxRemaining(chat,
      ['current_interval_remaining_percent', 'currentIntervalRemainingPercent'],
      ['current_interval_total_count', 'currentIntervalTotalCount'],
      ['current_interval_usage_count', 'currentIntervalUsageCount'],
      ['current_interval_status', 'currentIntervalStatus'])
    const weeklyRemaining = minimaxRemaining(chat,
      ['current_weekly_remaining_percent', 'currentWeeklyRemainingPercent'],
      ['current_weekly_total_count', 'currentWeeklyTotalCount'],
      ['current_weekly_usage_count', 'currentWeeklyUsageCount'],
      ['current_weekly_status', 'currentWeeklyStatus'])

    const windows = [
      windowOf('session', sessionRemaining === undefined ? undefined : 100 - sessionRemaining,
        upcomingIso(chat['current_interval_end_time'] ?? chat['currentIntervalEndTime'], now)
        ?? resetFromDuration(chat['remains_time'] ?? chat['remainsTime'], now)),
      windowOf('weekly', weeklyRemaining === undefined ? undefined : 100 - weeklyRemaining,
        upcomingIso(chat['current_weekly_end_time'] ?? chat['currentWeeklyEndTime'], now)),
    ].filter((entry): entry is QuotaPlanWindow => entry !== undefined)
    if (windows.length === 0) {
      throw new QuotaRequestError('invalid-response', 'MiniMax chat entry has no usable quota fields')
    }
    return { plan: 'MiniMax Coding Plan', planWindows: Object.freeze(windows) }
  },
}

/** Z.ai limit-window durations, in minutes, from its unit enum. */
function zaiWindowMinutes(limit: unknown): number | undefined {
  const unit = pickNumber(limit, ['unit'])
  const number = pickNumber(limit, ['number'])
  if (unit === undefined || number === undefined || number <= 0) return undefined
  if (unit === 5) return number
  if (unit === 3) return number * 60
  if (unit === 1) return number * 24 * 60
  if (unit === 6) return number * 7 * 24 * 60
  return undefined
}

/** Used share of one Z.ai limit row. */
function zaiUsedPercent(limit: unknown): number | undefined {
  const total = pickNumber(limit, ['usage'])
  const remaining = pickNumber(limit, ['remaining'])
  const current = pickNumber(limit, ['currentValue', 'current_value'])
  if (total !== undefined && total > 0) {
    const used = remaining === undefined
      ? current
      : current === undefined ? total - remaining : Math.max(total - remaining, current)
    if (used !== undefined) return clampPercent((Math.max(0, Math.min(total, used)) / total) * 100)
  }
  return clampPercent(pickNumber(limit, ['percentage', 'usedPercent', 'used_percent']))
}

/** Title-case a plan label, keeping the GLM acronym uppercase. */
function displayPlan(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const text = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (text === '') return undefined
  return text.replace(/\bglm\b/gi, 'GLM').replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Z.ai / GLM Coding Plan: the quota endpoint reports one row per limit, and
 * the optional subscription endpoint supplies the plan label and renewal.
 *
 * The Coding Plan endpoints expect the raw API key, unlike the inference API.
 */
export const zaiTokenPlan: QuotaAdapter = {
  id: 'zai-token-plan',
  credentialRefs: ['ZAI_API_KEY'],
  async read(context) {
    const key = await requireRef(context, 'ZAI_API_KEY')
    const region = await context.credential('ZAI_API_REGION')
    const cn = /bigmodel\.cn/i.test(context.baseURL ?? '')
      || /^(cn|bigmodel-cn)$/i.test(region ?? '')
      || /-cn$/i.test(context.id)
    const host = context.usageBaseURL ?? (cn ? ZAI_HOSTS['bigmodel-cn'] : ZAI_HOSTS['global']) ?? ZAI_HOSTS['global']
    const raw = (url: string) => ({
      url,
      apiKey: key,
      auth: 'raw' as const,
      ...context.fetchImpl === undefined ? {} : { fetchImpl: context.fetchImpl },
    })

    const quota = await requestJson(raw(`${host}/api/monitor/usage/quota/limit`))
    let subscription: unknown
    try {
      subscription = await requestJson(raw(`${host}/api/biz/subscription/list`))
    } catch {
      // The plan label and renewal instant are decoration; the quota read
      // already succeeded, so a failure here must not fail the account.
      subscription = undefined
    }

    const limits = arrayUnder(quota, 'limits') ?? []
    const tokenLimits = limits
      .filter(limit => ['TOKENS_LIMIT', 'CREDIT_LIMIT'].includes(
        (pickString(limit, ['type', 'limit_type']) ?? '').toUpperCase()) && zaiUsedPercent(limit) !== undefined)
      .sort((left, right) =>
        (zaiWindowMinutes(left) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(right) ?? Number.MAX_SAFE_INTEGER))
    const timeLimit = limits.find(limit =>
      (pickString(limit, ['type', 'limit_type']) ?? '').toUpperCase() === 'TIME_LIMIT'
      && zaiUsedPercent(limit) !== undefined)

    const first = tokenLimits[0]
    const shortest = zaiWindowMinutes(first)
    const session = tokenLimits.length >= 2 ? first : shortest !== undefined && shortest <= 360 ? first : undefined
    const weekly = tokenLimits.length >= 2 ? tokenLimits[tokenLimits.length - 1] : session === undefined ? first : undefined

    const now = context.now()
    const rows = arrayUnder(subscription, 'data') ?? []
    const renewAt = upcomingIso(
      isRecord(rows[0]) ? rows[0]['next_renew_time'] ?? rows[0]['nextRenewTime'] : undefined, now)
    const windows = [
      session === undefined ? undefined : windowOf('session', zaiUsedPercent(session),
        upcomingIso(isRecord(session) ? session['nextResetTime'] ?? session['next_reset_time'] : undefined, now),
        pickNumber(session, ['remaining'])),
      weekly === undefined ? undefined : windowOf('weekly', zaiUsedPercent(weekly),
        upcomingIso(isRecord(weekly) ? weekly['nextResetTime'] ?? weekly['next_reset_time'] : undefined, now),
        pickNumber(weekly, ['remaining'])),
      timeLimit === undefined ? undefined : windowOf('billing', zaiUsedPercent(timeLimit), renewAt),
    ].filter((entry): entry is QuotaPlanWindow => entry !== undefined)
    if (windows.length === 0) {
      throw new QuotaRequestError('invalid-response', 'Z.ai quota response has no usable limit rows')
    }

    const plan = displayPlan(pickString(isRecord(rows[0]) ? rows[0] : undefined,
      ['product_name', 'productName', 'plan_name', 'planName', 'package_name', 'packageName']))
      ?? 'GLM Coding Plan'
    return { plan, planWindows: Object.freeze(windows) }
  },
}

/** One Kimi limit row: an absolute allowance with its remainder. */
function limitWindow(value: unknown, kind: QuotaPlanWindowKind, now: number): QuotaPlanWindow | undefined {
  const limit = pickNumber(value, ['limit', 'total'])
  const remaining = pickNumber(value, ['remaining'])
  if (limit === undefined || remaining === undefined || limit <= 0) return undefined
  return windowOf(kind, clampPercent(((limit - remaining) / limit) * 100),
    upcomingIso(isRecord(value) ? value['resetTime'] ?? value['reset_time'] ?? value['resetsAt'] : undefined, now),
    remaining)
}

/** Kimi For Coding: `/coding/v1/usages` reports a session limit plus weekly usage. */
export const kimiTokenPlan: QuotaAdapter = {
  id: 'kimi-token-plan',
  credentialRefs: ['KIMI_API_KEY'],
  async read(context) {
    const key = await requireRef(context, 'KIMI_API_KEY')
    const url = context.usageBaseURL ?? 'https://api.kimi.com/coding/v1/usages'
    const body = await requestJson(bearer(url, key, context))
    const data = isRecord(body) && isRecord(body['data']) ? body['data'] : body
    const now = context.now()
    const rows = arrayUnder(data, 'limits') ?? []
    const session = rows
      .map(row => limitWindow(isRecord(row) && isRecord(row['detail']) ? row['detail'] : row, 'session', now))
      .find(entry => entry !== undefined)
    const weekly = limitWindow(isRecord(data) ? data['usage'] : undefined, 'weekly', now)
    const windows = [session, weekly].filter((entry): entry is QuotaPlanWindow => entry !== undefined)
    if (windows.length === 0) {
      throw new QuotaRequestError('invalid-response', 'Kimi usage response has no usable limit rows')
    }
    return {
      plan: pickString(data, ['plan', 'planName']) ?? 'Kimi For Coding',
      planWindows: Object.freeze(windows),
    }
  },
}

/**
 * Read one OpenCode Go window. The Bearer endpoint reports `percent` on a
 * 0–100 scale; the dashboard embeds a 0–1 ratio under a `usagePercent`-style
 * name, which is why only the ratio-named fields are scaled.
 */
function goWindow(value: unknown, kind: QuotaPlanWindowKind, now: number): QuotaPlanWindow | undefined {
  if (!isRecord(value)) return undefined
  const named = value['usagePercent'] ?? value['usedPercent'] ?? value['percentUsed']
    ?? value['percentage'] ?? value['percent']
  let used = clampPercent(named)
  if (used === undefined) {
    const spent = pickNumber(value, ['used', 'consumed'])
    const limit = pickNumber(value, ['limit', 'total', 'quota'])
    if (spent === undefined || limit === undefined || limit <= 0) return undefined
    used = clampPercent((spent / limit) * 100)
  } else if (used <= 1 && value['percent'] === undefined && named !== undefined) {
    used = clampPercent(used * 100)
  }
  const seconds = pickNumber(value, ['resetInSec', 'resetInSeconds', 'resetSeconds'])
  const resetAt = seconds === undefined
    ? upcomingIso(value['resetAt'] ?? value['resetsAt'] ?? value['nextReset'], now)
    : resetFromDuration(Math.max(0, seconds) * 1000, now)
  return windowOf(kind, used, resetAt)
}

/**
 * OpenCode Go: the Bearer usage endpoint reports rolling, weekly, and monthly
 * windows.
 *
 * This endpoint is not part of the documented provider API and may change
 * upstream; a failure is reported as an account status rather than retried
 * against the authenticated dashboard, which would need a browser cookie.
 */
export const opencodeGo: QuotaAdapter = {
  id: 'opencode-go',
  credentialRefs: ['OPENCODE_GO_API_KEY'],
  async read(context) {
    const key = await requireRef(context, 'OPENCODE_GO_API_KEY')
    const url = context.usageBaseURL ?? 'https://opencode.ai/zen/go/v1/usage'
    const body = await requestJson(bearer(url, key, context))
    const usage = isRecord(body) && isRecord(body['usage']) ? body['usage'] : body
    const now = context.now()
    const windows = [
      goWindow(isRecord(usage) ? usage['rolling'] : undefined, 'session', now),
      goWindow(isRecord(usage) ? usage['weekly'] : undefined, 'weekly', now),
      goWindow(isRecord(usage) ? usage['monthly'] : undefined, 'monthly', now),
    ].filter((entry): entry is QuotaPlanWindow => entry !== undefined)
    if (windows.length === 0) {
      throw new QuotaRequestError('invalid-response', 'OpenCode Go usage response has no usable windows')
    }
    return { plan: 'Go', planWindows: Object.freeze(windows) }
  },
}

/**
 * Ollama cloud: `/api/usage` reports a session and a weekly window as
 * consumed ratios on a 0–1 scale. There is no balance.
 */
export const ollama: QuotaAdapter = {
  id: 'ollama',
  credentialRefs: ['OLLAMA_API_KEY'],
  async read(context) {
    const key = await requireRef(context, 'OLLAMA_API_KEY')
    const url = context.usageBaseURL ?? 'https://ollama.com/api/usage'
    const body = await requestJson(bearer(url, key, context))
    const limits = isRecord(body) ? body['limits'] : undefined
    const ratio = (value: unknown): number | undefined => {
      const parsed = numberOf(isRecord(value) ? value['usage'] : undefined)
      return parsed === undefined ? undefined : clampPercent(parsed * 100)
    }
    const windows = [
      windowOf('session', ratio(isRecord(limits) ? limits['session'] : undefined), undefined),
      windowOf('weekly', ratio(isRecord(limits) ? limits['weekly'] : undefined), undefined),
    ].filter((entry): entry is QuotaPlanWindow => entry !== undefined)
    if (windows.length === 0) {
      throw new QuotaRequestError('invalid-response', 'Ollama usage response has no usable windows')
    }
    return { plan: 'Ollama', planWindows: Object.freeze(windows) }
  },
}

/**
 * Cline Pass plan limits: five-hour, weekly, and monthly used shares, each
 * with its own reset instant.
 *
 * Only the pay-as-you-go credit endpoint is absent; an account without an
 * active plan therefore falls back to the manual allowance.
 */
export const clinePlan: QuotaAdapter = {
  id: 'cline-plan',
  async read(context) {
    const key = context.credentialRef === undefined
      ? context.apiKey
      : await context.credential(context.credentialRef)
    if (key === undefined || key === '') {
      throw new QuotaRequestError('not-configured', 'provider has no configured API key')
    }
    const base = context.usageBaseURL ?? context.baseURL
    if (base === undefined || base === '') {
      throw new QuotaRequestError('not-configured', 'provider has no configured base URL')
    }
    const body = await requestJson(bearer(`${base}/users/me/plan/usage-limits`, key, context))
    const now = context.now()
    const windows: QuotaPlanWindow[] = []
    for (const row of arrayUnder(body, 'limits') ?? []) {
      const type = pickString(row, ['type'])
      const kind = type === undefined ? undefined : CLINE_WINDOW_KINDS[type]
      if (kind === undefined) continue
      const entry = windowOf(kind, clampPercent(pickNumber(row, ['percentUsed'])),
        upcomingIso(isRecord(row) ? row['resetsAt'] : undefined, now))
      if (entry !== undefined) windows.push(entry)
    }
    if (windows.length === 0) {
      throw new QuotaRequestError('invalid-response', 'Cline Pass response has no recognized plan window')
    }
    windows.sort((left, right) => right.percentUsed - left.percentUsed)
    return { plan: 'Cline Pass', planWindows: Object.freeze(windows) }
  },
}

/** Every subscription adapter, keyed for registry assembly. */
export const SUBSCRIPTION_ADAPTERS: readonly QuotaAdapter[] = Object.freeze([
  minimaxTokenPlan,
  zaiTokenPlan,
  kimiTokenPlan,
  opencodeGo,
  ollama,
  clinePlan,
])

/** Re-exported so the account reading type stays reachable from one module. */
export type { QuotaAccountReading }
