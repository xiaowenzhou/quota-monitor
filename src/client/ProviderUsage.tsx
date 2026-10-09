/**
 * The provider breakdown: folded token totals per provider route, so a
 * deployment can see which route spent them instead of one combined figure.
 *
 * The report carries route keys only, so a route the snapshot knows is labelled
 * with its display name and an unknown one falls back to the key itself.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ProviderUsage
 */

import type { QuotaProviderUsage } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtCost, fmtNumber, fmtPercent, fmtTokens } from './format.ts'
import css from './UsagePanel.module.css'

/** The breakdown's props. */
export interface ProviderUsageProps {
  t: QuotaTranslate
  providers: readonly QuotaProviderUsage[]
  /** Route key → display name, for the routes the snapshot knows. */
  names: Readonly<Record<string, string>>
  /** All-time tokens across every route, the denominator of each share. */
  totalTokens: number
}

/** One route's row: the row itself plus what labels and scales it. */
interface ProviderRowProps {
  t: QuotaTranslate
  provider: QuotaProviderUsage
  names: Readonly<Record<string, string>>
  totalTokens: number
}

/**
 * Render one route's row: its figures, its share of all tokens, and its spend.
 * @param props - the row and the labels it is rendered with.
 * @returns the row element.
 */
function ProviderRow({ t, provider, names, totalTokens }: ProviderRowProps) {
  const name = names[provider.provider]
  const share = totalTokens <= 0 ? 0 : Math.round((provider.totalTokens / totalTokens) * 1000) / 10
  const meta = [
    t('provider.meta', {
      calls: fmtNumber(provider.calls),
      models: fmtNumber(provider.models),
    }),
    t('provider.today', { tokens: fmtTokens(provider.todayTokens) }),
    provider.cacheHitPercent === undefined
      ? undefined
      : t('provider.cache', { percent: fmtPercent(provider.cacheHitPercent) }),
    t('provider.lastDay', { date: provider.lastDay }),
  ].filter(part => part !== undefined)

  return <div className={css.providerRow}>
    <div className={css.providerHead}>
      <span className={css.providerName}>{name ?? provider.provider}</span>
      {name === undefined ? null : <span className={css.providerId}>{provider.provider}</span>}
      <span className={css.providerTokens}>{fmtTokens(provider.totalTokens)}</span>
    </div>
    <div className={css.bar}>
      <div className={css.barFill} style={{ width: `${Math.min(100, share)}%` }} />
    </div>
    <div className={css.providerFoot}>
      <span className={css.providerShare}>{t('provider.share', { percent: fmtPercent(share) })}</span>
      {provider.cost === undefined ? null : <span className={css.providerCost}>{fmtCost(provider.cost)}</span>}
    </div>
    <span className={css.providerMeta}>{meta.join(' · ')}</span>
  </div>
}

export function ProviderUsage({ t, providers, names, totalTokens }: ProviderUsageProps) {
  if (providers.length === 0) return <p className={css.empty}>{t('provider.empty')}</p>

  return <div className={css.providerList}>
    {providers.map(provider => <ProviderRow
      key={provider.provider}
      t={t}
      provider={provider}
      names={names}
      totalTokens={totalTokens}
    />)}
  </div>
}
