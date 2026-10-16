import { useState } from 'react'
import type { QuotaKeyDayUsage, QuotaKeyModelUsage, QuotaKeyWindow } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import type { DateRange } from './key-usage-period.ts'
import { fmtNumber, fmtPercent, fmtTokens } from './format.ts'
import css from './UsageCharts.module.css'

interface Slice { label: string; value: number; color: string }
const colors = ['#4f8ff7', '#20b8a5', '#a184ed', '#f0ae47', '#e9798c', '#60b8dc', '#9fb168']
function modelColor(index: number): string {
  return `hsl(${(210 + Math.max(0, index) * 137.508) % 360} 65% 60%)`
}
const bucketKeys = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'] as const
const bucketLabels = ['usage.input', 'usage.output', 'usage.cacheRead', 'usage.cacheWrite'] as const

/** Legends support keyboard/touch; hover highlights slices while the centre keeps the total. */
function Donut({ title, slices, t, available, reportedTotal, onInspect }: { title: string; slices: Slice[]; t: QuotaTranslate; available: boolean; reportedTotal?: number; onInspect?: (label:string) => void }) {
  const [highlight, setHighlight] = useState<string | undefined>()
  const inspect = (label: string) => { setHighlight(label); onInspect?.(label) }
  const clear = () => { if (!onInspect) setHighlight(undefined) }
  const total = reportedTotal ?? slices.reduce((sum, slice) => sum + slice.value, 0)
  const selected = slices.find(slice => slice.label === highlight)
  let offset = 0
  return <figure className={css.chart} aria-label={title}>
    <figcaption className={css.heading}>{title}</figcaption>
    <div className={css.donutBody}>
      <div className={css.ring}>
        <svg viewBox="0 0 160 160" role="img" aria-label={`${title}: ${available ? fmtNumber(total) : t('analysis.unavailable')}`}>
          <circle cx="80" cy="80" r="64" fill="none" className={css.track} strokeWidth="15" />
          {slices.map(slice => {
            const share = total > 0 ? slice.value / total * 100 : 0
            const start = offset
            offset += share
            return share > 0 && <circle key={slice.label} cx="80" cy="80" r="64" fill="none" stroke={slice.color} strokeWidth={15} pathLength="100"
              strokeDasharray={`${Math.max(0, share - Math.min(0.75, share / 4))} ${100 - Math.max(0, share - Math.min(0.75, share / 4))}`} strokeDashoffset={-start} transform="rotate(-90 80 80)"
              opacity={selected && selected.label !== slice.label ? 0.35 : 1}
              onMouseEnter={() => inspect(slice.label)} onMouseLeave={clear}>
              <title>{slice.label}: {fmtNumber(slice.value)} · {fmtPercent(share)}</title>
            </circle>
          })}
        </svg>
        <div className={css.center} aria-live="polite"><strong>{available ? fmtTokens(total) : '—'}</strong><span>{t('analysis.tokens')}</span></div>
      </div>
      <div className={css.legend}>
        {available && slices.some(slice => slice.value > 0) ? slices.filter(slice => slice.value > 0).map(slice => <button key={slice.label} type="button" className={css.legendRow} aria-pressed={highlight === slice.label}
          onMouseEnter={() => inspect(slice.label)} onMouseLeave={clear} onFocus={() => inspect(slice.label)} onBlur={clear}
          onClick={() => inspect(slice.label)}>
          <i className={css.swatch} style={{ background: slice.color }} aria-hidden="true" />
          <span className={css.legendName} title={slice.label}>{slice.label}</span>
          <span className={css.legendValue} title={fmtNumber(slice.value)}>{fmtTokens(slice.value)}</span>
          <span className={css.legendShare}>{fmtPercent(slice.value / total * 100)}</span>
        </button>) : <p className={css.empty}>{t(!available ? 'analysis.unavailable' : total > 0 ? 'charts.breakdownUnavailable' : 'charts.zero')}</p>}
      </div>
    </div>
  </figure>
}

/** Include calendar gaps so adjacent bars never conceal idle or unavailable days. */
export function calendarSeries(daily: readonly QuotaKeyDayUsage[], range: DateRange, availableStart: string | undefined, availableEnd: string | undefined) {
  const byDate = new Map(daily.map(day => [day.date, day.totalTokens]))
  const series: { date: string; value: number | undefined }[] = []
  for (let stamp = Date.parse(`${range.start}T00:00:00Z`); stamp <= Date.parse(`${range.end}T00:00:00Z`); stamp += 86_400_000) {
    const date = new Date(stamp).toISOString().slice(0, 10)
    const known = availableStart !== undefined && availableEnd !== undefined && date >= availableStart && date <= availableEnd
    series.push({ date, value: byDate.get(date) ?? (known ? 0 : undefined) })
  }
  return series
}

export function UsageCharts({ t, totals, models, daily, range, startDate, endDate, modelNames = [] }: {
  t: QuotaTranslate
  totals: QuotaKeyWindow | undefined
  models: readonly QuotaKeyModelUsage[]
  daily: readonly QuotaKeyDayUsage[]
  range: DateRange
  startDate: string | undefined
  endDate: string | undefined
  modelNames?: readonly string[]
}) {
  // Window bounds alone do not prove that daily detail was supplied.
  const dailyComplete = totals !== undefined && daily.reduce((sum, day) => sum + day.totalTokens, 0) === totals.totalTokens
  const series = calendarSeries(daily, range, dailyComplete ? startDate : undefined, dailyComplete ? endDate : undefined)
  const max = Math.max(1, ...series.map(day => day.value ?? 0))
  const peak = series.reduce<(typeof series)[number] | undefined>((peak, day) => day.value !== undefined && day.value > (peak?.value ?? 0) ? day : peak, undefined)
  const [hovered, setHovered] = useState<string | undefined>()
  const focusDay = series.find(day => day.date === hovered)
  const tokenSlices = bucketKeys.map((key, i) => ({ label: t(bucketLabels[i]!), value: totals?.[key] ?? 0, color: colors[i]! }))
  const bucketSum = tokenSlices.reduce((sum, slice) => sum + slice.value, 0)
  const tokenTotal = totals?.totalTokens ?? 0
  if (bucketSum < tokenTotal) tokenSlices.push({ label: t('charts.unclassified'), value: tokenTotal - bucketSum, color: '#8e9aaa' })
  // An inconsistent breakdown cannot be normalized as though it were the total.
  if (bucketSum > tokenTotal) tokenSlices.length = 0
  // Use the whole provider model catalogue, so period/member switches preserve colours.
  const catalog = modelNames.length ? modelNames : models.map(model => model.model).sort()
  const sorted = [...models].sort((a, b) => b.totalTokens - a.totalTokens)
  const modelSlices = sorted.map(model => ({ label: model.model, value: model.totalTokens, color: modelColor(catalog.indexOf(model.model)) }))
  const [inspectedModel, setInspectedModel] = useState<string | undefined>()
  const modelDetail = sorted.find(model => model.model === inspectedModel) ?? sorted[0]
  const modelTotal = sorted.reduce((sum, model) => sum + model.totalTokens, 0)
  return <div className={css.dashboard}>
    <div className={css.chartPair}>
      <Donut title={t('charts.tokens')} slices={tokenSlices} available={totals !== undefined} t={t} {...totals === undefined ? {} : { reportedTotal: totals.totalTokens }} />
      <Donut title={t('charts.models')} slices={modelSlices} available={models.some(model => model.totalTokens > 0) || totals?.totalTokens === 0} t={t} onInspect={setInspectedModel} />
    </div>
    {modelDetail && <section className={css.modelDetail} aria-label={t('charts.modelDetail')}>
      <div className={css.detailHead}><h4><i className={css.swatch} style={{background:modelColor(catalog.indexOf(modelDetail.model))}} />{modelDetail.model}</h4><span>{fmtPercent(modelTotal > 0 ? modelDetail.totalTokens / modelTotal * 100 : undefined)} · {t('charts.inspect')}</span></div>
      <div className={css.detailMetrics}>
        <div><span>{t('analysis.tokens')}</span><strong title={fmtNumber(modelDetail.totalTokens)}>{fmtTokens(modelDetail.totalTokens)}</strong></div>
        <div><span>{t('analysis.calls')}</span><strong>{fmtNumber(modelDetail.calls)}</strong></div>
        {bucketKeys.map((key, index) => <div key={key}><span><i className={css.swatch} style={{background:colors[index]}} />{t(bucketLabels[index]!)}</span><strong title={fmtNumber(modelDetail[key])}>{fmtTokens(modelDetail[key])}</strong></div>)}
      </div>
    </section>}
    {totals !== undefined && models.length > 0 && models.reduce((sum, model) => sum + model.totalTokens, 0) !== totals.totalTokens && <p className={css.empty}>{t('charts.modelsPartial')}</p>}
    <figure className={css.chart} aria-label={t('charts.trend')}>
      <div className={css.trendHead}><figcaption className={css.heading}>{t('charts.trend')}</figcaption>
        <span className={css.trendValue}>{focusDay ? `${focusDay.date} · ${focusDay.value === undefined ? t('analysis.unavailable') : fmtTokens(focusDay.value)}` : peak ? `${t('charts.peak')} ${peak.date} · ${fmtTokens(peak.value)}` : t(series.every(day => day.value === 0) ? 'charts.zero' : 'analysis.unavailable')}</span>
      </div>
      <div className={css.plot} role="group" aria-label={t('charts.trend')}>
        <div className={css.grid} aria-hidden="true"><span>{fmtTokens(max === 1 ? 0 : max)}</span><span>{fmtTokens(max === 1 ? 0 : max / 2)}</span><span>0</span></div>
        <div className={css.bars}>{series.map(day => <button key={day.date} type="button" className={`${css.barSlot} ${day.value === undefined ? css.unknown : ''}`} title={`${day.date}: ${day.value === undefined ? t('analysis.unavailable') : fmtNumber(day.value)}`} aria-label={`${day.date}: ${day.value === undefined ? t('analysis.unavailable') : `${fmtNumber(day.value)} tokens`}`}
          onMouseEnter={() => setHovered(day.date)} onMouseLeave={() => setHovered(undefined)} onFocus={() => setHovered(day.date)} onBlur={() => setHovered(undefined)} onClick={() => setHovered(day.date)}>
          <span className={css.bar} style={{ height: `${day.value === undefined ? 0 : day.value / max * 100}%` }} />
        </button>)}</div>
      </div>
      <div className={css.axis}><span>{range.start}</span><span>{range.end}</span></div>
      {series.some(day => day.value === undefined) && <p className={css.empty}>{t('charts.unknownDays')}</p>}
    </figure>
  </div>
}
