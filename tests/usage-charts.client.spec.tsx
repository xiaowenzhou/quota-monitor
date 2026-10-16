// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/index.ts'
import { UsageCharts, calendarSeries } from '../src/client/UsageCharts.tsx'
import { en } from '../src/client/locales.ts'
import type { QuotaKeyWindow } from '../src/types.ts'
afterEach(cleanup)
const totals: QuotaKeyWindow = { inputTokens: 10, outputTokens: 20, reasoningTokens: 5, cacheReadTokens: 60, cacheWriteTokens: 10, totalTokens: 100 }
const range = { start: '2026-10-01', end: '2026-10-03' }
const props = { t: makeTranslate(en, commonEn), totals, models: [{ ...totals, model: 'Model A' }], daily: [{ ...totals, date: '2026-10-02' }], range, startDate: range.start, endDate: range.end }
describe('usage charts', () => {
  it('shows four exclusive token buckets and supports keyboard/touch highlighting', () => {
    render(<UsageCharts {...props} />)
    const token = within(screen.getByRole('figure', { name: 'Token composition' }))
    expect(token.getByRole('img', { name: 'Token composition: 100' })).toBeTruthy()
    const read = token.getByRole('button', { name: /Cache read.*60.*60.0%/ })
    fireEvent.focus(read)
    expect(read.getAttribute('aria-pressed')).toBe('true')
    expect(token.getAllByText('100').length).toBeGreaterThan(0)
    fireEvent.blur(read)
    expect(read.getAttribute('aria-pressed')).toBe('false')
    const output = token.getByRole('button', { name: /Output.*20.*20.0%/ })
    fireEvent.click(output)
    expect(output.getAttribute('aria-pressed')).toBe('true')
    expect(token.queryByText('Reasoning')).toBeNull()
  })
  it('keeps every model individually inspectable and shows its own calls and buckets', () => {
    render(<UsageCharts {...props} models={Array.from({length:7}, (_,i)=>({ ...totals, calls:i + 1, model:`Model ${i}`, totalTokens:1000 }))} />)
    const models = within(screen.getByRole('figure', { name: 'Model usage share' }))
    expect(models.getByRole('img', { name: 'Model usage share: 7,000' })).toBeTruthy()
    expect(models.getAllByRole('button')).toHaveLength(7)
    const last = models.getByRole('button', {name:/Model 6/})
    fireEvent.focus(last)
    const detail = within(screen.getByRole('region', {name:'Selected model detail'}))
    expect(detail.getByText('Model 6')).toBeTruthy()
    expect(detail.getByText('7')).toBeTruthy()
    expect(detail.getByText('60')).toBeTruthy()
    expect(detail.getAllByText('10')).toHaveLength(2)
    fireEvent.click(models.getByRole('button', {name:/Model 1/}))
    expect(detail.getByText('Model 1')).toBeTruthy()
    expect(detail.getByText('2')).toBeTruthy()
    fireEvent.mouseEnter(screen.getByRole('figure', {name:'Model usage share'}).querySelector('circle[stroke-dasharray]')!)
    expect(detail.getByText('Model 0')).toBeTruthy()
  })
  it('refreshes inspected model detail when the member or period changes', () => {
    const {rerender} = render(<UsageCharts {...props} />)
    fireEvent.mouseEnter(within(screen.getByRole('figure',{name:'Model usage share'})).getByRole('button',{name:/Model A/}))
    rerender(<UsageCharts {...props} models={[{...totals,model:'Model B',calls:9,cacheReadTokens:123}]} />)
    const detail = within(screen.getByRole('region',{name:'Selected model detail'}))
    expect(detail.getByText('Model B')).toBeTruthy()
    expect(detail.queryByText('Model A')).toBeNull()
    expect(detail.getByText('123')).toBeTruthy()
    expect(detail.getByText('9')).toBeTruthy()
  })
  it('keeps unavailable data distinct from a known zero period', () => {
    const { rerender } = render(<UsageCharts {...props} totals={undefined} models={[]} daily={[]} />)
    expect(screen.getByRole('img', { name: 'Token composition: No available detail' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '2026-10-01: No available detail' })).toBeTruthy()
    rerender(<UsageCharts {...props} totals={{...totals, inputTokens:0, outputTokens:0, cacheReadTokens:0, cacheWriteTokens:0, totalTokens:0}} models={[]} daily={[]} />)
    expect(screen.getByRole('img', { name: 'Token composition: 0' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '2026-10-01: 0 tokens' })).toBeTruthy()
  })
  it('preserves nonzero totals when the API does not provide bucket or daily details', () => {
    const reported = {...totals, inputTokens:0, outputTokens:0, cacheReadTokens:0, cacheWriteTokens:0}
    render(<UsageCharts {...props} totals={reported} models={[]} daily={[]} />)
    expect(screen.getByRole('img', {name:'Token composition: 100'})).toBeTruthy()
    expect(screen.getByRole('button', {name:/Unclassified.*100.*100.0%/})).toBeTruthy()
    expect(screen.getByRole('button', {name:'2026-10-02: No available detail'})).toBeTruthy()
    expect(within(screen.getByRole('figure', {name:'Daily usage trend'})).queryByText('No usage in this period')).toBeNull()
  })
  it('preserves calendar gaps and distinguishes dates outside the available window', () => {
    expect(calendarSeries(props.daily, range, '2026-10-02', '2026-10-03')).toEqual([
      {date:'2026-10-01',value:undefined}, {date:'2026-10-02',value:100}, {date:'2026-10-03',value:0},
    ])
  })
})
