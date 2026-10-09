import { describe, expect, it } from 'vitest'
import { siblingStatesAllowance } from '../src/client/yield.ts'

/**
 * Seat arbitration: when does this plugin's composer pill stand down?
 *
 * The composer's tool row is a list another plugin may already occupy with its
 * own allowance chip, and two chips stating one route's windows is noise. The
 * decision is a pure one so the convention is testable without a renderer.
 */

const SELF = 'quota-monitor-pill'

describe('siblingStatesAllowance', () => {
  it('yields to a provider plugin\'s own usage chip', () => {
    // `dsh-cline-pass` publishes exactly this entry.
    expect(siblingStatesAllowance(['cline-pass-usage'], SELF)).toBe(true)
    expect(siblingStatesAllowance(['other', 'cline-pass-usage'], SELF)).toBe(true)
  })

  it('keeps the seat when nothing else states an allowance', () => {
    expect(siblingStatesAllowance([], SELF)).toBe(false)
    expect(siblingStatesAllowance(['attachments', 'plan-control'], SELF)).toBe(false)
  })

  it('never treats this plugin\'s own entry as a rival', () => {
    expect(siblingStatesAllowance([SELF], SELF)).toBe(false)
  })

  it('matches the word as a segment, not as a substring', () => {
    // A word glued into a longer one names nothing: only a whole segment counts.
    expect(siblingStatesAllowance(['myquotathing'], SELF)).toBe(false)
    // A leading `usage` segment is a chip whose id says so, whatever follows it.
    expect(siblingStatesAllowance(['usage-hint'], SELF)).toBe(true)
    // Each accepted spelling, in each position a segment can take.
    expect(siblingStatesAllowance(['usage'], SELF)).toBe(true)
    expect(siblingStatesAllowance(['x.balance'], SELF)).toBe(true)
    expect(siblingStatesAllowance(['quota_chip'], SELF)).toBe(true)
  })
})
