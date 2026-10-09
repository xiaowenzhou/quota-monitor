/**
 * Price matching and cost derivation for folded token counters.
 *
 * Prices are configuration, never a shipped table: a relay resells the same
 * model at its own rate, and a stale built-in list would report a confident
 * wrong figure. A deployment states its rules, and a call no rule covers is
 * counted as unpriced rather than charged zero.
 *
 * A rule applies from a local calendar day, and a cost is always derived for
 * the day whose counters it prices, so a price change never re-rates history.
 * @module @deepseek-ai/dsh-extension-quota-monitor/pricing
 */

import type { QuotaCostView } from './types.ts'

/** Tokens divided by this many give the per-rule price unit. */
const PER_UNIT = 1_000_000

/** One configured price, matched against a `provider · model` route and a day. */
export interface QuotaPriceRule {
  /** Provider route this rule prices; absent matches every route. */
  provider?: string
  /**
   * Model this rule prices: an exact id, or a `*`-suffixed prefix such as
   * `deepseek-*`. Absent matches every model on the matched provider.
   */
  model?: string
  /** Local calendar day (`YYYY-MM-DD`) from which the rule applies; absent means always. */
  from?: string
  /** Price of one million uncached input tokens. */
  inputPerMillion: number
  /** Price of one million output tokens, reasoning included. */
  outputPerMillion: number
  /** Price of one million cache-read input tokens; absent charges the input rate. */
  cacheReadPerMillion?: number
  /** Price of one million cache-write input tokens; absent charges the input rate. */
  cacheWritePerMillion?: number
}

/** The configured price rules and the unit they are denominated in. */
export interface QuotaPriceTable {
  /** Unit every rule and every derived figure is denominated in. */
  currency: string
  /** Rules in configuration order; specificity, not order, decides a match. */
  rules: readonly QuotaPriceRule[]
  /**
   * Whether a model no exact or prefix pattern covers may be matched by its
   * normalized id. A normalized hit is an inference about which catalog entry
   * a route means, so a deployment opts in rather than getting it by default.
   */
  fuzzyMatch: boolean
}

/** The four counters a rule prices. */
export interface QuotaPricedCounts {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Whether a rule's model pattern covers one model id. */
function modelMatches(pattern: string | undefined, model: string): boolean {
  if (pattern === undefined) return true
  if (!pattern.endsWith('*')) return pattern === model
  return model.startsWith(pattern.slice(0, -1))
}

/**
 * A model id reduced to the characters two spellings of it share.
 *
 * Vendors, catalogs, and routes punctuate the same model differently —
 * `gpt5.6 luna (go)` and `gpt-5.6-luna` are one model. Bracketed notes are
 * dropped before punctuation, because they qualify a deployment rather than
 * name the model.
 * @param model - the model id to reduce.
 * @returns the comparable form.
 */
export function normalizeModel(model: string): string {
  return model.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '')
}

/** The normalized counterpart of {@link modelMatches}. */
function modelMatchesNormalized(pattern: string | undefined, model: string): boolean {
  if (pattern === undefined) return true
  const subject = normalizeModel(model)
  if (subject === '') return false
  if (!pattern.endsWith('*')) return normalizeModel(pattern) === subject
  const prefix = normalizeModel(pattern.slice(0, -1))
  return prefix !== '' && subject.startsWith(prefix)
}

/**
 * How narrowly a rule names its route. A rule naming both a provider and an
 * exact model outranks one naming a model family, which outranks a
 * provider-wide rule, which outranks a catch-all.
 */
function specificity(rule: QuotaPriceRule): number {
  const provider = rule.provider === undefined ? 0 : 4
  const model = rule.model === undefined ? 0 : rule.model.endsWith('*') ? 1 : 2
  return provider + model
}

/**
 * The rule that prices one route on one day.
 *
 * Ties on specificity go to the latest `from` at or before `day`, so adding a
 * new price leaves earlier days on the rule that was in force then.
 * @param table - the configured price table.
 * @param provider - provider route key of the counters being priced.
 * @param model - model id of the counters being priced.
 * @param day - local calendar day (`YYYY-MM-DD`) the counters belong to.
 * @returns the matching rule, or `undefined` when none covers the route.
 */
export function priceFor(
  table: QuotaPriceTable,
  provider: string,
  model: string,
  day: string,
): QuotaPriceRule | undefined {
  return selectRule(table, provider, model, day, modelMatches)
    ?? (table.fuzzyMatch ? selectRule(table, provider, model, day, modelMatchesNormalized) : undefined)
}

/**
 * The best rule under one model-comparison policy.
 * @param table - the configured price table.
 * @param provider - provider route key.
 * @param model - model id.
 * @param day - local calendar day the counters belong to.
 * @param matches - how a rule's model pattern is compared.
 * @returns the matching rule, or `undefined` when none covers the route.
 */
function selectRule(
  table: QuotaPriceTable,
  provider: string,
  model: string,
  day: string,
  matches: (pattern: string | undefined, model: string) => boolean,
): QuotaPriceRule | undefined {
  let best: QuotaPriceRule | undefined
  for (const rule of table.rules) {
    if (rule.provider !== undefined && rule.provider !== provider) continue
    if (!matches(rule.model, model)) continue
    if (rule.from !== undefined && rule.from > day) continue
    if (best === undefined) {
      best = rule
      continue
    }
    const rank = specificity(rule) - specificity(best)
    if (rank > 0 || (rank === 0 && (rule.from ?? '') >= (best.from ?? ''))) best = rule
  }
  return best
}

/**
 * The amount one rule charges for a set of counters.
 *
 * Cache-read and cache-write tokens fall back to the input rate, because a
 * provider that meters them without publishing a separate price bills them as
 * input.
 * @param rule - the matched rule.
 * @param counts - the token counters to price.
 * @returns the amount in the table's currency.
 */
export function costOf(rule: QuotaPriceRule, counts: QuotaPricedCounts): number {
  const cacheRead = rule.cacheReadPerMillion ?? rule.inputPerMillion
  const cacheWrite = rule.cacheWritePerMillion ?? rule.inputPerMillion
  return (counts.inputTokens * rule.inputPerMillion
    + counts.outputTokens * rule.outputPerMillion
    + counts.cacheReadTokens * cacheRead
    + counts.cacheWriteTokens * cacheWrite) / PER_UNIT
}

/**
 * Accumulates derived spend across one scope, tracking the calls it could not
 * price so the panel can say the amount is partial.
 *
 * Constructed without a table when the deployment configured no prices; every
 * add is then inert and {@link view} reports nothing, which is how a report
 * carries no cost figures at all rather than a column of zeros.
 */
export class QuotaCostAccumulator {
  private amount = 0
  private unpriced = 0

  /** @param table - the price table every added row is matched against, or undefined to derive nothing. */
  constructor(private readonly table: QuotaPriceTable | undefined) {}

  /**
   * Add one day's counters for one route.
   * @param provider - provider route key.
   * @param model - model id.
   * @param day - local calendar day the counters belong to.
   * @param calls - calls behind the counters, counted as unpriced when no rule matches.
   * @param counts - the token counters.
   */
  add(provider: string, model: string, day: string, calls: number, counts: QuotaPricedCounts): void {
    if (this.table === undefined) return
    const rule = priceFor(this.table, provider, model, day)
    if (rule === undefined) {
      this.unpriced += calls
      return
    }
    this.amount += costOf(rule, counts)
  }

  /**
   * Fold another accumulator's totals into this one.
   * @param view - the figure to add, or undefined to add nothing.
   */
  addView(view: QuotaCostView | undefined): void {
    if (this.table === undefined || view === undefined) return
    this.amount += view.amount
    this.unpriced += view.unpricedCalls
  }

  /**
   * The accumulated figure, rounded to the precision a per-million rate needs.
   * @returns the figure, or undefined when no prices were configured.
   */
  view(): QuotaCostView | undefined {
    if (this.table === undefined) return undefined
    return {
      amount: Math.round(this.amount * 1e6) / 1e6,
      currency: this.table.currency,
      unpricedCalls: this.unpriced,
    }
  }
}
