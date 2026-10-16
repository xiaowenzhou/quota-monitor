# Agent Note: Unified member usage and calendar periods

Status: implemented

## Presentation update

The active-key-first default and optional member analysis are defined in [Active key overview](2026-10-15-active-key-overview.md). The calendar, history and accounting rules below remain in force.

## Problem

The separate allowance and per-key pages split the user's member analysis across two navigation entries. Rolling-window tokens also invite comparison with unrelated billing-month spend.

## Decision

The existing quota-monitor entry owns one page. Member analysis reads the parent's provider snapshot and selection; allowance/key management and instance-local usage are tabs on that page ([quota page tabs](2026-10-16-quota-page-tabs.md)). Selecting a member only changes the displayed credential, never the routing credential.

Member statistics aggregate upstream date/model points over inclusive Asia/Shanghai calendar ranges. Weeks start Monday; current weeks and months end today. The presets are this week, last week, this month, last month and last 30 days. Model tables retain independent input/output/cache-read/cache-write buckets. Reasoning is not added to the reported total again. Missing call counters remain unknown.

The StepCode request defaults to 62 days and permits 1–366 days. Live probes honour days=60/90/365; month and date-bound parameters are ignored. Returned bounds, rather than the first activity date, determine partial window coverage. A declared window is not proof that upstream retained every historical request; the UI states this limitation.

Historical or model-specific money is unavailable. Current billing-period spend and unit price keep their own explicit period label and never change with a historical token filter. Member comparisons stay within one provider to avoid adding the same key from multiple routes. Shared keys cannot identify individual people.

## Alternatives considered

Keeping two navigation entries preserves separation of data sources, but the user explicitly needs one analysis page. Labelled local-call and allowance tabs retain that distinction without duplicate navigation.

Requesting start/end or month directly would avoid a local fold, but live probes show those parameters are ignored. Requesting 62 days once and filtering points covers the full previous calendar month without repeated API calls.

## Consequences

One snapshot supplies all filters; period switching causes no network request. Historical data remains limited to the API's records. Short configured windows are reported as partial instead of silently labelled complete.

Related local-call accounting notes are encrypted by E-SafeNet in this checkout and could not be inspected from WSL. They are left untouched; this decision concerns upstream member usage, not the existing local session accounting contract.

## Testing

Calendar tests cover Shanghai midnight, Monday weeks, year rollover and leap February. Aggregation tests cover inclusive bounds, bucket sums, missing calls, partial coverage and aggregate-only responses. UI tests switch periods and members and verify separate model cache columns. Existing provider synchronization, routing and account tests remain required.

Verification: all 20 test files / 258 cases pass; both host and client typechecks pass. After the final default-selection adjustment, all 26 affected UI cases pass again. Chromium against the existing port 3081 confirms one sidebar entry, nine member rows, all five period switches and separate model bucket columns, with no captured page/console errors and successful quota RPCs. At 600px, the body stays 600px wide and tables scroll internally. Live model/day sums reconcile with each member's selected-period tokens.

## Runtime deployment

The profile uses an uncached host entry and contract module. Changing the bundle patch name and reconciling the profile updates loader metadata but does not itself recreate an active fiber. Reconcile first, then disable/enable quota-monitor to instantiate the new entry. Reusing a previously imported ESM path can load old code. The deployed production entry is `index.members.live.20261015.js`; its host requests 62 days for all ten keys. Temporary diagnostic code is not part of that production entry.
