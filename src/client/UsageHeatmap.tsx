/**
 * The month calendar: one cell per day of the shown month, shaded by that
 * day's token total and labelled with its day number, with month navigation
 * and day selection.
 *
 * The calendar is built from the month string alone, so a month with 28, 30,
 * or 31 days and any leading weekday renders without a special case.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsageHeatmap
 */

import { useMemo } from 'react'
import type { QuotaDayUsage } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtNumber, fmtTokens } from './format.ts'
import css from './UsagePanel.module.css'

/** Shading steps, from no usage to the month's own maximum. */
const LEVELS = 5

/** Weekday headers, starting on Monday to match the cell order. */
const WEEKDAYS = Object.freeze([
  'weekday.mon',
  'weekday.tue',
  'weekday.wed',
  'weekday.thu',
  'weekday.fri',
  'weekday.sat',
  'weekday.sun',
] as const)

/** One calendar cell: a day of the shown month, or a leading blank. */
interface Cell {
  date?: string
  day: number
  totalTokens: number
  calls: number
}

/** Days in one `YYYY-MM` month, and the weekday its first day falls on. */
function calendarOf(month: string): { days: number; leading: number } {
  const [year = 0, index = 1] = month.split('-').map(Number)
  // Day 0 of the next month is the last day of this one, which is how the
  // length comes out right for February in a leap year.
  const days = new Date(year, index, 0).getDate()
  // Columns start on Monday, so Sunday (0) moves to the last column.
  const weekday = new Date(year, index - 1, 1).getDay()
  return { days, leading: (weekday + 6) % 7 }
}

/** The month before or after `month`, as `YYYY-MM`. */
function shiftMonth(month: string, delta: number): string {
  const [year = 0, index = 1] = month.split('-').map(Number)
  const shifted = new Date(year, index - 1 + delta, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`
}

/** The calendar's props. */
export interface UsageHeatmapProps {
  t: QuotaTranslate
  days: readonly QuotaDayUsage[]
  month: string | undefined
  /** The report's own today, so the current day is outlined without a second clock. */
  today: string | undefined
  selected: string | undefined
  onSelect: (date: string) => void
  onMonthChange: (month: string) => void
}

export function UsageHeatmap({
  t, days, month, today, selected, onSelect, onMonthChange,
}: UsageHeatmapProps) {
  const byDate = useMemo(() => new Map(days.map(day => [day.date, day])), [days])

  const cells = useMemo<Cell[]>(() => {
    if (month === undefined) return []
    const { days: count, leading } = calendarOf(month)
    const rows: Cell[] = Array.from({ length: leading }, () => ({ day: 0, totalTokens: 0, calls: 0 }))
    for (let index = 1; index <= count; index += 1) {
      const date = `${month}-${String(index).padStart(2, '0')}`
      const usage = byDate.get(date)
      rows.push({ date, day: index, totalTokens: usage?.totalTokens ?? 0, calls: usage?.calls ?? 0 })
    }
    return rows
  }, [month, byDate])

  // Shading is relative to the shown month's own peak: a quiet month still
  // shows its own variation instead of collapsing to one flat colour.
  const peak = useMemo(
    () => cells.reduce((highest, cell) => Math.max(highest, cell.totalTokens), 0),
    [cells],
  )

  if (month === undefined) return <p className={css.empty}>{t('usage.empty')}</p>

  return <div className={css.calendar}>
    <div className={css.calendarHead}>
      <button
        type="button"
        className={css.navButton}
        aria-label={t('heatmap.prev')}
        onClick={() =>{  onMonthChange(shiftMonth(month, -1)) }}
      >‹</button>
      <span className={css.calendarMonth}>{month}</span>
      <button
        type="button"
        className={css.navButton}
        aria-label={t('heatmap.next')}
        onClick={() =>{  onMonthChange(shiftMonth(month, 1)) }}
      >›</button>
    </div>

    <div className={css.weekdayRow} aria-hidden="true">
      {WEEKDAYS.map(key => <span key={key} className={css.weekday}>{t(key)}</span>)}
    </div>

    <div className={css.monthGrid}>
      {cells.map((cell, index) => {
        if (cell.date === undefined) {
          return <span key={`blank-${index}`} className={css.dayBlank} aria-hidden="true" />
        }
        const level = peak <= 0 || cell.totalTokens <= 0
          ? 0
          : Math.max(1, Math.ceil((cell.totalTokens / peak) * (LEVELS - 1)))
        const label = cell.totalTokens > 0
          ? t('heatmap.day', {
            date: cell.date,
            tokens: fmtTokens(cell.totalTokens),
            calls: fmtNumber(cell.calls),
          })
          : t('heatmap.dayEmpty', { date: cell.date })
        const date = cell.date
        return <button
          key={date}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={selected === date}
          data-level={level}
          className={[
            css.dayCell,
            selected === date ? css.dayCellActive : '',
            date === today ? css.dayCellToday : '',
          ].filter(name => name !== '').join(' ')}
          onClick={() =>{  onSelect(date) }}
        >
          <span className={css.dayNumber}>{cell.day}</span>
          {cell.totalTokens > 0
            ? <span className={css.dayTokens}>{fmtTokens(cell.totalTokens)}</span>
            : null}
        </button>
      })}
    </div>

    <div className={css.legend}>
      <span>{t('heatmap.less')}</span>
      {Array.from({ length: LEVELS }, (_, level) =>
        <span key={level} data-level={level} className={css.legendCell} aria-hidden="true" />)}
      <span>{t('heatmap.more')}</span>
    </div>
  </div>
}
