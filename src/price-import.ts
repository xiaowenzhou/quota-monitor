/**
 * Loading price rules from documents a deployment keeps outside the config.
 *
 * A catalog is configuration too, but restating 170 models inline is not how
 * anyone maintains one: this reads a JSON file per configured import, so the
 * file can be replaced (a vendor catalog, a generated table) without touching
 * the profile patch. Two shapes are understood:
 *
 * 1. this plugin's own — `{ currency?, rules: [...] }`, or a bare rule array,
 *    where each rule uses the same field names `pricing.rules` does;
 * 2. the published vendor catalog — `{ providers: { <vendor>: { models: {
 *    <model>: { input, output, cachedInput?, cacheWrite? } } } } }`, whose
 *    amounts are USD per million tokens and whose vendor names are not DSH
 *    route ids, so an imported rule matches by model alone.
 *
 * Amounts are never converted. A document whose unit differs from the
 * configured `pricing.currency` is a configuration error and fails at load,
 * because a silent factor-of-seven mispricing is worse than a refused start.
 * @module @deepseek-ai/dsh-extension-quota-monitor/price-import
 */

import type { QuotaMonitorConfig, QuotaPriceImport } from './config.ts'
import type { QuotaPriceRule, QuotaPriceTable } from './pricing.ts'

/** The unit the published vendor catalog is denominated in. */
const CATALOG_CURRENCY = 'USD'

/** Largest catalog document accepted, so a wrong path cannot exhaust memory. */
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

/** A document, split into the unit it states and the rules it carries. */
interface PriceDocument {
  currency?: string
  rules: QuotaPriceRule[]
}

/** Whether a value is a plain object to index into. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A finite, non-negative price, or undefined. */
function amountOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

/** A non-empty trimmed string, or undefined. */
function textOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * One rule from a document entry, or `undefined` when it prices nothing.
 * @param entry - the candidate rule object.
 * @returns the rule in this plugin's vocabulary.
 */
function ruleOf(entry: unknown): QuotaPriceRule | undefined {
  if (!isRecord(entry)) return undefined
  const inputPerMillion = amountOf(entry['inputPerMillion'])
  const outputPerMillion = amountOf(entry['outputPerMillion'])
  if (inputPerMillion === undefined || outputPerMillion === undefined) return undefined
  const model = textOf(entry['model'])
  const provider = textOf(entry['provider'])
  const from = textOf(entry['from'])
  const cacheReadPerMillion = amountOf(entry['cacheReadPerMillion'])
  const cacheWritePerMillion = amountOf(entry['cacheWritePerMillion'])
  return {
    ...provider === undefined ? {} : { provider },
    ...model === undefined ? {} : { model },
    ...from === undefined ? {} : { from },
    inputPerMillion,
    outputPerMillion,
    ...cacheReadPerMillion === undefined ? {} : { cacheReadPerMillion },
    ...cacheWritePerMillion === undefined ? {} : { cacheWritePerMillion },
  }
}

/**
 * Rules of a published vendor catalog.
 *
 * The catalog states a vendor and a model id per entry, and states no route:
 * the same model is resold under routes whose ids say nothing about the vendor,
 * so an imported rule is matched by model alone. Context-length tiers and
 * off-peak rates the catalog may carry are not modelled here and are ignored.
 * @param providers - the catalog's `providers` object.
 * @returns one rule per priced model.
 */
function catalogRules(providers: Record<string, unknown>): QuotaPriceRule[] {
  const rules: QuotaPriceRule[] = []
  for (const vendor of Object.values(providers)) {
    if (!isRecord(vendor) || !isRecord(vendor['models'])) continue
    for (const [model, entry] of Object.entries(vendor['models'])) {
      if (!isRecord(entry)) continue
      const inputPerMillion = amountOf(entry['input'])
      const outputPerMillion = amountOf(entry['output'])
      if (inputPerMillion === undefined || outputPerMillion === undefined) continue
      const cacheReadPerMillion = amountOf(entry['cachedInput'])
      const cacheWritePerMillion = amountOf(entry['cacheWrite'])
      rules.push({
        model,
        inputPerMillion,
        outputPerMillion,
        ...cacheReadPerMillion === undefined ? {} : { cacheReadPerMillion },
        ...cacheWritePerMillion === undefined ? {} : { cacheWritePerMillion },
      })
    }
  }
  return rules
}

/**
 * Parse one price document.
 *
 * @param text - the document's text.
 * @param path - the path it was read from, named in every error.
 * @param declared - the unit the import entry states, when it states one.
 * @returns the unit the document resolves to and the rules it carries.
 * @throws {Error} when the document is not one of the understood shapes.
 */
export function parsePriceDocument(text: string, path: string, declared?: string): PriceDocument {
  if (text.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`quota monitor: price document "${path}" exceeds ${MAX_DOCUMENT_BYTES} bytes`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(`quota monitor: price document "${path}" is not valid JSON`, { cause: error })
  }

  if (Array.isArray(parsed)) {
    const document: PriceDocument = { rules: rulesFrom(parsed, path) }
    if (declared !== undefined) document.currency = declared
    return document
  }

  if (!isRecord(parsed)) {
    throw new Error(`quota monitor: price document "${path}" must be an object or an array of rules`)
  }

  if (isRecord(parsed['providers'])) {
    return { currency: declared ?? CATALOG_CURRENCY, rules: catalogRules(parsed['providers']) }
  }

  const document: PriceDocument = { rules: rulesFrom(parsed['rules'], path) }
  const unit = textOf(parsed['currency']) ?? declared
  if (unit !== undefined) document.currency = unit
  return document
}

/**
 * Rules from a document's `rules` array.
 * @param value - the candidate array.
 * @param path - the document path, named in the error.
 * @returns the readable rules.
 * @throws {Error} when the value is not an array.
 */
function rulesFrom(value: unknown, path: string): QuotaPriceRule[] {
  if (!Array.isArray(value)) {
    throw new Error(`quota monitor: price document "${path}" carries neither a "rules" array nor a "providers" catalog`)
  }
  const rules: QuotaPriceRule[] = []
  for (const entry of value) {
    const rule = ruleOf(entry)
    if (rule !== undefined) rules.push(rule)
  }
  return rules
}

/**
 * Build the effective price table: configured rules first, then every import.
 *
 * Configured rules keep the tie on an equally specific match, so a deployment
 * can override one model of an imported catalog without restating it.
 * @param config - the plugin configuration.
 * @param readText - reads one document, injected so tests need no filesystem.
 * @returns the table, or `undefined` when the deployment stated no prices at all.
 * @throws {Error} when a document is unreadable, malformed, or denominated in a
 * unit other than the configured currency.
 */
export async function loadPriceTable(
  config: QuotaMonitorConfig,
  readText: (path: string) => Promise<string>,
): Promise<QuotaPriceTable | undefined> {
  const { currency, rules, imports, fuzzyMatch } = config.pricing
  if (rules.length === 0 && imports.length === 0) return undefined

  const imported: QuotaPriceRule[] = []
  for (const source of imports) {
    const document = parsePriceDocument(await readText(source.path), source.path, source.currency)
    assertCurrency(document.currency, source, currency)
    imported.push(...document.rules)
  }
  return {
    currency,
    rules: Object.freeze([...rules, ...imported]),
    fuzzyMatch,
  }
}

/**
 * Refuse an import denominated in another unit.
 * @param stated - the unit the document resolved to, when it resolved to one.
 * @param source - the import entry.
 * @param currency - the configured pricing currency.
 * @throws {Error} when the two disagree.
 */
function assertCurrency(stated: string | undefined, source: QuotaPriceImport, currency: string): void {
  if (stated === undefined || stated.toUpperCase() === currency.toUpperCase()) return
  throw new Error(
    `quota monitor: price document "${source.path}" is denominated in ${stated} while pricing.currency is ${currency}; `
    + 'amounts are never converted — set pricing.currency to the unit the document states, or import a document in that unit',
  )
}
