# Provider keys and routing (0.1.7)

Each provider has one selector button. Its key list shows each key's quota, optional custom name, upstream identity and active status. Selecting a row only changes the displayed account. **Use this key** changes the provider's actual credential and pins manual mode.

Add keys through the password field, rename them, or detach inactive keys. Detaching preserves credentials in the Host credential store. Metadata persists in the `quota_keys` storage domain; no secret values are included in snapshots or exports.

Current accounts and key management follow the Host's live LLM provider registry. Adding, renaming, disabling or deleting a provider in model settings updates the open quota panel through the same topology event. Removed providers stop receiving account refreshes or key-management requests. Invalid provider/key selections fall back to a valid entry and late reads cannot restore a deleted account. Historic usage remains in the comparison, labelled **Historical provider**, without an active account or key manager. Stored source credentials and monitoring metadata are retained for re-enabling the same provider.

**Quota routing** selects healthy keys within the chosen provider. It uses the tightest subscription window or relative remaining balance, refreshes old readings, and excludes exhausted keys, failed account reads and keys with recent model-request errors. Enabling routing connects the provider's `apiKeyEnv` to a dedicated active credential reference. Source credentials and the selected model are preserved. Requests sharing a routed provider are serialized to prevent credential races. Failed streams are not replayed; cooldown affects subsequent requests.

**Jev** uses the OpenRouter Decisions API (`typesafe/jev-1.13` by default). Enter the OpenRouter key used for Jev in the routing form. Only anonymous quota and reset metadata is sent, without conversation text or source credentials. Timeout, invalid or low-confidence decisions fall back to local quota selection. Jev calls incur OpenRouter usage. Configure `routing.maxAgeMs`, `cooldownMs`, `jevTimeoutMs`, `jevMinConfidence` and `jevModel` in plugin settings as needed.

Provider additions: Command Code / GOAT identity and 5h/weekly windows, API-reported monthly remainder and monthly percentage when the API supplies a total; OpenCode Zen / Go aliases using their shared usage endpoint; OpenRouter ordinary-key limit and label fallback when the account-credit endpoint rejects it. A missing key cap never implies unlimited account credit. Community subscription endpoints may change and require live credentials for account-specific verification.

For rollback to an older plugin, point the provider's `apiKeyEnv` back to the desired source reference. [中文及详细说明](MULTI_KEY.zh.md).

References: [Command Code compatibility adapter](https://github.com/shxtmaker/dsh-token-quota), [OpenCode helper](https://github.com/xiaojiecode/opencode-helper), [Jev API](https://openrouter.ai/docs/guides/community/jev), [OpenRouter current key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).
