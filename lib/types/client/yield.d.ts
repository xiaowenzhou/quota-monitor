/**
 * When this plugin's composer pill stands down.
 *
 * The composer's tool row is a list seat, and a provider-specific plugin may
 * put its own allowance chip there — `dsh-cline-pass` publishes
 * `cline-pass-usage`. Such a chip is registered **unconditionally** and states
 * nothing about the routes it does not own: it renders `null` unless the
 * selected route is its own. Presence in the seat therefore says nothing about
 * what the user is looking at, and yielding on presence alone would retire this
 * pill for good — every route, including the ones the rival chip stays silent
 * about.
 *
 * So the decision is scoped to the route: a sibling stands this pill down only
 * when the route its entry id names is the selected one. A sibling whose id
 * names no route at all claims every route, and still wins.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/yield
 */
/** This plugin's entry id in the composer's tool row. */
export declare const PILL_ID = "quota-monitor-pill";
/**
 * Whether a sibling already states this route's allowance.
 *
 * @param ids - every entry id registered in the seat, this plugin's included.
 * @param self - this plugin's own entry id, which never counts as a rival.
 * @param provider - the route the session selected, which is what decides it.
 * @returns true when a sibling speaks for this route and this pill should stand
 * down for it.
 */
export declare function rivalStatesRoute(ids: readonly (string | undefined)[], self: string, provider: string): boolean;
//# sourceMappingURL=yield.d.ts.map