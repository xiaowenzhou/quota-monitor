# Agent Note: Quota page tabs and per-provider analysis gating

Status: implemented

## Problem

Per-key token history exists only where the upstream reports it: the AgentRouter / StepCode desk read by the `stepcode` adapter. The page decided whether to show the active-key analysis and the member toggle from whether *any* configured provider supported it, so selecting another provider showed empty tiles and charts while its allowance and local sections stayed folded.

The user then found the page dated: 11–13px text, 26px buttons, bordered boxes inside bordered boxes, native ▼ disclosures and a full-width layout, unlike the native Plugins and Automation pages.

## Decision

- Visibility follows the selected provider. `supportsAnalysis(entry)` in `src/client/UsagePanel.tsx` (adapter `stepcode`, or an account already carrying `keyUsage`) shows the Current key view; Member analysis additionally needs `credentialRefs.length > 1`. Every other provider offers only Allowance & keys and Local calls.
- The page is a centred column of at most 960px: title and intro on the left, provider select and an outline Refresh button on the right, then pill tabs (`role="tablist"`, roving tabindex, Arrow/Home/End) in the order Current key, Member analysis, Allowance & keys, Local calls. The first available tab is the default, only the selected tab is mounted, and a tab that disappears after a provider switch falls back to the first one.
- Reset session stats lives in the Local calls tab, not in the page head.
- One design language: the `--qm-*` custom properties defined on the panel root in `src/client/UsagePanel.module.css` (card on layer-1 with a hairline border, 16px radius and 20px padding; tile tint; business-primary accent; meter track; ok/warn/error; mono font). Each view owns its CSS module (`MemberAnalysis`, `UsageCharts`, `AccountCard` + `Keys`, `LocalStats`); `UsagePanel.module.css` keeps only the shell classes.
- `LocalStats` (`src/client/LocalStats.tsx`) composes the local-call components. The panel passes the calendar month already defaulted; LocalStats derives the day list and the selected day.
- The account card says the provider name once (the identity row is the card head, with the status badge and refresh) and says a failed status once.
- Chart legends are single-line rows with no height cap; the former 168px cap clipped models.

## Alternatives considered

- Restyle the disclosures and keep one long page. It keeps everything visible at once, but the disclosures were the dated element and the long page interleaved per-key and instance-local data. Tabs follow the Automation page and still need only one navigation entry.
- `SegmentedTabs` from `@deepseek-ai/dsh-client-ui-primitives`. Its equal-width grid with a sliding indicator suits a fixed set of two or three options; here the set changes from two to four by provider, and the Automation page's pill filters read lighter.
- Member analysis for a single key. One key has no members to compare, and the Current key view already shows the same figures.
- A smaller currency span beside large amounts. Tests match exact amount strings such as `42.5 CNY`, so amount and currency stay one text node.

## Consequences

- Providers without per-key history no longer render empty tiles and charts, and the page matches native pages in both themes through tokens.
- Allowance and local statistics are one click away instead of open sections; panel tests open views explicitly through `openView` in `tests/panel.client.spec.tsx`.
- Inactive tabs are unmounted, so view-local state such as opened exact-data tables resets when switching tabs.
- The model-usage table with configured rates still scrolls horizontally inside its card at 960px.

## Testing

All 21 files / 272 cases pass, Host and Client typecheck pass, and `git diff --check` passes. The case "shows key analysis only for a provider reporting per-key history, and members only for several keys" asserts the tab sets for a two-key StepCode route, a one-key route and DeepSeek; it failed against the former any-provider gating. In Chromium at port 3081, DeepSeek, cline and Cline Pass show Allowance & keys and Local calls; agentrouter-codex adds Current key; agentrouter-claude shows all four. No console errors occur and no element extends past the scroll container at 1440px or 390px.

Related: [active key overview](2026-10-15-active-key-overview.md), [member calendar analysis](2026-10-15-member-calendar-analysis.md).
