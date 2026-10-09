import { describe, expect, it } from 'vitest'
import { QuotaCostAccumulator, costOf, priceFor } from '../src/pricing.ts'
import type { QuotaPriceRule, QuotaPriceTable } from '../src/pricing.ts'

/**
 * Pricing regressions: which rule wins for a route and day, what a rule
 * charges, and how an accumulator reports a figure it could only derive in
 * part.
 */

/** A table from rules stated in the order a cordis.yml would list them. */
function table(...rules: QuotaPriceRule[]): QuotaPriceTable {
  return { currency: 'USD', rules, fuzzyMatch: false }
}

/** One million of each counter, so a rate reads straight off the amount. */
const MILLION = Object.freeze({
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
})

describe('priceFor', () => {
  it('reports nothing when no rule covers the route', () => {
    const found = priceFor(table({ provider: 'deepseek', inputPerMillion: 1, outputPerMillion: 2 }),
      'zai', 'glm-4.6', '2026-03-15')
    expect(found).toBeUndefined()
  })

  it('prefers an exact model over a family prefix', () => {
    const found = priceFor(table(
      { model: 'deepseek-*', inputPerMillion: 1, outputPerMillion: 1 },
      { model: 'deepseek-chat', inputPerMillion: 2, outputPerMillion: 2 },
    ), 'deepseek', 'deepseek-chat', '2026-03-15')
    expect(found?.inputPerMillion).toBe(2)
  })

  it('prefers a provider-scoped rule over a catch-all', () => {
    const found = priceFor(table(
      { inputPerMillion: 1, outputPerMillion: 1 },
      { provider: 'deepseek', inputPerMillion: 3, outputPerMillion: 3 },
    ), 'deepseek', 'anything', '2026-03-15')
    expect(found?.inputPerMillion).toBe(3)
  })

  it('matches a family prefix against the model id', () => {
    const rules = table({ model: 'glm-4*', inputPerMillion: 5, outputPerMillion: 5 })
    expect(priceFor(rules, 'zai', 'glm-4.6', '2026-03-15')?.inputPerMillion).toBe(5)
    expect(priceFor(rules, 'zai', 'glm-3', '2026-03-15')).toBeUndefined()
  })

  it('leaves a day before a rule started on the rule in force then', () => {
    const rules = table(
      { model: 'chat', inputPerMillion: 1, outputPerMillion: 1 },
      { model: 'chat', from: '2026-03-10', inputPerMillion: 4, outputPerMillion: 4 },
    )
    expect(priceFor(rules, 'deepseek', 'chat', '2026-03-09')?.inputPerMillion).toBe(1)
    expect(priceFor(rules, 'deepseek', 'chat', '2026-03-10')?.inputPerMillion).toBe(4)
  })

  it('matches a differently punctuated model only when the deployment opts in', () => {
    const rule: QuotaPriceRule = { model: 'gpt-5.6-luna', inputPerMillion: 1, outputPerMillion: 2 }
    const exact: QuotaPriceTable = { currency: 'USD', rules: [rule], fuzzyMatch: false }
    const fuzzy: QuotaPriceTable = { currency: 'USD', rules: [rule], fuzzyMatch: true }

    expect(priceFor(exact, 'pro', 'gpt5.6 luna (go)', '2026-03-15')).toBeUndefined()
    expect(priceFor(fuzzy, 'pro', 'gpt5.6 luna (go)', '2026-03-15')?.inputPerMillion).toBe(1)
  })

  it('prices a route-prefixed model by its leaf when the deployment opted in', () => {
    const rules: QuotaPriceTable = {
      currency: 'USD',
      fuzzyMatch: true,
      rules: [{ model: 'deepseek-v4.1-flash', inputPerMillion: 2, outputPerMillion: 4 }],
    }
    expect(priceFor(rules, 'cline-pass', 'cline-pass/deepseek-v4.1-flash', '2026-03-15')?.inputPerMillion).toBe(2)

    const exact: QuotaPriceTable = { ...rules, fuzzyMatch: false }
    expect(priceFor(exact, 'cline-pass', 'cline-pass/deepseek-v4.1-flash', '2026-03-15')).toBeUndefined()
  })

  it('keeps an exact match ahead of a normalized one', () => {
    const rules: QuotaPriceTable = {
      currency: 'USD',
      fuzzyMatch: true,
      rules: [
        { model: 'gpt-5.6-luna', inputPerMillion: 1, outputPerMillion: 1 },
        { model: 'gpt5.6-luna', inputPerMillion: 7, outputPerMillion: 7 },
      ],
    }
    // The exact pass finds the second rule and never reaches the fuzzy pass.
    expect(priceFor(rules, 'pro', 'gpt5.6-luna', '2026-03-15')?.inputPerMillion).toBe(7)
  })

  it('keeps the later start when two rules of equal reach both apply', () => {
    const rules = table(
      { model: 'chat', from: '2026-03-10', inputPerMillion: 4, outputPerMillion: 4 },
      { model: 'chat', from: '2026-01-01', inputPerMillion: 1, outputPerMillion: 1 },
    )
    expect(priceFor(rules, 'deepseek', 'chat', '2026-03-15')?.inputPerMillion).toBe(4)
  })
})

describe('costOf', () => {
  it('charges input and output at their own rates', () => {
    expect(costOf({ inputPerMillion: 1, outputPerMillion: 2 }, MILLION)).toBe(3)
  })

  it('charges cache tokens at the input rate when no cache rate is stated', () => {
    expect(costOf({ inputPerMillion: 2, outputPerMillion: 0 }, {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    })).toBe(4)
  })

  it('charges each cache bucket at its own stated rate', () => {
    expect(costOf({
      inputPerMillion: 10,
      outputPerMillion: 0,
      cacheReadPerMillion: 0.1,
      cacheWritePerMillion: 1,
    }, {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    })).toBeCloseTo(1.1, 10)
  })
})

describe('QuotaCostAccumulator', () => {
  it('reports nothing at all without a price table', () => {
    const total = new QuotaCostAccumulator(undefined)
    total.add('deepseek', 'chat', '2026-03-15', 2, MILLION)
    expect(total.view()).toBeUndefined()
  })

  it('counts the calls of an unmatched route as unpriced', () => {
    const total = new QuotaCostAccumulator(table({ model: 'chat', inputPerMillion: 1, outputPerMillion: 1 }))
    total.add('deepseek', 'chat', '2026-03-15', 1, MILLION)
    total.add('deepseek', 'mystery', '2026-03-15', 3, MILLION)
    expect(total.view()).toEqual({ amount: 2, currency: 'USD', unpricedCalls: 3 })
  })

  it('folds one scope figure into another', () => {
    const rules = table({ inputPerMillion: 1, outputPerMillion: 1 })
    const day = new QuotaCostAccumulator(rules)
    day.add('deepseek', 'chat', '2026-03-15', 1, MILLION)

    const total = new QuotaCostAccumulator(rules)
    total.addView(day.view())
    total.addView(day.view())
    expect(total.view()).toEqual({ amount: 4, currency: 'USD', unpricedCalls: 0 })
  })

  it('rounds to the precision a per-million rate can express', () => {
    const total = new QuotaCostAccumulator(table({ inputPerMillion: 1, outputPerMillion: 0 }))
    total.add('deepseek', 'chat', '2026-03-15', 1, {
      inputTokens: 1,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(total.view()).toEqual({ amount: 0.000001, currency: 'USD', unpricedCalls: 0 })
  })
})
