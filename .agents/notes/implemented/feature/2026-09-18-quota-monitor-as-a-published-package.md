# Agent Note: The quota monitor as a published dual-face package

Status: implemented

English | [中文](2026-09-18-quota-monitor-as-a-published-package.zh.md)

## Problem

The quota monitor began as a dynamic plugin: a `cordis.yml` row holding an inline module the runtime evaluated, with its panel code and its Host code in one file. Everything about that arrangement fought the repository's own rules. A dynamic plugin cannot declare a `Config` schema the Loader validates, cannot be typechecked as part of the workspace, cannot publish a Client entry the module graph orders, and cannot carry tests that resolve through tsconfig `paths`. Its panel copy lived in the file rather than in a locale dictionary, which `verify-client-ui-copy` cannot see. Its dependencies were invisible to `verify-package-dependencies`, `verify-client-packages`, and the generated catalogs.

The capability itself was also incomplete in ways that only became visible once the panel was rebuilt. The account read understood a wallet; it did not understand a plan window, a budget pool, or a gateway that reports a mode per read. There was no folded history at all, so the panel could show what this process had seen and nothing older. There was no spend figure, no budget, no export, and no way to tell a provider that publishes no account endpoint from one whose endpoint failed.

The instruction was to make this a real package whose panel matches the repository's usage-stats presentation, and to carry the union of both feature sets rather than choosing between them.

## Decision

**The quota monitor is one dual-face package, `@deepseek-ai/dsh-extension-quota-monitor`.** The Host half is a `TypertRemoteService` publishing `ctx.quotaMonitor`; the Client half declares `dsh.client` and registers a sidebar rail entry plus a `main`-slot panel. The two faces get `tsconfig.host.json` and `tsconfig.client.json` leaves with a solution-only root, which is what a package with distinct Host and Client programs requires.

**The package is exempted from automatic Client/Host dependency treatment.** It joins `@deepseek-ai/dsh-api-session-controller` and `@deepseek-ai/dsh-api-workspace-controller` in `CLIENT_FACE_EXCLUDE`. Its Host half value-imports `defineDomain` and `domainTable` from `@deepseek-ai/dsh-storage-domain`, and that package is a `peerDependency` because the domain facility must be one instance shared with the deployment's storage backends. Client/Host treatment flattens peers into `dependencies`, which would admit a second installed copy of a stateful Host service — the exact failure the exclusion exists to prevent.

**The panel is the union of both feature sets, laid out as the repository's usage-stats panel.** A provider selector rail of status-dotted chips, an account card leading with the remaining figure, plan windows and budget pools, three totals tiles with derived spend, budget bars, a weekday-aligned month calendar shaded against the month's own peak, the selected day's `provider · model` breakdown, the busiest sessions, and the export row. Every figure arrives from the Remote face; the panel derives presentation and never computes a total the Host did not report.

**Account reads understand four card frames rather than one.** `QuotaAccountReading.mode` lets a gateway declare whether its answer is a wallet, subscription windows, or an unmetered allowance, because one gateway family genuinely serves all three under one protocol. `QuotaAccountStatus` separates `unsupported` (the provider publishes no account endpoint) from `blocked` (this plugin refused the request) from `unavailable` (the upstream failed), so the card states which of the three a reader is looking at.

**Spend is configuration. This package ships no price table.** `pricing.currency` plus `pricing.rules` is the only source of a rate; a report built without rules carries no cost field rather than a zero. A partly priced figure is disclosed with its `unpricedCalls` count instead of being hidden behind an em dash, and a budget that rests entirely on unpriced calls reports `unknown` rather than a reassuring 0%.

**Folded history comes from persisted session logs, cached in a storage domain.** `quota_usage` is a versioned domain table keyed by session id holding counters and route ids only — never prompt text, never a conversation title. Every refresh replays the complete readable log, replacing earlier settlements and identifying equal-length rewrites; accounting revision 3 invalidates older derived counters without changing the domain version. The replay, inherited-fork and concrete-model accounting decision is defined in the [model accounting note](2026-10-13-quota-model-accounting.md).

**Exports go through the Remote face.** `exportUsage(request)` returns a `QuotaExportDocument` and the browser saves it through a Blob. A new loopback route would need its own authorization and lifecycle for an operation the connection already carries.

**An unrecognized gateway is asked what it is, once, without a credential.** `detectSub2apiPanel` probes one public settings document and accepts only a strict answer; the promise is cached per route and base URL so a refresh loop cannot turn it into repeated traffic. `detection.enabled` (default true) turns it off entirely.

**The account, usage-panel, and export Remote methods are the panel's whole Host surface.** `getSnapshot`, `getAccount`, `getUsage`, `exportUsage`, `setBalances`, and `resetStats` are declared with `@Remote`; the panel holds no other way to reach the Host.

## Verification

`tests/service.spec.ts` drives usage accounting over the real `llm/stream` waterfall, manual balances, stat resets, and the account read for a route no adapter recognizes. `tests/usage-fold.spec.ts` pins repeat folding, rewritten logs, route inheritance, day bucketing, the cache-hit denominator, per-row/day/session/window cost, the disclosed unpriced count, and every budget status. `tests/adapters.spec.ts` pins each provider's response grammar and the HTTP layer's security rules. `tests/pricing.spec.ts`, `tests/export.spec.ts`, `tests/config.spec.ts`, and `tests/detection.spec.ts` cover rule specificity, the CSV framing and formula guard, the shipped empty price list with both `assertConsistent` rejections, and the credential-free probe. `tests/panel.client.spec.tsx` renders the panel under jsdom through its Remote face and asserts what a reader sees, which method a gesture reaches, and that a rejected Remote result leaves the last good view standing.

`tests/composition.spec.ts` is the REAL-composition suite `packages/AGENTS.md` requires for a product-visible plugin: a test-only `cordis.yml` booted through the Loader with the plugin resolved by path, asserting that `ctx.quotaMonitor` is published by the Loader's own activation, that the deployment's registered route reaches the selector, that the persisted session log folds into served totals and into an export document, and that disposal unwinds the registration.

## Alternatives considered

**Keep it a dynamic plugin.** Rejected because every gate listed under Problem cannot see a dynamic plugin, and because a plugin whose config the Loader cannot validate cannot be configured safely. The static package is what makes the Config schema, the locale dictionary, the generated catalogs, and the workspace typecheck apply.

**Split into `extension-quota-monitor` and `ui-quota-monitor`.** This is the standard repository shape for a Host service with a browser panel, and `ui-cordis` and `experimental-client-ui-agent-team` are precedents. It was rejected for this change because the two halves share one type surface — the snapshot, account, usage report, and export types are the Remote contract between them — and splitting would have added a third package's worth of manifests, tsconfig leaves, catalogs, and documentation without changing what either half does. The dual-face form is legitimate and already used by the two excluded precedents.

**Register `defineDomain` and `domainTable` in `SAFE_HOST_DEPENDENCY_EXPORTS`.** Rejected: that list's comment forbids automated-agent additions, and its members are exports whose duplication is genuinely safe. Adding this package would have silenced the gate rather than answering it.

**Declare the storage-domain edge in `PEER_REQUIRED_HOST_EXPORTS`.** Rejected as dishonest. `defineDomain` and `domainTable` are pure constructors; nothing about their identity needs to be shared. The reason the edge is a peer is the *service*, not these two functions, so naming them as peer-required exports would have mislabelled the mechanism to satisfy a checker.

**Drop durable fold persistence.** Rejected because it contradicts the objective: without the domain table the panel can report only what the current process saw, which is exactly the gap the folded history exists to close.

**Ship a built-in price table.** Rejected as a hardcoded tunable with a silent failure mode: a relay resells the same model id at its own rate, published prices change without a release, and a stale table renders a confident wrong number where a right one belongs.

**Hide any total containing an unpriced call.** Rejected because it discards the part that is known. The amount plus the unpriced count is strictly more information and no more misleading.

**Serve exports from new loopback HTTP routes.** Rejected because the Remote face already carries authenticated, lifecycle-managed access to exactly this data.

## Consequences

- The package publishes `.`, `./types`, `./client`, `./typert`, and `./remote`, and appears in the module graph, the config catalog, the Cordis catalog, the capability-seams table, and the event producer/consumer matrix. Every one of those is a gate that now fails if the package's shape changes without its documentation.
- `verify-doc-graphs` requires a `quotaMonitor` entry in `SERVICE_ROLES` with a completeness guard, so adding a service to this package without classifying it fails the doc gate rather than silently omitting it from the seams table.
- A deployment that configures no prices sees tokens, balances, and windows with no cost column anywhere. Spend is opt-in and its completeness is the deployment's own.
- A price rule states one flat per-million rate per bucket, so tiered, batch, and context-length pricing are not expressible; a deployment on such a plan gets a floor, not an invoice.
- The `quota_usage` domain is at `version: 2` with `compatibleVersions: [1]`, because a version-1 record has no `lastActiveAt`. Such a session appears in the session list with a zero activity instant until its log is refolded.
- Detection adds one credential-free request per unrecognized provider per process, cached thereafter. A deployment that finds that unacceptable sets `detection.enabled: false` and names adapters explicitly.
- The panel's calendar shades each day against the shown month's own peak rather than an absolute scale, so two months are not comparable by colour; the cell labels and the exports carry the absolute figures.
- The Client half is exercised by `tests/panel.client.spec.tsx` under jsdom. `packages/extensions/*/src/**` is excluded from the per-file coverage gate, so those component paths are covered by this suite rather than by a coverage threshold.