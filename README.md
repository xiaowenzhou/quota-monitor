---
description: "Provider account balances and plan windows, session-log token analytics, derived spend, and the usage panel for the DeepSeek Harness web surface."
kind: "package-reference"
---

# @deepseek-ai/dsh-extension-quota-monitor

English | [中文](README.zh.md)

## Summary

`dsh-extension-quota-monitor` answers two questions about a running harness: how much has been spent, and how much remains. The Host half reads each configured provider's account endpoint through seventeen adapters, folds every persisted session log into per-day `provider · model` token totals, and taps the `llm/stream` waterfall for live counters. Its sidebar panel shows every watched account as a status chip, the selected account's figures, today/month/all-time totals with derived spend and budget bars, a calendar of daily usage, per-day and per-session breakdowns, and CSV/JSON exports. Credentials never leave the Host process, and an unreadable account reports why rather than zero.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Mount this plugin when an operator wants spend and remaining allowance beside the running session. It is read-only accounting layered over providers that are already configured: it discovers each provider through the settings registry instead of owning credentials, so adding or removing a provider row changes what the panel reports without any change here.

### What the panel reports

- **Every watched account in one rail** — one chip per provider with a severity dot, so a depleted account is visible without opening its card.
- **One account at a time** — the selected chip's card shows either a balance (remaining, spent, allowance, currency) or a subscription's plan windows, whichever that provider publishes.
- **Plan windows** — a subscription account reports each window as a used-share bar with its own reset countdown: the provider's rolling session window, five-hour, daily, weekly, monthly, the billing period, and a standalone quota.
- **Budget pools** — an AgentRouter account reports its account remainder plus one row per budget pool, each with the pool's own remainder and allowance.
- **Account usage** — an endpoint that publishes its own usage tables shows them under the card, one row per day, per model, or per budget pool. That ledger belongs to the credential the read was made with, so two keys behind one provider route each state their own totals — the split the local fold cannot make, because a model request names a route and never the key that served it.
- **Token analytics** — today, this month, and all time, each split into input, output, cache-read, and cache-write, plus today's cache-hit share of billed input.
- **Per-provider breakdown** — the same folded counters are also rolled up per provider route: each route's tokens with its share of every folded token, its calls, the models it served, today's tokens, its cache-hit share, the day it last ran, and its derived spend. The route is the finest identity the fold carries — a request names a provider and a model, never the credential — so two keys behind one route still read as one row.
- **Derived spend** — every total, day, route row, and session also carries an amount once `pricing.rules` is configured, with the number of calls no rule priced stated beside it.
- **Spend ceilings** — `budgets.daily` and `budgets.monthly` become bars that turn amber and then red as derived spend approaches them.
- **Daily calendar** — the current month as a weekday-aligned calendar, one shaded cell per day with its token count, today outlined; selecting a day opens its `provider · model` breakdown.
- **Busiest sessions** — the twenty most recently active sessions with their routes, calls, tokens, and spend.
- **Exports** — the day breakdown as CSV, the session breakdown as CSV, or the whole report as JSON, saved straight from the browser.
- **Manual allowance** — a provider with no readable account endpoint takes a manually entered figure, estimated against observed token volume.

### Which accounts can be read

| Adapter | Provider | Reads |
|---|---|---|
| `deepseek-balance` | DeepSeek | `GET {origin}/user/balance`; prefers the CNY entry |
| `openrouter-balance` | OpenRouter | `/api/v1/credits`; needs a Management Key |
| `moonshot-balance` | Moonshot / Kimi API | `/v1/users/me/balance` |
| `zai-balance` | Z.ai / BigModel open platform | `/api/paas/v4/balance` |
| `orcarouter-balance` | OrcaRouter | `/v1/balance`, then the OpenAI-compatible billing pair |
| `new-api` | new-api gateways | `/api/usage/token/`, then `/api/user/self`, denominated by `/api/status` |
| `sub2api` | Sub2API-protocol gateways | `{origin}/v1/usage`: a wallet, an aggregate quota, or subscription windows, as the answer declares |
| `sub2api-auth` | Sub2API resale panels | `{origin}/user/balance` plus today's spend, falling back to `/v1/usage` |
| `agent-router` | AgentRouter | `{origin}/desk/v1/stepcode/user/info` |
| `stepcode` | StepCode / AgentRouter desk | the same path, read as an account summary plus its budget pools, usage share, and billing period |
| `general` | CC Switch-style gateways | `GET {baseURL}/user/balance` |
| `zai-token-plan` | Z.ai / GLM Coding Plan | quota limits plus the subscription list |
| `kimi-token-plan` | Kimi For Coding | `https://api.kimi.com/coding/v1/usages` |
| `minimax-token-plan` | MiniMax Coding Plan | token-plan remains, global or CN host |
| `opencode-go` | OpenCode Go | `https://opencode.ai/zen/go/v1/usage` |
| `ollama` | Ollama cloud | `https://ollama.com/api/usage` |
| `cline-plan` | Cline Pass | `{baseURL}/users/me/plan/usage-limits` |
| `declarative` | any gateway | a configured URL plus JSON Pointers |

A route resolves to an adapter by explicit configuration first, then by canonical route id, then by the hostname its base URL names. A route matching none of these is asked what it is: one credential-free `GET {origin}/api/v1/settings/public` recognizes a Sub2API resale panel by the public settings document only such a panel serves. `detection.enabled: false` skips that probe, and a route that still resolves to nothing reports `unsupported` — a permanent answer, not a failure — and offers the manual allowance instead.

### Mounting

The Host half is the `quotaMonitor` Remote service; the browser half is declared through this package's `dsh.client` field. The shipped Web bundle mounts both through its `cordis.patch.yml`; a custom composition adds one row:

```yaml
- insert:
    - id: quota-monitor
      name: '@deepseek-ai/dsh-extension-quota-monitor'
      config:
        refresh:
          enabled: true
          activeMs: 60000
          backgroundMs: 300000
        thresholds:
          warningRemaining: 10
          criticalRemaining: 2
          warningPercentUsed: 80
          criticalPercentUsed: 95
        detection:
          enabled: true
```

`refresh.enabled: false` turns off every unattended request while leaving the panel's on-demand reads working. `thresholds` decides when a figure turns amber or red; the defaults suit a small prepaid account in CNY or USD, and an account on another scale overrides them per provider.

### Stating prices and ceilings

This package ships no price list. A relay resells the same model at its own rate, and a built-in table would go stale into confidently wrong figures, so spend is derived only from rules a deployment states:

```yaml
config:
  pricing:
    currency: USD
    rules:
      - model: deepseek-chat
        inputPerMillion: 0.27
        outputPerMillion: 1.1
        cacheReadPerMillion: 0.07
      - provider: my-relay
        model: glm-4*
        from: 2026-03-01
        inputPerMillion: 0.6
        outputPerMillion: 2.2
  budgets:
    daily: 5
    monthly: 100
    warningPercent: 80
    criticalPercent: 100
```

A rule matches a `provider · model` route by the narrowest name it gives: provider plus exact model, then a `*`-suffixed model family, then provider-wide, then a catch-all. `from` applies a rule from a local calendar day onward, so raising a price leaves earlier days priced as they were billed. `cacheReadPerMillion` and `cacheWritePerMillion` default to the input rate, matching a provider that meters cache tokens without pricing them separately. Calls no rule covers are counted, never charged at zero, and the panel states that count beside the amount. Budgets are denominated in `pricing.currency`, so a budget configured with no price behind it fails at load rather than rendering as unknown.

A deployment that keeps a catalog in a file names it under `pricing.imports` instead of restating it:

```yaml
config:
  pricing:
    currency: USD
    fuzzyMatch: true
    imports:
      - path: /srv/dsh/prices/provider-pricing.json
    rules:
      - provider: my-relay
        model: glm-4*
        inputPerMillion: 0.6
        outputPerMillion: 2.2
```

Each path must be absolute, is re-read on every background round, and is understood in two shapes: this package's own (`{ currency, rules }`, or a bare rule array) and the published vendor catalog (`providers.<vendor>.models.<id>.{ input, output, cachedInput, cacheWrite }`, USD per million). A rule written in `pricing.rules` outranks an imported one on an equally specific match, so a deployment overrides one model of a catalog without copying it. Amounts are never converted: a document whose unit is not `pricing.currency` fails at load. `fuzzyMatch` lets a model no exact or prefix pattern covers fall back to a normalized comparison — case, spaces, hyphens, dots, and bracketed notes ignored — which is what makes a vendor catalog usable for route ids that spell the same model differently; it is off by default because that hit is an inference rather than a statement. A catalog entry's context-length tiers and off-peak rates are not modelled, and are ignored.

### Exporting

The three export buttons ask the Host to build a document from the report already on screen and hand it back over the same Remote face the panel reads. Each CSV opens as UTF-8 in a spreadsheet, quotes every cell, and prefixes a cell starting with `=`, `+`, `-`, or `@` with an apostrophe so a route id is never evaluated as a formula. The JSON document carries the whole usage report plus one row per watched route naming its adapter and status; account balances, plan windows, and credential references stay in the panel.

### Teaching it a new gateway

A `monitors` entry overrides resolution for one route. It can force an adapter, point at a different endpoint, name a different credential, set that provider's own thresholds, or describe the read entirely:

```yaml
config:
  monitors:
    my-gateway:
      declarative:
        url: /api/account
        remainingPointer: /data/credits/available
        limitPointer: /data/credits/total
        currency: USD
```

The declarative form is data, not code: it names an endpoint and RFC 6901 JSON Pointers to the figures, so reaching a new gateway never widens what this plugin can execute.

`usageBaseURL` addresses a gateway whose account endpoint does not sit under the inference base URL, and `credentialRef` names the reference that gateway expects when it differs from the key its provider profile stores. `allowPlaintextEndpoint: true` is the one deliberate exception to the transport rule: an intranet gateway reached over plaintext at an address that carries no more trust than any other can only be read that way, and naming the route is the operator's approval. The permission covers that route alone — every other route still needs TLS or loopback. `allowedHosts` fences a route to the exact hosts it may address, as `host` or `host:port`; a copied configuration whose base URL was edited then fails as `blocked` instead of sending that route's key somewhere the deployment never named. An empty or absent list keeps the route fenced only by the transport rule.

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The two halves share one wire vocabulary: the browser half never reads provider state directly, and every figure it renders arrives from a `quotaMonitor` Remote method over the gateway.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | The `quotaMonitor` service: the `llm/stream` tap, the account reads, gateway detection, the refresh timers, and the Remote methods |
| [`src/config.ts`](src/config.ts) | Refresh cadence, warning thresholds, detection, prices, ceilings, and per-provider monitor overrides |
| [`src/identity.ts`](src/identity.ts) | Which adapter serves a route, and the private-host gate |
| [`src/http.ts`](src/http.ts) | The guarded JSON GET and the failure classification every adapter shares |
| [`src/parse.ts`](src/parse.ts) | Numeric coercion, key probing, percent clamping, epoch normalization |
| [`src/adapters/`](src/adapters/) | One module per account family, the Sub2API fingerprint, and the declarative reader |
| [`src/pricing.ts`](src/pricing.ts) | Rule matching by route and day, and the cost accumulator every scope shares |
| [`src/price-import.ts`](src/price-import.ts) | Reading price rules from a configured document, in either understood format |
| [`src/usage-fold.ts`](src/usage-fold.ts) | Pure folding of session events into per-day, per-route counters, including the per-provider rollup |
| [`src/usage-store.ts`](src/usage-store.ts) | The fold round: reading sessions, caching folds, assembling the report |
| [`src/usage-domain.ts`](src/usage-domain.ts) | The `quota_usage` storage domain holding one fold record per session |
| [`src/export.ts`](src/export.ts) | The two CSV documents and the JSON report the panel downloads |
| [`src/types.ts`](src/types.ts) | The account, usage, and snapshot types shared by both halves |
| [`src/client/index.ts`](src/client/index.ts) | The browser mount, the dictionary registration, and the two slot registrations |
| [`src/client/UsagePanel.tsx`](src/client/UsagePanel.tsx) | The panel root: data loading and the seven sections |
| [`src/client/ProviderUsage.tsx`](src/client/ProviderUsage.tsx) | The per-provider token breakdown and each route's share of all tokens |

### How an account read resolves

A read starts from the settings registry, not a hard-coded provider list. For each route it resolves the settings profile (`baseURL` plus `apiKeyEnv`), resolves that reference through the credentials service, selects an adapter, and runs it. Every failure becomes an account status the card renders verbatim: `not-configured`, `unauthorized`, `rate-limited`, `unsupported`, `invalid-response`, `unavailable`, or `blocked`. No failure produces a figure.

Three rules keep a misconfigured monitor from becoming an exfiltration path. A credential travels only to an absolute `https:` URL, with loopback `http:` allowed for a self-hosted gateway; a URL embedding credentials or naming a plaintext public host is refused as `blocked` before any request. Redirects are never followed, because a redirect would carry the `Authorization` header to a host this configuration never approved. Response bodies are capped at 1 MiB.

Detection obeys the same rules and adds one of its own: the fingerprint probe carries no credential, runs only for a route no rule resolved and only when a credential exists to use afterwards, and its answer is cached per provider and base URL, so an unrecognized gateway is asked once rather than on every refresh.

One gateway family answers three different ways under one protocol, so a Sub2API reading declares its own mode — a wallet card or a metered subscription — and the panel frames the card by that declaration rather than by the adapter id.

The private-host gate exists because of Ollama: a local `localhost:11434` daemon shares the cloud route id but has no subscription, so treating it as a quota account would invent a window that does not exist. A canonical route id pointing at this machine therefore resolves to no adapter.

### How usage is folded

The report is folded from persisted session logs rather than from in-memory counters, so it survives restarts and covers sessions this process never ran. A round lists every session, reads the ones whose logs grew, and accumulates `assistant/message` events carrying provider-reported `usage` into the local calendar day of the event. The `provider · model` route comes from the most recent `request/context` event, so a session that switched models keeps separate rows.

Only provider-reported usage is folded. A step whose adapter reported none contributes nothing rather than an estimate, so every figure traces back to a provider's own accounting.

Each session's fold is cached in the `quota_usage` storage domain with the log `seq` it reached, so a steady-state round costs one listing plus the sessions that actually changed. A log that shrank, rather than grew, is refolded from the start: its earlier seqs no longer identify the same events. The cache holds counters, route ids, and the last instant usage was recorded — no prompt text, tool output, or file path — and a lost record costs a refold, never a wrong figure.

Days are local, not UTC. A reader asking about "today" means their own day, and a UTC fold would move eight hours of usage into the wrong bucket for a CN workday.

### How spend is derived

Cost is derived while the report is assembled, from the counters of each day, not from a running total. A row is priced by the rule in force on its own day, so the day, the session, the month, and the all-time figure all agree, and a later price change never re-rates history. Each scope carries its own amount plus the calls it could not price, which is how a partly priced total stays readable instead of collapsing to a dash.

A budget window compares its ceiling against derived spend in the same currency. A window whose spend rests entirely on unpriced calls reports `unknown` rather than a comfortable zero percent.

### Why reads stay in-process

Account reads use Node's own TLS stack rather than shelling out to a sidecar or a CLI, so the plugin keeps its single-process install story and needs no extra binary on a deployment host. They also run outside any conversation, which keeps their traffic out of the stream tap and out of the counters that tap feeds.

</details>

<a id="further-exploration"></a>
## Further Exploration

Read these pages when you need the seams this package reads or the conventions it follows.

- [Extensions subsystem](../../../docs/subsystems/extensions.md) — how a Cordis extension package is composed and mounted.
- [Settings subsystem](../../../docs/subsystems/settings.md) — the provider-profile registry account reads resolve against.
- [LLM streaming subsystem](../../../docs/subsystems/llm-streaming.md) — the waterfall this package taps for live counters.
- [Session query](../../session-query/session-query/README.md) — the session corpus the usage fold reads.
- [Storage domains](../../storage/storage-domain/README.md) — the KV domain layer holding the fold cache.

<a id="model-experience"></a>
## Model Experience

None, as the monitor only observes `llm/stream` traffic, reads account endpoints, folds persisted logs, and serves browser reads; it registers no prompt section, tool, or request rewrite.

#### KV Cache effect

The panel and its Host service add nothing to model context. Token figures are read-side accounting over already-streamed calls, and account reads run outside any conversation, so no KV cache grows because of this package.

## Known Limitations and Deferred Work
<a id="known-limitations-and-deferred-work"></a>

- Usage totals are folded from persisted session logs, so a session whose log was never written contributes nothing. Live per-process counters cover the current process only and reset with it, as do manual allowances.
- The session list identifies a session by id, latest activity, and routes; it carries no conversation title, because a title is prompt-derived text and the `quota_usage` fold holds counters and route ids only. Reading a title would require a second read of every session log the panel lists.
- Spend is only as complete as the configured prices. No price list ships, a route no rule covers is reported as unpriced rather than free, and a rule states one flat per-million rate, so tiered, batch, and context-length pricing are not expressed.
- An imported catalog is priced at one rate per model. Context-length tiers and off-peak rates such a document may carry are ignored, and an imported amount is never converted, so a document in another unit is refused rather than rescaled. Nothing is priced by time of day: a provider charging peak and off-peak rates for the same model is billed by this package at the single rate its rule states. `fuzzyMatch` compares normalized model ids, which can price a route whose id happens to normalize like a catalog entry; leaving it off keeps matching to what a rule literally says.
- Adapter coverage is endpoint-specific. A gateway publishing none of the recognized endpoints, and answering no fingerprint, reports `unsupported`; the declarative monitor and the manual allowance are the two workarounds.
- Gateway detection recognizes one family. It probes a single public settings document, so a relay that hides that route, or serves it behind a login, still needs `monitors.<id>.adapter`.
- AgentRouter discloses no unit with its account and pool figures, so the panel labels them `credits` and shows them exactly as reported. Its section keys are read from an ordered candidate list rather than one pinned spelling, so a renamed field degrades that row rather than reporting a wrong number.
- A Cline Pass account is read only through its plan windows; the separate credit-balance endpoint is not walked, so a pay-as-you-go Cline account without an active plan falls back to the manual allowance.
- OpenCode Go's usage endpoint is not part of a documented provider API and may change upstream; a change surfaces as `invalid-response` on that card.
- The fold reads whole session logs. A corpus with very many long sessions makes the first round after a cold start proportionally slower; subsequent rounds read only what changed.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

No runtime invariant companion is published. The service owns one `llm/stream` tap, three timers, the usage store, and its in-memory maps, and the single effect disposer installed in `[Service.init]` releases all of them, so no second authority exists for a companion to check at runtime.

Panel copy is locale-owned: `src/client/locales.ts` declares the `quotaMonitor` namespace and both shipped dictionaries, the `main` registration declares `locale: NS`, and every component reads its strings through the framework `t` seat. `verify-client-ui-i18n` rejects a string reintroduced into a component.

The sidebar entry id and the `main` slot key are the same string (`quota-monitor`); that identity is how the rail addresses the panel it selects, so changing one without the other silently detaches the entry.

The panel's shading ramp, status colours, and bars are built from the design-platform alias tokens only; `color-mix` over `--dsw-alias-state-business-primary` is what produces the five calendar steps, so the calendar follows a theme change without a second palette.

</details>
