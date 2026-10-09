import { describe, expect, it } from 'vitest'
import { adapterFor, declarativeAdapter, resolvePointer } from '../src/adapters/index.ts'
import type { QuotaAdapterContext } from '../src/adapters/index.ts'
import { detectSub2apiPanel } from '../src/adapters/sub2api.ts'
import { QuotaRequestError, isFallthrough, requestJson, statusOf } from '../src/http.ts'
import { resolveProviderIdentity, isPrivateHostname } from '../src/identity.ts'
import { requestUrl } from './stubs.ts'

/**
 * Adapter regressions: each provider's response grammar, the failure
 * classification the panel renders, and the security rules the HTTP layer
 * enforces. Every request is served by an injected fetch, so no test touches
 * the network.
 */

/** A fetch that answers each URL from a table, and 404s anything else. */
function serve(routes: Record<string, unknown>, status = 200): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = requestUrl(input)
    const body = routes[url]
    if (body === undefined) {
      return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  })
}

/** Overrides a test applies, where an explicit `undefined` clears a default. */
type ContextOverrides = { [K in keyof QuotaAdapterContext]?: QuotaAdapterContext[K] | undefined }

/** A context for one provider route, with no credential indirection. */
function context(overrides: ContextOverrides & { fetchImpl: typeof fetch }): QuotaAdapterContext {
  const merged = {
    id: 'test',
    apiKey: 'secret-key',
    now: () => Date.parse('2026-03-15T12:00:00Z'),
    credential: async () => undefined,
    ...overrides,
  }
  // An override of `undefined` must leave the key absent: under
  // `exactOptionalPropertyTypes` a present-but-undefined optional is a
  // distinct value the adapters' `?? ` fallbacks would still see.
  return Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== undefined),
  ) as unknown as QuotaAdapterContext
}

describe('deepseek-balance', () => {
  it('prefers the CNY entry of the balance list', async () => {
    const adapter = adapterFor('deepseek-balance')
    const reading = await adapter?.read(context({
      baseURL: 'https://api.deepseek.com',
      fetchImpl: serve({
        'https://api.deepseek.com/user/balance': {
          is_available: true,
          balance_infos: [
            { currency: 'USD', total_balance: '1.50' },
            { currency: 'CNY', total_balance: '42.75' },
          ],
        },
      }),
    }))

    expect(reading).toEqual({ remaining: 42.75, currency: 'CNY' })
  })

  it('refuses a response with no balance entries', async () => {
    const adapter = adapterFor('deepseek-balance')
    await expect(adapter?.read(context({
      baseURL: 'https://api.deepseek.com',
      fetchImpl: serve({ 'https://api.deepseek.com/user/balance': { is_available: true } }),
    }))).rejects.toThrow(/no balance_infos/)
  })
})

describe('openrouter-balance', () => {
  it('derives the remainder from credits minus usage', async () => {
    const adapter = adapterFor('openrouter-balance')
    const reading = await adapter?.read(context({
      baseURL: 'https://openrouter.ai/api/v1',
      credentialRef: 'MY_KEY',
      credential: async reference => reference === 'MY_KEY' ? 'management-key' : undefined,
      fetchImpl: serve({
        'https://openrouter.ai/api/v1/credits': { data: { total_credits: 25, total_usage: 7.25 } },
      }),
    }))

    expect(reading).toEqual({ remaining: 17.75, used: 7.25, limit: 25, currency: 'USD' })
  })

  it('names the credential it needs when none is configured', async () => {
    const adapter = adapterFor('openrouter-balance')
    await expect(adapter?.read(context({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: undefined,
      fetchImpl: serve({}),
    }))).rejects.toThrow(/OPENROUTER_MANAGEMENT_KEY is not configured/)
  })
})

describe('orcarouter-balance', () => {
  it('sums the paid, free, and promo wallets', async () => {
    const adapter = adapterFor('orcarouter-balance')
    const reading = await adapter?.read(context({
      baseURL: 'https://api.orcarouter.com/v1',
      fetchImpl: serve({
        'https://api.orcarouter.com/v1/balance': {
          unit: 'usd',
          paid_balance: 10,
          free_credit: [{ balance_usd: 2.5, unit: 'USD' }],
          promo_credits: [{ balance_usd: 1, unit: 'USD' }],
        },
      }),
    }))

    expect(reading).toEqual({ remaining: 13.5, currency: 'USD' })
  })

  it('refuses a wallet mixing currencies rather than adding them', async () => {
    const adapter = adapterFor('orcarouter-balance')
    await expect(adapter?.read(context({
      baseURL: 'https://api.orcarouter.com/v1',
      fetchImpl: serve({
        'https://api.orcarouter.com/v1/balance': {
          unit: 'usd',
          paid_balance: 10,
          free_credit: [{ balance_usd: 5, unit: 'CNY' }],
        },
      }),
    }))).rejects.toThrow(/mix currencies/)
  })

  it('falls back to the billing pair when the wallet route is absent', async () => {
    const adapter = adapterFor('orcarouter-balance')
    const reading = await adapter?.read(context({
      baseURL: 'https://api.orcarouter.com/v1',
      fetchImpl: serve({
        'https://api.orcarouter.com/v1/dashboard/billing/subscription': { hard_limit_usd: 20 },
        'https://api.orcarouter.com/v1/dashboard/billing/usage': { total_usage: 250 },
      }),
    }))

    expect(reading).toEqual({ remaining: 17.5, used: 2.5, limit: 20, currency: 'USD' })
  })

  it('reports an unmetered plan instead of a sentinel balance', async () => {
    const adapter = adapterFor('orcarouter-balance')
    const reading = await adapter?.read(context({
      baseURL: 'https://api.orcarouter.com/v1',
      fetchImpl: serve({
        'https://api.orcarouter.com/v1/dashboard/billing/subscription': {
          hard_limit_usd: 100_000_000,
          soft_limit_usd: 100_000_000,
          system_hard_limit_usd: 100_000_000,
        },
        'https://api.orcarouter.com/v1/dashboard/billing/usage': { total_usage: 1234 },
      }),
    }))

    expect(reading).toMatchObject({ unlimited: true, currency: 'USD' })
    expect(reading?.limit).toBeUndefined()
  })
})

describe('new-api', () => {
  it('converts the quota unit into dollars', async () => {
    const adapter = adapterFor('new-api')
    const reading = await adapter?.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({
        'https://gateway.example.com/api/usage/token/': { data: { quota: 2_500_000, used_quota: 500_000 } },
      }),
    }))

    expect(reading).toEqual({ remaining: 5, used: 1, currency: 'USD' })
  })

  it('falls back to the legacy self endpoint', async () => {
    const adapter = adapterFor('new-api')
    const reading = await adapter?.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({
        'https://gateway.example.com/api/user/self': { data: { quota: 500_000 } },
      }),
    }))

    expect(reading).toMatchObject({ remaining: 1, currency: 'USD' })
  })

  it('takes the quota denomination from the deployment status document', async () => {
    const adapter = adapterFor('new-api')
    const reading = await adapter?.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({
        'https://gateway.example.com/api/status': { data: { quota_per_unit: 1_000_000 } },
        'https://gateway.example.com/api/usage/token/': {
          data: { quota: 3_000_000, used_quota: 1_000_000, total_granted: 4_000_000, name: 'team' },
        },
      }),
    }))

    expect(reading).toEqual({ remaining: 3, used: 1, limit: 4, currency: 'USD', plan: 'team' })
  })

  it('applies the deployment exchange rate when it displays quota in CNY', async () => {
    const adapter = adapterFor('new-api')
    const reading = await adapter?.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({
        'https://gateway.example.com/api/status': {
          data: { quota_per_unit: 500_000, quota_display_type: 'CNY', usd_exchange_rate: 7.2 },
        },
        'https://gateway.example.com/api/usage/token/': { data: { quota: 500_000 } },
      }),
    }))

    expect(reading).toEqual({ remaining: 7.2, currency: 'CNY' })
  })

  it('refuses a display unit it cannot convert instead of mislabelling one', async () => {
    const adapter = adapterFor('new-api')
    await expect(adapter?.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({
        'https://gateway.example.com/api/status': { data: { quota_display_type: 'JPY' } },
        'https://gateway.example.com/api/usage/token/': { data: { quota: 500_000 } },
      }),
    }))).rejects.toThrow(/unsupported unit JPY/)
  })

  it('reports an unlimited token without inventing a remainder', async () => {
    const adapter = adapterFor('new-api')
    const reading = await adapter?.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({
        'https://gateway.example.com/api/usage/token/': { data: { unlimited_quota: true, quota: 0 } },
      }),
    }))

    expect(reading).toEqual({ unlimited: true, remaining: 0, currency: 'USD' })
  })
})

describe('sub2api', () => {
  it('reads a wallet answer as a balance account', async () => {
    const adapter = adapterFor('sub2api')
    const reading = await adapter?.read(context({
      baseURL: 'https://relay.example.com/v1',
      fetchImpl: serve({
        'https://relay.example.com/v1/usage': { balance: 12.5, unit: 'USD', planName: 'Starter' },
      }),
    }))

    expect(reading).toEqual({ mode: 'balance', remaining: 12.5, currency: 'USD', plan: 'Starter' })
  })

  it('reads an aggregate quota with its rate-limit windows', async () => {
    const adapter = adapterFor('sub2api')
    const reading = await adapter?.read(context({
      baseURL: 'https://relay.example.com',
      fetchImpl: serve({
        'https://relay.example.com/v1/usage': {
          mode: 'quota_limited',
          quota: { used: 25, limit: 100 },
          rate_limits: [
            { window: '5h', used: 3, limit: 10 },
            { window: '7d', used: 40, limit: 50 },
          ],
        },
      }),
    }))

    expect(reading?.mode).toBe('subscription')
    expect(reading?.planWindows).toEqual([
      { kind: 'quota', percentUsed: 25 },
      { kind: 'five-hour', percentUsed: 30 },
      { kind: 'weekly', percentUsed: 80 },
    ])
  })

  it('reads a subscription answer as one window per published period', async () => {
    const adapter = adapterFor('sub2api')
    const reading = await adapter?.read(context({
      baseURL: 'https://relay.example.com',
      fetchImpl: serve({
        'https://relay.example.com/v1/usage': {
          planName: 'Pro',
          subscription: {
            daily_usage_usd: 1,
            daily_limit_usd: 4,
            monthly_usage_usd: 30,
            monthly_limit_usd: 100,
          },
        },
      }),
    }))

    expect(reading?.plan).toBe('Pro')
    expect(reading?.planWindows).toEqual([
      { kind: 'daily', percentUsed: 25 },
      { kind: 'monthly', percentUsed: 30 },
    ])
  })

  it('treats a key the gateway marks inactive as rejected, not empty', async () => {
    const adapter = adapterFor('sub2api')
    await expect(adapter?.read(context({
      baseURL: 'https://relay.example.com',
      fetchImpl: serve({ 'https://relay.example.com/v1/usage': { isValid: false, balance: 0 } }),
    }))).rejects.toThrow(/inactive/)
  })

  it('refuses a metered answer that publishes no usable window', async () => {
    const adapter = adapterFor('sub2api')
    await expect(adapter?.read(context({
      baseURL: 'https://relay.example.com',
      fetchImpl: serve({
        'https://relay.example.com/v1/usage': { mode: 'quota_limited', quota: { limit: 0 } },
      }),
    }))).rejects.toThrow(/no usable quota window/)
  })

  it('reports the remainder of a plan that meters spend without a ceiling', async () => {
    const adapter = adapterFor('sub2api')
    const reading = await adapter?.read(context({
      baseURL: 'https://relay.example.com',
      fetchImpl: serve({
        'https://relay.example.com/v1/usage': {
          isValid: true,
          mode: 'unrestricted',
          planName: 'Codex-hanamizzh',
          remaining: 502.31810956,
          subscription: { daily_limit_usd: null, daily_usage_usd: 47.67973458 },
        },
      }),
    }))

    expect(reading).toEqual({ mode: 'balance', remaining: 502.31810956, currency: 'USD', plan: 'Codex-hanamizzh' })
  })

  it('carries the usage ledger the gateway reports for this key', async () => {
    const adapter = adapterFor('sub2api')
    const reading = await adapter?.read(context({
      baseURL: 'https://relay.example.com',
      fetchImpl: serve({
        'https://relay.example.com/v1/usage': {
          balance: 495.39,
          unit: 'USD',
          planName: '钱包余额',
          daily_usage: [{ date: '2026-09-29', requests: 12, total_tokens: 1_629_770, actual_cost: 4.61 }],
          model_stats: [{ model: 'claude-opus-5', requests: 12, input_tokens: 24, output_tokens: 29_894 }],
        },
      }),
    }))

    expect(reading).toMatchObject({
      remaining: 495.39,
      currency: 'USD',
      usage: [
        { kind: 'day', label: '2026-09-29', requests: 12, totalTokens: 1_629_770, cost: 4.61, currency: 'USD' },
        {
          kind: 'model',
          label: 'claude-opus-5',
          requests: 12,
          inputTokens: 24,
          outputTokens: 29_894,
          currency: 'USD',
        },
      ],
    })
  })
})

describe('stepcode', () => {
  it('reads the desk summary and one row per budget pool', async () => {
    const adapter = adapterFor('stepcode')
    const reading = await adapter?.read(context({
      baseURL: 'https://co.air-outer.com',
      fetchImpl: serve({
        'https://co.air-outer.com/desk/v1/stepcode/user/info': {
          code: 0,
          data: {
            usage_summary: {
              used: 25,
              total: 100,
              usage_percent: 25,
              cost_currency: 'CNY',
              period_end: '2026-04-01T00:00:00Z',
            },
            budget_pool_usages: [
              { pool_name: 'team-a', remaining: 12, total: 20 },
              { name: 'team-b', used_quota: 3, total_quota: 15 },
              { name: 'silent' },
            ],
          },
        },
      }),
    }))

    expect(reading).toEqual({
      mode: 'balance',
      remaining: 75,
      used: 25,
      limit: 100,
      currency: 'CNY',
      planWindows: [{ kind: 'billing', percentUsed: 25, resetAt: '2026-04-01T00:00:00.000Z' }],
      budgetPools: [
        { name: 'team-a', remaining: 12, limit: 20, percentUsed: 40 },
        { name: 'team-b', remaining: 12, limit: 15, percentUsed: 20 },
      ],
    })
  })

  it('derives the remainder from a limit and a spend', async () => {
    const adapter = adapterFor('stepcode')
    const reading = await adapter?.read(context({
      baseURL: 'https://co.air-outer.com',
      fetchImpl: serve({
        'https://co.air-outer.com/desk/v1/stepcode/user/info': {
          code: 0,
          data: { usage_summary: { used: 30, total: 50 } },
        },
      }),
    }))

    expect(reading).toMatchObject({ remaining: 20, used: 30, limit: 50, currency: 'CNY' })
  })

  it('reports an envelope error code instead of a figure', async () => {
    const adapter = adapterFor('stepcode')
    await expect(adapter?.read(context({
      baseURL: 'https://co.air-outer.com',
      fetchImpl: serve({
        'https://co.air-outer.com/desk/v1/stepcode/user/info': { code: 401, msg: 'Invalid API Key!' },
      }),
    }))).rejects.toThrow(/Invalid API Key/)
  })

  it('refuses an answer that discloses no figures', async () => {
    const adapter = adapterFor('stepcode')
    await expect(adapter?.read(context({
      baseURL: 'https://co.air-outer.com',
      fetchImpl: serve({
        'https://co.air-outer.com/desk/v1/stepcode/user/info': { code: 0, data: { username: 'someone' } },
      }),
    }))).rejects.toThrow(/no usable figures/)
  })

  it('reports the tokens each pool disclosed, even one whose allowance is unreadable', async () => {
    const adapter = adapterFor('stepcode')
    const reading = await adapter?.read(context({
      baseURL: 'https://co.air-outer.com',
      fetchImpl: serve({
        'https://co.air-outer.com/desk/v1/stepcode/user/info': {
          code: 0,
          data: {
            usage_summary: { total: 5_000, remaining: 5_000 },
            budget_pool_usages: [
              { pool_name: '二组', total: 5_000, remaining: 5_000, total_tokens: 12_345, total_calls: 7 },
              { pool_name: '三组', total_tokens: 900 },
            ],
          },
        },
      }),
    }))

    expect(reading?.usage).toEqual([
      { kind: 'pool', label: '二组', requests: 7, totalTokens: 12_345 },
      { kind: 'pool', label: '三组', totalTokens: 900 },
    ])
    // Only the pool that disclosed an allowance becomes a budget row.
    expect(reading?.budgetPools?.map(pool => pool.name)).toEqual(['二组'])
  })
})

describe('sub2api-auth', () => {
  it('reads the panel balance and the spend it reports for today', async () => {
    const adapter = adapterFor('sub2api-auth')
    const reading = await adapter?.read(context({
      baseURL: 'https://panel.example.com',
      fetchImpl: serve({
        'https://panel.example.com/user/balance': { data: { balance: 8.25 } },
        'https://panel.example.com/api/v1/usage/stats?period=today': { data: { total_actual_cost: 0.75 } },
      }),
    }))

    expect(reading).toEqual({ mode: 'balance', remaining: 8.25, currency: 'USD', used: 0.75 })
  })

  it('still reports the balance when the usage summary is absent', async () => {
    const adapter = adapterFor('sub2api-auth')
    const reading = await adapter?.read(context({
      baseURL: 'https://panel.example.com',
      fetchImpl: serve({ 'https://panel.example.com/user/balance': { balance: 3 } }),
    }))

    expect(reading).toEqual({ mode: 'balance', remaining: 3, currency: 'USD' })
  })

  it('falls through to the published protocol when the panel route is missing', async () => {
    const adapter = adapterFor('sub2api-auth')
    const reading = await adapter?.read(context({
      baseURL: 'https://panel.example.com',
      fetchImpl: serve({ 'https://panel.example.com/v1/usage': { balance: 1.5 } }),
    }))

    expect(reading).toEqual({ mode: 'balance', remaining: 1.5, currency: 'USD' })
  })

  it('keeps a rejected credential as rejected instead of retrying another path', async () => {
    const adapter = adapterFor('sub2api-auth')
    const unauthorized = (async (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.endsWith('/user/balance')) {
        return new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } })
      }
      throw new Error(`unexpected request to ${url}`)
    })

    await expect(adapter?.read(context({
      baseURL: 'https://panel.example.com',
      fetchImpl: unauthorized,
    }))).rejects.toMatchObject({ status: 'unauthorized' })
  })
})

describe('detectSub2apiPanel', () => {
  it('recognizes a panel by its public settings document', async () => {
    const detected = await detectSub2apiPanel(context({
      baseURL: 'https://panel.example.com',
      fetchImpl: serve({
        'https://panel.example.com/api/v1/settings/public': { code: 0, data: { affiliate_enabled: false } },
      }),
    }))

    expect(detected).toBe(true)
  })

  it('sends no credential while asking what a gateway is', async () => {
    const headers: Array<string | null> = []
    const recording = (async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      const sent = new Headers(init?.headers)
      headers.push(sent.get('authorization'))
      return new Response(JSON.stringify({ code: 0, data: { affiliate_enabled: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    await detectSub2apiPanel(context({ baseURL: 'https://panel.example.com', fetchImpl: recording }))
    expect(headers).toEqual([null])
  })

  it('rejects an answer that carries no fingerprint', async () => {
    const wrong = await detectSub2apiPanel(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({ 'https://gateway.example.com/api/v1/settings/public': { code: 0, data: {} } }),
    }))
    expect(wrong).toBe(false)

    const absent = await detectSub2apiPanel(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({}),
    }))
    expect(absent).toBe(false)
  })
})

describe('agent-router', () => {
  it('reports the account summary with one row per budget pool', async () => {
    const adapter = adapterFor('agent-router')
    const reading = await adapter?.read(context({
      baseURL: 'https://agentrouter.example.com/v1',
      fetchImpl: serve({
        'https://agentrouter.example.com/desk/v1/stepcode/user/info': {
          usage_summary: { remaining: 80, limit: 100 },
          budget_pool_usages: [
            { name: 'default', remaining: 50, limit: 60 },
            { pool_name: 'burst', limit: 40, used: 10 },
          ],
        },
      }),
    }))

    expect(reading).toMatchObject({ remaining: 80, limit: 100, currency: 'credits' })
    expect(reading?.budgetPools).toEqual([
      { name: 'default', remaining: 50, limit: 60, percentUsed: 16.7 },
      { name: 'burst', remaining: 30, limit: 40, percentUsed: 25 },
    ])
  })
})

describe('cline-plan', () => {
  it('orders the plan windows by used share', async () => {
    const adapter = adapterFor('cline-plan')
    const reading = await adapter?.read(context({
      baseURL: 'https://api.cline.bot/v1',
      fetchImpl: serve({
        'https://api.cline.bot/v1/users/me/plan/usage-limits': {
          limits: [
            { type: 'weekly', percentUsed: 20, resetsAt: '2026-03-20T00:00:00Z' },
            { type: 'five_hour', percentUsed: 75 },
            { type: 'quarterly', percentUsed: 99 },
          ],
        },
      }),
    }))

    expect(reading?.plan).toBe('Cline Pass')
    expect(reading?.planWindows).toEqual([
      { kind: 'five-hour', percentUsed: 75 },
      { kind: 'weekly', percentUsed: 20, resetAt: '2026-03-20T00:00:00.000Z' },
    ])
  })
})

describe('minimax-token-plan', () => {
  it('reads the chat row percentages as used shares', async () => {
    const adapter = adapterFor('minimax-token-plan')
    const reading = await adapter?.read(context({
      id: 'minimax',
      credential: async reference => reference === 'MINIMAX_API_KEY' ? 'key' : undefined,
      fetchImpl: serve({
        'https://www.minimax.io/v1/token_plan/remains': {
          base_resp: { status_code: 0 },
          model_remains: [
            {
              model_name: 'general',
              current_interval_remaining_percent: 40,
              current_weekly_remaining_percent: 85,
            },
          ],
        },
      }),
    }))

    expect(reading?.plan).toBe('MiniMax Coding Plan')
    expect(reading?.planWindows).toEqual([
      { kind: 'session', percentUsed: 60 },
      { kind: 'weekly', percentUsed: 15 },
    ])
  })

  it('refuses a payload whose status code reports a failure', async () => {
    const adapter = adapterFor('minimax-token-plan')
    await expect(adapter?.read(context({
      id: 'minimax',
      credential: async () => 'key',
      fetchImpl: serve({
        'https://www.minimax.io/v1/token_plan/remains': { base_resp: { status_code: 1004 } },
      }),
    }))).rejects.toThrow(/status_code 1004/)
  })
})

describe('ollama', () => {
  it('scales the reported ratios into percentages', async () => {
    const adapter = adapterFor('ollama')
    const reading = await adapter?.read(context({
      credential: async () => 'key',
      fetchImpl: serve({
        'https://ollama.com/api/usage': { limits: { session: { usage: 0.25 }, weekly: { usage: 0.8 } } },
      }),
    }))

    expect(reading?.planWindows).toEqual([
      { kind: 'session', percentUsed: 25 },
      { kind: 'weekly', percentUsed: 80 },
    ])
  })
})

describe('declarative adapter', () => {
  it('reads figures through the configured pointers', async () => {
    const adapter = declarativeAdapter({
      url: '/account',
      remainingPointer: '/wallet/balance',
      limitPointer: '/wallet/cap',
      currency: 'USD',
    })
    const reading = await adapter.read(context({
      baseURL: 'https://gateway.example.com',
      fetchImpl: serve({ 'https://gateway.example.com/account': { wallet: { balance: 12.5, cap: 50 } } }),
    }))

    expect(reading).toEqual({ remaining: 12.5, limit: 50, currency: 'USD' })
  })

  it('refuses when no pointer matched a figure', async () => {
    const adapter = declarativeAdapter({ url: 'https://gateway.example.com/account', remainingPointer: '/nope' })
    await expect(adapter.read(context({
      fetchImpl: serve({ 'https://gateway.example.com/account': { wallet: {} } }),
    }))).rejects.toThrow(/matched no figure/)
  })
})

describe('resolvePointer', () => {
  it('resolves object keys, array indices, and escapes', () => {
    const document = { 'a/b': { '~x': [10, 20] } }
    expect(resolvePointer(document, '/a~1b/~0x/1')).toBe(20)
    expect(resolvePointer(document, '')).toBe(document)
  })

  it('returns nothing for an absent path, a bad index, or a relative pointer', () => {
    expect(resolvePointer({ a: 1 }, '/b')).toBeUndefined()
    expect(resolvePointer({ a: [1] }, '/a/-')).toBeUndefined()
    expect(resolvePointer({ a: 1 }, 'a')).toBeUndefined()
  })
})

describe('request guards', () => {
  it('refuses a plaintext request to a public host', async () => {
    await expect(requestJson({ url: 'http://api.example.com/x', apiKey: 'k', fetchImpl: serve({}) }))
      .rejects.toThrow(/https/)
  })

  it('allows plaintext to a loopback gateway', async () => {
    const body = await requestJson({
      url: 'http://127.0.0.1:3000/x',
      apiKey: 'k',
      fetchImpl: serve({ 'http://127.0.0.1:3000/x': { ok: true } }),
    })
    expect(body).toEqual({ ok: true })
  })

  it('allows one route the deployment named as plaintext', async () => {
    const body = await requestJson({
      url: 'http://43.138.157.78:8888/v1/usage',
      apiKey: 'k',
      allowPlaintext: true,
      fetchImpl: serve({ 'http://43.138.157.78:8888/v1/usage': { ok: true } }),
    })
    expect(body).toEqual({ ok: true })
  })

  it('keeps a fenced route to the hosts its deployment named', async () => {
    const fenced = {
      url: 'https://relay.example.com/v1/usage',
      apiKey: 'k',
      allowedHosts: ['other.example.com'],
      fetchImpl: serve({ 'https://relay.example.com/v1/usage': { ok: true } }),
    }
    await expect(requestJson(fenced)).rejects.toThrow(/not among this route's monitors\.allowedHosts/)

    const permitted = await requestJson({
      ...fenced,
      allowedHosts: ['relay.example.com'],
    })
    expect(permitted).toEqual({ ok: true })
  })

  it('refuses a URL embedding credentials', async () => {
    await expect(requestJson({ url: 'https://user:pass@api.example.com/x', fetchImpl: serve({}) }))
      .rejects.toThrow(/must not embed credentials/)
  })

  it('refuses to follow a redirect', async () => {
    const redirecting = (async () => new Response('', { status: 302 })) as typeof fetch
    await expect(requestJson({ url: 'https://api.example.com/x', apiKey: 'k', fetchImpl: redirecting }))
      .rejects.toThrow(/redirected/)
  })

  it('refuses a body larger than the cap', async () => {
    const huge = (async () => new Response('{}', {
      status: 200,
      headers: { 'content-length': String(2_000_000) },
    })) as typeof fetch
    await expect(requestJson({ url: 'https://api.example.com/x', fetchImpl: huge }))
      .rejects.toThrow(/size limit/)
  })

  it('refuses a non-JSON body', async () => {
    const text = (async () => new Response('not json', { status: 200 })) as typeof fetch
    await expect(requestJson({ url: 'https://api.example.com/x', fetchImpl: text }))
      .rejects.toThrow(/invalid JSON/)
  })
})

describe('failure classification', () => {
  it('maps HTTP status codes to account statuses', () => {
    expect(statusOf(401)).toBe('unauthorized')
    expect(statusOf(403)).toBe('unauthorized')
    expect(statusOf(429)).toBe('rate-limited')
    expect(statusOf(404)).toBe('unsupported')
    expect(statusOf(500)).toBe('unavailable')
    expect(statusOf(418)).toBe('invalid-response')
  })

  it('allows a fallthrough only for a missing route or unreadable reply', () => {
    expect(isFallthrough(new QuotaRequestError('unsupported', 'x'))).toBe(true)
    expect(isFallthrough(new QuotaRequestError('invalid-response', 'x'))).toBe(true)
    expect(isFallthrough(new QuotaRequestError('unauthorized', 'x'))).toBe(false)
    expect(isFallthrough(new Error('x'))).toBe(false)
  })
})

describe('provider identity', () => {
  it('prefers an explicit adapter over every inference', () => {
    const identity = resolveProviderIdentity('anything', 'https://api.deepseek.com', 'new-api')
    expect(identity.adapter).toBe('new-api')
  })

  it('recognizes a canonical route id', () => {
    expect(resolveProviderIdentity('deepseek-official', undefined, undefined).adapter).toBe('deepseek-balance')
  })

  it('recognizes a canonical hostname when the route id is custom', () => {
    expect(resolveProviderIdentity('my-route', 'https://openrouter.ai/api/v1', undefined).adapter)
      .toBe('openrouter-balance')
  })

  it('reports no adapter for a local model server', () => {
    const identity = resolveProviderIdentity('local', 'http://localhost:11434/v1', undefined)
    expect(identity.adapter).toBeNull()
    expect(identity.mode).toBe('unsupported')
  })

  it('recognizes every private host form', () => {
    for (const host of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.1.5', '172.20.0.1', '::1', 'box.local']) {
      expect(isPrivateHostname(host)).toBe(true)
    }
    expect(isPrivateHostname('api.deepseek.com')).toBe(false)
    expect(isPrivateHostname('172.32.0.1')).toBe(false)
  })
})
