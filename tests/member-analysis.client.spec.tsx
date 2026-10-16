// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/index.ts'
import { MemberAnalysis } from '../src/client/MemberAnalysis.tsx'
import { en } from '../src/client/locales.ts'
import type { QuotaProviderEntry, QuotaKeyPoint } from '../src/types.ts'
afterEach(cleanup)
const point = (date: string, model: string, factor: number): QuotaKeyPoint => ({ date, model, inputTokens: 10 * factor, outputTokens: 20 * factor, reasoningTokens: 0, cacheReadTokens: 60 * factor, cacheWriteTokens: 10 * factor, totalTokens: 100 * factor, calls: factor })
const provider: QuotaProviderEntry = {
  id: 'team', name: 'Team', mode: 'balance', status: 'ok', adapter: 'stepcode', credentialRefs: ['alice', 'bob'], keyNames: { alice: 'Alice', bob: 'Bob' },
  accounts: [{ id: 'team', name: 'Team', mode: 'balance', status: 'ok', adapter: 'stepcode', credentialRef: 'alice', fetchedAt: 0,
    keyUsage: { days: 62, startDate: '2026-08-15', endDate: '2026-10-15', models: [], daily: [], points: [point('2026-09-20', 'September-model', 3), point('2026-10-10', 'October-model', 1), point('2026-10-15', 'October-model', 2)] } },
  { id: 'team', name: 'Team', mode: 'balance', status: 'ok', adapter: 'stepcode', credentialRef: 'bob', fetchedAt: 0 }],
}
function Harness({ entry = provider }: { entry?: QuotaProviderEntry }) {
  const [credential, setCredential] = useState<string | undefined>('alice')
  return <MemberAnalysis t={makeTranslate(en, commonEn)} providers={[entry]} provider="team" credential={credential} capturedAt={Date.parse('2026-10-15T12:00:00+08:00')} onSelect={(_, ref) => setCredential(ref)} />
}
describe('member analysis', () => {
  it('explains the first upstream failure without inventing token history', () => {
    render(<Harness entry={{ ...provider, accounts: [{ ...provider.accounts[0]!, status: 'unavailable', reason: 'account endpoint returned HTTP 500', keyUsage: undefined }, provider.accounts[1]!] }} />)
    expect(screen.getByRole('status').textContent).toContain('HTTP 500')
    expect(screen.getByRole('status').textContent).toContain('Refresh')
    expect(screen.getByText('No model detail available for this period')).toBeTruthy()
  })
  it('keeps real token totals and labels retained history after a temporary failed refresh', () => {
    const first = provider.accounts[0]!
    render(<Harness entry={{ ...provider, accounts: [{ ...first, status: 'unavailable', reason: 'HTTP 500', keyUsageFetchedAt: Date.parse('2026-10-15T10:00:00+08:00') }, provider.accounts[1]!] }} />)
    expect(screen.getByRole('status').textContent).toContain('Charts retain their last successful data')
    expect(screen.getByRole('status').textContent).toContain('Shanghai time')
    expect(screen.getByRole('img', { name: 'Model usage share: 300' })).toBeTruthy()
  })
  it('changes the period for members and all model buckets together', () => {
    render(<Harness />)
    expect(screen.getByText('Exact model figures').closest('details')!.hasAttribute('open')).toBe(false)
    fireEvent.click(screen.getByText('Exact model figures'))
    const models = () => within(screen.getByRole('table', { name: 'Model usage breakdown' }))
    expect(models().getByText('October-model')).toBeTruthy()
    expect(models().getByText('180')).toBeTruthy()
    expect(models().getByText('60')).toBeTruthy()
    expect(models().getAllByText('30')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Last month', exact: true }))
    expect(models().getByText('September-model')).toBeTruthy()
    expect(screen.queryByText('October-model')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'This week', exact: true }))
    expect(models().getByText('200')).toBeTruthy()
    expect(models().getByText('120')).toBeTruthy()
  })
  it('selects a member without inventing figures for a key with no data', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Bob', exact: true }))
    expect(screen.getByText('No model detail available for this period')).toBeTruthy()
    const row = screen.getByRole('button', { name: 'Bob', exact: true }).closest('li')!
    expect(within(row).getByText('No available detail')).toBeTruthy()
    expect(within(row).getByText('—')).toBeTruthy()
    expect(within(row).queryByText('0')).toBeNull()
  })
  it('labels a partially available last month', () => {
    const first = provider.accounts[0]!
    render(<Harness entry={{ ...provider, accounts: [{ ...first, keyUsage: { ...first.keyUsage!, startDate: '2026-09-16' } }, provider.accounts[1]!] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Last month', exact: true }))
    expect(screen.getByRole('status').textContent).toContain('Missing dates do not mean zero usage')
  })
})

describe('active key overview', () => {
  it('shows the actual active key rather than the selected member or combined totals', () => {
    const bob = { ...provider.accounts[1]!, remaining: 90, used: 10, limit: 100, currency: 'CNY', keyUsage: { ...provider.accounts[0]!.keyUsage!, points: [point('2026-10-15', 'Bobs-model', 7)] } }
    const entry = { ...provider, activeCredentialRef: 'bob', accounts: [provider.accounts[0]!, bob] }
    const props = { t: makeTranslate(en, commonEn), providers: [entry], provider: 'team', credential: 'alice', capturedAt: Date.parse('2026-10-15T12:00:00+08:00'), mode: 'current' as const, onSelect: () => {} }
    const { rerender } = render(<MemberAnalysis {...props} />)
    expect(screen.getByRole('region', { name: 'Active key' })).toBeTruthy()
    expect(screen.getByText('Team · Bob')).toBeTruthy()
    expect(screen.getByText('90 CNY')).toBeTruthy()
    expect(screen.queryByRole('table', { name: 'Member / key' })).toBeNull()
    expect(screen.getByText('Exact model figures').closest('details')!.hasAttribute('open')).toBe(false)
    expect(within(screen.getByRole('region', {name:'Selected model detail'})).getByText('Bobs-model')).toBeTruthy()
    fireEvent.click(screen.getByText('Exact model figures'))
    const models = within(screen.getByRole('table', { name: 'Model usage breakdown' }))
    expect(models.getByText('Bobs-model')).toBeTruthy()
    expect(models.getByText('700')).toBeTruthy()
    expect(screen.queryByText('October-model')).toBeNull()
    rerender(<MemberAnalysis {...props} providers={[{ ...entry, activeCredentialRef: 'alice' }]} />)
    expect(screen.getByText('Team · Alice')).toBeTruthy()
    expect(within(screen.getByRole('table', { name: 'Model usage breakdown' })).getByText('October-model')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Model usage share: 300' })).toBeTruthy()
  })
})
