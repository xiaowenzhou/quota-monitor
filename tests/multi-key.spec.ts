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
import { Config, assertConsistent } from '../src/config.ts'
import type { QuotaMonitorConfigInput } from '../src/config.ts'
import { installStubSeams, requestUrl } from './stubs.ts'

/**
 * Host regressions for a route monitored through several credentials: one
 * reading per key, each read with its own key, and a request that names no key
 * served by the route's first.
 *
 * Every request is served by a stubbed global fetch that answers from the
 * credential it received, so a reading can only hold the figure of the key that
 * produced it. The route is a real configurable provider with a real stored
 * profile, because the profile is what supplies the route's own key.
 */

/** The route under test and the stored profile that names its own key. */
const ROUTE = 'relay'
const BASE_URL = 'https://panel.example.com'

/** The two keys the route monitors, and one it does not. */
const KEY_A = 'RELAY_KEY_A'
const KEY_B = 'RELAY_KEY_B'
const KEY_UNLISTED = 'RELAY_KEY_UNLISTED'

/** Balance each key's own credential reports. */
const BALANCES: Record<string, number> = { 'Bearer key-a': 6.5, 'Bearer key-b': 2 }

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
const ROUTE_SECTION = { baseURL: BASE_URL, apiKeyEnv: KEY_A }

/** Resolves the route's own key and every monitored key. */
class RouteCredentials extends CredentialProvider {
  async resolve(name: string): Promise<ResolvedCredential | undefined> {
    const values: Record<string, string> = { [KEY_A]: 'key-a', [KEY_B]: 'key-b' }
    const value = values[name]
    return value === undefined ? undefined : { value, source: 'env' }
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

/** Answer `/user/balance` with the balance of the key that asked for it. */
function stubFetch(): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input)
    const authorization = new Headers(init?.headers).get('authorization')
    calls.push({ url, authorization })
    const balance = authorization === null ? undefined : BALANCES[authorization]
    const body = url.endsWith('/user/balance') && balance !== undefined ? { data: { balance } } : undefined
    return new Response(JSON.stringify(body ?? {}), {
      status: body === undefined ? 404 : 200,
      headers: { 'content-type': 'application/json' },
    })
  }))
  return calls
}

/** Boot the service over a route whose profile settings serve. */
async function start(config: QuotaMonitorConfigInput = {}, section: unknown = ROUTE_SECTION): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  ctx.provide('settings', {
    describe: () => [{ ns: 'quota-route', value: section }],
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

/** Config naming both keys for the route, on the adapter that serves a balance. */
function monitoringBothKeys(): QuotaMonitorConfigInput {
  return { monitors: { [ROUTE]: { adapter: 'sub2api-auth', credentialRefs: [KEY_A, KEY_B] } } }
}

/** The balance reads one stub recorded, in order. */
function balanceReads(calls: readonly Call[]): Array<string | null> {
  return calls.filter(call => call.url.endsWith('/user/balance')).map(call => call.authorization)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a route monitored through several keys', () => {
  it('reads every monitored key and keeps each reading under its own key', async () => {
    const calls = stubFetch()
    const ctx = await start(monitoringBothKeys())
    try {
      const snapshot = await ctx.quotaMonitor.refreshAccounts()
      const entry = snapshot.providers.find(row => row.id === ROUTE)
      expect(entry?.credentialRefs).toEqual([KEY_A, KEY_B])
      // Each key states the balance that key reports, and nothing mixes them.
      expect(entry?.accounts.map(account => [account.credentialRef, account.status, account.remaining])).toEqual([
        [KEY_A, 'ok', 6.5],
        [KEY_B, 'ok', 2],
      ])
      // The route-level fields keep describing the first monitored key.
      expect(entry).toMatchObject({ status: 'ok', mode: 'balance', adapter: 'sub2api-auth' })
      expect(balanceReads(calls)).toEqual(['Bearer key-a', 'Bearer key-b'])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('reads the first monitored key when the request names none', async () => {
    const calls = stubFetch()
    const ctx = await start(monitoringBothKeys())
    try {
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      expect(account).toMatchObject({ credentialRef: KEY_A, status: 'ok', remaining: 6.5 })
      expect(balanceReads(calls)).toEqual(['Bearer key-a'])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('reads one named key without touching the others', async () => {
    const calls = stubFetch()
    const ctx = await start(monitoringBothKeys())
    try {
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE, credentialRef: KEY_B })
      expect(account).toMatchObject({ credentialRef: KEY_B, status: 'ok', remaining: 2 })
      expect(balanceReads(calls)).toEqual(['Bearer key-b'])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('reads only the keys no round has read yet', async () => {
    const calls = stubFetch()
    const ctx = await start(monitoringBothKeys())
    try {
      // A card this route already opened holds one key; opening the panel
      // completes the picture without re-querying what is already known.
      await ctx.quotaMonitor.getAccount({ provider: ROUTE })
      const snapshot = await ctx.quotaMonitor.readPendingAccounts()
      const entry = snapshot.providers.find(row => row.id === ROUTE)
      expect(entry?.accounts.map(account => account.credentialRef)).toEqual([KEY_A, KEY_B])
      expect(balanceReads(calls)).toEqual(['Bearer key-a', 'Bearer key-b'])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('states an unmonitored key as unreadable instead of reading another', async () => {
    const calls = stubFetch()
    const ctx = await start(monitoringBothKeys())
    try {
      const account = await ctx.quotaMonitor.getAccount({ provider: ROUTE, credentialRef: KEY_UNLISTED })
      expect(account).toMatchObject({ credentialRef: KEY_UNLISTED, status: 'not-configured' })
      expect(calls).toEqual([])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('monitors a route that names no key list through its own profile key', async () => {
    const calls = stubFetch()
    const ctx = await start({ monitors: { [ROUTE]: { adapter: 'sub2api-auth' } } })
    try {
      const snapshot = await ctx.quotaMonitor.refreshAccounts()
      const entry = snapshot.providers.find(row => row.id === ROUTE)
      expect(entry?.credentialRefs).toEqual([KEY_A])
      expect(entry?.accounts.map(account => [account.credentialRef, account.remaining])).toEqual([[KEY_A, 6.5]])
      expect(balanceReads(calls)).toEqual(['Bearer key-a'])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('keeps one unnamed slot for a route whose profile names no key', async () => {
    const calls = stubFetch()
    const ctx = await start({ monitors: { [ROUTE]: { adapter: 'sub2api-auth' } } }, { baseURL: BASE_URL })
    try {
      const snapshot = await ctx.quotaMonitor.refreshAccounts()
      const entry = snapshot.providers.find(row => row.id === ROUTE)
      // Nothing names a credential, so the route keeps its single column and
      // the reading is attributed to the route rather than to a key.
      expect(entry?.credentialRefs).toEqual([])
      expect(entry?.accounts.map(account => [account.credentialRef, account.status])).toEqual([[undefined, 'not-configured']])
      expect(calls).toEqual([])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })
})

describe('monitored key configuration', () => {
  it('rejects a repeated key at load', () => {
    const config = Config({ monitors: { [ROUTE]: { credentialRefs: [KEY_A, KEY_A] } } })
    expect(() => { assertConsistent(config) }).toThrow(/repeats a credential reference/u)
  })

  it('rejects a name outside the credential grammar at load', () => {
    const config = Config({ monitors: { [ROUTE]: { credentialRefs: ['not a ref'] } } })
    expect(() => { assertConsistent(config) }).toThrow(/is not a credential reference/u)
  })
})
