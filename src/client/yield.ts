/**
 * When this plugin's composer pill stands down.
 *
 * The composer's tool row is a list seat, and a provider-specific plugin may
 * already put its own allowance chip there — `dsh-cline-pass` publishes
 * `cline-pass-usage`. Two chips stating the same route's windows is noise, so
 * this plugin yields to a sibling whose entry id names an allowance of its own,
 * and takes the seat back when that entry leaves.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/yield
 */

/**
 * Entry-id words that mean "this entry states an allowance".
 *
 * Matched as a whole segment so `quota-monitor-pill` (this plugin's own id) and
 * unrelated ids such as `usage-hint` are told apart from `cline-pass-usage`.
 */
const ALLOWANCE_SEGMENT = /(?:^|[-_.])(?:usage|quota|balance|allowance)(?:$|[-_.])/iu

/**
 * Whether another entry already states an allowance in this seat.
 *
 * @param ids - every entry id registered in the seat, this plugin's included.
 * @param self - this plugin's own entry id, which never counts as a rival.
 * @returns true when a sibling owns the seat and this pill should stand down.
 */
export function siblingStatesAllowance(ids: readonly (string | undefined)[], self: string): boolean {
  return ids.some(id => id !== undefined && id !== self && ALLOWANCE_SEGMENT.test(id))
}
