# Agent Note: Active key first with optional member analysis

Status: implemented

## Problem

The unified page puts a large member ranking ahead of the key actually serving requests. The user asks for an interface resembling Context Insights and for multi-key statistics to become supplementary.

A subsequent live report found blank charts after switching. Stepcode intermittently returned HTTP 500, failed cached accounts were never retried on reopening, and successful single-key reads updated the allowance state without updating the snapshot consumed by charts. The lower allowance, key and local usage sections also retained their older styles.

## Decision

The single usage page defaults to the selected provider's active credential (`activeCredentialRef`, falling back to its first monitored credential when absent). It shows that key's allowance, billing-period spend, selected-period tokens, calls, cache-read share and model breakdown. Totals in this mode include only the active key, never the provider's other keys.

A Member analysis tab holds the supplemental view; it appears only for a provider reporting per-key history with two or more keys ([quota page tabs](2026-10-16-quota-page-tabs.md)). Its selected member is separate state from the allowance selection. Inspecting a member cannot change the active-key overview or mutate the provider's routing credential. Changing provider selects that provider's active key. Updated snapshots automatically change the active-key view when routing changes.

The top toolbar is the only provider switch. The allowance/key manager and optional member analysis follow it; local provider comparisons are informational. The visual reference is the actual in-session Context tab: 96px rings, compact multi-column two-line legends, flat 10px cards and dimming of unhighlighted segments. Ring centres preserve totals during inspection.

Every model has its own slice and accessible legend entry; there is no Other aggregation. Hover, keyboard focus and touch selection update a compact detail strip with that model's calls and exclusive input/output/cache-read/cache-write counters. The last inspected model remains visible when the pointer leaves, and selecting another period/member resolves it against fresh counters or falls back to the largest available model. Members use ranking cards; exact member/model/day tables remain collapsed native disclosures. The existing week/month calendar and API accounting contract remain unchanged.

Temporary unavailable/rate-limited/invalid-response accounts are retried when selected or reopened after `refresh.activeMs`, reusing the existing 60-second default rather than adding a retry loop. Healthy cached accounts remain cached. Transient failures preserve only the same credential's previously successful token history and account identity, with `keyUsageFetchedAt` retaining the original success time across repeated failures. Current failure status and reason remain visible; stale allowance figures are not carried forward. First failures and rejected credentials retain no history. A successful reading clears the timestamp marker. This history remains in memory for the service lifetime.

A guarded successful single-key request updates both the allowance and the provider snapshot used by charts/key inventory. Existing selection and request sequence guards still reject stale responses. Retained history has an explicit Shanghai-time notice. All lower allowance, budget, reset-window, key/routing, local usage, calendar and session sections now share the compact Context card and control styles.

This partially supersedes the default member-first presentation in [Unified member usage](2026-10-15-member-calendar-analysis.md); that note still owns period boundaries, partial history and billing-versus-token accounting rules.

## Alternatives considered

Keeping member totals on the first screen makes team comparison immediately available, but conflicts with the user's explicit current-key priority. An optional inline section retains those comparisons without another sidebar entry or a separate overlay lifecycle.

Removing member analysis would simplify the view further but discard the previously requested member, model and calendar statistics. The optional section keeps the existing analysis with no new network requests.

Grouping small models into Other shortens a legend, but prevents inspecting every model directly from the donut. A bounded scrolling multi-column legend retains all models without a new chart dependency. The detail strip stays visible after hover so keyboard and touch users can read the same counters.

## Consequences

Opening and closing member analysis does not persist a new setting or change routing. A shared key still cannot identify separate users. Providers without per-key history retain their original account and local-usage sections.

## Testing

All 21 regression files / 271 cases pass and Host/Client typecheck/build pass. Five additional regressions cover bounded retry and healthy cache reuse, per-key retained history across repeated failures/recovery/rejected credentials, chart recovery from a successful single-key reading, the visible retained-history notice, and the explicit first-read failure reason instead of a silent empty analysis. The initial red run reproduced history loss and the unsynchronized chart. UI coverage checks global provider updates and stale responses, inspection of models beyond the former top-five grouping, model-specific calls and cache buckets, keyboard/touch selection, fresh inspected counters after member/period changes, default disclosure state and active-key isolation.

Chromium at the existing port 3081 verifies live upstream data for all five periods, inspects all nine models via legends and a real mouse hover over a ring segment, and reconciles calls and all four buckets with date/model points. Rings measure 96px. Opening member analysis shows nine ranking cards and no visible tables; selecting another member leaves the active key total unchanged. Opening exact-data disclosures reveals the tables. Opening allowance management still leaves exactly one provider combobox. At 600px, the body remains 600px and all chart/detail cards have equal client/scroll widths. No console or page errors are captured. Screenshots are saved; this model cannot inspect image pixels, so verification uses DOM dimensions, computed styles and real pointer interaction.

Recovery iteration: the deployed production entry is `index.recovery.live.20261015a.js`, importing uniquely named recovery service and generated Host contract modules so cached ESM cannot keep the old behavior. The temporary diagnostic entry is no longer configured. Real upstream reads demonstrated a successful history followed by HTTP 500 while the service retained history and failure status. Some first reads still return HTTP 500, so analysis now states that cause and the refresh action directly. At the existing port 3081, live browser checks cover both agentrouter providers and all lower disclosures at 1440/600/380px; panel widths are 1160/544/324 with equal scroll widths, key-manager widths 1082/482/262, and no page overflow or console errors. Browser-only response interception verifies the retained-history notice and its removal after a successful single-key response without altering production data. Explicit saved-snapshot replay verifies all five period totals, eight individually inspectable models, 96px rings and nine-member isolation; this is distinguished from live upstream availability. `git diff --check` passes.
