# Agent Note: Quota accounting by concrete model and settlement

Status: implemented

English | [中文](2026-10-13-quota-model-accounting.zh.md)

## Problem

The [published-package decision](2026-09-18-quota-monitor-as-a-published-package.md) provides durable usage and configured spend. Its length-only resume rule cannot detect an equal-length log correction. Message-only folds miss charged attempts and do not identify the authoritative route in current logs. Forked seed history and repeated settlements can duplicate calls. The panel has daily model rows but no model comparison across today, month and all time, or a visible effective rate.

## Decision

Replay each readable session at every refresh, using `request/header.config` as the route and `request/context` only for legacy logs without headers. Read direct message usage or the last embedded stream usage for `assistant/message` and `assistant/attempt`. Replace the last settlement for the same turn and step. A matching `llm/retry-started` boundary begins a separate attempt; unrelated retries leave the settlement intact. Charge only events after the latest inherited `session/end-seed` marker in a fork; ordinary restore markers retain history. Reasoning stays included in output, and the four token buckets remain disjoint.

Full replay replaces the earlier cursor-resume accounting decision. Keep storage-domain version 2 with version-1 compatibility, but add accounting revision 3 and disregard older cached counters. Avoid writing identical replay results. Unreadable sessions keep their existing current cache. Rebuild calendar scopes when the local date changes even without new requests.

Aggregate by `provider · model` into today, month and all-time scopes. Each row carries all four buckets, calls, cache-hit percentage and optional cost. Historical spend uses the usage day's matching rule; the displayed rate is today's effective rule. Keep the existing deployment-configured/imported rate source because relay prices vary. Explicitly disclose unpriced calls; do not treat an absent rate as free usage. Client request generations prevent slower responses from replacing a newly selected provider.

Register both package leaves in the root Host and Client aggregates so the standard Typert generator discovers the package and emits the `models` Remote result.

## Verification

The final complete plugin suite passed all 197 tests across 13 files. The accounting and real Loader composition suites also passed a focused 14-test run, including the unrelated-retry regression. Host and Client TypeScript checks passed. The standard `WorkspaceTypertGenerator` emitted the Host and Remote schemas with `models` and rates; both plugin bundles built successfully.

Regression coverage includes authoritative headers, embedded usage, latest settlement replacement across days and routes, matching and unrelated retries, nested inherited forks, equal-length rewrites, legacy-cache invalidation, midnight rollover, dated model costs and unpriced models. Client tests cover model scopes/rates and late responses after provider switches. Loader composition serves the model result and USD 0.000605 estimated cost for 400 input, 100 output and 50 cache-read tokens.

Installed `0.1.6-alpha.1.local.6246bcaa8ea4` into the active `desktop` profile through PluginManager, preserving its monitor and pricing configuration. Installed Host, Client and Remote payload hashes match the staged build. After the user-authorized Desktop/Host restart, authenticated `quotaMonitor/getUsage` on the existing `http://127.0.0.1:19387` returned HTTP 200 and 18 model summaries across 105 sessions, including configured rates and estimated costs. Chromium verified the rendered model table, all ten column headings, today/month/all-time controls, the estimate notice and quota RPC HTTP 200 responses, with no console or page errors. Evidence is in `.artifacts/quota-desktop-post-restart-verification.json` and `.artifacts/quota-desktop-installed-panel.png`. The browser-only preview notice could not save its acknowledgement; its overlay and root inert flag were suppressed only in the isolated verification browser to inspect the quota panel. This does not verify the preview acknowledgement flow.

## Alternatives considered

- Retain the event-length cursor: rejected because equal-length rewrites and replacement of an old settlement leave stale usage. A prefix fingerprint could support a future optimization but needs another durable contract.
- Count every usage sample: rejected because attempts and final messages may settle the same call more than once.
- Ship upstream list prices: rejected because deployment relay rates may differ and silently stale prices would give misleading estimates. Existing dated custom rules and local imports remain authoritative.
- Increment the storage domain to version 3: rejected because the backend may already have an open version-2 table. Accounting revision is sufficient to invalidate derived records.

## Consequences

Every refresh reads and replays complete session logs. Large corpora cost more CPU and I/O; unchanged results skip writes, not replay. Usage absent from provider-reported persisted events cannot be reconstructed. Monetary values remain estimates with the existing per-million rate schema; tiers, taxes, subscription fees and rounding may differ from invoices. Model summaries are optional on the wire for older callers and fixtures, and a current rate does not retroactively reprice history.
