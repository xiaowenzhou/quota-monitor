# Agent Note: Quota account readings per monitored credential

Status: implemented

English | [中文](2026-10-13-quota-monitor-multi-key-accounts.zh.md)

## Problem

An account read resolved one credential per provider route: `monitors.<id>.credentialRef`, else the route's own `apiKeyEnv`. That is the right key for a route that pays with one credential, and the wrong one for a deployment that holds several keys behind the same gateway. Such a deployment could watch exactly one of its keys at a time, and the panel had nowhere to state what the others had left, because a chip, a card, and a cached reading were all keyed by route.

## Decision

`monitors.<id>.credentialRefs` lists the credentials a route is monitored with. A non-empty list replaces `credentialRef` for that route and is read in the order written; an absent or empty field keeps the one-slot behavior, which is what every existing entry and every route without an entry keeps. `assertConsistent` validates each name against the credential-reference grammar and rejects a repeated name, so a typo fails at load rather than as a silent `not-configured` reading.

The Host reads one account per slot. A slot is the route id plus its optional credential reference, and that pair is the cache key, so each key keeps its own reading. The background round reads every monitored credential of every route — routes in parallel, slots within a route serially, which keeps one in-flight request per gateway — and opening the panel reads the slots no round has taken yet. The active-interval tick still reads only the focused slot, because its job is to keep the reading on screen current. The slot's reference is what the adapter resolves its key with; `context.apiKey` remains the route's own inference credential, so a monitored key adds a reading without replacing the credential the route bills model calls to.

On the wire, `QuotaProviderEntry` carries `credentialRefs` and `accounts` (the readings taken so far, in slot order), and `QuotaAccount` names the `credentialRef` it was taken with. Two Remote methods return a fresh snapshot: `readPendingAccounts` for the slots no round has taken yet, and `refreshAccounts` to re-read every monitored credential. `getAccount` accepts an optional `credentialRef` and falls back to the route's first monitored credential, which is also what an absent reference names in `readPendingAccounts`.

The panel groups chips by route. A route with one slot keeps its provider name and states that slot's figure. A route with several slots renders the route name once, then one chip per key stating that key's figure — an amount for a balance reading, the tightest plan window as a percentage for a subscription, or the unlimited marker. Picking a chip reads that key, and the reading card names the key in its meta row only where the route has more than one, so a single-key route reads exactly as it did before.

## Verification

The complete plugin suite passed all 208 tests across 14 files. New Host coverage reads several keys of one route, caches each under its own key, keeps one key failing without disturbing the others, resolves the first monitored credential when no reference is given, and reports `credentialRefs` and `accounts` from `providerEntries`; new panel coverage opens the panel on a two-key route, asserts one figure per chip, and asserts that picking a chip reads that key and that a header refresh re-reads all of them. Host and Client TypeScript builds passed, and the generated Typert wire schema carries the two new methods and the new fields.

`0.1.6-alpha.1.local.054d6414e516` was installed into the `desktop` profile through PluginManager, with the profile's `cline-pass` monitor switched to three credential references. After the app restart, `refreshAccounts` over the authenticated `http://127.0.0.1:19387` returned three readings for `cline-pass` — the same plan with a different window set per key (five-hour/monthly/weekly 100/70/40, 100/61/41, and 8/75/89) — which is what proves each key was queried with its own credential. A headless Chromium session against the running app rendered the panel with the route name once and three chips (`CLINE_PASS_API_KEY 100%`, `CLINE_PASS_15_KEY 100%`, `CLINE_PASS_ME_KEY 89%`), and clicking the middle chip flipped only that chip's `aria-pressed` and sent `quotaMonitor/getAccount` with `credentialRef: "CLINE_PASS_15_KEY"`; the card then showed that key's 100/61/41 windows with no page or console errors. Evidence is in `.artifacts/quota-desktop-multi-key-panel.png` and `.artifacts/quota-desktop-multi-key-top.png`. The same artifact was installed into the `web` profile, which reports the new version and needs a restart before its browser serves it.

## Alternatives considered

- One credential per route with a duplicated route per key: rejected because a gateway that issues several keys would need several provider routes, duplicating the model endpoints and leaving the panel comparing routes rather than keys, while stream usage is folded per route and would name whichever route carried the call.
- A provider entry per key: rejected because usage folding, pricing, and the stream route id are all route-scoped; the key dimension belongs inside a route, not in place of it.
- Reading a key only when its chip or card is opened: rejected because a chip exists to state a figure without interaction, and the reading has to precede the display.
- Re-reading every key on each active-interval tick: rejected because that tick exists to keep the focused reading current; reading every key every minute would multiply gateway traffic for figures that the background round already refreshes.

## Consequences

A route monitored with N credentials performs N account reads per background round, one authenticated request per key, so a deployment with many keys behind one gateway multiplies endpoint traffic and can reach a gateway's rate limit; reading slots serially within a route bounds concurrency to one in-flight request per gateway. Each slot's reading is cached separately and survives until a round, a panel opening, or a refresh replaces it, so a chip can trail its endpoint by one interval. Keys are configured by reference name only: the monitor resolves them through the credentials service and never reads or stores key material itself.
