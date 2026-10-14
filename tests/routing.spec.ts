import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type {
  CredentialInfo,
  CredentialRecord,
  CredentialRecordEntry,
  CredentialRecordInfo,
  CredentialRef,
  ResolvedCredential,
} from '@deepseek-ai/dsh-credentials'
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { QuotaMonitorService } from '../src/index.ts'
import { Config, assertConsistent } from '../src/config.ts'
import type { QuotaMonitorConfigInput } from '../src/config.ts'
import { installStubSeams, requestUrl } from './stubs.ts'

/**
 * Host regressions for a route that routes its own credential: each model
 * request authenticates with the monitored key that has the most room left.
 *
 * The route authenticates with a reference of its own (`activeRef`), which this
 * monitor keeps pointed at one of the monitored keys. The keys themselves are
 * never written, so a reading is still taken with the key it describes. The
 * credential seam is a real service backed by a mutable map, so what the route
 * would resolve on its next request is exactly what the monitor wrote.
 */

/** The route under test, its routing reference, and the two keys it chooses between. */
const ROUTE = 'relay'
const BASE_URL = 'https://panel.example.com'
const ACTIVE_REF = 'RELAY_ACTIVE_KEY'
const KEY_A = 'RELAY_KEY_A'
const KEY_B = 'RELAY_KEY_B'

/** The route's profile: it authenticates with the routing reference, not a key. */
const ROUTE_SECTION = { baseURL: BASE_URL, apiKeyEnv: ACTIVE_REF }

class SilentAdapter extends LlmAdapter {
  override async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    void options
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

/** The credential seam, backed by a map a test can seed and inspect. */
class RouteCredentials extends CredentialProvider {
  readonly values: Map<string, string>
  readonly writes: Array<{ ref: string; value: string }> = []

  constructor(ctx: Context, initial: Record<string, string> = {}) {
    super(ctx)
    this.values = new Map(Object.entries(initial))
  }

  async resolve(name: string): Promise<ResolvedCredential | undefined> {
    const value = this.values.get(name)
    return value === undefined ? undefined : { value, source: 'store' }
  }

  async describe(): Promise<CredentialInfo> {
    return { configured: true, writable: true }
  }

  async set(ref: string, value: string): Promise<void> {
    this.writes.push({ ref, value })
    this.values.set(ref, value)
  }

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

/**
 * Answer `/user/balance` with the balance of the key that asked for it.
 * @param balances - balance per `Authorization` header; a key absent from the
 * map is answered as if the gateway did not recognize it.
 * @returns every request the stub received, in call order.
 */
function stubFetch(balances: Record<string, number>): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input)
    const authorization = new Headers(init?.headers).get('authorization')
    calls.push({ url, authorization })
    const balance = authorization === null ? undefined : balances[authorization]
    const body = url.endsWith('/user/balance') && balance !== undefined ? { data: { balance } } : undefined
    return new Response(JSON.stringify(body ?? {}), {
      status: body === undefined ? 404 : 200,
      headers: { 'content-type': 'application/json' },
    })
  }))
  return calls
}

/** Both monitored keys with the values the stub answers for. */
const BOTH_KEYS = { [KEY_A]: 'key-a', [KEY_B]: 'key-b' }

/**
 * Boot the service over a route whose profile settings serve.
 * @param config - quota monitor config to load.
 * @param section - the route's stored profile section.
 * @param credentials - credential values present before the monitor loads.
 * @returns the context, whose `credentials` service is a `RouteCredentials`.
 */
async function start(
  config: QuotaMonitorConfigInput,
  section: unknown = ROUTE_SECTION,
  credentials: Record<string, string> = BOTH_KEYS,
  storedKeys?: unknown,
): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  let storedSection = section
  ctx.provide('settings', {
    describe: () => [{ ns: 'quota-route', value: storedSection, revision: 1 }],
    mutate: async (_ns: string, operations: Array<{ value: unknown }>) => {
      if (typeof storedSection === 'object' && storedSection !== null) storedSection = { ...storedSection, apiKeyEnv: operations[0]?.value }
    },
  } as never)
  await ctx.plugin(RouteCredentials, credentials)
  const seams = installStubSeams(ctx)
  if (storedKeys !== undefined) seams.storageDomain.keyRecords.set(ROUTE, storedKeys)
  // The route is registered before the monitor loads, so the monitor's load-time
  // identification reads the same topology a running deployment would have.
  ctx.llm.registerAdapter([ROUTE], new SilentAdapter())
  ctx.llm.registerConfigurableProviders([{
    provider: ROUTE,
    displayName: 'Relay',
    settingsNs: 'quota-route',
    settingsPath: [],
  }])
  await ctx.plugin(QuotaMonitorService, Config({ refresh: { enabled: false }, ...config }))
  return ctx
}

/** Config routing the route's credential between both monitored keys. */
function routingBothKeys(): QuotaMonitorConfigInput {
  return {
    monitors: {
      [ROUTE]: { adapter: 'sub2api-auth', credentialRefs: [KEY_A, KEY_B], activeRef: ACTIVE_REF },
    },
  }
}

/** Drive one model request through the route's stream waterfall. */
async function callModel(ctx: Context): Promise<void> {
  for await (const chunk of ctx.llm.stream({ provider: ROUTE, model: 'mock-model', messages: [] })) void chunk
}

/** The writes the monitor made to the routing reference. */
function writes(ctx: Context): Array<{ ref: string; value: string }> {
  return (ctx.credentials as RouteCredentials).writes
}

/** The route's entry in the served snapshot. */
function routeEntry(ctx: Context) {
  return ctx.quotaMonitor.getSnapshot().providers.find(row => row.id === ROUTE)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a route that routes its credential', () => {
  it('authenticates the next request with the key that has the most room left', async () => {
    const calls = stubFetch({ 'Bearer key-a': 6.5, 'Bearer key-b': 2 })
    const ctx = await start(routingBothKeys())
    try {
      await ctx.quotaMonitor.refreshAccounts()
      expect(calls.length).toBeGreaterThan(0)

      await callModel(ctx)

      // The key with the larger balance is the one written into the routing
      // reference, and the route resolves it on its next request.
      expect(writes(ctx)).toEqual([{ ref: ACTIVE_REF, value: 'key-a' }])
      expect((await ctx.credentials.resolve(ACTIVE_REF as CredentialRef))?.value).toBe('key-a')
      // The monitored keys keep their own values: routing never writes a key.
      expect((ctx.credentials as RouteCredentials).values.get(KEY_A)).toBe('key-a')
      expect((ctx.credentials as RouteCredentials).values.get(KEY_B)).toBe('key-b')
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(KEY_A)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('leaves the credential alone while the same key stays ahead', async () => {
    stubFetch({ 'Bearer key-a': 6.5, 'Bearer key-b': 2 })
    const ctx = await start(routingBothKeys())
    try {
      await ctx.quotaMonitor.refreshAccounts()
      await callModel(ctx)
      await callModel(ctx)
      expect(writes(ctx)).toEqual([{ ref: ACTIVE_REF, value: 'key-a' }])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('moves the route to another key once that key is ahead', async () => {
    stubFetch({ 'Bearer key-a': 6.5, 'Bearer key-b': 2 })
    const ctx = await start(routingBothKeys())
    try {
      await ctx.quotaMonitor.refreshAccounts()
      await callModel(ctx)
      expect(writes(ctx)).toEqual([{ ref: ACTIVE_REF, value: 'key-a' }])

      // A later round sees the other key ahead, so the next request moves.
      const moved = stubFetch({ 'Bearer key-a': 1, 'Bearer key-b': 9 })
      await ctx.quotaMonitor.refreshAccounts()
      await callModel(ctx)
      expect(moved.length).toBeGreaterThan(0)
      expect(writes(ctx)).toEqual([
        { ref: ACTIVE_REF, value: 'key-a' },
        { ref: ACTIVE_REF, value: 'key-b' },
      ])
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(KEY_B)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('chooses among the keys it could read', async () => {
    // Only one key's own endpoint answers; the other is not a candidate at all.
    stubFetch({ 'Bearer key-b': 2 })
    const ctx = await start(routingBothKeys())
    try {
      const snapshot = await ctx.quotaMonitor.refreshAccounts()
      const accounts = snapshot.providers.find(row => row.id === ROUTE)?.accounts ?? []
      expect(accounts.find(account => account.credentialRef === KEY_B)?.status).toBe('ok')
      expect(accounts.find(account => account.credentialRef === KEY_A)?.status).not.toBe('ok')

      await callModel(ctx)
      expect(writes(ctx)).toEqual([{ ref: ACTIVE_REF, value: 'key-b' }])
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('leaves the route untouched until a key states a figure', async () => {
    stubFetch({})
    const ctx = await start(routingBothKeys())
    try {
      await callModel(ctx)
      expect(writes(ctx)).toEqual([])
      expect(routeEntry(ctx)?.activeCredentialRef).toBeUndefined()
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('names the key the route already authenticates with before any request', async () => {
    stubFetch({ 'Bearer key-a': 6.5, 'Bearer key-b': 2 })
    // The routing reference was set up with the second key's value. Matching the
    // values is the only way to name it: the stored value is opaque and the
    // reference it came from is not recorded anywhere.
    const ctx = await start(routingBothKeys(), ROUTE_SECTION, { ...BOTH_KEYS, [ACTIVE_REF]: 'key-b' })
    try {
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(KEY_B)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('refuses to route a route whose profile authenticates elsewhere', async () => {
    stubFetch({ 'Bearer key-a': 6.5, 'Bearer key-b': 2 })
    // The profile names one of the keys rather than the routing reference, so
    // writing the routing reference would change nothing about the request.
    const ctx = await start(routingBothKeys(), { baseURL: BASE_URL, apiKeyEnv: KEY_A })
    const reported = vi.spyOn(ctx.logger, 'error')
    try {
      await ctx.quotaMonitor.refreshAccounts()
      await callModel(ctx)
      await callModel(ctx)
      expect(writes(ctx)).toEqual([])
      expect(reported).toHaveBeenCalledTimes(1)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })
})

describe('key management', () => {
  it('wires a normal provider and restores managed keys after restart', async () => {
    stubFetch({ 'Bearer key-a': 6, 'Bearer key-b': 9 })
    const config: QuotaMonitorConfigInput = { monitors: { [ROUTE]: { adapter: 'sub2api-auth' } } }
    const ctx = await start(config, { baseURL: BASE_URL, apiKeyEnv: KEY_A })
    let persisted: unknown
    let credentials: Record<string, string> = {}
    let activeRef: string | undefined
    try {
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'add', credentialRef: KEY_B, name: 'Secondary' })
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'activate', credentialRef: KEY_B })
      activeRef = routeEntry(ctx)?.routing?.activeRef
      expect(activeRef).toMatch(/^QUOTA_ACTIVE_/)
      expect(ctx.settings.describe()[0]?.value).toMatchObject({ apiKeyEnv: activeRef })
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(KEY_B)
      credentials = Object.fromEntries((ctx.credentials as RouteCredentials).values)
      persisted = (ctx.storageDomain as import('./stubs.ts').StubStorageDomain).keyRecords.get(ROUTE)
      expect(JSON.stringify(persisted)).not.toContain('key-b')
    } finally { await ctx.fiber.dispose() }
    const restored = await start(config, { baseURL: BASE_URL, apiKeyEnv: activeRef }, credentials, persisted)
    try {
      expect(routeEntry(restored)?.credentialRefs).toEqual([KEY_A, KEY_B])
      expect(routeEntry(restored)?.keyNames?.[KEY_B]).toBe('Secondary')
      expect(routeEntry(restored)?.activeCredentialRef).toBe(KEY_B)
      await callModel(restored)
      expect(routeEntry(restored)?.activeCredentialRef).toBe(KEY_B)
    } finally { await restored.fiber.dispose() }
  })
  it('adds a key without exposing its value, renames it, pins it and detaches it', async () => {
    stubFetch({ 'Bearer key-a': 6, 'Bearer key-b': 9 })
    const ctx = await start(routingBothKeys(), ROUTE_SECTION, { ...BOTH_KEYS, [ACTIVE_REF]: 'key-a' })
    try {
      const snapshot = await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'add', key: 'third-secret', name: 'Work' })
      const ref = snapshot.providers[0]!.credentialRefs.find(value => value !== KEY_A && value !== KEY_B)!
      expect(JSON.stringify(snapshot)).not.toContain('third-secret')
      expect((ctx.credentials as RouteCredentials).values.get(ref)).toBe('third-secret')
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'rename', credentialRef: ref, name: 'Backup' })
      expect(routeEntry(ctx)?.keyNames?.[ref]).toBe('Backup')
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'activate', credentialRef: ref })
      await callModel(ctx)
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(ref)
      expect(routeEntry(ctx)?.routing?.mode).toBe('manual')
      expect((ctx.credentials as RouteCredentials).values.get(ACTIVE_REF)).toBe('third-secret')
      await expect(ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'remove', credentialRef: ref })).rejects.toThrow('Switch away')
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'activate', credentialRef: KEY_A })
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'remove', credentialRef: ref })
      expect(routeEntry(ctx)?.credentialRefs).not.toContain(ref)
      expect((ctx.credentials as RouteCredentials).values.get(ref)).toBe('third-secret')
      expect(routeEntry(ctx)?.keyNames?.[ref]).toBeUndefined()
    } finally { await ctx.fiber.dispose() }
  })

  it('rejects overwriting existing references and reading other providers keys', async () => {
    const ctx = await start(routingBothKeys())
    try {
      await expect(ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'add', credentialRef: KEY_A, key: 'overwrite' })).rejects.toThrow('already monitored')
      await expect(ctx.quotaMonitor.getAccount({ provider: ROUTE, credentialRef: 'SOME_OTHER_KEY' })).rejects.toThrow('not monitored')
      expect((ctx.credentials as RouteCredentials).values.get(KEY_A)).toBe('key-a')
    } finally { await ctx.fiber.dispose() }
  })

  it('reads fresh quotas on enabling automatic routing and refuses exhausted keys', async () => {
    stubFetch({ 'Bearer key-a': 0, 'Bearer key-b': 8 })
    const ctx = await start(routingBothKeys(), ROUTE_SECTION, { ...BOTH_KEYS, [ACTIVE_REF]: 'key-a' })
    try {
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'routing', mode: 'quota' })
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(KEY_B)
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'routing', mode: 'manual' })
      stubFetch({ 'Bearer key-a': 100, 'Bearer key-b': 8 })
      await ctx.quotaMonitor.refreshAccounts()
      await callModel(ctx)
      expect(routeEntry(ctx)?.activeCredentialRef).toBe(KEY_B)
      await ctx.quotaMonitor.manageKey({ provider: ROUTE, action: 'routing', mode: 'quota' })
      stubFetch({ 'Bearer key-a': 0, 'Bearer key-b': 0 })
      await ctx.quotaMonitor.refreshAccounts()
      await expect(callModel(ctx)).rejects.toThrow('no healthy key')
    } finally { await ctx.fiber.dispose() }
  })
})

describe('routing configuration', () => {
  it('rejects a routing reference that is also a monitored key', () => {
    const config = Config({
      monitors: { [ROUTE]: { credentialRefs: [KEY_A, KEY_B], activeRef: KEY_A } },
    })
    expect(() => { assertConsistent(config) }).toThrow(/would overwrite that key/u)
  })

  it('rejects routing below two monitored keys', () => {
    const config = Config({
      monitors: { [ROUTE]: { credentialRefs: [KEY_A], activeRef: ACTIVE_REF } },
    })
    expect(() => { assertConsistent(config) }).toThrow(/at least two credentialRefs/u)
  })

  it('rejects a routing reference outside the credential grammar', () => {
    const config = Config({
      monitors: { [ROUTE]: { credentialRefs: [KEY_A, KEY_B], activeRef: 'not a ref' } },
    })
    expect(() => { assertConsistent(config) }).toThrow(/is not a credential reference/u)
  })
})
