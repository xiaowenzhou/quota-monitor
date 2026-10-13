# Agent Note: A spend-and-budget quota panel, and asking a gateway what it is

Status: implemented

English | [中文](2026-09-17-quota-monitor-spend-budgets-and-detection.zh.md)

## Problem

The quota panel reported tokens and remaining balance and stopped there. Three things an operator actually asks were missing, and a fourth was quietly wrong.

An operator asks what a month cost, not how many tokens it consumed. Token totals are the input to that question, never its answer: they cannot be compared against an invoice, split across providers by value, or measured against a limit anyone set.

An operator also asks which session spent it. The fold already keyed its cache by session id, but the report threw that key away and reported only per-day, per-route rows, so a run that burned a month's budget in an afternoon was indistinguishable from steady use.

An operator asks these questions somewhere other than this panel. The figures lived only in a browser view, so attaching them to a bug report, a reimbursement claim, or a spreadsheet meant retyping them.

The fourth is the one that produced wrong numbers rather than missing ones. A `new-api` deployment declares its own quota denomination at `/api/status`; this package assumed the historical 500000-units-per-dollar constant. A deployment that changed the unit, or displays CNY, had every figure on its card off by a factor nobody would notice. Separately, the `sub2api` adapter walked an ordered list of dashboard paths and forced whatever it found into a balance card, even for the gateways in that family whose answer is a metered subscription.

The panel's own composition had a matching problem: an account selector that shows one provider at a time makes an operator click through every provider to find the depleted one.

## Decision

**Prices are configuration. This package ships no price table.** `pricing.currency` plus `pricing.rules` is the only source of a rate, and a report built without rules carries no cost field at all rather than a zero. A baked-in table is a hardcoded tunable in the exact sense the repository forbids: a relay resells the same model id at its own rate, published prices change without notice, and the failure of a stale table is silent — it renders a confident wrong number in the same place a right one would appear. A deployment that wants spend states what it pays.

A rule matches a `provider · model` route by the narrowest name it gives: provider plus exact model (4+2), provider plus a `*`-suffixed family (4+1), provider-wide (4), model-only variants, then a catch-all (0). Ties go to the latest `from` day at or before the day being priced, so adding a rule prices today onward and leaves history on the rule that was in force. Cost is derived per day from that day's counters, never from a running total, which is what makes the day, session, month, and all-time figures agree with each other.

**A partly priced total is disclosed, not withheld.** Each cost view carries `amount` plus `unpricedCalls`. The reference implementation this rework drew from hides any figure it cannot fully price behind an em dash; that withholds the part it does know and gives the operator nothing to act on. Stating "$4.12, 37 calls unpriced" tells them both the floor and the size of the gap.

**Budgets are measured against derived spend, and a budget without prices fails at load.** `budgets.daily` and `budgets.monthly` are denominated in `pricing.currency`. `assertConsistent` throws in the constructor when a budget exists with zero price rules, or when `criticalPercent` sits below `warningPercent`. A budget that can only ever report `unknown` is a configuration mistake, and the repository rule is that misconfiguration fails loud at load rather than rendering as a state. A window whose spend rests entirely on unpriced calls still reports `unknown` rather than a reassuring 0%, because that combination is data, not misconfiguration.

**The report lists sessions by id, activity, and routes — never by title.** `SessionFoldState` gained `lastActiveAt`, and `buildUsageReport` emits one row per session with tokens, calls, routes, and cost. It carries no conversation title: a title is prompt-derived text, and the `quota_usage` domain's documented contents are counters and route ids only. Widening that cache to hold titles would put prompt text into an accounting store to save the panel a lookup.

`buildUsageReport(states, options)` replaced four positional arguments with one options object at the same time, because the new `prices` and `budgets` inputs are both optional and a fifth and sixth positional argument would be unreadable at every call site.

**Exports go through the Remote face, not new HTTP routes.** `exportUsage(request)` returns a `QuotaExportDocument` — filename, media type, and content — and the browser saves it through a Blob. A new loopback route would need its own authorization story, its own lifecycle, and its own surface for an operation the panel can already ask for over the connection it has. The JSON document carries the usage report plus one row per watched route naming its adapter and status; balances, plan windows, and credential references stay out, because an export is a file that gets attached to a bug report.

Both CSVs quote every cell, emit CRLF rows behind a UTF-8 BOM, and prefix a text cell starting with `=`, `+`, `-`, or `@` with an apostrophe. A `provider · model` route id is attacker-influenced in exactly the way spreadsheet formula injection needs, and the guard costs one regular expression.

**A `new-api` deployment is asked how it denominates quota.** `/api/status` is read concurrently with the usage read; `quota_per_unit` overrides the legacy constant, `quota_display_type: CNY` applies the deployment's own `usd_exchange_rate`, and any other display unit is reported as `unsupported` rather than relabelled. The legacy 500000 constant survives only as the fallback for a deployment that serves no status route — a protocol fact about older builds, not a tunable.

**A Sub2API reading declares its own mode.** `QuotaAccountReading` gained `mode`, and `readSub2apiUsage` decides between a wallet, an aggregate quota, and per-period subscription ceilings from the answer itself. One gateway family genuinely serves all three under one protocol, so an adapter id cannot decide the card's shape; `isValid: false` or `is_active: false` is reported as `unauthorized`, not as an empty wallet.

**An unrecognized gateway is asked what it is, once, without a credential.** `detectSub2apiPanel` probes `GET {origin}/api/v1/settings/public` with `auth: 'none'` and accepts only `code === 0` with a boolean `data.affiliate_enabled`. It runs only when no rule resolved an adapter, only when a credential exists to use afterwards, and its promise is cached per provider and base URL so a refresh loop cannot turn it into repeated traffic. `detection.enabled` (default true) turns it off for a deployment that wants zero unattended requests to unknown hosts.

**The panel shows every account at once, then one in detail.** A selector rail of chips carries a status dot per provider, so a depleted account is visible without selecting it. Below it, the card leads with a hero figure (remaining, used, limit), then plan windows, then pools; then the three totals tiles with derived spend, then budget bars, then the current month as a weekday-aligned calendar with a token count in each cell, the selected day's routes, the busiest sessions, and the export row. The shading ramp is `color-mix` over `--dsw-alias-state-business-primary` in five steps rather than a second palette, so the calendar follows a theme change.

## Verification

`tests/pricing.spec.ts` pins rule selection at every specificity step, the `from` boundary in both directions, the cache-bucket fallback to the input rate, and an accumulator that reports nothing at all without a table. `tests/usage-fold.spec.ts` pins the session rows and their ordering, the zero-token session that is listed nowhere but still counted, per-row/day/session/window cost, the disclosed unpriced count, and each budget status including `unknown`. `tests/export.spec.ts` pins the BOM, the CRLF framing, the quoted cells, the formula guard against a hostile route id, the empty cost columns of an unpriced report, and the fields the JSON document must not contain. `tests/config.spec.ts` pins the empty shipped price list and both `assertConsistent` rejections, including one through a real `ctx.plugin` load. `tests/detection.spec.ts` boots the service over a real configurable route with a real settings profile and credential reference, and pins that the probe carries no `authorization` header, runs once across two reads, is skipped entirely when disabled, and that the card is framed by the reading's declared mode rather than the adapter id. `tests/adapters.spec.ts` pins the `new-api` denomination reads and the three Sub2API answer grammars.

## Alternatives considered

**Ship a built-in price table for the well-known providers.** Rejected as a hardcoded tunable with a silent failure mode. Model prices change without a release of this package, relays resell the same model id at different rates, and a wrong rate produces a plausible number in the place the right one belongs. Configuration makes the deployment state what it actually pays, and an unconfigured deployment sees tokens rather than fiction.

**Hide any total that contains an unpriced call.** Rejected: it discards the part that is known. The reference implementation does this, and the result is an em dash where an operator expected an amount, with nothing to tell them whether the gap is one call or ten thousand. The amount plus the unpriced count is strictly more information and no more misleading.

**Estimate a price for an unpriced route from a similar model.** Rejected because a guessed rate is indistinguishable from a configured one once it reaches a budget bar. An unpriced call is counted and named as such.

**Store the conversation title in the fold cache so the session list can show it.** Rejected because the `quota_usage` domain documents its contents as counters and route ids, and a title is prompt-derived text. The list identifies a session by id, latest activity, and routes; the gap is recorded under Known Limitations rather than paid for with prompt text in an accounting store.

**Serve exports from new loopback HTTP routes, as the reference project does.** Rejected because the Remote face already carries authenticated, lifecycle-managed access to exactly this data. A second transport would need its own authorization, its own disposal, and its own surface for no capability the first one lacks.

**Probe several candidate paths to identify an unknown gateway.** Rejected because each additional path is another unattended credential-free request to a host the operator never named, and the single public settings document is what actually distinguishes this panel family. A gateway that hides it keeps `monitors.<id>.adapter`.

**Keep the old multi-path `sub2api` walk and force every answer into a balance card.** Rejected: the walk reported a wallet for gateways that meter periods, which is a wrong card rather than a missing one. Reading the mode from the answer is what the protocol already discloses.

## Consequences

- A deployment that configures no prices sees exactly what it saw before: tokens, balances, and windows, with no cost column anywhere. Spend is opt-in and its completeness is the deployment's own.
- A price rule states one flat per-million rate per bucket, so tiered, batch, and context-length pricing are not expressible. A deployment on such a plan gets a floor, not an invoice.
- `buildUsageReport`'s signature changed from positional arguments to an options object; every caller in this package moved with it, and the function is not exported from the package's public entry.
- `usageDomainSpec` moved to `version: 2` with `compatibleVersions: [1]`, because a version-1 record has no `lastActiveAt`. Such a session appears in the list with a zero activity instant until its log is refolded.
- Detection adds one credential-free request per unrecognized provider per process, cached thereafter. A deployment that finds that unacceptable sets `detection.enabled: false` and names adapters explicitly.
- A `new-api` deployment that serves `/api/status` with a display unit other than USD or CNY now reports `unsupported` where it previously reported a wrong number. That is the intended trade: a missing card beats a mislabelled one.
- The panel grew from four sections to six. The calendar shades each day against the shown month's own peak rather than an absolute scale, so two months are not comparable by colour; the cell labels and the exports are where absolute figures live.
