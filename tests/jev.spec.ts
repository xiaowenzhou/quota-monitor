import { describe, expect, it } from 'vitest'
import { chooseWithJev } from '../src/routing.ts'
import { Config } from '../src/config.ts'

const candidates = [{ ref: 'PRIVATE_KEY_A', headroom: 0.9 }, { ref: 'PRIVATE_KEY_B', headroom: 0.7 }]
const config = Config({}).routing

describe('Jev decisions', () => {
  it('sends anonymous quota metadata and maps only a listed, confident choice', async () => {
    let request = ''
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toBe('https://openrouter.ai/api/alpha/decisions')
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer jev-secret')
      request = String(init?.body)
      return Response.json({ answers: { route: { choice: 'key_1', confidence: 0.98 } } })
    }
    expect(await chooseWithJev(candidates, 'jev-secret', config, fetchImpl)).toBe('PRIVATE_KEY_B')
    expect(request).not.toContain('PRIVATE_KEY')
    expect(request).not.toContain('jev-secret')
    expect(JSON.parse(request)).toMatchObject({ model: 'typesafe/jev-1.13', state: { candidates: { key_0: { headroom: 0.9 } } } })
  })
  it.each([
    { answers: { route: { choice: 'key_0', confidence: 0.01 } } },
    { answers: { route: { choice: 'PRIVATE_KEY_A', confidence: 1 } } },
    { answers: { route: { choice: 'key_99', confidence: 1 } } },
    { answers: { route: { choice: 'key_0', confidence: 2 } } },
    {},
  ])('falls back on invalid or uncertain answers %#', async body => {
    expect(await chooseWithJev(candidates, 'secret', config, async () => Response.json(body))).toBeUndefined()
  })
  it('falls back on unavailable service and skips a decision for a single healthy key', async () => {
    expect(await chooseWithJev(candidates, 'secret', config, async () => { throw new Error('timeout') })).toBeUndefined()
    expect(await chooseWithJev(candidates.slice(0, 1), 'secret', config, async () => { throw new Error('must not call') })).toBe('PRIVATE_KEY_A')
  })
})
