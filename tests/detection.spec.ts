import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type {
  CredentialInfo,
  CredentialRecord,
  CredentialRecordEntry,
  CredentialRecordInfo,
  ResolvedCredential,
} from '@deepseek-ai/dsh-credentials'
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { QuotaMonitorService } from '../src/index.ts'
import { Config } from '../src/config.ts'
import type { QuotaMonitorConfigInput } from '../src/config.ts'
import { installStubSeams, requestUrl } from './stubs.ts'

/**
 * Host regressions for a gateway no rule recognizes: the credential-free
 * fingerprint, the mode a reading declares for itself, the severity that
 * reaches the selector, and the export documents the panel downloads.
 *
 * Every request is served by a stubbed global fetch, so no test reaches the
 * network. The provider is a real configurable route with a real settings
 * section and a real credential reference, because that is what decides
 * whether detection may run at all.
 */

/** The route under test, its stored profile, and the credential it names. */
const ROUTE = 'relay'
const BASE_URL = 'https://panel.example.com'
const KEY_REF = 'RELAY_KEY'

/** Answers the fingerprint route with a real panel's public settings. */
const FINGERPRINT = { code: 0, data: { affiliate_enabled: false } }

class SilentAdapter extends LlmAdapter {
  override async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    void options
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

/** Serves one namespace section, so `profileOf` reads a real stored profile. */
const ROUTE_SECTION = { baseURL: BASE_URL, apiKeyEnv: KEY_REF }

/** Resolves only the reference the stored profile names. */
class RouteCredentials extends CredentialProvider {
  async resolve(name: string): Promise<ResolvedCredential | undefined> {
    return name === KEY_REF ? { value: 'inference-key', source: 'env' } : undefined
  }

  async describe(): Promise<CredentialInfo> {
    return { configured: true, writable: false }
  }

  async set(): Promise<void> {}

  async unset(): Promise<void> {}

  async readRecord(): Promise<CredentialRecord | undefined> {
    return undefined
  }

  async describeRecord(): Promise<CredentialRecordInfo> {
    return { configured: false, writable: false }
  }

  async listRecords(): Promise<readonly CredentialRecordEntry[]> {
    return []
  }

  async modifyRecord(): Promise<CredentialRecord | undefined> {
    return undefined
  }

  async deleteRecord(): Promise<void> {}
}

/** One request the stubbed fetch received, in call order. */
interface Call {
  url: string
  authorization: string | null
}

/** Install a fetch answering a URL table, recording every request. */
function stubFetch(routes: Record<string, unknown>): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input)
    calls.push({ url, authorization: new Headers(init?.headers).get('authorization') })
    const body = routes[url]
    const status = body === undefined ? 404 : 200
    return new Response(JSON.stringify(body ?? {}), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }))
  return calls
}

/** Boot the service over a configurable route whose profile settings serve. */
async function start(config: QuotaMonitorConfigInput = {}): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  // The forms API replaced the namespace-document provider this suite used to
  // install, so the stored profile arrives as the `describe()` row the monitor
  // reads: one entry id, `quota-route`, holding the section that entry backs.
  ctx.provide('settings', {
    describe: () => [{ ns: 'quota-route', value: ROUTE_SECTION }],
  } as never)
  await ctx.plugin(RouteCredentials)
  installStubSeams(ctx)
  await ctx.plugin(QuotaMonitorService, Config({ refresh: { enabled: false }, ...config }))
  ctx.llm.registerAdapter([ROUTE], new SilentAdapter())
  ctx.llm.registerConfigurableProviders([{
    provider: ROUTE,
    displayName: 'Relay',
    settingsNs: 'quota-route',
    settingsPath: [],
  }])
  return ctx
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('gateway detection', () => {
  it('runs a recognized panel adapter for a route no rule names', async () => {
    stubFetch({
      [`${BASE_URL}/api/v1/settings/public`]: FINGERPRINT,
      [`${BASE_URL}/user/balance`]: { data: { balance: 6.5 } },
    })
    const ctx = await start()
    try {
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      expect(account).toMatchObject({
        status: 'ok',
        adapter: 'sub2api-auth',
        mode: 'balance',
        remaining: 6.5,
        currency: 'USD',
      })
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('asks what the gateway is without sending the credential', async () => {
    const calls = stubFetch({
      [`${BASE_URL}/api/v1/settings/public`]: FINGERPRINT,
      [`${BASE_URL}/user/balance`]: { data: { balance: 1 } },
    })
    const ctx = await start()
    try {
      await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      const probe = calls.find(call => call.url.endsWith('/api/v1/settings/public'))
      const read = calls.find(call => call.url.endsWith('/user/balance'))
      expect(probe?.authorization).toBeNull()
      expect(read?.authorization).toBe('Bearer inference-key')
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('asks once and reuses the answer on the next read', async () => {
    const calls = stubFetch({
      [`${BASE_URL}/api/v1/settings/public`]: FINGERPRINT,
      [`${BASE_URL}/user/balance`]: { data: { balance: 1 } },
    })
    const ctx = await start()
    try {
      await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      await ctx.quotaMonitor.getAccount({ provider: ROUTE, refresh: true })
      const probes = calls.filter(call => call.url.endsWith('/api/v1/settings/public'))
      expect(probes).toHaveLength(1)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('leaves the route unsupported when a deployment turns detection off', async () => {
    const calls = stubFetch({ [`${BASE_URL}/api/v1/settings/public`]: FINGERPRINT })
    const ctx = await start({ detection: { enabled: false } })
    try {
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      expect(account).toMatchObject({ status: 'unsupported', adapter: 'none' })
      expect(calls).toEqual([])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('leaves the route unsupported when the gateway is not a panel', async () => {
    stubFetch({ [`${BASE_URL}/api/v1/settings/public`]: { code: 0, data: {} } })
    const ctx = await start()
    try {
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      expect(account).toMatchObject({ status: 'unsupported', adapter: 'none' })
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('frames the card by the mode the reading declared, not by the adapter id', async () => {
    stubFetch({
      [`${BASE_URL}/api/v1/settings/public`]: FINGERPRINT,
      [`${BASE_URL}/v1/usage`]: {
        mode: 'quota_limited',
        quota: { used: 96, limit: 100 },
      },
    })
    const ctx = await start()
    try {
      // The panel serves no dashboard balance, so the adapter falls through to
      // the published protocol, which meters windows instead of an amount.
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      expect(account.mode).toBe('subscription')
      expect(account.planWindows).toEqual([{ kind: 'quota', percentUsed: 96 }])
      expect(account.warning).toBe('critical')

      const entry = ctx.quotaMonitor.getSnapshot().providers.find(row => row.id === ROUTE)
      expect(entry).toMatchObject({ mode: 'subscription', adapter: 'sub2api-auth', status: 'ok', warning: 'critical' })
    }
    finally {
      await ctx.fiber.dispose()
    }
  })
})

describe('exportUsage', () => {
  it('builds each document from the report the panel is showing', async () => {
    stubFetch({})
    const ctx = await start()
    try {
      await ctx.quotaMonitor.getUsage({ refresh: true })

      const daily = ctx.quotaMonitor.exportUsage({ kind: 'daily-csv' })
      expect(daily).toMatchObject({ kind: 'daily-csv', filename: 'dsh-quota-daily.csv' })
      expect(daily.content).toContain('"date","provider","model"')

      const sessions = ctx.quotaMonitor.exportUsage({ kind: 'sessions-csv' })
      expect(sessions.content).toContain('"session_id","routes"')

      const json = ctx.quotaMonitor.exportUsage({ kind: 'report-json' })
      const parsed = JSON.parse(json.content) as { providers: Array<{ id: string }> }
      expect(parsed.providers.map(row => row.id)).toEqual([ROUTE])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })
})
