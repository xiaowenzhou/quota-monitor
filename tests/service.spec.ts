import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
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
import { installStubSeams } from './stubs.ts'

/**
 * Host-half regressions: usage accounting over the real `llm/stream`
 * waterfall, manual balance bookkeeping, stat resets, and the account read
 * for a route no adapter recognizes. Settings, credentials, session query,
 * and storage are stubs, so no network or disk access participates.
 */

class ScriptedAdapter extends LlmAdapter {
  constructor(private readonly script: Array<StreamChunk[] | Error>) {
    super()
  }

  override async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const entry = this.script.shift()
    if (entry === undefined) throw new Error('ScriptedAdapter: script exhausted')
    if (entry instanceof Error) throw entry
    void options
    for (const chunk of entry) yield chunk
  }
}

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

async function start(script: Array<StreamChunk[] | Error>): Promise<{ ctx: Context; llm: LlmRuntime }> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  // The forms API replaced the namespace-document provider this suite used to
  // install; an empty `describe()` is the same "no provider profile" seam, and
  // the monitor's settings read addresses both shapes structurally.
  ctx.provide('settings', { describe: () => [] } as never)
  await ctx.plugin(NoCredentials)
  installStubSeams(ctx)
  // Background rounds are disabled so no test depends on a timer firing.
  await ctx.plugin(QuotaMonitorService, Config({ refresh: { enabled: false } }))
  const llm = ctx.llm
  llm.registerAdapter(['mock'], new ScriptedAdapter(script))
  return { ctx, llm }
}

async function drain(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

describe('QuotaMonitorService', () => {
  it('accounts one streaming call and its usage per provider route', async () => {
    const { ctx, llm } = await start([
      [
        { type: 'text-delta', index: 0, text: 'hi' },
        { type: 'usage', usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 3 } },
        { type: 'finish', reason: { kind: 'stop' } },
      ],
    ])
    try {
      const chunks = await drain(llm.stream({ provider: 'mock', model: 'mock-model', messages: [] }))
      expect(chunks).toHaveLength(3)

      const snapshot = ctx.quotaMonitor.getSnapshot()
      expect(snapshot.rows).toHaveLength(1)
      expect(snapshot.rows[0]).toMatchObject({
        id: 'mock',
        calls: 1,
        inputTokens: 10,
        outputTokens: 5,
        cacheReadTokens: 3,
        totalTokens: 18,
        lastModel: 'mock-model',
        balance: null,
      })
      expect(snapshot.aggregate).toEqual({ calls: 1, inputTokens: 10, outputTokens: 5, totalTokens: 15 })
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('counts a throwing stream as an error while surfacing the failure', async () => {
    const { ctx, llm } = await start([])
    try {
      // Drive the waterfall directly: LlmRuntime itself normalizes adapter
      // throws into terminal finish chunks, which would never reach this
      // listener's catch.
      const wrapped = ctx.waterfall(llm, 'llm/stream',
        { provider: 'mock', model: 'm', messages: [] },
        async function* (): AsyncIterable<StreamChunk> {
          yield { type: 'text-delta', index: 0, text: 'partial' }
          throw new Error('upstream exploded')
        })
      await expect(drain(wrapped)).rejects.toThrow('upstream exploded')

      const [row] = ctx.quotaMonitor.getSnapshot().rows
      expect(row).toMatchObject({ calls: 1, errorCount: 1 })
      expect(row?.lastCallAt).toBeGreaterThan(0)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('stores manual balances, folds them into rows, and resets on demand', async () => {
    const { ctx, llm } = await start([
      [{ type: 'usage', usage: { inputTokens: 4, outputTokens: 1 } }, { type: 'finish', reason: { kind: 'stop' } }],
    ])
    try {
      const balances = ctx.quotaMonitor.setBalances({ balances: { mock: 2 } })
      expect(balances).toEqual({ mock: 2 })
      expect(ctx.quotaMonitor.getSnapshot().rows[0]?.balance).toEqual({
        total: 2,
        spent: 0,
        remaining: 2,
        pct: 0,
      })

      const cleared = ctx.quotaMonitor.setBalances({ balances: { mock: Number.NaN } })
      expect(cleared).toEqual({})
      expect(ctx.quotaMonitor.getSnapshot().rows[0]?.balance).toBeNull()

      await drain(llm.stream({ provider: 'mock', model: 'm', messages: [] }))
      expect(ctx.quotaMonitor.getSnapshot().aggregate.calls).toBe(1)

      const reset = ctx.quotaMonitor.resetStats({})
      expect(reset.rows[0]).toMatchObject({ calls: 0, inputTokens: 0 })
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('reports a route no adapter recognizes as unsupported rather than zero', async () => {
    const { ctx } = await start([])
    try {
      const snapshot = ctx.quotaMonitor.getSnapshot()
      expect(snapshot.providers).toHaveLength(1)
      expect(snapshot.providers[0]).toMatchObject({ id: 'mock', mode: 'unsupported', adapter: 'none' })

      const account = await ctx.quotaMonitor.getAccount({ provider: 'mock' })
      expect(account).toMatchObject({ id: 'mock', status: 'unsupported', adapter: 'none' })
      expect(account.remaining).toBeUndefined()
      expect(account.reason).toBe('this provider publishes no account endpoint')
    }
    finally {
      await ctx.fiber.dispose()
    }
  })

  it('serves an empty usage report before any session has been folded', async () => {
    const { ctx } = await start([])
    try {
      const usage = await ctx.quotaMonitor.getUsage({ refresh: true })
      expect(usage.sessionCount).toBe(0)
      expect(usage.days).toEqual([])
      expect(usage.allTimeTotals.totalTokens).toBe(0)
      expect(usage.todayCacheHitPercent).toBeUndefined()
      expect(usage.folding).toBe(false)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })
})
