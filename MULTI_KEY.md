# Provider keys and routing (0.1.7)

Select a provider once in the page's top dropdown. The allowance/key manager follows this selection and shows each key's quota, optional custom name, upstream identity and active status. Selecting a key row only changes the displayed account. **Use this key** changes the provider's actual credential and pins manual mode.

Add keys through the password field, rename them, or detach inactive keys. Detaching preserves credentials in the Host credential store. Metadata persists in the `quota_keys` storage domain; no secret values are included in snapshots or exports.

Current accounts and key management follow the Host's live LLM provider registry. Adding, renaming, disabling or deleting a provider in model settings updates the open quota panel through the same topology event. Removed providers stop receiving account refreshes or key-management requests. Invalid provider/key selections fall back to a valid entry and late reads cannot restore a deleted account. Historic usage remains in the comparison, labelled **Historical provider**, without an active account or key manager. Stored source credentials and monitoring metadata are retained for re-enabling the same provider.

**Active key first.** The single Usage and balance page defaults to the selected provider's actually active key: remaining allowance, billing-period spend, period usage and model breakdown. Below the provider selector, tabs switch between **Current key**, **Member analysis**, **Allowance & keys** and **Local calls**; only the open tab is rendered. Inspecting another member does not change the active key or its overview.

Per-key token history exists only where the upstream reports it, which today is the AgentRouter / StepCode desk. The **Current key** tab therefore appears only for such a provider, and the **Member analysis** tab additionally needs two or more monitored keys. Any other provider offers only **Allowance & keys** (opened by default) and **Local calls**, instead of empty tiles and charts.

The layout follows the native Plugins and Automation pages: a centred column up to 960px wide, title and description on the left with the provider dropdown and refresh on the right, and pill tabs for the views. Cards share one surface (soft background, hairline border, 16px radius) with tabular figures; allowances, budgets, reset windows, key inventory, routing, local totals, calendar and sessions use the same cards, type scale and controls, and wide tables scroll inside their card.

Temporary upstream failures retain previously successful per-key token history with its update time; balances still report the current failure. Opening the page or selecting a key retries temporary failures after `refresh.activeMs` (60 seconds by default), while healthy cached readings are reused. A recovered single-key reading updates charts and inventory immediately. First failures, rejected credentials and missing upstream detail never become zero figures. Retained history lasts only for the current service process.

- Select a provider and This week, Last week, This month, Last month or Last 30 days. Weeks start Monday in Asia/Shanghai; current periods end today.
- Member ranking cards sort keys by period tokens and show calls, cache-read share and current billing-period unit price. Select a member to inspect its model usage; expand Exact member figures for calls, active days and usage shares.
- The active key and selected member use donut cards with one-line legends (name, tokens, share) and a daily trend. Every model stays individually inspectable: hover a segment or legend, focus it with the keyboard or select it to update calls, input, output, cache read/write and total tokens below. Period/member changes update those metrics; model colors stay stable.
- Exact member, model and daily tables are collapsed by default. Unattributed token totals are labelled Unclassified; grey date marks indicate missing data, never zero usage.
- Each key is queried with its own credential. A key label identifies a member; shared keys cannot distinguish individuals. Providers are compared separately, avoiding a cross-provider sum of shared credentials.
- History defaults to 62 days; `usage.days` accepts 1–366. Incomplete windows are labelled partial; missing detail stays unknown. History absent upstream cannot be reconstructed.
- Spend, billing-period tokens and the derived unit price remain explicitly tied to the current billing period. Historical and per-model costs are unavailable upstream and are never inferred from this month's spend.
- Allowance/key management retains pools, add/rename/detach and routing. Local calls cover only this DSH instance, not a member's usage through other clients.

**Quota routing** selects healthy keys within the chosen provider. It uses the tightest subscription window or relative remaining balance, refreshes old readings, and excludes exhausted keys, failed account reads and keys with recent model-request errors. Enabling routing connects the provider's `apiKeyEnv` to a dedicated active credential reference. Source credentials and the selected model are preserved. Requests sharing a routed provider are serialized to prevent credential races. Failed streams are not replayed; cooldown affects subsequent requests.

**Jev** uses the OpenRouter Decisions API (`typesafe/jev-1.13` by default). Enter the OpenRouter key used for Jev in the routing form. Only anonymous quota and reset metadata is sent, without conversation text or source credentials. Timeout, invalid or low-confidence decisions fall back to local quota selection. Jev calls incur OpenRouter usage. Configure `routing.maxAgeMs`, `cooldownMs`, `jevTimeoutMs`, `jevMinConfidence` and `jevModel` in plugin settings as needed.

Provider additions: Command Code / GOAT identity and 5h/weekly windows, API-reported monthly remainder and monthly percentage when the API supplies a total; OpenCode Zen / Go aliases using their shared usage endpoint; OpenRouter ordinary-key limit and label fallback when the account-credit endpoint rejects it. A missing key cap never implies unlimited account credit. Community subscription endpoints may change and require live credentials for account-specific verification.

For rollback to an older plugin, point the provider's `apiKeyEnv` back to the desired source reference. [中文及详细说明](MULTI_KEY.zh.md).

References: [Command Code compatibility adapter](https://github.com/shxtmaker/dsh-token-quota), [OpenCode helper](https://github.com/xiaojiecode/opencode-helper), [Jev API](https://openrouter.ai/docs/guides/community/jev), [OpenRouter current key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).
