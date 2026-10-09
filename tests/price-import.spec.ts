import { describe, expect, it } from 'vitest'
import { loadPriceTable, parsePriceDocument } from '../src/price-import.ts'
import { normalizeModel } from '../src/pricing.ts'
import type { QuotaMonitorConfig } from '../src/config.ts'

/**
 * Price import regressions: which document shapes are understood, what a unit
 * mismatch does, and that an imported rule never outranks a stated one.
 *
 * Nothing here touches the filesystem: the reader is injected, which is also
 * what lets a case answer with a document a deployment could not have written.
 */

/** A configuration that imports one document and states one rule of its own. */
function config(overrides: Partial<QuotaMonitorConfig['pricing']> = {}): QuotaMonitorConfig {
  return {
    refresh: { enabled: false, activeMs: 60_000, backgroundMs: 300_000 },
    thresholds: { warningRemaining: 10, criticalRemaining: 2, warningPercentUsed: 80, criticalPercentUsed: 95 },
    detection: { enabled: true },
    pricing: { currency: 'USD', rules: [], imports: [], fuzzyMatch: false, ...overrides },
    budgets: { warningPercent: 80, criticalPercent: 100 },
    monitors: {},
  }
}

/** A reader that answers one document and records nothing else. */
function reader(text: string): (path: string) => Promise<string> {
  return async () => text
}

describe('parsePriceDocument', () => {
  it('reads this plugin\'s own document, including its stated unit', () => {
    const document = parsePriceDocument(JSON.stringify({
      currency: 'CNY',
      rules: [{ provider: 'deepseek', model: 'deepseek-chat', inputPerMillion: 2, outputPerMillion: 3 }],
    }), '/prices.json')

    expect(document.currency).toBe('CNY')
    expect(document.rules).toEqual([
      { provider: 'deepseek', model: 'deepseek-chat', inputPerMillion: 2, outputPerMillion: 3 },
    ])
  })

  it('reads a bare array of rules and leaves the unit to the import entry', () => {
    const document = parsePriceDocument(
      JSON.stringify([{ model: 'glm-4.6', inputPerMillion: 1, outputPerMillion: 2 }]),
      '/prices.json',
      'CNY',
    )

    expect(document.currency).toBe('CNY')
    expect(document.rules).toHaveLength(1)
  })

  it('reads a vendor catalog as USD rules matched by model alone', () => {
    const document = parsePriceDocument(JSON.stringify({
      generatedAt: '2026-10-03',
      providers: {
        openai: {
          models: {
            'gpt-6-astra': { input: 10, output: 50, cachedInput: 1, cacheWrite: 12.5, longContext: { aboveInputTokens: 272_000 } },
            'unpriced-model': { billingMode: 'flat' },
          },
        },
      },
    }), '/catalog.json')

    expect(document.currency).toBe('USD')
    expect(document.rules).toEqual([
      { model: 'gpt-6-astra', inputPerMillion: 10, outputPerMillion: 50, cacheReadPerMillion: 1, cacheWritePerMillion: 12.5 },
    ])
  })

  it('refuses a document that carries neither rules nor a catalog', () => {
    expect(() => parsePriceDocument('{"generatedAt":"2026-10-03"}', '/prices.json'))
      .toThrow(/neither a "rules" array nor a "providers" catalog/)
  })

  it('names the document when it is not valid JSON', () => {
    expect(() => parsePriceDocument('{oops', '/prices.json')).toThrow(/"\/prices\.json" is not valid JSON/)
  })
})

describe('loadPriceTable', () => {
  it('returns nothing when the deployment states no prices at all', async () => {
    await expect(loadPriceTable(config(), reader('[]'))).resolves.toBeUndefined()
  })

  it('keeps stated rules ahead of imported ones and carries the fuzzy choice', async () => {
    const table = await loadPriceTable(config({
      currency: 'USD',
      fuzzyMatch: true,
      rules: [{ model: 'gpt-6-astra', inputPerMillion: 99, outputPerMillion: 99 }],
      imports: [{ path: '/catalog.json' }],
    }), reader(JSON.stringify({ providers: { openai: { models: { 'gpt-6-astra': { input: 10, output: 50 } } } } })))

    expect(table?.fuzzyMatch).toBe(true)
    expect(table?.rules.map(rule => rule.inputPerMillion)).toEqual([99, 10])
  })

  it('refuses to mix units instead of converting them', async () => {
    const mismatched = config({ currency: 'CNY', imports: [{ path: '/catalog.json' }] })
    await expect(loadPriceTable(mismatched, reader(JSON.stringify({ providers: {} }))))
      .rejects.toThrow(/denominated in USD while pricing\.currency is CNY/)
  })

  it('accepts an import entry that states the document unit itself', async () => {
    const cny = config({ currency: 'CNY', imports: [{ path: '/prices.json', currency: 'CNY' }] })
    const table = await loadPriceTable(cny, reader(JSON.stringify({
      rules: [{ model: 'glm-4.6', inputPerMillion: 1, outputPerMillion: 2 }],
    })))

    expect(table?.currency).toBe('CNY')
    expect(table?.rules).toHaveLength(1)
  })
})

describe('normalizeModel', () => {
  it('reduces punctuation, case, and bracketed notes to one comparable form', () => {
    expect(normalizeModel('gpt5.6 luna (go)')).toBe(normalizeModel('GPT-5.6-Luna'))
    expect(normalizeModel('  ')).toBe('')
  })
})
