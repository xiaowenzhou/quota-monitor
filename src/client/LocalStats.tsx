import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { QuotaExportDocument, QuotaExportKind, QuotaUsageReport } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { TotalsRow } from './TotalsRow.tsx'
import { ModelUsage } from './ModelUsage.tsx'
import { ProviderUsage } from './ProviderUsage.tsx'
import { UsageHeatmap } from './UsageHeatmap.tsx'
import { DayBreakdown } from './DayBreakdown.tsx'
import { SessionList } from './SessionList.tsx'
import { ExportBar } from './ExportBar.tsx'
import css from './LocalStats.module.css'

export interface LocalStatsProps {
  t: QuotaTranslate
  usage: QuotaUsageReport | undefined
  allUsage: QuotaUsageReport | undefined
  names: Readonly<Record<string, string>>
  provider: string | undefined
  scopeName: string | undefined
  month: string | undefined
  selectedDay: string | undefined
  onSelectDay: (date: string) => void
  onMonthChange: (month: string) => void
  onExport: (kind: QuotaExportKind) => Promise<QuotaExportDocument | undefined>
  onReset: () => void
}

/** Local accounting keeps its own surfaces while the panel owns its selection. */
export function LocalStats({
  t, usage, allUsage, names, provider, scopeName, month, selectedDay,
  onSelectDay, onMonthChange, onExport, onReset,
}: LocalStatsProps): ReactNode {
  const days = usage?.days ?? []
  const selected = days.find(day => day.date === selectedDay)

  return <div className={css.stack}>
    <section className={css.section}>
      <div className={css.sectionHead}>
        <div className={css.headingGroup}>
          <h2 className={css.sectionTitle}>{t('usage.heading')}</h2>
          {scopeName === undefined ? null : <span className={css.sectionMeta}>
            {t('usage.scope', { provider: scopeName })}
          </span>}
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>{t('action.reset')}</Button>
      </div>
      <TotalsRow t={t} usage={usage} />
    </section>

    <section className={css.section}>
      <ModelUsage t={t} models={usage?.models ?? []} names={names} />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('provider.heading')}</h2>
        <span className={css.sectionMeta}>{t('provider.hint')}</span>
      </div>
      <ProviderUsage
        t={t} providers={allUsage?.providers ?? []} names={names} selected={provider}
        allTimeTokens={allUsage?.allTimeTotals.totalTokens ?? 0}
        todayTokens={allUsage?.todayTotals.totalTokens ?? 0}
        monthTokens={allUsage?.monthTotals.totalTokens ?? 0}
      />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('heatmap.heading')}</h2>
      </div>
      <UsageHeatmap
        t={t} days={days} month={month} today={usage?.today} selected={selectedDay}
        onSelect={onSelectDay} onMonthChange={onMonthChange}
      />
    </section>

    <DayBreakdown t={t} date={selectedDay} day={selected} />

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('session.heading')}</h2>
      </div>
      <SessionList t={t} sessions={usage?.sessions ?? []} />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('export.heading')}</h2>
      </div>
      <ExportBar t={t} onExport={onExport} />
    </section>
  </div>
}
