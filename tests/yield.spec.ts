import { describe, expect, it } from 'vitest'
import { PILL_ID, rivalStatesRoute } from '../src/client/yield.ts'

/**
 * Seat arbitration: when does this plugin's composer pill stand down?
 *
 * The composer's tool row is a list a provider plugin may already occupy with
 * its own allowance chip. That chip registers unconditionally and renders
 * nothing unless the selected route is its own, so the decision is scoped to the
 * selected route and is a pure function of the seat's ids plus that route —
 * testable without a renderer.
 */

const SELF = PILL_ID
const CLINE = 'cline-pass'

describe('rivalStatesRoute', () => {
  it('stands down when the rival chip speaks for the selected route', () => {
    // This is the case the whole rule exists for: with cline-pass selected, its
    // own chip states the windows and a second reading of them is noise.
    expect(rivalStatesRoute(['cline-pass-usage'], SELF, CLINE)).toBe(true)
    expect(rivalStatesRoute(['other', 'cline-pass-usage'], SELF, CLINE)).toBe(true)
  })

  it('keeps the seat while the rival chip stays silent about the route', () => {
    // The regression this rule replaced: `cline-pass-usage` is registered for
    // every route and renders `null` for all of them but its own. Judging by
    // presence alone would have retired this pill on every provider.
    expect(rivalStatesRoute(['cline-pass-usage'], SELF, 'cline')).toBe(false)
    expect(rivalStatesRoute(['cline-pass-usage'], SELF, 'ktc-claude')).toBe(false)
    expect(rivalStatesRoute(['cline-pass-usage'], SELF, 'deepseek-official')).toBe(false)
  })

  it('keeps the seat when nothing else states an allowance', () => {
    expect(rivalStatesRoute([], SELF, CLINE)).toBe(false)
    expect(rivalStatesRoute(['attachments', 'plan-control'], SELF, CLINE)).toBe(false)
  })

  it('never treats this plugin\'s own entry as a rival', () => {
    expect(rivalStatesRoute([SELF], SELF, SELF)).toBe(false)
    // Even when the id's route part would otherwise match this selection.
    expect(rivalStatesRoute([SELF], SELF, 'quota-monitor')).toBe(false)
  })

  it('stands down for a chip whose id names no route at all', () => {
    // A bare `usage` chip claims every route rather than one, so it wins.
    expect(rivalStatesRoute(['usage'], SELF, CLINE)).toBe(true)
    expect(rivalStatesRoute(['usage'], SELF, 'anything')).toBe(true)
  })

  it('matches the allowance word as a segment, not as a substring', () => {
    // A word glued into a longer one states nothing.
    expect(rivalStatesRoute(['myquotathing'], SELF, 'myquotathing')).toBe(false)
    // Every accepted spelling, and each position a segment can take.
    expect(rivalStatesRoute(['x.balance'], SELF, 'x')).toBe(true)
    expect(rivalStatesRoute(['quota_chip'], SELF, 'quota_chip')).toBe(false)
  })

  it('reads the route out of the id past every separator', () => {
    // `cline_pass_usage` separates its words differently from `cline-pass`, but
    // the route it names is the same one, so it claims the seat for it.
    expect(rivalStatesRoute(['cline_pass_usage'], SELF, 'cline-pass')).toBe(true)
  })

  it('ignores an undefined id rather than treating it as a claimant', () => {
    expect(rivalStatesRoute([undefined, 'cline-pass-usage'], SELF, CLINE)).toBe(true)
    expect(rivalStatesRoute([undefined], SELF, CLINE)).toBe(false)
  })
})
