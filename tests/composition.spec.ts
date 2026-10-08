/**
 * The quota monitor's real composition: a test-only `cordis.yml` booted through
 * the Loader, with the shipped Host service published as `ctx.quotaMonitor`.
 *
 * `packages/AGENTS.md` requires a non-unit composition test for a product-visible
 * plugin, so this suite builds no `ctx.plugin(QuotaMonitorService)` seat of its
 * own. The Loader resolves the real plugin module by path, the fixture entry
 * provides the seams the deployment would provide, and every assertion reads
 * what a deployment observes: the published service, the account and usage
 * figures it serves, the export document it hands a browser, and that disposal
 * unwinds the registration.
 *
 * Only the surrounding seams are stubbed — settings, credentials, session query,
 * and storage-domain persistence — and no stub reaches the network: the account
 * read for a route no adapter recognizes is the endpoint-free path.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
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
import SettingsProvider from '@deepseek-ai/dsh-settings'
import { installStubSeams } from './stubs.ts'

/** A credential store with nothing in it, so no adapter sends a request. */
class NoCredentials extends CredentialProvider {
  async resolve(): Promise<ResolvedCredential | undefined> {
    return undefined
  }

  async describe(): Promise<CredentialInfo> {
    return { configured: false, writable: false }
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

/** A settings store holding no provider profile, so the registry stays empty. */
class EmptySettings extends SettingsProvider {
  readonly writable = false
  protected async load(): Promise<Record<string, unknown>> {
    return {}
  }

  protected async persist(): Promise<void> {}
}

/** What the fixture's seam entry leaves for the test to drive and assert. */
interface Booted {
  ctx: Context
  /** The seams the fixture's entry installed, for assertions about durable state. */
  seams: ReturnType<typeof installStubSeams>
  llm: LlmRuntime
}

/** The one session the stub query serves, whose fold the export must carry. */
function sessionLog(): SessionEvent[] {
  const day = new Date(2026, 2, 15, 12).getTime()
  return [
    { seq: 0, time: day, type: 'request/context', data: { provider: 'mock', model: 'mock-model' } },
    { seq: 1, time: day, type: 'assistant/message', data: { usage: { inputTokens: 400, outputTokens: 100, cacheReadTokens: 50 } } },
  ] as unknown as SessionEvent[]
}

/** A deployment's own inference route, scripted so no socket is opened. */
class ScriptedAdapter extends LlmAdapter {
  override async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    void options
    yield { type: 'usage', usage: { inputTokens: 400, outputTokens: 100, cacheReadTokens: 50 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

/** Boots this worker has started, so a stale fixture report cannot satisfy a later one. */
let bootGeneration = 0

/**
 * Boot the fixture tree through the Loader.
 * @returns the published service alongside the seams the fixture installed.
 */
async function boot(): Promise<Booted> {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-quota-composition-'))
  const globals = globalThis as unknown as {
    __quotaMonitorService: unknown
    __quotaMonitorSeams: (ctx: Context) => void
    __quotaMonitorBooted: { generation: number; seams: ReturnType<typeof installStubSeams> } | undefined
  }
  // Each boot carries its own generation so a stale report from an earlier boot
  // in this worker can never satisfy a later one.
  bootGeneration += 1
  const generation = bootGeneration
  // The Loader imports fixture modules through Node's resolver, so a fixture in
  // a temporary directory cannot name workspace packages. Each one delegates to
  // a callback this test already imported through the source plane, and the
  // plugin fixture re-exports the real class so the Loader resolves it by path.
  writeFileSync(join(dir, 'plugin.mjs'), 'export default globalThis.__quotaMonitorService\n')
  writeFileSync(join(dir, 'seams.mjs'), 'export function apply(ctx) { return globalThis.__quotaMonitorSeams(ctx) }\n')
  writeFileSync(join(dir, 'cordis.yml'), [
    '- id: seams',
    `  name: ${pathToFileURL(join(dir, 'seams.mjs')).href}`,
    '- id: quota-monitor',
    `  name: ${pathToFileURL(join(dir, 'plugin.mjs')).href}`,
    '  config:',
    '    refresh:',
    '      enabled: false',
    '',
  ].join('\n'))

  globals.__quotaMonitorService = (await import('../src/index.ts')).default
  globals.__quotaMonitorSeams = (ctx) => {
    // Registering a Service inside a Loader entry without awaiting it keeps this
    // entry free of the activation the services themselves must complete.
    ctx.plugin(LlmRuntime)
    ctx.plugin(EmptySettings)
    ctx.plugin(NoCredentials)
    const seams = installStubSeams(ctx)
    seams.sessionQuery.sessions = [{ id: 'session-folded', events: sessionLog() }]
    globals.__quotaMonitorBooted = { generation, seams }
  }

  const ctx = new Context()
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  try {
    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(join(dir, 'cordis.yml')).href } })
    await ctx.loader.await()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  const booted = globals.__quotaMonitorBooted
  if (booted === undefined || booted.generation !== generation) {
    throw new Error('composition: the seam entry never applied')
  }
  // The deployment's own inference route, registered on the live llm service the
  // fixture provided; the monitor re-reads the registry when the topology changes.
  const llm = ctx.get('llm') as LlmRuntime
  llm.registerAdapter(['mock'], new ScriptedAdapter())
  return { ctx, seams: booted.seams, llm }
}

describe('quota monitor composition through the Loader', () => {
  it('publishes ctx.quotaMonitor from a cordis.yml entry and unwinds it on disposal', async () => {
    const { ctx } = await boot()
    try {
      // The service is published by the Loader's own activation, not by this test.
      expect(ctx.get('quotaMonitor')).toBeDefined()
      expect(ctx.quotaMonitor.getSnapshot().capturedAt).toBeGreaterThan(0)
    } finally {
      await ctx.fiber.dispose()
    }
    expect(ctx.get('quotaMonitor')).toBeUndefined()
  })

  it('serves the provider registry the deployment registered and the account read for one route', async () => {
    const { ctx, llm } = await boot()
    try {
      // The route reaches the selector through the real llm registry, driven by
      // one streaming call rather than by a test-only registration.
      for await (const _chunk of llm.stream({ provider: 'mock', model: 'mock-model', messages: [] })) void _chunk

      const snapshot = ctx.quotaMonitor.getSnapshot()
      expect(snapshot.providers.map(entry => entry.id)).toEqual(['mock'])
      expect(snapshot.aggregate.calls).toBe(1)
      expect(snapshot.rows[0]).toMatchObject({ id: 'mock', lastModel: 'mock-model' })

      // No adapter serves a bare `mock` route, so the read answers without a socket.
      const account = await ctx.quotaMonitor.getAccount({ provider: 'mock' })
      expect(account).toMatchObject({ id: 'mock', status: 'unsupported', mode: 'unsupported' })
      expect(account.remaining).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('folds the persisted session log into the served totals and carries them into an export', async () => {
    const { ctx, seams } = await boot()
    try {
      const usage = await ctx.quotaMonitor.getUsage({ refresh: true })
      expect(usage.sessionCount).toBe(1)
      expect(usage.days.map(day => day.date)).toEqual(['2026-03-15'])
      expect(usage.allTimeTotals).toMatchObject({
        inputTokens: 400,
        outputTokens: 100,
        cacheReadTokens: 50,
        totalTokens: 550,
      })
      expect(usage.sessions[0]).toMatchObject({ id: 'session-folded', calls: 1 })

      // The durable cache the fold opened on the storage seam survives its round.
      expect(seams.storageDomain.state.records.size).toBeGreaterThan(0)
      expect(seams.storageDomain.state.closed).toBe(false)

      const exported = ctx.quotaMonitor.exportUsage({ kind: 'daily-csv' })
      expect(exported.kind).toBe('daily-csv')
      expect(exported.filename).toBe('dsh-quota-daily.csv')
      expect(exported.mediaType).toBe('text/csv; charset=utf-8')
      expect(exported.content).toContain('2026-03-15')
      expect(exported.content).toContain('mock-model')
      // Aggregates only: no credential and no upstream body reaches an export.
      expect(exported.content).not.toContain('secret')
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('records a manual allowance on the live service and reads it back through the snapshot', async () => {
    const { ctx } = await boot()
    try {
      expect(ctx.quotaMonitor.setBalances({ balances: { mock: 12 } })).toEqual({ mock: 12 })
      const snapshot = ctx.quotaMonitor.getSnapshot()
      expect(snapshot.rows[0]?.balance).toMatchObject({ total: 12, remaining: 12 })
      expect(snapshot.balances).toEqual({ mock: 12 })
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
