import { describe, expect, it } from 'vitest'
import { adapterFor } from '../src/adapters/index.ts'
import type { QuotaAdapterContext } from '../src/adapters/index.ts'
import { resolveProviderIdentity } from '../src/identity.ts'

const now = Date.parse('2026-10-14T08:00:00Z')
function context(routes: Record<string, unknown>, baseURL: string): QuotaAdapterContext {
  return { id: 'test', baseURL, apiKey: 'test-key', now: () => now,
    credential: async () => 'test-key',
    fetchImpl: async (input, init) => {
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-key')
      const url = String(input)
      const body = routes[url]
      return Response.json(body ?? {}, { status: body === undefined ? 404 : 200 })
    },
  }
}

describe('new provider quota adapters', () => {
  it('reads Command GOAT key identity, separate windows and API-provided monthly totals', async () => {
    const base = 'https://api.commandcode.ai'
    const reading = await adapterFor('command-code')!.read(context({
      [`${base}/alpha/whoami`]: { user: { name: 'Work Account' }, org: { id: 'org 1' } },
      [`${base}/alpha/billing/credits?orgId=org%201`]: {
        credits: { planId: 'individual-goat', monthlyCredits: 30, monthlyLimit: 70 },
        windowLimits: { fiveHour: { cap: 10, used: 2, resetAt: now + 3600000 }, weekly: { limit: 50, remaining: 10 } },
      },
      [`${base}/alpha/billing/subscriptions?orgId=org%201`]: { data: { currentPeriodEnd: '2026-11-01T00:00:00Z' } },
    }, base))
    expect(reading).toMatchObject({ accountName: 'Work Account', plan: 'GOAT', remaining: 30, currency: 'USD' })
    expect(reading.planWindows).toEqual([
      { kind: 'five-hour', percentUsed: 20, remaining: 8, resetAt: new Date(now + 3600000).toISOString() },
      { kind: 'weekly', percentUsed: 80, remaining: 10 },
      { kind: 'monthly', percentUsed: (70 - 30) / 70 * 100, remaining: 30, resetAt: '2026-11-01T00:00:00.000Z' },
    ])
  })
  it('preserves unknown monthly total and unknown reset dates', async () => {
    const base = 'https://api.commandcode.ai'
    const reading = await adapterFor('command-code')!.read(context({
      [`${base}/alpha/whoami`]: { user: { email: 'user@example.com' } },
      [`${base}/alpha/billing/credits`]: { credits: { planId: 'individual-goat', monthlyCredits: 30 }, windowLimits: { fiveHour: { cap: 10, used: 1 } } },
    }, base))
    expect(reading.planWindows).toEqual([{ kind: 'five-hour', percentUsed: 10, remaining: 9 }])
    expect(reading.remaining).toBe(30)
  })
  it('uses the shared OpenCode usage endpoint for Zen and preserves literal percentages', async () => {
    const reading = await adapterFor('opencode-go')!.read(context({
      'https://opencode.ai/zen/go/v1/usage': { usage: { rolling: { percent: 0.5 }, weekly: { percent: 82 }, monthly: { percent: 12 } } },
    }, 'https://opencode.ai/zen/v1'))
    expect(reading.plan).toBe('Zen')
    expect(reading.planWindows?.map(window => window.percentUsed)).toEqual([0.5, 82, 12])
  })
  it('falls back to OpenRouter per-key limits and label without inventing unlimited credit', async () => {
    const base = 'https://openrouter.ai'
    const finite = await adapterFor('openrouter-balance')!.read(context({ [`${base}/api/v1/key`]: { data: { label: 'Team key', usage: 7, limit: 20, limit_remaining: 13 } } }, base))
    expect(finite).toMatchObject({ accountName: 'Team key', used: 7, remaining: 13, limit: 20 })
    const uncapped = await adapterFor('openrouter-balance')!.read(context({ [`${base}/api/v1/key`]: { data: { label: 'No cap', usage: 7, limit: null, limit_remaining: null } } }, base))
    expect(uncapped.remaining).toBeUndefined()
    expect(uncapped.unlimited).toBeUndefined()
  })
  it.each(['command', 'commandcode', 'command-code', 'command-goat'])('recognizes Command route %s', id => {
    expect(resolveProviderIdentity(id, undefined).adapter).toBe('command-code')
  })
  it.each(['opencode', 'opencode-go', 'opencode-zen'])('recognizes OpenCode route %s', id => {
    expect(resolveProviderIdentity(id, undefined).adapter).toBe('opencode-go')
  })
})
