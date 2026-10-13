# Agent Note: Plan-window and budget-pool quota providers

Status: implemented

English | [中文](2026-09-16-quota-monitor-plan-window-providers.zh.md)

## Problem

The quota monitor recognized four balance grammars, and all four answer the same question: how much money is left. Two providers an operator may configure answer a different one. Cline Pass meters elapsed time rather than currency — it enforces a rolling five-hour window plus calendar weekly and monthly windows, and a session stops when the tightest of the three fills, regardless of remaining credit. AgentRouter splits one account across named budget pools, so a single account remainder hides which pool is about to run dry. Folding either into the existing single `balance` figure would have discarded exactly the fact the operator needs.

The panel also carried its own wording. Every string in the panel component was a Chinese literal, which the repository's locale-owned client copy rule forbids and `verify-client-ui-i18n` rejects once the package's `src/client` tree is discovered.

## Decision

**An account reading may carry disaggregated rows beside its headline figure.** `QuotaAccountReading` gains `planWindows` and `budgetPools`; both are absent for the four balance grammars, which keeps existing rows unchanged. The headline `remaining`, `limit`, and each window's own `resetAt` remain the single figures the selector chip and the bars need, so no consumer must understand the new arrays to keep working. For Cline Pass the headline reports the tightest window, because that is the one that stops a session first; for AgentRouter it reports the account remainder, falling back to the sum of the pools when the summary discloses none.

**Cline Pass reads `{baseURL}/users/me/plan/usage-limits` with the route's Bearer credential.** The three `type` values `five_hour`, `weekly`, and `monthly` map to the three rows the panel can label, and every other value is skipped rather than rendered under a guessed label: the endpoint may add windows a shipped build has no row for, and a mislabelled window is worse than an absent one. Percentages are clamped into 0–100 once in the parser rather than at each render, because gateways report overage above 100 and post-refund figures below 0, and the panel draws a bar directly from the number. A `resetsAt` instant already in the past is dropped, since a countdown to it shows nothing.

**AgentRouter reads `{origin}/desk/v1/stepcode/user/info`.** It is the one probe addressed from the base URL's origin rather than the base URL itself, because the configured value points at the inference API while the desk API is served beside it; a base URL that does not parse as a URL simply has no desk origin to probe. The endpoint discloses no unit for its `usage_summary` and `budget_pool_usages` figures, so they are reported verbatim under the neutral `credits` label rather than converted through new-api's 1/500000-dollar unit on the assumption that the derivative kept it — a wrong conversion is off by five orders of magnitude and looks plausible. Section keys are read from ordered candidate lists, the grammar this file already uses for Sub2API dashboards, so a renamed field degrades that row to the manual fallback instead of reporting a wrong number. Unlike the Sub2API reader, the lookup is top-level only: these sections name their figures at the top, and a nested search would let an unrelated inner object supply a row's headline number.

Both providers are selected by provider-route id or by the host their base URL names, matching how DeepSeek and MiniMax are already selected, so a route reached through a proxy domain still resolves.

**The panel's copy moved into a typed `quotaMonitor` locale namespace.** `src/client/locales.ts` owns both shipped dictionaries, the `main` slot registration declares `locale: NS`, and every component reads its strings through the framework `t` seat. Countdown formatting became the notable case: a string-returning formatter that assembles `重置于 …` is exactly what the gate rejects and what a second language cannot re-order, so the helper now returns countdown parts and the dictionary owns the sentence.

## Verification

`tests/adapters.spec.ts` pins both grammars: window ordering and the tightest-window envelope, the `data` envelope, a skipped unknown `type`, clamping at both ends, a dropped elapsed reset, per-pool remainders derived from either the remaining or the limit-and-used side, pool numbering when a row discloses no name, and the rejection cases that fall through to the manual allowance. `verify-client-ui-i18n` passes over the package's `src/client` tree, which is what proves the panel copy actually reaches the dictionary rather than merely having one.

## Alternatives considered

**Report each Cline window as its own provider row.** Rejected because the three windows share one account, one credential, and one usage counter; splitting them would triple the token-accounting rows and break the identity between a provider route and its `llm/stream` bucket.

**Convert AgentRouter figures through the new-api quota unit.** Rejected because AgentRouter's derivation from new-api is not evidence that the desk API kept that unit, and the failure is silent: a balance wrong by 500000× still renders as a plausible number. A neutral `credits` label is honest about what the endpoint disclosed.

**Pin one exact spelling per AgentRouter field.** Rejected because the endpoint is undocumented; a pinned spelling turns any rename into a wrong or missing row, while the candidate list already used for Sub2API degrades to the manual fallback instead.

**Keep the panel's Chinese literals and exempt the package.** Rejected because the exemption would have to grow with every new row this change adds, and the gate's value is that omission fails at the introducing line rather than accumulating into a mixed-language UI.

## Consequences

- A gateway that adds a plan window this build has no row for silently loses that window until a dictionary key and a `QuotaPlanWindowKind` member are added together; the tightest-window headline still accounts for it only if it is one of the three recognized types.
- AgentRouter figures are comparable to each other but not to the currency figures in other rows, because the panel labels them with the unit the endpoint failed to disclose.
- Adding a row to the panel now costs two dictionary entries rather than one literal, and the bilingual pair is enforced at registration.
- The probe file now holds six grammars behind one endpoint walk; the next addition should weigh splitting per-provider readers out of the shared module before the candidate-key lists start colliding.
