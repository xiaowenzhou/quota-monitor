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
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SettingsProvider from '@deepseek-ai/dsh-settings'
import { QuotaMonitorService } from '../src/index.ts'
import { Config, assertConsistent, resolveMonitor } from '../src/config.ts'
import { installStubSeams } from './stubs.ts'

/**
 * Configuration regressions: the defaults a deployment inherits, the price and
 * budget sections, and the contradictions that must stop the plugin at load
 * rather than surface as an unreadable panel.
 */

class EmptySettings extends SettingsProvider {
  readonly writable = false
  protected async load(): Promise<Record<string, unknown>> {
    return {}
  }

  protected async persist(): Promise<void> {}
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

describe('Config', () => {
  it('ships no price list, so a deployment states its own rates', () => {
    const config = Config({})
    expect(config.pricing).toEqual({ currency: 'USD', rules: [], imports: [], fuzzyMatch: false })
    expect(config.budgets.daily).toBeUndefined()
    expect(config.budgets.monthly).toBeUndefined()
  })

  it('leaves gateway fingerprinting on and lets a deployment turn it off', () => {
    expect(Config({}).detection.enabled).toBe(true)
    expect(Config({ detection: { enabled: false } }).detection.enabled).toBe(false)
  })

  it('accepts a price rule naming a provider, a model family, and a start day', () => {
    const config = Config({
      pricing: {
        currency: 'CNY',
        rules: [{
          provider: 'deepseek',
          model: 'deepseek-*',
          from: '2026-03-01',
          inputPerMillion: 2,
          outputPerMillion: 8,
          cacheReadPerMillion: 0.2,
        }],
      },
    })

    expect(config.pricing.currency).toBe('CNY')
    expect(config.pricing.rules[0]).toMatchObject({
      provider: 'deepseek',
      model: 'deepseek-*',
      from: '2026-03-01',
      inputPerMillion: 2,
      cacheReadPerMillion: 0.2,
    })
  })

  it('resolves the override configured for one route and nothing for another', () => {
    const config = Config({ monitors: { relay: { adapter: 'sub2api-auth' } } })
    expect(resolveMonitor(config, 'relay')).toMatchObject({ adapter: 'sub2api-auth' })
    expect(resolveMonitor(config, 'other')).toBeUndefined()
  })
})

describe('assertConsistent', () => {
  it('accepts a budget backed by a price rule', () => {
    expect(() =>{  assertConsistent(Config({
      pricing: { rules: [{ inputPerMillion: 1, outputPerMillion: 2 }] },
      budgets: { daily: 5 },
    })) }).not.toThrow()
  })

  it('rejects a budget with no price rule to measure it against', () => {
    expect(() =>{  assertConsistent(Config({ budgets: { monthly: 100 } })) })
      .toThrow(/budgets require pricing\.rules or pricing\.imports/)
  })

  it('accepts a budget measured against an imported document alone', () => {
    expect(() =>{  assertConsistent(Config({
      pricing: { imports: [{ path: '/prices/catalog.json' }] },
      budgets: { daily: 5 },
    })) }).not.toThrow()
  })

  it('rejects an import path that is not absolute', () => {
    expect(() =>{  assertConsistent(Config({ pricing: { imports: [{ path: 'prices.json' }] } })) })
      .toThrow(/must be absolute/)
  })

  it('rejects a critical threshold below the warning threshold', () => {
    expect(() =>{  assertConsistent(Config({ budgets: { warningPercent: 90, criticalPercent: 50 } })) })
      .toThrow(/criticalPercent must not be below/)
  })

  it('stops the plugin at load rather than serving an unmeasurable budget', async () => {
    const ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(EmptySettings)
    await ctx.plugin(NoCredentials)
    installStubSeams(ctx)
    try {
      await expect(ctx.plugin(QuotaMonitorService, Config({
        refresh: { enabled: false },
        budgets: { daily: 1 },
      }))).rejects.toThrow(/budgets require pricing\.rules or pricing\.imports/)
    }
    finally {
      await ctx.fiber.dispose()
    }
  })
})
