window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-extension-quota-monitor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let zod = require("zod");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region ../../typert/protocol/lib/types/remote-info.js
		/** Lazy assembly of generated Remote definitions using caller-supplied Zod; no runtime imports. */
		/**
		* Retain one generated definition per endpoint without constructing parsers or projections.
		* The class instance builds its shared descriptor/method index on first access;
		* input schemas and JSON Schema projections are cached only when requested.
		* @param spec - compiler-produced method facts and Zod factories.
		* @param zod - the generated artifact's Zod runtime for named-input parsers.
		* @returns a lazy, mountable info instance with no registration or transport effects.
		*/
		function createTypertRemoteInfo(spec, zod) {
			return new RemoteInfo(spec, zod);
		}
		var RemoteInfo = class {
			spec;
			zod;
			index;
			constructor(spec, zod) {
				this.spec = spec;
				this.zod = zod;
			}
			get package() {
				return this.spec.package;
			}
			get descriptors() {
				return this.resolve().descriptors;
			}
			get methods() {
				return this.resolve().methods;
			}
			resolve() {
				if (this.index !== void 0) return this.index;
				const zod = this.zod;
				const descriptors = [];
				const methods = Object.create(null);
				for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
					const separator = endpoint.indexOf("/");
					const namespace = endpoint.slice(0, separator);
					const method = endpoint.slice(separator + 1);
					const parameters = definition.parameters.map((parameter) => ({
						...parameter,
						wire: parameter.wire ?? parameter.name
					}));
					const descriptor = {
						...definition,
						id: `${this.spec.package}#${endpoint}`,
						namespace,
						method,
						parameters,
						result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
					};
					if (definition.invocation.kind === "direct") {
						const inputs = [];
						methods[endpoint] = Object.assign(descriptor, {
							input(options) {
								const strict = options?.strict === true;
								return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
							},
							invoke(remote, input, signal) {
								const named = input;
								const values = parameters.map((parameter) => named[parameter.wire]);
								if (definition.cancellation !== void 0) values.push(signal);
								const receiver = Reflect.get(remote, namespace);
								return Reflect.get(receiver, method).apply(receiver, values);
							}
						});
					}
					descriptors.push(descriptor);
				}
				return this.index = {
					descriptors,
					methods
				};
			}
		};
		function optional(parameter) {
			return parameter.source === "json" && parameter.acceptsUndefined === true;
		}
		var NamedInput = class {
			parameters;
			strict;
			zod;
			schema;
			projection;
			constructor(parameters, strict, zod) {
				this.parameters = parameters;
				this.strict = strict;
				this.zod = zod;
			}
			codec(parameter) {
				return this.strict ? parameter.strictCodec : parameter.codec;
			}
			create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
				const value = this.codec(parameter).create();
				return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
			})));
			get jsonSchema() {
				return this.project().jsonSchema;
			}
			get jsonSchemaError() {
				return this.project().jsonSchemaError;
			}
			project() {
				if (this.projection !== void 0) return this.projection;
				const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
				if (unavailable !== void 0) return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
				return this.projection = { jsonSchema: {
					type: "object",
					properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
						...this.codec(parameter).jsonSchema,
						...parameter.description === void 0 ? {} : { description: parameter.description }
					}])),
					required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
					additionalProperties: false
				} };
			}
		};
		var ResultValue = class {
			spec;
			projection;
			constructor(spec) {
				this.spec = spec;
			}
			get mode() {
				return this.spec.mode;
			}
			get typeSymbol() {
				return this.spec.typeSymbol;
			}
			get create() {
				return this.spec.create;
			}
			get decode() {
				return this.spec.decode;
			}
			get encode() {
				return this.spec.encode;
			}
			get description() {
				return this.spec.description;
			}
			get jsonSchemaError() {
				return this.spec.jsonSchemaError;
			}
			get jsonSchema() {
				if (this.projection === void 0) {
					const schema = this.spec.jsonSchema;
					this.projection = { value: schema === void 0 ? void 0 : {
						...schema,
						description: this.spec.description
					} };
				}
				return this.projection.value;
			}
		};
		//#endregion
		//#region lib/typert.remote-client.js
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema$value ??= zod.z.object({ "kind": zod.z.union([
			zod.z.literal("daily-csv"),
			zod.z.literal("sessions-csv"),
			zod.z.literal("report-json")
		]) });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema$value ??= zod.z.object({
			"kind": zod.z.union([
				zod.z.literal("daily-csv"),
				zod.z.literal("sessions-csv"),
				zod.z.literal("report-json")
			]),
			"filename": zod.z.string().describe("Suggested download name, carrying the export's local calendar day."),
			"mediaType": zod.z.string().describe("MIME type matching {@link kind}."),
			"content": zod.z.string().describe("The document itself.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema$value ??= zod.z.object({
			"provider": zod.z.string().describe("Provider route whose account is read."),
			"credentialRef": zod.z.string().optional().describe("Credential reference of the reading to answer with. Absent reads the route's first monitored credential — its own key unless `monitors.<id>.credentialRefs` names other credentials."),
			"refresh": zod.z.boolean().optional().describe("Bypass the cached reading and query the endpoint again.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema$value ??= zod.z.object({
			"id": zod.z.string().readonly().describe("Provider route key this account belongs to."),
			"name": zod.z.string().describe("Display label for the account card."),
			"mode": zod.z.union([
				zod.z.literal("balance"),
				zod.z.literal("subscription"),
				zod.z.literal("unsupported")
			]),
			"status": zod.z.union([
				zod.z.literal("blocked"),
				zod.z.literal("unsupported"),
				zod.z.literal("ok"),
				zod.z.literal("not-configured"),
				zod.z.literal("unauthorized"),
				zod.z.literal("rate-limited"),
				zod.z.literal("invalid-response"),
				zod.z.literal("unavailable")
			]),
			"adapter": zod.z.string().describe("The adapter that produced the reading, for the card's origin line."),
			"credentialRef": zod.z.string().readonly().optional().describe("Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."),
			"keyName": zod.z.string().optional().describe("User label and provider-disclosed identity, never a secret."),
			"accountName": zod.z.string().optional(),
			"fetchedAt": zod.z.number().describe("Epoch ms of the reading."),
			"remaining": zod.z.number().optional().describe("Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."),
			"used": zod.z.number().optional().describe("Cumulative spend, when the endpoint discloses one."),
			"limit": zod.z.number().optional().describe("Total allowance behind {@link remaining}, when the endpoint discloses one."),
			"currency": zod.z.string().optional().describe("Unit label for the three figures above: `CNY`, `USD`, `credits`, …"),
			"unlimited": zod.z.boolean().optional().describe("True when the endpoint reports an unmetered allowance; the panel shows `∞`."),
			"plan": zod.z.string().optional().describe("Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."),
			"planWindows": zod.z.array(zod.z.object({
				"kind": zod.z.union([
					zod.z.literal("session"),
					zod.z.literal("five-hour"),
					zod.z.literal("daily"),
					zod.z.literal("weekly"),
					zod.z.literal("monthly"),
					zod.z.literal("billing"),
					zod.z.literal("quota")
				]),
				"percentUsed": zod.z.number().describe("Used share of the window, clamped to 0–100."),
				"resetAt": zod.z.string().optional().describe("ISO instant at which the window resets, when the endpoint discloses one."),
				"remaining": zod.z.number().optional().describe("Remaining raw allowance, when the endpoint discloses a count rather than only a percentage.")
			})).optional().describe("Every plan window the endpoint disclosed, tightest first."),
			"budgetPools": zod.z.array(zod.z.object({
				"name": zod.z.string(),
				"remaining": zod.z.number().describe("Remaining amount in the account's {@link QuotaAccount.currency} units."),
				"limit": zod.z.number().optional().describe("The pool's allowance, when the endpoint discloses one."),
				"percentUsed": zod.z.number().optional().describe("Used share of the pool, clamped to 0–100; absent when no allowance is disclosed.")
			})).optional().describe("Budget pools reported beside the account balance, in endpoint order."),
			"usage": zod.z.array(zod.z.object({
				"kind": zod.z.union([
					zod.z.literal("model"),
					zod.z.literal("day"),
					zod.z.literal("pool")
				]).readonly().describe("Which table the row came from, so the panel groups rows by kind."),
				"label": zod.z.string().readonly().describe("The row's own label: a calendar day, a model id, or a pool name."),
				"requests": zod.z.number().optional().describe("Calls or requests the endpoint counted."),
				"inputTokens": zod.z.number().optional(),
				"outputTokens": zod.z.number().optional(),
				"cacheReadTokens": zod.z.number().optional(),
				"cacheWriteTokens": zod.z.number().optional(),
				"totalTokens": zod.z.number().optional().describe("Sum of the four token buckets, when the endpoint reports its own total."),
				"cost": zod.z.number().optional().describe("Spend the endpoint reported, denominated in {@link currency}."),
				"currency": zod.z.string().optional().describe("Unit `cost` is denominated in, when the row states one.")
			})).optional().describe("Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."),
			"keyUsage": zod.z.object({
				"days": zod.z.number().describe("Requested history window, in days (1–366)."),
				"startDate": zod.z.string().optional().describe("Window bounds the endpoint answered with, when it states them."),
				"endDate": zod.z.string().optional(),
				"period": zod.z.object({
					"periodKey": zod.z.string().optional().describe("Upstream period key, e.g. `2026-10`."),
					"startAt": zod.z.string().optional().describe("Period bounds, ISO 8601 with offset."),
					"endAt": zod.z.string().optional(),
					"updatedAt": zod.z.number().optional().describe("Epoch ms the endpoint last folded this period, when it states one."),
					"used": zod.z.number().optional().describe("Spend and allowance over the same period, for reconciliation with the card."),
					"limit": zod.z.number().optional(),
					"remaining": zod.z.number().optional(),
					"percentUsed": zod.z.number().optional(),
					"currency": zod.z.string().optional(),
					"inputTokens": zod.z.number().optional(),
					"outputTokens": zod.z.number().optional(),
					"reasoningTokens": zod.z.number().optional(),
					"cacheReadTokens": zod.z.number().optional(),
					"cacheWriteTokens": zod.z.number().optional(),
					"totalTokens": zod.z.number().optional().describe("Sum of every bucket above, as the endpoint reports it."),
					"calls": zod.z.number().optional(),
					"successCalls": zod.z.number().optional(),
					"failedCalls": zod.z.number().optional(),
					"streamCalls": zod.z.number().optional()
				}).optional().describe("The billing period's own totals, from the account endpoint."),
				"window": zod.z.object({
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"reasoningTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
					"calls": zod.z.number().optional(),
					"successCalls": zod.z.number().optional(),
					"failedCalls": zod.z.number().optional(),
					"streamCalls": zod.z.number().optional()
				}).optional().describe("Totals over {@link days}, from the usage endpoint."),
				"models": zod.z.array(zod.z.object({
					"model": zod.z.string(),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"reasoningTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
					"calls": zod.z.number().optional(),
					"successCalls": zod.z.number().optional(),
					"failedCalls": zod.z.number().optional(),
					"streamCalls": zod.z.number().optional()
				})).describe("Per-model totals over the window, from the usage endpoint."),
				"daily": zod.z.array(zod.z.object({
					"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"reasoningTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
					"calls": zod.z.number().optional(),
					"successCalls": zod.z.number().optional(),
					"failedCalls": zod.z.number().optional(),
					"streamCalls": zod.z.number().optional()
				})).describe("Per-day totals over the window, from the usage endpoint."),
				"points": zod.z.array(zod.z.object({
					"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
					"model": zod.z.string().describe("Model id the day's calls named."),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"reasoningTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
					"calls": zod.z.number().optional(),
					"successCalls": zod.z.number().optional(),
					"failedCalls": zod.z.number().optional(),
					"streamCalls": zod.z.number().optional()
				})).describe("Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this.")
			}).optional().describe("What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."),
			"keyUsageFetchedAt": zod.z.number().optional().describe("Last successful history read, present when a transient failure retains older data."),
			"warning": zod.z.union([
				zod.z.literal("normal"),
				zod.z.literal("warning"),
				zod.z.literal("critical")
			]).optional().describe("Severity of the remaining figure, when one could be resolved."),
			"missingCredentials": zod.z.array(zod.z.string()).optional().describe("Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."),
			"reason": zod.z.string().optional().describe("Human-readable diagnosis for a non-`ok` status; never carries response bodies."),
			"manual": zod.z.object({
				"total": zod.z.number().describe("The manually entered total allowance."),
				"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
				"remaining": zod.z.number(),
				"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
			}).optional().describe("Manual allowance the user entered for this provider, when no endpoint answered.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema$value ??= zod.z.object({
			"capturedAt": zod.z.number(),
			"providers": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"mode": zod.z.union([
					zod.z.literal("balance"),
					zod.z.literal("subscription"),
					zod.z.literal("unsupported")
				]).describe("Mode of {@link accounts}[0], the route's first monitored credential."),
				"adapter": zod.z.string().describe("The adapter that would serve this provider's account read."),
				"status": zod.z.union([
					zod.z.literal("blocked"),
					zod.z.literal("unsupported"),
					zod.z.literal("ok"),
					zod.z.literal("not-configured"),
					zod.z.literal("unauthorized"),
					zod.z.literal("rate-limited"),
					zod.z.literal("invalid-response"),
					zod.z.literal("unavailable")
				]).describe("Latest known status of {@link accounts}[0]."),
				"warning": zod.z.union([
					zod.z.literal("normal"),
					zod.z.literal("warning"),
					zod.z.literal("critical")
				]).optional().describe("Latest known severity of {@link accounts}[0], so the selector can mark a draining account."),
				"credentialRefs": zod.z.array(zod.z.string()).describe("Credential references this route's account is read with, in configuration order. Empty means the route has one slot read with whatever credential its own profile (or `monitors.<id>.credentialRef`) names, which may be none."),
				"activeCredentialRef": zod.z.string().optional().describe("The monitored credential whose value the route currently authenticates with, when this monitor routes among them and the route's credential is one of them. Absent while no request has run since load, or when the route's credential is none of the monitored keys."),
				"accounts": zod.z.array(zod.z.object({
					"id": zod.z.string().readonly().describe("Provider route key this account belongs to."),
					"name": zod.z.string().describe("Display label for the account card."),
					"mode": zod.z.union([
						zod.z.literal("balance"),
						zod.z.literal("subscription"),
						zod.z.literal("unsupported")
					]),
					"status": zod.z.union([
						zod.z.literal("blocked"),
						zod.z.literal("unsupported"),
						zod.z.literal("ok"),
						zod.z.literal("not-configured"),
						zod.z.literal("unauthorized"),
						zod.z.literal("rate-limited"),
						zod.z.literal("invalid-response"),
						zod.z.literal("unavailable")
					]),
					"adapter": zod.z.string().describe("The adapter that produced the reading, for the card's origin line."),
					"credentialRef": zod.z.string().readonly().optional().describe("Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."),
					"keyName": zod.z.string().optional().describe("User label and provider-disclosed identity, never a secret."),
					"accountName": zod.z.string().optional(),
					"fetchedAt": zod.z.number().describe("Epoch ms of the reading."),
					"remaining": zod.z.number().optional().describe("Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."),
					"used": zod.z.number().optional().describe("Cumulative spend, when the endpoint discloses one."),
					"limit": zod.z.number().optional().describe("Total allowance behind {@link remaining}, when the endpoint discloses one."),
					"currency": zod.z.string().optional().describe("Unit label for the three figures above: `CNY`, `USD`, `credits`, …"),
					"unlimited": zod.z.boolean().optional().describe("True when the endpoint reports an unmetered allowance; the panel shows `∞`."),
					"plan": zod.z.string().optional().describe("Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."),
					"planWindows": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("session"),
							zod.z.literal("five-hour"),
							zod.z.literal("daily"),
							zod.z.literal("weekly"),
							zod.z.literal("monthly"),
							zod.z.literal("billing"),
							zod.z.literal("quota")
						]),
						"percentUsed": zod.z.number().describe("Used share of the window, clamped to 0–100."),
						"resetAt": zod.z.string().optional().describe("ISO instant at which the window resets, when the endpoint discloses one."),
						"remaining": zod.z.number().optional().describe("Remaining raw allowance, when the endpoint discloses a count rather than only a percentage.")
					})).optional().describe("Every plan window the endpoint disclosed, tightest first."),
					"budgetPools": zod.z.array(zod.z.object({
						"name": zod.z.string(),
						"remaining": zod.z.number().describe("Remaining amount in the account's {@link QuotaAccount.currency} units."),
						"limit": zod.z.number().optional().describe("The pool's allowance, when the endpoint discloses one."),
						"percentUsed": zod.z.number().optional().describe("Used share of the pool, clamped to 0–100; absent when no allowance is disclosed.")
					})).optional().describe("Budget pools reported beside the account balance, in endpoint order."),
					"usage": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("model"),
							zod.z.literal("day"),
							zod.z.literal("pool")
						]).readonly().describe("Which table the row came from, so the panel groups rows by kind."),
						"label": zod.z.string().readonly().describe("The row's own label: a calendar day, a model id, or a pool name."),
						"requests": zod.z.number().optional().describe("Calls or requests the endpoint counted."),
						"inputTokens": zod.z.number().optional(),
						"outputTokens": zod.z.number().optional(),
						"cacheReadTokens": zod.z.number().optional(),
						"cacheWriteTokens": zod.z.number().optional(),
						"totalTokens": zod.z.number().optional().describe("Sum of the four token buckets, when the endpoint reports its own total."),
						"cost": zod.z.number().optional().describe("Spend the endpoint reported, denominated in {@link currency}."),
						"currency": zod.z.string().optional().describe("Unit `cost` is denominated in, when the row states one.")
					})).optional().describe("Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."),
					"keyUsage": zod.z.object({
						"days": zod.z.number().describe("Requested history window, in days (1–366)."),
						"startDate": zod.z.string().optional().describe("Window bounds the endpoint answered with, when it states them."),
						"endDate": zod.z.string().optional(),
						"period": zod.z.object({
							"periodKey": zod.z.string().optional().describe("Upstream period key, e.g. `2026-10`."),
							"startAt": zod.z.string().optional().describe("Period bounds, ISO 8601 with offset."),
							"endAt": zod.z.string().optional(),
							"updatedAt": zod.z.number().optional().describe("Epoch ms the endpoint last folded this period, when it states one."),
							"used": zod.z.number().optional().describe("Spend and allowance over the same period, for reconciliation with the card."),
							"limit": zod.z.number().optional(),
							"remaining": zod.z.number().optional(),
							"percentUsed": zod.z.number().optional(),
							"currency": zod.z.string().optional(),
							"inputTokens": zod.z.number().optional(),
							"outputTokens": zod.z.number().optional(),
							"reasoningTokens": zod.z.number().optional(),
							"cacheReadTokens": zod.z.number().optional(),
							"cacheWriteTokens": zod.z.number().optional(),
							"totalTokens": zod.z.number().optional().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("The billing period's own totals, from the account endpoint."),
						"window": zod.z.object({
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("Totals over {@link days}, from the usage endpoint."),
						"models": zod.z.array(zod.z.object({
							"model": zod.z.string(),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-model totals over the window, from the usage endpoint."),
						"daily": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day totals over the window, from the usage endpoint."),
						"points": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"model": zod.z.string().describe("Model id the day's calls named."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this.")
					}).optional().describe("What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."),
					"keyUsageFetchedAt": zod.z.number().optional().describe("Last successful history read, present when a transient failure retains older data."),
					"warning": zod.z.union([
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]).optional().describe("Severity of the remaining figure, when one could be resolved."),
					"missingCredentials": zod.z.array(zod.z.string()).optional().describe("Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."),
					"reason": zod.z.string().optional().describe("Human-readable diagnosis for a non-`ok` status; never carries response bodies."),
					"manual": zod.z.object({
						"total": zod.z.number().describe("The manually entered total allowance."),
						"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
						"remaining": zod.z.number(),
						"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
					}).optional().describe("Manual allowance the user entered for this provider, when no endpoint answered.")
				})).describe("Readings of {@link credentialRefs}, one per credential read so far and in the same order. A route not yet read carries none, so a selector can draw every monitored credential before the first answer arrives."),
				"keyNames": zod.z.record(zod.z.string(), zod.z.string()).readonly().optional(),
				"routing": zod.z.object({
					"mode": zod.z.union([
						zod.z.literal("manual"),
						zod.z.literal("quota"),
						zod.z.literal("jev")
					]),
					"wired": zod.z.boolean(),
					"activeRef": zod.z.string().optional(),
					"jevConfigured": zod.z.boolean(),
					"lastDecision": zod.z.string().optional()
				}).optional()
			})).describe("Provider selector entries, in registry order."),
			"rows": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"reasoningTokens": zod.z.number(),
				"totalTokens": zod.z.number(),
				"errorCount": zod.z.number(),
				"lastCallAt": zod.z.number(),
				"lastModel": zod.z.string(),
				"balance": zod.z.union([zod.z.literal(null), zod.z.object({
					"total": zod.z.number().describe("The manually entered total allowance."),
					"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
					"remaining": zod.z.number(),
					"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
				})]).describe("Manual balance estimate, when the user entered one for this provider.")
			})).describe("Per-process token accounting, one row per provider route."),
			"balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → manually entered total allowance."),
			"aggregate": zod.z.object({
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"totalTokens": zod.z.number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema$value ??= zod.z.object({
			"refresh": zod.z.boolean().optional().describe("Run a fold round before answering, instead of serving the cached report."),
			"provider": zod.z.string().optional().describe("Report only this provider route's days, sessions, and totals. Absent folds every route together, which is what the per-provider comparison reads.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema$value ??= zod.z.object({
			"today": zod.z.string().describe("Local calendar day the `today` figures belong to, as `YYYY-MM-DD`."),
			"todayTotals": zod.z.object({
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"totalTokens": zod.z.number().describe("Sum of the four buckets.")
			}).describe("Tokens folded for {@link today}."),
			"monthTotals": zod.z.object({
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"totalTokens": zod.z.number().describe("Sum of the four buckets.")
			}).describe("Tokens folded for the local calendar month containing {@link today}."),
			"allTimeTotals": zod.z.object({
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"totalTokens": zod.z.number().describe("Sum of the four buckets.")
			}).describe("Tokens folded across every session the fold has read."),
			"todayCost": zod.z.object({
				"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
				"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
				"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
			}).optional().describe("Derived spend for {@link today}, absent while no price rule is configured."),
			"monthCost": zod.z.object({
				"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
				"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
				"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
			}).optional().describe("Derived spend for the current month, absent while no price rule is configured."),
			"allTimeCost": zod.z.object({
				"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
				"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
				"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
			}).optional().describe("Derived spend across every folded day, absent while no price rule is configured."),
			"budgets": zod.z.object({
				"currency": zod.z.string().describe("Unit both windows are denominated in."),
				"daily": zod.z.object({
					"limit": zod.z.number().describe("The configured ceiling."),
					"spent": zod.z.number().describe("Derived spend inside the window."),
					"percentUsed": zod.z.number().describe("Used share of {@link limit}, clamped to 0–100."),
					"status": zod.z.union([
						zod.z.literal("unknown"),
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]),
					"unpricedCalls": zod.z.number().describe("Calls inside the window that no rule priced.")
				}).optional().describe("The local calendar day's budget, when one is configured."),
				"monthly": zod.z.object({
					"limit": zod.z.number().describe("The configured ceiling."),
					"spent": zod.z.number().describe("Derived spend inside the window."),
					"percentUsed": zod.z.number().describe("Used share of {@link limit}, clamped to 0–100."),
					"status": zod.z.union([
						zod.z.literal("unknown"),
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]),
					"unpricedCalls": zod.z.number().describe("Calls inside the window that no rule priced.")
				}).optional().describe("The local calendar month's budget, when one is configured.")
			}).optional().describe("The configured budgets, absent while none is configured."),
			"todayCacheHitPercent": zod.z.number().optional().describe("Cache-hit share of today's billed input, 0–100: `cacheRead / (cacheRead + input + cacheWrite)`. Absent with no input."),
			"models": zod.z.array(zod.z.object({
				"provider": zod.z.string().readonly(),
				"model": zod.z.string().readonly(),
				"all": zod.z.object({
					"calls": zod.z.number(),
					"cost": zod.z.object({
						"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
						"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
						"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
					}).optional(),
					"cacheHitPercent": zod.z.number().optional(),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of the four buckets.")
				}),
				"today": zod.z.object({
					"calls": zod.z.number(),
					"cost": zod.z.object({
						"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
						"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
						"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
					}).optional(),
					"cacheHitPercent": zod.z.number().optional(),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of the four buckets.")
				}),
				"month": zod.z.object({
					"calls": zod.z.number(),
					"cost": zod.z.object({
						"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
						"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
						"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
					}).optional(),
					"cacheHitPercent": zod.z.number().optional(),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of the four buckets.")
				}),
				"rate": zod.z.object({
					"currency": zod.z.string(),
					"inputPerMillion": zod.z.number(),
					"outputPerMillion": zod.z.number(),
					"cacheReadPerMillion": zod.z.number().optional(),
					"cacheWritePerMillion": zod.z.number().optional(),
					"from": zod.z.string().optional()
				}).optional().describe("Current per-million rates; historical costs retain their own dated rules.")
			})).optional().describe("Concrete provider/model pairs, busiest first; optional for older clients."),
			"providers": zod.z.array(zod.z.object({
				"provider": zod.z.string().readonly().describe("Provider route key, as model requests reported it."),
				"calls": zod.z.number().describe("Calls folded across every day for this route."),
				"cacheHitPercent": zod.z.number().optional().describe("Cache-hit share of this route's billed input, 0–100; absent with no input."),
				"cost": zod.z.object({
					"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
					"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
					"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
				}).optional().describe("Derived spend across every day, absent while no price rule is configured."),
				"todayCalls": zod.z.number().describe("Calls folded for {@link QuotaUsageReport.today} on this route."),
				"todayTokens": zod.z.number().describe("Tokens folded for {@link QuotaUsageReport.today} on this route."),
				"todayCacheHitPercent": zod.z.number().optional().describe("Today's cache-hit share of this route's billed input; absent with no input."),
				"todayCost": zod.z.object({
					"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
					"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
					"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
				}).optional().describe("Derived spend for {@link QuotaUsageReport.today}, absent while unpriced."),
				"monthCalls": zod.z.number().describe("Calls folded for the local calendar month containing today."),
				"monthTokens": zod.z.number().describe("Tokens folded for that month."),
				"monthCacheHitPercent": zod.z.number().optional().describe("That month's cache-hit share of this route's billed input; absent with no input."),
				"monthCost": zod.z.object({
					"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
					"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
					"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
				}).optional().describe("Derived spend for that month, absent while no price rule is configured."),
				"models": zod.z.number().describe("Distinct models folded into this route."),
				"lastDay": zod.z.string().describe("Latest local calendar day carrying usage for this route, `YYYY-MM-DD`."),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"totalTokens": zod.z.number().describe("Sum of the four buckets.")
			})).describe("Every route carrying usage, busiest first."),
			"days": zod.z.array(zod.z.object({
				"date": zod.z.string().readonly().describe("Local calendar day as `YYYY-MM-DD`."),
				"calls": zod.z.number(),
				"models": zod.z.array(zod.z.object({
					"provider": zod.z.string().readonly().describe("Provider route key; the same model under two routes stays two rows."),
					"model": zod.z.string().readonly(),
					"calls": zod.z.number().describe("Model calls folded into this row."),
					"cost": zod.z.object({
						"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
						"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
						"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
					}).optional().describe("Derived spend, absent while no price rule is configured."),
					"inputTokens": zod.z.number(),
					"outputTokens": zod.z.number(),
					"cacheReadTokens": zod.z.number(),
					"cacheWriteTokens": zod.z.number(),
					"totalTokens": zod.z.number().describe("Sum of the four buckets.")
				})).describe("Per-`provider · model` breakdown backing the day's drilldown."),
				"cost": zod.z.object({
					"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
					"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
					"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
				}).optional().describe("Derived spend for the day, absent while no price rule is configured."),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"totalTokens": zod.z.number().describe("Sum of the four buckets.")
			})).describe("Days carrying usage, ascending by date. Days with none are omitted."),
			"sessions": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"calls": zod.z.number(),
				"routes": zod.z.array(zod.z.string()).describe("`provider · model` labels this session spent tokens on, busiest first."),
				"lastActiveAt": zod.z.number().describe("Epoch ms of the latest usage-bearing event folded from this session."),
				"cost": zod.z.object({
					"amount": zod.z.number().describe("Amount in {@link currency}, summed over the calls a rule priced."),
					"currency": zod.z.string().describe("Unit the configured rules are denominated in."),
					"unpricedCalls": zod.z.number().describe("Calls no rule priced; a positive count makes {@link amount} partial.")
				}).optional().describe("Derived spend for the session, absent while no price rule is configured."),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"totalTokens": zod.z.number().describe("Sum of the four buckets.")
			})).describe("Sessions carrying usage, most recently active first."),
			"sessionCount": zod.z.number().describe("Sessions folded into this report."),
			"foldedAt": zod.z.number().describe("Epoch ms when the fold last completed, or 0 before the first one."),
			"folding": zod.z.boolean().describe("True while a fold round is running, so the panel can show progress.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0$schema$value ??= zod.z.object({
			"provider": zod.z.string(),
			"action": zod.z.union([
				zod.z.literal("remove"),
				zod.z.literal("add"),
				zod.z.literal("rename"),
				zod.z.literal("activate"),
				zod.z.literal("routing")
			]),
			"credentialRef": zod.z.string().optional(),
			"name": zod.z.string().optional(),
			"key": zod.z.string().optional(),
			"mode": zod.z.union([
				zod.z.literal("manual"),
				zod.z.literal("quota"),
				zod.z.literal("jev")
			]).optional(),
			"jevKey": zod.z.string().optional()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_result$schema$value ??= zod.z.object({
			"capturedAt": zod.z.number(),
			"providers": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"mode": zod.z.union([
					zod.z.literal("balance"),
					zod.z.literal("subscription"),
					zod.z.literal("unsupported")
				]).describe("Mode of {@link accounts}[0], the route's first monitored credential."),
				"adapter": zod.z.string().describe("The adapter that would serve this provider's account read."),
				"status": zod.z.union([
					zod.z.literal("blocked"),
					zod.z.literal("unsupported"),
					zod.z.literal("ok"),
					zod.z.literal("not-configured"),
					zod.z.literal("unauthorized"),
					zod.z.literal("rate-limited"),
					zod.z.literal("invalid-response"),
					zod.z.literal("unavailable")
				]).describe("Latest known status of {@link accounts}[0]."),
				"warning": zod.z.union([
					zod.z.literal("normal"),
					zod.z.literal("warning"),
					zod.z.literal("critical")
				]).optional().describe("Latest known severity of {@link accounts}[0], so the selector can mark a draining account."),
				"credentialRefs": zod.z.array(zod.z.string()).describe("Credential references this route's account is read with, in configuration order. Empty means the route has one slot read with whatever credential its own profile (or `monitors.<id>.credentialRef`) names, which may be none."),
				"activeCredentialRef": zod.z.string().optional().describe("The monitored credential whose value the route currently authenticates with, when this monitor routes among them and the route's credential is one of them. Absent while no request has run since load, or when the route's credential is none of the monitored keys."),
				"accounts": zod.z.array(zod.z.object({
					"id": zod.z.string().readonly().describe("Provider route key this account belongs to."),
					"name": zod.z.string().describe("Display label for the account card."),
					"mode": zod.z.union([
						zod.z.literal("balance"),
						zod.z.literal("subscription"),
						zod.z.literal("unsupported")
					]),
					"status": zod.z.union([
						zod.z.literal("blocked"),
						zod.z.literal("unsupported"),
						zod.z.literal("ok"),
						zod.z.literal("not-configured"),
						zod.z.literal("unauthorized"),
						zod.z.literal("rate-limited"),
						zod.z.literal("invalid-response"),
						zod.z.literal("unavailable")
					]),
					"adapter": zod.z.string().describe("The adapter that produced the reading, for the card's origin line."),
					"credentialRef": zod.z.string().readonly().optional().describe("Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."),
					"keyName": zod.z.string().optional().describe("User label and provider-disclosed identity, never a secret."),
					"accountName": zod.z.string().optional(),
					"fetchedAt": zod.z.number().describe("Epoch ms of the reading."),
					"remaining": zod.z.number().optional().describe("Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."),
					"used": zod.z.number().optional().describe("Cumulative spend, when the endpoint discloses one."),
					"limit": zod.z.number().optional().describe("Total allowance behind {@link remaining}, when the endpoint discloses one."),
					"currency": zod.z.string().optional().describe("Unit label for the three figures above: `CNY`, `USD`, `credits`, …"),
					"unlimited": zod.z.boolean().optional().describe("True when the endpoint reports an unmetered allowance; the panel shows `∞`."),
					"plan": zod.z.string().optional().describe("Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."),
					"planWindows": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("session"),
							zod.z.literal("five-hour"),
							zod.z.literal("daily"),
							zod.z.literal("weekly"),
							zod.z.literal("monthly"),
							zod.z.literal("billing"),
							zod.z.literal("quota")
						]),
						"percentUsed": zod.z.number().describe("Used share of the window, clamped to 0–100."),
						"resetAt": zod.z.string().optional().describe("ISO instant at which the window resets, when the endpoint discloses one."),
						"remaining": zod.z.number().optional().describe("Remaining raw allowance, when the endpoint discloses a count rather than only a percentage.")
					})).optional().describe("Every plan window the endpoint disclosed, tightest first."),
					"budgetPools": zod.z.array(zod.z.object({
						"name": zod.z.string(),
						"remaining": zod.z.number().describe("Remaining amount in the account's {@link QuotaAccount.currency} units."),
						"limit": zod.z.number().optional().describe("The pool's allowance, when the endpoint discloses one."),
						"percentUsed": zod.z.number().optional().describe("Used share of the pool, clamped to 0–100; absent when no allowance is disclosed.")
					})).optional().describe("Budget pools reported beside the account balance, in endpoint order."),
					"usage": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("model"),
							zod.z.literal("day"),
							zod.z.literal("pool")
						]).readonly().describe("Which table the row came from, so the panel groups rows by kind."),
						"label": zod.z.string().readonly().describe("The row's own label: a calendar day, a model id, or a pool name."),
						"requests": zod.z.number().optional().describe("Calls or requests the endpoint counted."),
						"inputTokens": zod.z.number().optional(),
						"outputTokens": zod.z.number().optional(),
						"cacheReadTokens": zod.z.number().optional(),
						"cacheWriteTokens": zod.z.number().optional(),
						"totalTokens": zod.z.number().optional().describe("Sum of the four token buckets, when the endpoint reports its own total."),
						"cost": zod.z.number().optional().describe("Spend the endpoint reported, denominated in {@link currency}."),
						"currency": zod.z.string().optional().describe("Unit `cost` is denominated in, when the row states one.")
					})).optional().describe("Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."),
					"keyUsage": zod.z.object({
						"days": zod.z.number().describe("Requested history window, in days (1–366)."),
						"startDate": zod.z.string().optional().describe("Window bounds the endpoint answered with, when it states them."),
						"endDate": zod.z.string().optional(),
						"period": zod.z.object({
							"periodKey": zod.z.string().optional().describe("Upstream period key, e.g. `2026-10`."),
							"startAt": zod.z.string().optional().describe("Period bounds, ISO 8601 with offset."),
							"endAt": zod.z.string().optional(),
							"updatedAt": zod.z.number().optional().describe("Epoch ms the endpoint last folded this period, when it states one."),
							"used": zod.z.number().optional().describe("Spend and allowance over the same period, for reconciliation with the card."),
							"limit": zod.z.number().optional(),
							"remaining": zod.z.number().optional(),
							"percentUsed": zod.z.number().optional(),
							"currency": zod.z.string().optional(),
							"inputTokens": zod.z.number().optional(),
							"outputTokens": zod.z.number().optional(),
							"reasoningTokens": zod.z.number().optional(),
							"cacheReadTokens": zod.z.number().optional(),
							"cacheWriteTokens": zod.z.number().optional(),
							"totalTokens": zod.z.number().optional().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("The billing period's own totals, from the account endpoint."),
						"window": zod.z.object({
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("Totals over {@link days}, from the usage endpoint."),
						"models": zod.z.array(zod.z.object({
							"model": zod.z.string(),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-model totals over the window, from the usage endpoint."),
						"daily": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day totals over the window, from the usage endpoint."),
						"points": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"model": zod.z.string().describe("Model id the day's calls named."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this.")
					}).optional().describe("What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."),
					"keyUsageFetchedAt": zod.z.number().optional().describe("Last successful history read, present when a transient failure retains older data."),
					"warning": zod.z.union([
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]).optional().describe("Severity of the remaining figure, when one could be resolved."),
					"missingCredentials": zod.z.array(zod.z.string()).optional().describe("Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."),
					"reason": zod.z.string().optional().describe("Human-readable diagnosis for a non-`ok` status; never carries response bodies."),
					"manual": zod.z.object({
						"total": zod.z.number().describe("The manually entered total allowance."),
						"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
						"remaining": zod.z.number(),
						"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
					}).optional().describe("Manual allowance the user entered for this provider, when no endpoint answered.")
				})).describe("Readings of {@link credentialRefs}, one per credential read so far and in the same order. A route not yet read carries none, so a selector can draw every monitored credential before the first answer arrives."),
				"keyNames": zod.z.record(zod.z.string(), zod.z.string()).readonly().optional(),
				"routing": zod.z.object({
					"mode": zod.z.union([
						zod.z.literal("manual"),
						zod.z.literal("quota"),
						zod.z.literal("jev")
					]),
					"wired": zod.z.boolean(),
					"activeRef": zod.z.string().optional(),
					"jevConfigured": zod.z.boolean(),
					"lastDecision": zod.z.string().optional()
				}).optional()
			})).describe("Provider selector entries, in registry order."),
			"rows": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"reasoningTokens": zod.z.number(),
				"totalTokens": zod.z.number(),
				"errorCount": zod.z.number(),
				"lastCallAt": zod.z.number(),
				"lastModel": zod.z.string(),
				"balance": zod.z.union([zod.z.literal(null), zod.z.object({
					"total": zod.z.number().describe("The manually entered total allowance."),
					"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
					"remaining": zod.z.number(),
					"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
				})]).describe("Manual balance estimate, when the user entered one for this provider.")
			})).describe("Per-process token accounting, one row per provider route."),
			"balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → manually entered total allowance."),
			"aggregate": zod.z.object({
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"totalTokens": zod.z.number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_readPendingAccounts_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_readPendingAccounts_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_readPendingAccounts_result$schema$value ??= zod.z.object({
			"capturedAt": zod.z.number(),
			"providers": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"mode": zod.z.union([
					zod.z.literal("balance"),
					zod.z.literal("subscription"),
					zod.z.literal("unsupported")
				]).describe("Mode of {@link accounts}[0], the route's first monitored credential."),
				"adapter": zod.z.string().describe("The adapter that would serve this provider's account read."),
				"status": zod.z.union([
					zod.z.literal("blocked"),
					zod.z.literal("unsupported"),
					zod.z.literal("ok"),
					zod.z.literal("not-configured"),
					zod.z.literal("unauthorized"),
					zod.z.literal("rate-limited"),
					zod.z.literal("invalid-response"),
					zod.z.literal("unavailable")
				]).describe("Latest known status of {@link accounts}[0]."),
				"warning": zod.z.union([
					zod.z.literal("normal"),
					zod.z.literal("warning"),
					zod.z.literal("critical")
				]).optional().describe("Latest known severity of {@link accounts}[0], so the selector can mark a draining account."),
				"credentialRefs": zod.z.array(zod.z.string()).describe("Credential references this route's account is read with, in configuration order. Empty means the route has one slot read with whatever credential its own profile (or `monitors.<id>.credentialRef`) names, which may be none."),
				"activeCredentialRef": zod.z.string().optional().describe("The monitored credential whose value the route currently authenticates with, when this monitor routes among them and the route's credential is one of them. Absent while no request has run since load, or when the route's credential is none of the monitored keys."),
				"accounts": zod.z.array(zod.z.object({
					"id": zod.z.string().readonly().describe("Provider route key this account belongs to."),
					"name": zod.z.string().describe("Display label for the account card."),
					"mode": zod.z.union([
						zod.z.literal("balance"),
						zod.z.literal("subscription"),
						zod.z.literal("unsupported")
					]),
					"status": zod.z.union([
						zod.z.literal("blocked"),
						zod.z.literal("unsupported"),
						zod.z.literal("ok"),
						zod.z.literal("not-configured"),
						zod.z.literal("unauthorized"),
						zod.z.literal("rate-limited"),
						zod.z.literal("invalid-response"),
						zod.z.literal("unavailable")
					]),
					"adapter": zod.z.string().describe("The adapter that produced the reading, for the card's origin line."),
					"credentialRef": zod.z.string().readonly().optional().describe("Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."),
					"keyName": zod.z.string().optional().describe("User label and provider-disclosed identity, never a secret."),
					"accountName": zod.z.string().optional(),
					"fetchedAt": zod.z.number().describe("Epoch ms of the reading."),
					"remaining": zod.z.number().optional().describe("Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."),
					"used": zod.z.number().optional().describe("Cumulative spend, when the endpoint discloses one."),
					"limit": zod.z.number().optional().describe("Total allowance behind {@link remaining}, when the endpoint discloses one."),
					"currency": zod.z.string().optional().describe("Unit label for the three figures above: `CNY`, `USD`, `credits`, …"),
					"unlimited": zod.z.boolean().optional().describe("True when the endpoint reports an unmetered allowance; the panel shows `∞`."),
					"plan": zod.z.string().optional().describe("Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."),
					"planWindows": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("session"),
							zod.z.literal("five-hour"),
							zod.z.literal("daily"),
							zod.z.literal("weekly"),
							zod.z.literal("monthly"),
							zod.z.literal("billing"),
							zod.z.literal("quota")
						]),
						"percentUsed": zod.z.number().describe("Used share of the window, clamped to 0–100."),
						"resetAt": zod.z.string().optional().describe("ISO instant at which the window resets, when the endpoint discloses one."),
						"remaining": zod.z.number().optional().describe("Remaining raw allowance, when the endpoint discloses a count rather than only a percentage.")
					})).optional().describe("Every plan window the endpoint disclosed, tightest first."),
					"budgetPools": zod.z.array(zod.z.object({
						"name": zod.z.string(),
						"remaining": zod.z.number().describe("Remaining amount in the account's {@link QuotaAccount.currency} units."),
						"limit": zod.z.number().optional().describe("The pool's allowance, when the endpoint discloses one."),
						"percentUsed": zod.z.number().optional().describe("Used share of the pool, clamped to 0–100; absent when no allowance is disclosed.")
					})).optional().describe("Budget pools reported beside the account balance, in endpoint order."),
					"usage": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("model"),
							zod.z.literal("day"),
							zod.z.literal("pool")
						]).readonly().describe("Which table the row came from, so the panel groups rows by kind."),
						"label": zod.z.string().readonly().describe("The row's own label: a calendar day, a model id, or a pool name."),
						"requests": zod.z.number().optional().describe("Calls or requests the endpoint counted."),
						"inputTokens": zod.z.number().optional(),
						"outputTokens": zod.z.number().optional(),
						"cacheReadTokens": zod.z.number().optional(),
						"cacheWriteTokens": zod.z.number().optional(),
						"totalTokens": zod.z.number().optional().describe("Sum of the four token buckets, when the endpoint reports its own total."),
						"cost": zod.z.number().optional().describe("Spend the endpoint reported, denominated in {@link currency}."),
						"currency": zod.z.string().optional().describe("Unit `cost` is denominated in, when the row states one.")
					})).optional().describe("Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."),
					"keyUsage": zod.z.object({
						"days": zod.z.number().describe("Requested history window, in days (1–366)."),
						"startDate": zod.z.string().optional().describe("Window bounds the endpoint answered with, when it states them."),
						"endDate": zod.z.string().optional(),
						"period": zod.z.object({
							"periodKey": zod.z.string().optional().describe("Upstream period key, e.g. `2026-10`."),
							"startAt": zod.z.string().optional().describe("Period bounds, ISO 8601 with offset."),
							"endAt": zod.z.string().optional(),
							"updatedAt": zod.z.number().optional().describe("Epoch ms the endpoint last folded this period, when it states one."),
							"used": zod.z.number().optional().describe("Spend and allowance over the same period, for reconciliation with the card."),
							"limit": zod.z.number().optional(),
							"remaining": zod.z.number().optional(),
							"percentUsed": zod.z.number().optional(),
							"currency": zod.z.string().optional(),
							"inputTokens": zod.z.number().optional(),
							"outputTokens": zod.z.number().optional(),
							"reasoningTokens": zod.z.number().optional(),
							"cacheReadTokens": zod.z.number().optional(),
							"cacheWriteTokens": zod.z.number().optional(),
							"totalTokens": zod.z.number().optional().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("The billing period's own totals, from the account endpoint."),
						"window": zod.z.object({
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("Totals over {@link days}, from the usage endpoint."),
						"models": zod.z.array(zod.z.object({
							"model": zod.z.string(),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-model totals over the window, from the usage endpoint."),
						"daily": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day totals over the window, from the usage endpoint."),
						"points": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"model": zod.z.string().describe("Model id the day's calls named."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this.")
					}).optional().describe("What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."),
					"keyUsageFetchedAt": zod.z.number().optional().describe("Last successful history read, present when a transient failure retains older data."),
					"warning": zod.z.union([
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]).optional().describe("Severity of the remaining figure, when one could be resolved."),
					"missingCredentials": zod.z.array(zod.z.string()).optional().describe("Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."),
					"reason": zod.z.string().optional().describe("Human-readable diagnosis for a non-`ok` status; never carries response bodies."),
					"manual": zod.z.object({
						"total": zod.z.number().describe("The manually entered total allowance."),
						"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
						"remaining": zod.z.number(),
						"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
					}).optional().describe("Manual allowance the user entered for this provider, when no endpoint answered.")
				})).describe("Readings of {@link credentialRefs}, one per credential read so far and in the same order. A route not yet read carries none, so a selector can draw every monitored credential before the first answer arrives."),
				"keyNames": zod.z.record(zod.z.string(), zod.z.string()).readonly().optional(),
				"routing": zod.z.object({
					"mode": zod.z.union([
						zod.z.literal("manual"),
						zod.z.literal("quota"),
						zod.z.literal("jev")
					]),
					"wired": zod.z.boolean(),
					"activeRef": zod.z.string().optional(),
					"jevConfigured": zod.z.boolean(),
					"lastDecision": zod.z.string().optional()
				}).optional()
			})).describe("Provider selector entries, in registry order."),
			"rows": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"reasoningTokens": zod.z.number(),
				"totalTokens": zod.z.number(),
				"errorCount": zod.z.number(),
				"lastCallAt": zod.z.number(),
				"lastModel": zod.z.string(),
				"balance": zod.z.union([zod.z.literal(null), zod.z.object({
					"total": zod.z.number().describe("The manually entered total allowance."),
					"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
					"remaining": zod.z.number(),
					"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
				})]).describe("Manual balance estimate, when the user entered one for this provider.")
			})).describe("Per-process token accounting, one row per provider route."),
			"balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → manually entered total allowance."),
			"aggregate": zod.z.object({
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"totalTokens": zod.z.number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_refreshAccounts_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_refreshAccounts_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_refreshAccounts_result$schema$value ??= zod.z.object({
			"capturedAt": zod.z.number(),
			"providers": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"mode": zod.z.union([
					zod.z.literal("balance"),
					zod.z.literal("subscription"),
					zod.z.literal("unsupported")
				]).describe("Mode of {@link accounts}[0], the route's first monitored credential."),
				"adapter": zod.z.string().describe("The adapter that would serve this provider's account read."),
				"status": zod.z.union([
					zod.z.literal("blocked"),
					zod.z.literal("unsupported"),
					zod.z.literal("ok"),
					zod.z.literal("not-configured"),
					zod.z.literal("unauthorized"),
					zod.z.literal("rate-limited"),
					zod.z.literal("invalid-response"),
					zod.z.literal("unavailable")
				]).describe("Latest known status of {@link accounts}[0]."),
				"warning": zod.z.union([
					zod.z.literal("normal"),
					zod.z.literal("warning"),
					zod.z.literal("critical")
				]).optional().describe("Latest known severity of {@link accounts}[0], so the selector can mark a draining account."),
				"credentialRefs": zod.z.array(zod.z.string()).describe("Credential references this route's account is read with, in configuration order. Empty means the route has one slot read with whatever credential its own profile (or `monitors.<id>.credentialRef`) names, which may be none."),
				"activeCredentialRef": zod.z.string().optional().describe("The monitored credential whose value the route currently authenticates with, when this monitor routes among them and the route's credential is one of them. Absent while no request has run since load, or when the route's credential is none of the monitored keys."),
				"accounts": zod.z.array(zod.z.object({
					"id": zod.z.string().readonly().describe("Provider route key this account belongs to."),
					"name": zod.z.string().describe("Display label for the account card."),
					"mode": zod.z.union([
						zod.z.literal("balance"),
						zod.z.literal("subscription"),
						zod.z.literal("unsupported")
					]),
					"status": zod.z.union([
						zod.z.literal("blocked"),
						zod.z.literal("unsupported"),
						zod.z.literal("ok"),
						zod.z.literal("not-configured"),
						zod.z.literal("unauthorized"),
						zod.z.literal("rate-limited"),
						zod.z.literal("invalid-response"),
						zod.z.literal("unavailable")
					]),
					"adapter": zod.z.string().describe("The adapter that produced the reading, for the card's origin line."),
					"credentialRef": zod.z.string().readonly().optional().describe("Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."),
					"keyName": zod.z.string().optional().describe("User label and provider-disclosed identity, never a secret."),
					"accountName": zod.z.string().optional(),
					"fetchedAt": zod.z.number().describe("Epoch ms of the reading."),
					"remaining": zod.z.number().optional().describe("Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."),
					"used": zod.z.number().optional().describe("Cumulative spend, when the endpoint discloses one."),
					"limit": zod.z.number().optional().describe("Total allowance behind {@link remaining}, when the endpoint discloses one."),
					"currency": zod.z.string().optional().describe("Unit label for the three figures above: `CNY`, `USD`, `credits`, …"),
					"unlimited": zod.z.boolean().optional().describe("True when the endpoint reports an unmetered allowance; the panel shows `∞`."),
					"plan": zod.z.string().optional().describe("Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."),
					"planWindows": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("session"),
							zod.z.literal("five-hour"),
							zod.z.literal("daily"),
							zod.z.literal("weekly"),
							zod.z.literal("monthly"),
							zod.z.literal("billing"),
							zod.z.literal("quota")
						]),
						"percentUsed": zod.z.number().describe("Used share of the window, clamped to 0–100."),
						"resetAt": zod.z.string().optional().describe("ISO instant at which the window resets, when the endpoint discloses one."),
						"remaining": zod.z.number().optional().describe("Remaining raw allowance, when the endpoint discloses a count rather than only a percentage.")
					})).optional().describe("Every plan window the endpoint disclosed, tightest first."),
					"budgetPools": zod.z.array(zod.z.object({
						"name": zod.z.string(),
						"remaining": zod.z.number().describe("Remaining amount in the account's {@link QuotaAccount.currency} units."),
						"limit": zod.z.number().optional().describe("The pool's allowance, when the endpoint discloses one."),
						"percentUsed": zod.z.number().optional().describe("Used share of the pool, clamped to 0–100; absent when no allowance is disclosed.")
					})).optional().describe("Budget pools reported beside the account balance, in endpoint order."),
					"usage": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("model"),
							zod.z.literal("day"),
							zod.z.literal("pool")
						]).readonly().describe("Which table the row came from, so the panel groups rows by kind."),
						"label": zod.z.string().readonly().describe("The row's own label: a calendar day, a model id, or a pool name."),
						"requests": zod.z.number().optional().describe("Calls or requests the endpoint counted."),
						"inputTokens": zod.z.number().optional(),
						"outputTokens": zod.z.number().optional(),
						"cacheReadTokens": zod.z.number().optional(),
						"cacheWriteTokens": zod.z.number().optional(),
						"totalTokens": zod.z.number().optional().describe("Sum of the four token buckets, when the endpoint reports its own total."),
						"cost": zod.z.number().optional().describe("Spend the endpoint reported, denominated in {@link currency}."),
						"currency": zod.z.string().optional().describe("Unit `cost` is denominated in, when the row states one.")
					})).optional().describe("Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."),
					"keyUsage": zod.z.object({
						"days": zod.z.number().describe("Requested history window, in days (1–366)."),
						"startDate": zod.z.string().optional().describe("Window bounds the endpoint answered with, when it states them."),
						"endDate": zod.z.string().optional(),
						"period": zod.z.object({
							"periodKey": zod.z.string().optional().describe("Upstream period key, e.g. `2026-10`."),
							"startAt": zod.z.string().optional().describe("Period bounds, ISO 8601 with offset."),
							"endAt": zod.z.string().optional(),
							"updatedAt": zod.z.number().optional().describe("Epoch ms the endpoint last folded this period, when it states one."),
							"used": zod.z.number().optional().describe("Spend and allowance over the same period, for reconciliation with the card."),
							"limit": zod.z.number().optional(),
							"remaining": zod.z.number().optional(),
							"percentUsed": zod.z.number().optional(),
							"currency": zod.z.string().optional(),
							"inputTokens": zod.z.number().optional(),
							"outputTokens": zod.z.number().optional(),
							"reasoningTokens": zod.z.number().optional(),
							"cacheReadTokens": zod.z.number().optional(),
							"cacheWriteTokens": zod.z.number().optional(),
							"totalTokens": zod.z.number().optional().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("The billing period's own totals, from the account endpoint."),
						"window": zod.z.object({
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("Totals over {@link days}, from the usage endpoint."),
						"models": zod.z.array(zod.z.object({
							"model": zod.z.string(),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-model totals over the window, from the usage endpoint."),
						"daily": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day totals over the window, from the usage endpoint."),
						"points": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"model": zod.z.string().describe("Model id the day's calls named."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this.")
					}).optional().describe("What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."),
					"keyUsageFetchedAt": zod.z.number().optional().describe("Last successful history read, present when a transient failure retains older data."),
					"warning": zod.z.union([
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]).optional().describe("Severity of the remaining figure, when one could be resolved."),
					"missingCredentials": zod.z.array(zod.z.string()).optional().describe("Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."),
					"reason": zod.z.string().optional().describe("Human-readable diagnosis for a non-`ok` status; never carries response bodies."),
					"manual": zod.z.object({
						"total": zod.z.number().describe("The manually entered total allowance."),
						"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
						"remaining": zod.z.number(),
						"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
					}).optional().describe("Manual allowance the user entered for this provider, when no endpoint answered.")
				})).describe("Readings of {@link credentialRefs}, one per credential read so far and in the same order. A route not yet read carries none, so a selector can draw every monitored credential before the first answer arrives."),
				"keyNames": zod.z.record(zod.z.string(), zod.z.string()).readonly().optional(),
				"routing": zod.z.object({
					"mode": zod.z.union([
						zod.z.literal("manual"),
						zod.z.literal("quota"),
						zod.z.literal("jev")
					]),
					"wired": zod.z.boolean(),
					"activeRef": zod.z.string().optional(),
					"jevConfigured": zod.z.boolean(),
					"lastDecision": zod.z.string().optional()
				}).optional()
			})).describe("Provider selector entries, in registry order."),
			"rows": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"reasoningTokens": zod.z.number(),
				"totalTokens": zod.z.number(),
				"errorCount": zod.z.number(),
				"lastCallAt": zod.z.number(),
				"lastModel": zod.z.string(),
				"balance": zod.z.union([zod.z.literal(null), zod.z.object({
					"total": zod.z.number().describe("The manually entered total allowance."),
					"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
					"remaining": zod.z.number(),
					"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
				})]).describe("Manual balance estimate, when the user entered one for this provider.")
			})).describe("Per-process token accounting, one row per provider route."),
			"balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → manually entered total allowance."),
			"aggregate": zod.z.object({
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"totalTokens": zod.z.number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema$value ??= zod.z.object({ "provider": zod.z.union([zod.z.undefined(), zod.z.string()]).optional().describe("Reset only this provider route; absent resets every bucket.") });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema$value ??= zod.z.object({
			"capturedAt": zod.z.number(),
			"providers": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"mode": zod.z.union([
					zod.z.literal("balance"),
					zod.z.literal("subscription"),
					zod.z.literal("unsupported")
				]).describe("Mode of {@link accounts}[0], the route's first monitored credential."),
				"adapter": zod.z.string().describe("The adapter that would serve this provider's account read."),
				"status": zod.z.union([
					zod.z.literal("blocked"),
					zod.z.literal("unsupported"),
					zod.z.literal("ok"),
					zod.z.literal("not-configured"),
					zod.z.literal("unauthorized"),
					zod.z.literal("rate-limited"),
					zod.z.literal("invalid-response"),
					zod.z.literal("unavailable")
				]).describe("Latest known status of {@link accounts}[0]."),
				"warning": zod.z.union([
					zod.z.literal("normal"),
					zod.z.literal("warning"),
					zod.z.literal("critical")
				]).optional().describe("Latest known severity of {@link accounts}[0], so the selector can mark a draining account."),
				"credentialRefs": zod.z.array(zod.z.string()).describe("Credential references this route's account is read with, in configuration order. Empty means the route has one slot read with whatever credential its own profile (or `monitors.<id>.credentialRef`) names, which may be none."),
				"activeCredentialRef": zod.z.string().optional().describe("The monitored credential whose value the route currently authenticates with, when this monitor routes among them and the route's credential is one of them. Absent while no request has run since load, or when the route's credential is none of the monitored keys."),
				"accounts": zod.z.array(zod.z.object({
					"id": zod.z.string().readonly().describe("Provider route key this account belongs to."),
					"name": zod.z.string().describe("Display label for the account card."),
					"mode": zod.z.union([
						zod.z.literal("balance"),
						zod.z.literal("subscription"),
						zod.z.literal("unsupported")
					]),
					"status": zod.z.union([
						zod.z.literal("blocked"),
						zod.z.literal("unsupported"),
						zod.z.literal("ok"),
						zod.z.literal("not-configured"),
						zod.z.literal("unauthorized"),
						zod.z.literal("rate-limited"),
						zod.z.literal("invalid-response"),
						zod.z.literal("unavailable")
					]),
					"adapter": zod.z.string().describe("The adapter that produced the reading, for the card's origin line."),
					"credentialRef": zod.z.string().readonly().optional().describe("Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."),
					"keyName": zod.z.string().optional().describe("User label and provider-disclosed identity, never a secret."),
					"accountName": zod.z.string().optional(),
					"fetchedAt": zod.z.number().describe("Epoch ms of the reading."),
					"remaining": zod.z.number().optional().describe("Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."),
					"used": zod.z.number().optional().describe("Cumulative spend, when the endpoint discloses one."),
					"limit": zod.z.number().optional().describe("Total allowance behind {@link remaining}, when the endpoint discloses one."),
					"currency": zod.z.string().optional().describe("Unit label for the three figures above: `CNY`, `USD`, `credits`, …"),
					"unlimited": zod.z.boolean().optional().describe("True when the endpoint reports an unmetered allowance; the panel shows `∞`."),
					"plan": zod.z.string().optional().describe("Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."),
					"planWindows": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("session"),
							zod.z.literal("five-hour"),
							zod.z.literal("daily"),
							zod.z.literal("weekly"),
							zod.z.literal("monthly"),
							zod.z.literal("billing"),
							zod.z.literal("quota")
						]),
						"percentUsed": zod.z.number().describe("Used share of the window, clamped to 0–100."),
						"resetAt": zod.z.string().optional().describe("ISO instant at which the window resets, when the endpoint discloses one."),
						"remaining": zod.z.number().optional().describe("Remaining raw allowance, when the endpoint discloses a count rather than only a percentage.")
					})).optional().describe("Every plan window the endpoint disclosed, tightest first."),
					"budgetPools": zod.z.array(zod.z.object({
						"name": zod.z.string(),
						"remaining": zod.z.number().describe("Remaining amount in the account's {@link QuotaAccount.currency} units."),
						"limit": zod.z.number().optional().describe("The pool's allowance, when the endpoint discloses one."),
						"percentUsed": zod.z.number().optional().describe("Used share of the pool, clamped to 0–100; absent when no allowance is disclosed.")
					})).optional().describe("Budget pools reported beside the account balance, in endpoint order."),
					"usage": zod.z.array(zod.z.object({
						"kind": zod.z.union([
							zod.z.literal("model"),
							zod.z.literal("day"),
							zod.z.literal("pool")
						]).readonly().describe("Which table the row came from, so the panel groups rows by kind."),
						"label": zod.z.string().readonly().describe("The row's own label: a calendar day, a model id, or a pool name."),
						"requests": zod.z.number().optional().describe("Calls or requests the endpoint counted."),
						"inputTokens": zod.z.number().optional(),
						"outputTokens": zod.z.number().optional(),
						"cacheReadTokens": zod.z.number().optional(),
						"cacheWriteTokens": zod.z.number().optional(),
						"totalTokens": zod.z.number().optional().describe("Sum of the four token buckets, when the endpoint reports its own total."),
						"cost": zod.z.number().optional().describe("Spend the endpoint reported, denominated in {@link currency}."),
						"currency": zod.z.string().optional().describe("Unit `cost` is denominated in, when the row states one.")
					})).optional().describe("Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."),
					"keyUsage": zod.z.object({
						"days": zod.z.number().describe("Requested history window, in days (1–366)."),
						"startDate": zod.z.string().optional().describe("Window bounds the endpoint answered with, when it states them."),
						"endDate": zod.z.string().optional(),
						"period": zod.z.object({
							"periodKey": zod.z.string().optional().describe("Upstream period key, e.g. `2026-10`."),
							"startAt": zod.z.string().optional().describe("Period bounds, ISO 8601 with offset."),
							"endAt": zod.z.string().optional(),
							"updatedAt": zod.z.number().optional().describe("Epoch ms the endpoint last folded this period, when it states one."),
							"used": zod.z.number().optional().describe("Spend and allowance over the same period, for reconciliation with the card."),
							"limit": zod.z.number().optional(),
							"remaining": zod.z.number().optional(),
							"percentUsed": zod.z.number().optional(),
							"currency": zod.z.string().optional(),
							"inputTokens": zod.z.number().optional(),
							"outputTokens": zod.z.number().optional(),
							"reasoningTokens": zod.z.number().optional(),
							"cacheReadTokens": zod.z.number().optional(),
							"cacheWriteTokens": zod.z.number().optional(),
							"totalTokens": zod.z.number().optional().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("The billing period's own totals, from the account endpoint."),
						"window": zod.z.object({
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						}).optional().describe("Totals over {@link days}, from the usage endpoint."),
						"models": zod.z.array(zod.z.object({
							"model": zod.z.string(),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-model totals over the window, from the usage endpoint."),
						"daily": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day totals over the window, from the usage endpoint."),
						"points": zod.z.array(zod.z.object({
							"date": zod.z.string().describe("Calendar day, `YYYY-MM-DD`."),
							"model": zod.z.string().describe("Model id the day's calls named."),
							"inputTokens": zod.z.number(),
							"outputTokens": zod.z.number(),
							"reasoningTokens": zod.z.number(),
							"cacheReadTokens": zod.z.number(),
							"cacheWriteTokens": zod.z.number(),
							"totalTokens": zod.z.number().describe("Sum of every bucket above, as the endpoint reports it."),
							"calls": zod.z.number().optional(),
							"successCalls": zod.z.number().optional(),
							"failedCalls": zod.z.number().optional(),
							"streamCalls": zod.z.number().optional()
						})).describe("Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this.")
					}).optional().describe("What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."),
					"keyUsageFetchedAt": zod.z.number().optional().describe("Last successful history read, present when a transient failure retains older data."),
					"warning": zod.z.union([
						zod.z.literal("normal"),
						zod.z.literal("warning"),
						zod.z.literal("critical")
					]).optional().describe("Severity of the remaining figure, when one could be resolved."),
					"missingCredentials": zod.z.array(zod.z.string()).optional().describe("Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."),
					"reason": zod.z.string().optional().describe("Human-readable diagnosis for a non-`ok` status; never carries response bodies."),
					"manual": zod.z.object({
						"total": zod.z.number().describe("The manually entered total allowance."),
						"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
						"remaining": zod.z.number(),
						"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
					}).optional().describe("Manual allowance the user entered for this provider, when no endpoint answered.")
				})).describe("Readings of {@link credentialRefs}, one per credential read so far and in the same order. A route not yet read carries none, so a selector can draw every monitored credential before the first answer arrives."),
				"keyNames": zod.z.record(zod.z.string(), zod.z.string()).readonly().optional(),
				"routing": zod.z.object({
					"mode": zod.z.union([
						zod.z.literal("manual"),
						zod.z.literal("quota"),
						zod.z.literal("jev")
					]),
					"wired": zod.z.boolean(),
					"activeRef": zod.z.string().optional(),
					"jevConfigured": zod.z.boolean(),
					"lastDecision": zod.z.string().optional()
				}).optional()
			})).describe("Provider selector entries, in registry order."),
			"rows": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string(),
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"cacheReadTokens": zod.z.number(),
				"cacheWriteTokens": zod.z.number(),
				"reasoningTokens": zod.z.number(),
				"totalTokens": zod.z.number(),
				"errorCount": zod.z.number(),
				"lastCallAt": zod.z.number(),
				"lastModel": zod.z.string(),
				"balance": zod.z.union([zod.z.literal(null), zod.z.object({
					"total": zod.z.number().describe("The manually entered total allowance."),
					"spent": zod.z.number().describe("Total tokens seen this process, divided by 1M as a rough spend figure."),
					"remaining": zod.z.number(),
					"pct": zod.z.number().describe("Share of the allowance consumed, 0–100.")
				})]).describe("Manual balance estimate, when the user entered one for this provider.")
			})).describe("Per-process token accounting, one row per provider route."),
			"balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → manually entered total allowance."),
			"aggregate": zod.z.object({
				"calls": zod.z.number(),
				"inputTokens": zod.z.number(),
				"outputTokens": zod.z.number(),
				"totalTokens": zod.z.number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema$value ??= zod.z.object({ "balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → total allowance. A non-finite value (or an absent entry) clears that provider's manual balance.") });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema$value ??= zod.z.record(zod.z.string(), zod.z.number());
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0_strict$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0_strict$schema$value ??= zod.z.strictObject({ "kind": zod.z.union([
			zod.z.literal("daily-csv"),
			zod.z.literal("sessions-csv"),
			zod.z.literal("report-json")
		]) });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0_strict$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0_strict$schema$value ??= zod.z.strictObject({
			"provider": zod.z.string().describe("Provider route whose account is read."),
			"credentialRef": zod.z.string().optional().describe("Credential reference of the reading to answer with. Absent reads the route's first monitored credential — its own key unless `monitors.<id>.credentialRefs` names other credentials."),
			"refresh": zod.z.boolean().optional().describe("Bypass the cached reading and query the endpoint again.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0_strict$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0_strict$schema$value ??= zod.z.strictObject({
			"refresh": zod.z.boolean().optional().describe("Run a fold round before answering, instead of serving the cached report."),
			"provider": zod.z.string().optional().describe("Report only this provider route's days, sessions, and totals. Absent folds every route together, which is what the per-provider comparison reads.")
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0_strict$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0_strict$schema$value ??= zod.z.strictObject({
			"provider": zod.z.string(),
			"action": zod.z.union([
				zod.z.literal("remove"),
				zod.z.literal("add"),
				zod.z.literal("rename"),
				zod.z.literal("activate"),
				zod.z.literal("routing")
			]),
			"credentialRef": zod.z.string().optional(),
			"name": zod.z.string().optional(),
			"key": zod.z.string().optional(),
			"mode": zod.z.union([
				zod.z.literal("manual"),
				zod.z.literal("quota"),
				zod.z.literal("jev")
			]).optional(),
			"jevKey": zod.z.string().optional()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0_strict$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0_strict$schema$value ??= zod.z.strictObject({ "provider": zod.z.union([zod.z.undefined(), zod.z.string()]).optional().describe("Reset only this provider route; absent resets every bucket.") });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0_strict$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0_strict$schema$value ??= zod.z.strictObject({ "balances": zod.z.record(zod.z.string(), zod.z.number()).describe("Provider id → total allowance. A non-finite value (or an absent entry) clears that provider's manual balance.") });
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: "@deepseek-ai/dsh-extension-quota-monitor",
			methods: {
				"quotaMonitor/exportUsage": {
					service: "quotaMonitor",
					description: "Build one downloadable document from the current report.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "which document to build.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaExportRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "kind": {
									"type": "string",
									"enum": [
										"daily-csv",
										"sessions-csv",
										"report-json"
									]
								} },
								"required": ["kind"],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaExportRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "kind": {
									"type": "string",
									"enum": [
										"daily-csv",
										"sessions-csv",
										"report-json"
									]
								} },
								"required": ["kind"],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaExportDocument",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema,
						description: "the document, with its filename and media type.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"enum": [
										"daily-csv",
										"sessions-csv",
										"report-json"
									]
								},
								"filename": {
									"type": "string",
									"description": "Suggested download name, carrying the export's local calendar day."
								},
								"mediaType": {
									"type": "string",
									"description": "MIME type matching {@link kind}."
								},
								"content": {
									"type": "string",
									"description": "The document itself."
								}
							},
							"required": [
								"kind",
								"filename",
								"mediaType",
								"content"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 396,
						"column": 3
					}
				},
				"quotaMonitor/getAccount": {
					service: "quotaMonitor",
					description: "Read one provider's account.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "the provider route, the credential reference to read, and whether to bypass the cached reading. An absent reference reads the route's first monitored credential.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaAccountRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"provider": {
										"type": "string",
										"description": "Provider route whose account is read."
									},
									"credentialRef": {
										"type": "string",
										"description": "Credential reference of the reading to answer with. Absent reads the route's first monitored credential — its own key unless `monitors.<id>.credentialRefs` names other credentials."
									},
									"refresh": {
										"type": "boolean",
										"description": "Bypass the cached reading and query the endpoint again."
									}
								},
								"required": ["provider"],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaAccountRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"provider": {
										"type": "string",
										"description": "Provider route whose account is read."
									},
									"credentialRef": {
										"type": "string",
										"description": "Credential reference of the reading to answer with. Absent reads the route's first monitored credential — its own key unless `monitors.<id>.credentialRefs` names other credentials."
									},
									"refresh": {
										"type": "boolean",
										"description": "Bypass the cached reading and query the endpoint again."
									}
								},
								"required": ["provider"],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaAccount",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema,
						description: "the account, including a non-`ok` status when it cannot be read.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"id": {
									"type": "string",
									"description": "Provider route key this account belongs to."
								},
								"name": {
									"type": "string",
									"description": "Display label for the account card."
								},
								"mode": {
									"type": "string",
									"enum": [
										"balance",
										"subscription",
										"unsupported"
									]
								},
								"status": {
									"type": "string",
									"enum": [
										"blocked",
										"unsupported",
										"ok",
										"not-configured",
										"unauthorized",
										"rate-limited",
										"invalid-response",
										"unavailable"
									]
								},
								"adapter": {
									"type": "string",
									"description": "The adapter that produced the reading, for the card's origin line."
								},
								"credentialRef": {
									"type": "string",
									"description": "Credential reference this reading was taken with, when the route was read through a named credential. Names only — a credential value never crosses this boundary."
								},
								"keyName": {
									"type": "string",
									"description": "User label and provider-disclosed identity, never a secret."
								},
								"accountName": { "type": "string" },
								"fetchedAt": {
									"type": "number",
									"description": "Epoch ms of the reading."
								},
								"remaining": {
									"type": "number",
									"description": "Remaining balance in {@link currency} units. Present only for a `balance` account whose status is `ok`."
								},
								"used": {
									"type": "number",
									"description": "Cumulative spend, when the endpoint discloses one."
								},
								"limit": {
									"type": "number",
									"description": "Total allowance behind {@link remaining}, when the endpoint discloses one."
								},
								"currency": {
									"type": "string",
									"description": "Unit label for the three figures above: `CNY`, `USD`, `credits`, …"
								},
								"unlimited": {
									"type": "boolean",
									"description": "True when the endpoint reports an unmetered allowance; the panel shows `∞`."
								},
								"plan": {
									"type": "string",
									"description": "Plan label of a subscription account (`GLM Coding Plan`, `Go`, …)."
								},
								"planWindows": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"session",
													"five-hour",
													"daily",
													"weekly",
													"monthly",
													"billing",
													"quota"
												]
											},
											"percentUsed": {
												"type": "number",
												"description": "Used share of the window, clamped to 0–100."
											},
											"resetAt": {
												"type": "string",
												"description": "ISO instant at which the window resets, when the endpoint discloses one."
											},
											"remaining": {
												"type": "number",
												"description": "Remaining raw allowance, when the endpoint discloses a count rather than only a percentage."
											}
										},
										"required": ["kind", "percentUsed"],
										"additionalProperties": true
									},
									"description": "Every plan window the endpoint disclosed, tightest first."
								},
								"budgetPools": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"name": { "type": "string" },
											"remaining": {
												"type": "number",
												"description": "Remaining amount in the account's {@link QuotaAccount.currency} units."
											},
											"limit": {
												"type": "number",
												"description": "The pool's allowance, when the endpoint discloses one."
											},
											"percentUsed": {
												"type": "number",
												"description": "Used share of the pool, clamped to 0–100; absent when no allowance is disclosed."
											}
										},
										"required": ["name", "remaining"],
										"additionalProperties": true
									},
									"description": "Budget pools reported beside the account balance, in endpoint order."
								},
								"usage": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"model",
													"day",
													"pool"
												],
												"description": "Which table the row came from, so the panel groups rows by kind."
											},
											"label": {
												"type": "string",
												"description": "The row's own label: a calendar day, a model id, or a pool name."
											},
											"requests": {
												"type": "number",
												"description": "Calls or requests the endpoint counted."
											},
											"inputTokens": { "type": "number" },
											"outputTokens": { "type": "number" },
											"cacheReadTokens": { "type": "number" },
											"cacheWriteTokens": { "type": "number" },
											"totalTokens": {
												"type": "number",
												"description": "Sum of the four token buckets, when the endpoint reports its own total."
											},
											"cost": {
												"type": "number",
												"description": "Spend the endpoint reported, denominated in {@link currency}."
											},
											"currency": {
												"type": "string",
												"description": "Unit `cost` is denominated in, when the row states one."
											}
										},
										"required": ["kind", "label"],
										"additionalProperties": true
									},
									"description": "Usage the endpoint itself reported for the credential it was read with. This is the gateway's own accounting rather than this plugin's fold, so it covers every call that credential made — including calls no process here saw. It is also the only per-credential split available: a model request carries a provider route, never the key that served it, so two keys behind one route can only be told apart by asking each endpoint about its own."
								},
								"keyUsage": {
									"type": "object",
									"properties": {
										"days": {
											"type": "number",
											"description": "Requested history window, in days (1–366)."
										},
										"startDate": {
											"type": "string",
											"description": "Window bounds the endpoint answered with, when it states them."
										},
										"endDate": { "type": "string" },
										"period": {
											"type": "object",
											"properties": {
												"periodKey": {
													"type": "string",
													"description": "Upstream period key, e.g. `2026-10`."
												},
												"startAt": {
													"type": "string",
													"description": "Period bounds, ISO 8601 with offset."
												},
												"endAt": { "type": "string" },
												"updatedAt": {
													"type": "number",
													"description": "Epoch ms the endpoint last folded this period, when it states one."
												},
												"used": {
													"type": "number",
													"description": "Spend and allowance over the same period, for reconciliation with the card."
												},
												"limit": { "type": "number" },
												"remaining": { "type": "number" },
												"percentUsed": { "type": "number" },
												"currency": { "type": "string" },
												"inputTokens": { "type": "number" },
												"outputTokens": { "type": "number" },
												"reasoningTokens": { "type": "number" },
												"cacheReadTokens": { "type": "number" },
												"cacheWriteTokens": { "type": "number" },
												"totalTokens": {
													"type": "number",
													"description": "Sum of every bucket above, as the endpoint reports it."
												},
												"calls": { "type": "number" },
												"successCalls": { "type": "number" },
												"failedCalls": { "type": "number" },
												"streamCalls": { "type": "number" }
											},
											"required": [],
											"additionalProperties": true,
											"description": "The billing period's own totals, from the account endpoint."
										},
										"window": {
											"type": "object",
											"properties": {
												"inputTokens": { "type": "number" },
												"outputTokens": { "type": "number" },
												"reasoningTokens": { "type": "number" },
												"cacheReadTokens": { "type": "number" },
												"cacheWriteTokens": { "type": "number" },
												"totalTokens": {
													"type": "number",
													"description": "Sum of every bucket above, as the endpoint reports it."
												},
												"calls": { "type": "number" },
												"successCalls": { "type": "number" },
												"failedCalls": { "type": "number" },
												"streamCalls": { "type": "number" }
											},
											"required": [
												"inputTokens",
												"outputTokens",
												"reasoningTokens",
												"cacheReadTokens",
												"cacheWriteTokens",
												"totalTokens"
											],
											"additionalProperties": true,
											"description": "Totals over {@link days}, from the usage endpoint."
										},
										"models": {
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"model": { "type": "string" },
													"inputTokens": { "type": "number" },
													"outputTokens": { "type": "number" },
													"reasoningTokens": { "type": "number" },
													"cacheReadTokens": { "type": "number" },
													"cacheWriteTokens": { "type": "number" },
													"totalTokens": {
														"type": "number",
														"description": "Sum of every bucket above, as the endpoint reports it."
													},
													"calls": { "type": "number" },
													"successCalls": { "type": "number" },
													"failedCalls": { "type": "number" },
													"streamCalls": { "type": "number" }
												},
												"required": [
													"model",
													"inputTokens",
													"outputTokens",
													"reasoningTokens",
													"cacheReadTokens",
													"cacheWriteTokens",
													"totalTokens"
												],
												"additionalProperties": true
											},
											"description": "Per-model totals over the window, from the usage endpoint."
										},
										"daily": {
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"date": {
														"type": "string",
														"description": "Calendar day, `YYYY-MM-DD`."
													},
													"inputTokens": { "type": "number" },
													"outputTokens": { "type": "number" },
													"reasoningTokens": { "type": "number" },
													"cacheReadTokens": { "type": "number" },
													"cacheWriteTokens": { "type": "number" },
													"totalTokens": {
														"type": "number",
														"description": "Sum of every bucket above, as the endpoint reports it."
													},
													"calls": { "type": "number" },
													"successCalls": { "type": "number" },
													"failedCalls": { "type": "number" },
													"streamCalls": { "type": "number" }
												},
												"required": [
													"date",
													"inputTokens",
													"outputTokens",
													"reasoningTokens",
													"cacheReadTokens",
													"cacheWriteTokens",
													"totalTokens"
												],
												"additionalProperties": true
											},
											"description": "Per-day totals over the window, from the usage endpoint."
										},
										"points": {
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"date": {
														"type": "string",
														"description": "Calendar day, `YYYY-MM-DD`."
													},
													"model": {
														"type": "string",
														"description": "Model id the day's calls named."
													},
													"inputTokens": { "type": "number" },
													"outputTokens": { "type": "number" },
													"reasoningTokens": { "type": "number" },
													"cacheReadTokens": { "type": "number" },
													"cacheWriteTokens": { "type": "number" },
													"totalTokens": {
														"type": "number",
														"description": "Sum of every bucket above, as the endpoint reports it."
													},
													"calls": { "type": "number" },
													"successCalls": { "type": "number" },
													"failedCalls": { "type": "number" },
													"streamCalls": { "type": "number" }
												},
												"required": [
													"date",
													"model",
													"inputTokens",
													"outputTokens",
													"reasoningTokens",
													"cacheReadTokens",
													"cacheWriteTokens",
													"totalTokens"
												],
												"additionalProperties": true
											},
											"description": "Per-day per-model rows over the window, when the endpoint discloses them. Empty when the endpoint answers only pre-aggregated totals; a consumer that needs a shorter window must then fall back to {@link models} and {@link daily} rather than slice this."
										}
									},
									"required": [
										"days",
										"models",
										"daily",
										"points"
									],
									"additionalProperties": true,
									"description": "What this credential actually spent, as the provider's own desk API meters it. Present when the provider publishes a per-key usage endpoint beside the account one — StepCode/AgentRouter does — and absent otherwise, so a card never draws a token figure the endpoint never stated."
								},
								"keyUsageFetchedAt": {
									"type": "number",
									"description": "Last successful history read, present when a transient failure retains older data."
								},
								"warning": {
									"type": "string",
									"enum": [
										"normal",
										"warning",
										"critical"
									],
									"description": "Severity of the remaining figure, when one could be resolved."
								},
								"missingCredentials": {
									"type": "array",
									"items": { "type": "string" },
									"description": "Credential reference names the adapter needed and did not find. Names only — a credential value never crosses this boundary."
								},
								"reason": {
									"type": "string",
									"description": "Human-readable diagnosis for a non-`ok` status; never carries response bodies."
								},
								"manual": {
									"type": "object",
									"properties": {
										"total": {
											"type": "number",
											"description": "The manually entered total allowance."
										},
										"spent": {
											"type": "number",
											"description": "Total tokens seen this process, divided by 1M as a rough spend figure."
										},
										"remaining": { "type": "number" },
										"pct": {
											"type": "number",
											"description": "Share of the allowance consumed, 0–100."
										}
									},
									"required": [
										"total",
										"spent",
										"remaining",
										"pct"
									],
									"additionalProperties": true,
									"description": "Manual allowance the user entered for this provider, when no endpoint answered."
								}
							},
							"required": [
								"id",
								"name",
								"mode",
								"status",
								"adapter",
								"fetchedAt"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 337,
						"column": 9
					}
				},
				"quotaMonitor/getSnapshot": {
					service: "quotaMonitor",
					description: "Whole-registry view: the provider selector, per-process usage rows, and the manual balance table.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema,
						description: "the snapshot served to the panel.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 325,
						"column": 3
					}
				},
				"quotaMonitor/getUsage": {
					service: "quotaMonitor",
					description: "The folded historical usage report.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "`refresh: true` forces a fold round before answering; `provider` reports that route alone instead of every route together.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaUsageRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"refresh": {
										"type": "boolean",
										"description": "Run a fold round before answering, instead of serving the cached report."
									},
									"provider": {
										"type": "string",
										"description": "Report only this provider route's days, sessions, and totals. Absent folds every route together, which is what the per-provider comparison reads."
									}
								},
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaUsageRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"refresh": {
										"type": "boolean",
										"description": "Run a fold round before answering, instead of serving the cached report."
									},
									"provider": {
										"type": "string",
										"description": "Report only this provider route's days, sessions, and totals. Absent folds every route together, which is what the per-provider comparison reads."
									}
								},
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaUsageReport",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema,
						description: "the report, with `folding` set while a round runs.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"today": {
									"type": "string",
									"description": "Local calendar day the `today` figures belong to, as `YYYY-MM-DD`."
								},
								"todayTotals": {
									"type": "object",
									"properties": {
										"inputTokens": { "type": "number" },
										"outputTokens": { "type": "number" },
										"cacheReadTokens": { "type": "number" },
										"cacheWriteTokens": { "type": "number" },
										"totalTokens": {
											"type": "number",
											"description": "Sum of the four buckets."
										}
									},
									"required": [
										"inputTokens",
										"outputTokens",
										"cacheReadTokens",
										"cacheWriteTokens",
										"totalTokens"
									],
									"additionalProperties": true,
									"description": "Tokens folded for {@link today}."
								},
								"monthTotals": {
									"type": "object",
									"properties": {
										"inputTokens": { "type": "number" },
										"outputTokens": { "type": "number" },
										"cacheReadTokens": { "type": "number" },
										"cacheWriteTokens": { "type": "number" },
										"totalTokens": {
											"type": "number",
											"description": "Sum of the four buckets."
										}
									},
									"required": [
										"inputTokens",
										"outputTokens",
										"cacheReadTokens",
										"cacheWriteTokens",
										"totalTokens"
									],
									"additionalProperties": true,
									"description": "Tokens folded for the local calendar month containing {@link today}."
								},
								"allTimeTotals": {
									"type": "object",
									"properties": {
										"inputTokens": { "type": "number" },
										"outputTokens": { "type": "number" },
										"cacheReadTokens": { "type": "number" },
										"cacheWriteTokens": { "type": "number" },
										"totalTokens": {
											"type": "number",
											"description": "Sum of the four buckets."
										}
									},
									"required": [
										"inputTokens",
										"outputTokens",
										"cacheReadTokens",
										"cacheWriteTokens",
										"totalTokens"
									],
									"additionalProperties": true,
									"description": "Tokens folded across every session the fold has read."
								},
								"todayCost": {
									"type": "object",
									"properties": {
										"amount": {
											"type": "number",
											"description": "Amount in {@link currency}, summed over the calls a rule priced."
										},
										"currency": {
											"type": "string",
											"description": "Unit the configured rules are denominated in."
										},
										"unpricedCalls": {
											"type": "number",
											"description": "Calls no rule priced; a positive count makes {@link amount} partial."
										}
									},
									"required": [
										"amount",
										"currency",
										"unpricedCalls"
									],
									"additionalProperties": true,
									"description": "Derived spend for {@link today}, absent while no price rule is configured."
								},
								"monthCost": {
									"type": "object",
									"properties": {
										"amount": {
											"type": "number",
											"description": "Amount in {@link currency}, summed over the calls a rule priced."
										},
										"currency": {
											"type": "string",
											"description": "Unit the configured rules are denominated in."
										},
										"unpricedCalls": {
											"type": "number",
											"description": "Calls no rule priced; a positive count makes {@link amount} partial."
										}
									},
									"required": [
										"amount",
										"currency",
										"unpricedCalls"
									],
									"additionalProperties": true,
									"description": "Derived spend for the current month, absent while no price rule is configured."
								},
								"allTimeCost": {
									"type": "object",
									"properties": {
										"amount": {
											"type": "number",
											"description": "Amount in {@link currency}, summed over the calls a rule priced."
										},
										"currency": {
											"type": "string",
											"description": "Unit the configured rules are denominated in."
										},
										"unpricedCalls": {
											"type": "number",
											"description": "Calls no rule priced; a positive count makes {@link amount} partial."
										}
									},
									"required": [
										"amount",
										"currency",
										"unpricedCalls"
									],
									"additionalProperties": true,
									"description": "Derived spend across every folded day, absent while no price rule is configured."
								},
								"budgets": {
									"type": "object",
									"properties": {
										"currency": {
											"type": "string",
											"description": "Unit both windows are denominated in."
										},
										"daily": {
											"type": "object",
											"properties": {
												"limit": {
													"type": "number",
													"description": "The configured ceiling."
												},
												"spent": {
													"type": "number",
													"description": "Derived spend inside the window."
												},
												"percentUsed": {
													"type": "number",
													"description": "Used share of {@link limit}, clamped to 0–100."
												},
												"status": {
													"type": "string",
													"enum": [
														"unknown",
														"normal",
														"warning",
														"critical"
													]
												},
												"unpricedCalls": {
													"type": "number",
													"description": "Calls inside the window that no rule priced."
												}
											},
											"required": [
												"limit",
												"spent",
												"percentUsed",
												"status",
												"unpricedCalls"
											],
											"additionalProperties": true,
											"description": "The local calendar day's budget, when one is configured."
										},
										"monthly": {
											"type": "object",
											"properties": {
												"limit": {
													"type": "number",
													"description": "The configured ceiling."
												},
												"spent": {
													"type": "number",
													"description": "Derived spend inside the window."
												},
												"percentUsed": {
													"type": "number",
													"description": "Used share of {@link limit}, clamped to 0–100."
												},
												"status": {
													"type": "string",
													"enum": [
														"unknown",
														"normal",
														"warning",
														"critical"
													]
												},
												"unpricedCalls": {
													"type": "number",
													"description": "Calls inside the window that no rule priced."
												}
											},
											"required": [
												"limit",
												"spent",
												"percentUsed",
												"status",
												"unpricedCalls"
											],
											"additionalProperties": true,
											"description": "The local calendar month's budget, when one is configured."
										}
									},
									"required": ["currency"],
									"additionalProperties": true,
									"description": "The configured budgets, absent while none is configured."
								},
								"todayCacheHitPercent": {
									"type": "number",
									"description": "Cache-hit share of today's billed input, 0–100: `cacheRead / (cacheRead + input + cacheWrite)`. Absent with no input."
								},
								"models": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"provider": { "type": "string" },
											"model": { "type": "string" },
											"all": {
												"type": "object",
												"properties": {
													"calls": { "type": "number" },
													"cost": {
														"type": "object",
														"properties": {
															"amount": {
																"type": "number",
																"description": "Amount in {@link currency}, summed over the calls a rule priced."
															},
															"currency": {
																"type": "string",
																"description": "Unit the configured rules are denominated in."
															},
															"unpricedCalls": {
																"type": "number",
																"description": "Calls no rule priced; a positive count makes {@link amount} partial."
															}
														},
														"required": [
															"amount",
															"currency",
															"unpricedCalls"
														],
														"additionalProperties": true
													},
													"cacheHitPercent": { "type": "number" },
													"inputTokens": { "type": "number" },
													"outputTokens": { "type": "number" },
													"cacheReadTokens": { "type": "number" },
													"cacheWriteTokens": { "type": "number" },
													"totalTokens": {
														"type": "number",
														"description": "Sum of the four buckets."
													}
												},
												"required": [
													"calls",
													"inputTokens",
													"outputTokens",
													"cacheReadTokens",
													"cacheWriteTokens",
													"totalTokens"
												],
												"additionalProperties": true
											},
											"today": {
												"type": "object",
												"properties": {
													"calls": { "type": "number" },
													"cost": {
														"type": "object",
														"properties": {
															"amount": {
																"type": "number",
																"description": "Amount in {@link currency}, summed over the calls a rule priced."
															},
															"currency": {
																"type": "string",
																"description": "Unit the configured rules are denominated in."
															},
															"unpricedCalls": {
																"type": "number",
																"description": "Calls no rule priced; a positive count makes {@link amount} partial."
															}
														},
														"required": [
															"amount",
															"currency",
															"unpricedCalls"
														],
														"additionalProperties": true
													},
													"cacheHitPercent": { "type": "number" },
													"inputTokens": { "type": "number" },
													"outputTokens": { "type": "number" },
													"cacheReadTokens": { "type": "number" },
													"cacheWriteTokens": { "type": "number" },
													"totalTokens": {
														"type": "number",
														"description": "Sum of the four buckets."
													}
												},
												"required": [
													"calls",
													"inputTokens",
													"outputTokens",
													"cacheReadTokens",
													"cacheWriteTokens",
													"totalTokens"
												],
												"additionalProperties": true
											},
											"month": {
												"type": "object",
												"properties": {
													"calls": { "type": "number" },
													"cost": {
														"type": "object",
														"properties": {
															"amount": {
																"type": "number",
																"description": "Amount in {@link currency}, summed over the calls a rule priced."
															},
															"currency": {
																"type": "string",
																"description": "Unit the configured rules are denominated in."
															},
															"unpricedCalls": {
																"type": "number",
																"description": "Calls no rule priced; a positive count makes {@link amount} partial."
															}
														},
														"required": [
															"amount",
															"currency",
															"unpricedCalls"
														],
														"additionalProperties": true
													},
													"cacheHitPercent": { "type": "number" },
													"inputTokens": { "type": "number" },
													"outputTokens": { "type": "number" },
													"cacheReadTokens": { "type": "number" },
													"cacheWriteTokens": { "type": "number" },
													"totalTokens": {
														"type": "number",
														"description": "Sum of the four buckets."
													}
												},
												"required": [
													"calls",
													"inputTokens",
													"outputTokens",
													"cacheReadTokens",
													"cacheWriteTokens",
													"totalTokens"
												],
												"additionalProperties": true
											},
											"rate": {
												"type": "object",
												"properties": {
													"currency": { "type": "string" },
													"inputPerMillion": { "type": "number" },
													"outputPerMillion": { "type": "number" },
													"cacheReadPerMillion": { "type": "number" },
													"cacheWritePerMillion": { "type": "number" },
													"from": { "type": "string" }
												},
												"required": [
													"currency",
													"inputPerMillion",
													"outputPerMillion"
												],
												"additionalProperties": true,
												"description": "Current per-million rates; historical costs retain their own dated rules."
											}
										},
										"required": [
											"provider",
											"model",
											"all",
											"today",
											"month"
										],
										"additionalProperties": true
									},
									"description": "Concrete provider/model pairs, busiest first; optional for older clients."
								},
								"providers": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"provider": {
												"type": "string",
												"description": "Provider route key, as model requests reported it."
											},
											"calls": {
												"type": "number",
												"description": "Calls folded across every day for this route."
											},
											"cacheHitPercent": {
												"type": "number",
												"description": "Cache-hit share of this route's billed input, 0–100; absent with no input."
											},
											"cost": {
												"type": "object",
												"properties": {
													"amount": {
														"type": "number",
														"description": "Amount in {@link currency}, summed over the calls a rule priced."
													},
													"currency": {
														"type": "string",
														"description": "Unit the configured rules are denominated in."
													},
													"unpricedCalls": {
														"type": "number",
														"description": "Calls no rule priced; a positive count makes {@link amount} partial."
													}
												},
												"required": [
													"amount",
													"currency",
													"unpricedCalls"
												],
												"additionalProperties": true,
												"description": "Derived spend across every day, absent while no price rule is configured."
											},
											"todayCalls": {
												"type": "number",
												"description": "Calls folded for {@link QuotaUsageReport.today} on this route."
											},
											"todayTokens": {
												"type": "number",
												"description": "Tokens folded for {@link QuotaUsageReport.today} on this route."
											},
											"todayCacheHitPercent": {
												"type": "number",
												"description": "Today's cache-hit share of this route's billed input; absent with no input."
											},
											"todayCost": {
												"type": "object",
												"properties": {
													"amount": {
														"type": "number",
														"description": "Amount in {@link currency}, summed over the calls a rule priced."
													},
													"currency": {
														"type": "string",
														"description": "Unit the configured rules are denominated in."
													},
													"unpricedCalls": {
														"type": "number",
														"description": "Calls no rule priced; a positive count makes {@link amount} partial."
													}
												},
												"required": [
													"amount",
													"currency",
													"unpricedCalls"
												],
												"additionalProperties": true,
												"description": "Derived spend for {@link QuotaUsageReport.today}, absent while unpriced."
											},
											"monthCalls": {
												"type": "number",
												"description": "Calls folded for the local calendar month containing today."
											},
											"monthTokens": {
												"type": "number",
												"description": "Tokens folded for that month."
											},
											"monthCacheHitPercent": {
												"type": "number",
												"description": "That month's cache-hit share of this route's billed input; absent with no input."
											},
											"monthCost": {
												"type": "object",
												"properties": {
													"amount": {
														"type": "number",
														"description": "Amount in {@link currency}, summed over the calls a rule priced."
													},
													"currency": {
														"type": "string",
														"description": "Unit the configured rules are denominated in."
													},
													"unpricedCalls": {
														"type": "number",
														"description": "Calls no rule priced; a positive count makes {@link amount} partial."
													}
												},
												"required": [
													"amount",
													"currency",
													"unpricedCalls"
												],
												"additionalProperties": true,
												"description": "Derived spend for that month, absent while no price rule is configured."
											},
											"models": {
												"type": "number",
												"description": "Distinct models folded into this route."
											},
											"lastDay": {
												"type": "string",
												"description": "Latest local calendar day carrying usage for this route, `YYYY-MM-DD`."
											},
											"inputTokens": { "type": "number" },
											"outputTokens": { "type": "number" },
											"cacheReadTokens": { "type": "number" },
											"cacheWriteTokens": { "type": "number" },
											"totalTokens": {
												"type": "number",
												"description": "Sum of the four buckets."
											}
										},
										"required": [
											"provider",
											"calls",
											"todayCalls",
											"todayTokens",
											"monthCalls",
											"monthTokens",
											"models",
											"lastDay",
											"inputTokens",
											"outputTokens",
											"cacheReadTokens",
											"cacheWriteTokens",
											"totalTokens"
										],
										"additionalProperties": true
									},
									"description": "Every route carrying usage, busiest first."
								},
								"days": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"date": {
												"type": "string",
												"description": "Local calendar day as `YYYY-MM-DD`."
											},
											"calls": { "type": "number" },
											"models": {
												"type": "array",
												"items": {
													"type": "object",
													"properties": {
														"provider": {
															"type": "string",
															"description": "Provider route key; the same model under two routes stays two rows."
														},
														"model": { "type": "string" },
														"calls": {
															"type": "number",
															"description": "Model calls folded into this row."
														},
														"cost": {
															"type": "object",
															"properties": {
																"amount": {
																	"type": "number",
																	"description": "Amount in {@link currency}, summed over the calls a rule priced."
																},
																"currency": {
																	"type": "string",
																	"description": "Unit the configured rules are denominated in."
																},
																"unpricedCalls": {
																	"type": "number",
																	"description": "Calls no rule priced; a positive count makes {@link amount} partial."
																}
															},
															"required": [
																"amount",
																"currency",
																"unpricedCalls"
															],
															"additionalProperties": true,
															"description": "Derived spend, absent while no price rule is configured."
														},
														"inputTokens": { "type": "number" },
														"outputTokens": { "type": "number" },
														"cacheReadTokens": { "type": "number" },
														"cacheWriteTokens": { "type": "number" },
														"totalTokens": {
															"type": "number",
															"description": "Sum of the four buckets."
														}
													},
													"required": [
														"provider",
														"model",
														"calls",
														"inputTokens",
														"outputTokens",
														"cacheReadTokens",
														"cacheWriteTokens",
														"totalTokens"
													],
													"additionalProperties": true
												},
												"description": "Per-`provider · model` breakdown backing the day's drilldown."
											},
											"cost": {
												"type": "object",
												"properties": {
													"amount": {
														"type": "number",
														"description": "Amount in {@link currency}, summed over the calls a rule priced."
													},
													"currency": {
														"type": "string",
														"description": "Unit the configured rules are denominated in."
													},
													"unpricedCalls": {
														"type": "number",
														"description": "Calls no rule priced; a positive count makes {@link amount} partial."
													}
												},
												"required": [
													"amount",
													"currency",
													"unpricedCalls"
												],
												"additionalProperties": true,
												"description": "Derived spend for the day, absent while no price rule is configured."
											},
											"inputTokens": { "type": "number" },
											"outputTokens": { "type": "number" },
											"cacheReadTokens": { "type": "number" },
											"cacheWriteTokens": { "type": "number" },
											"totalTokens": {
												"type": "number",
												"description": "Sum of the four buckets."
											}
										},
										"required": [
											"date",
											"calls",
											"models",
											"inputTokens",
											"outputTokens",
											"cacheReadTokens",
											"cacheWriteTokens",
											"totalTokens"
										],
										"additionalProperties": true
									},
									"description": "Days carrying usage, ascending by date. Days with none are omitted."
								},
								"sessions": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"id": { "type": "string" },
											"calls": { "type": "number" },
											"routes": {
												"type": "array",
												"items": { "type": "string" },
												"description": "`provider · model` labels this session spent tokens on, busiest first."
											},
											"lastActiveAt": {
												"type": "number",
												"description": "Epoch ms of the latest usage-bearing event folded from this session."
											},
											"cost": {
												"type": "object",
												"properties": {
													"amount": {
														"type": "number",
														"description": "Amount in {@link currency}, summed over the calls a rule priced."
													},
													"currency": {
														"type": "string",
														"description": "Unit the configured rules are denominated in."
													},
													"unpricedCalls": {
														"type": "number",
														"description": "Calls no rule priced; a positive count makes {@link amount} partial."
													}
												},
												"required": [
													"amount",
													"currency",
													"unpricedCalls"
												],
												"additionalProperties": true,
												"description": "Derived spend for the session, absent while no price rule is configured."
											},
											"inputTokens": { "type": "number" },
											"outputTokens": { "type": "number" },
											"cacheReadTokens": { "type": "number" },
											"cacheWriteTokens": { "type": "number" },
											"totalTokens": {
												"type": "number",
												"description": "Sum of the four buckets."
											}
										},
										"required": [
											"id",
											"calls",
											"routes",
											"lastActiveAt",
											"inputTokens",
											"outputTokens",
											"cacheReadTokens",
											"cacheWriteTokens",
											"totalTokens"
										],
										"additionalProperties": true
									},
									"description": "Sessions carrying usage, most recently active first."
								},
								"sessionCount": {
									"type": "number",
									"description": "Sessions folded into this report."
								},
								"foldedAt": {
									"type": "number",
									"description": "Epoch ms when the fold last completed, or 0 before the first one."
								},
								"folding": {
									"type": "boolean",
									"description": "True while a fold round is running, so the panel can show progress."
								}
							},
							"required": [
								"today",
								"todayTotals",
								"monthTotals",
								"allTimeTotals",
								"providers",
								"days",
								"sessions",
								"sessionCount",
								"foldedAt",
								"folding"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 385,
						"column": 9
					}
				},
				"quotaMonitor/manageKey": {
					service: "quotaMonitor",
					description: "Write-only key management. Removing a slot detaches it without deleting the credential.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaKeyRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"provider": { "type": "string" },
									"action": {
										"type": "string",
										"enum": [
											"remove",
											"add",
											"rename",
											"activate",
											"routing"
										]
									},
									"credentialRef": { "type": "string" },
									"name": { "type": "string" },
									"key": { "type": "string" },
									"mode": {
										"type": "string",
										"enum": [
											"manual",
											"quota",
											"jev"
										]
									},
									"jevKey": { "type": "string" }
								},
								"required": ["provider", "action"],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaKeyRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"provider": { "type": "string" },
									"action": {
										"type": "string",
										"enum": [
											"remove",
											"add",
											"rename",
											"activate",
											"routing"
										]
									},
									"credentialRef": { "type": "string" },
									"name": { "type": "string" },
									"key": { "type": "string" },
									"mode": {
										"type": "string",
										"enum": [
											"manual",
											"quota",
											"jev"
										]
									},
									"jevKey": { "type": "string" }
								},
								"required": ["provider", "action"],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_manageKey_result$schema,
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 439,
						"column": 9
					}
				},
				"quotaMonitor/readPendingAccounts": {
					service: "quotaMonitor",
					description: "Read missing credentials and retry expired temporary failures, then answer with the resulting snapshot. Successful cached readings are reused.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_readPendingAccounts_result$schema,
						description: "the snapshot carrying the readings.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 360,
						"column": 9
					}
				},
				"quotaMonitor/refreshAccounts": {
					service: "quotaMonitor",
					description: "Re-read every monitored credential of every known route.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_refreshAccounts_result$schema,
						description: "the snapshot carrying the new readings.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 373,
						"column": 9
					}
				},
				"quotaMonitor/resetStats": {
					service: "quotaMonitor",
					description: "Zero the per-process usage counters.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "restrict the reset to one provider route, or clear every bucket.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaResetStatsRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "provider": {
									"type": "string",
									"description": "Reset only this provider route; absent resets every bucket."
								} },
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaResetStatsRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "provider": {
									"type": "string",
									"description": "Reset only this provider route; absent resets every bucket."
								} },
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema,
						description: "the post-reset snapshot.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 421,
						"column": 3
					}
				},
				"quotaMonitor/setBalances": {
					service: "quotaMonitor",
					description: "Replace the manual balance fallbacks.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "provider id → total allowance; a non-finite value clears the entry.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSetBalancesRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema,
							jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSetBalancesRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0_strict$schema,
							jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/setBalances:result",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema,
						description: "the resulting manual balance table.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 406,
						"column": 3
					}
				}
			}
		}, zod.z);
		//#endregion
		//#region src/client/format.ts
		/** Placeholder for a figure the Host did not report. */
		const ABSENT = "—";
		/**
		* Compact token figure: `1.23M`, `4.5k`, or a plain integer.
		* @param value - the token count.
		* @returns the formatted figure.
		*/
		function fmtTokens(value) {
			if (value === void 0 || value === null) return ABSENT;
			if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
			if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
			return String(Math.round(value));
		}
		/**
		* A plain integer with grouping separators.
		* @param value - the count.
		* @returns the formatted figure.
		*/
		function fmtNumber(value) {
			if (value === void 0 || value === null) return ABSENT;
			return Math.round(value).toLocaleString();
		}
		/**
		* A money or credit amount, with its unit when one was reported.
		* @param value - the amount.
		* @param currency - the unit label reported beside it.
		* @returns the formatted amount.
		*/
		function fmtAmount(value, currency) {
			if (value === void 0 || value === null) return ABSENT;
			const digits = Math.abs(value) >= 100 ? 2 : 4;
			const text = value.toFixed(digits).replace(/\.?0+$/, "");
			return currency === void 0 ? text : `${text} ${currency}`;
		}
		/**
		* A wall-clock time of day, for an "updated at" line.
		* @param epochMs - the instant.
		* @returns the formatted time, or the placeholder at epoch zero.
		*/
		function fmtTime(epochMs) {
			if (epochMs === void 0 || epochMs <= 0) return ABSENT;
			return new Date(epochMs).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			});
		}
		/**
		* A percentage with one decimal.
		* @param value - the percentage.
		* @returns the formatted percentage.
		*/
		function fmtPercent(value) {
			return value === void 0 ? ABSENT : `${value.toFixed(1)}%`;
		}
		/**
		* A derived spend figure with its unit.
		*
		* A partial amount is still shown: the calls that carry no price are reported
		* beside it, which says more than hiding the figure entirely.
		* @param cost - the derived figure, when the Host reported one.
		* @returns the formatted amount.
		*/
		function fmtCost(cost) {
			if (cost === void 0) return ABSENT;
			return `${cost.amount.toFixed(cost.amount >= 100 ? 2 : 4).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")} ${cost.currency}`;
		}
		/**
		* A date and time, for a session's last activity.
		* @param epochMs - the instant.
		* @returns the formatted stamp, or the placeholder at epoch zero.
		*/
		function fmtDateTime(epochMs) {
			if (epochMs === void 0 || epochMs <= 0) return ABSENT;
			const at = new Date(epochMs);
			return `${at.toLocaleDateString()} ${at.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			})}`;
		}
		/**
		* The first characters of a provider name, for its avatar tile.
		* @param name - the provider's display name.
		* @returns one or two characters, or the placeholder for an empty name.
		*/
		function initialsOf(name) {
			const trimmed = name.trim();
			if (trimmed === "") return ABSENT;
			if (/^[^\u0000-\u024f]/.test(trimmed)) return trimmed.slice(0, 1);
			const words = trimmed.split(/[\s_\-.]+/).filter((word) => word !== "");
			return words.length > 1 ? `${words[0]?.slice(0, 1) ?? ""}${words[1]?.slice(0, 1) ?? ""}` : trimmed.slice(0, 2);
		}
		/**
		* The countdown line under a plan window.
		*
		* The remaining duration is recomputed at render rather than stored, because
		* the panel re-renders on every refresh and a stored countdown would drift.
		* @param t - the panel's namespace-bound translate.
		* @param resetAt - ISO instant the window resets.
		* @returns the line, or `undefined` when no reset was reported.
		*/
		function resetLabel(t, resetAt) {
			if (resetAt === void 0) return void 0;
			const target = new Date(resetAt).getTime();
			if (Number.isNaN(target)) return void 0;
			const remaining = target - Date.now();
			if (remaining <= 0) return t("reset.expired");
			const at = new Date(target).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			});
			const minutes = Math.floor(remaining / 6e4);
			const hours = Math.floor(minutes / 60);
			return hours > 0 ? t("reset.hours", {
				at,
				hours: String(hours),
				minutes: String(minutes % 60)
			}) : t("reset.minutes", {
				at,
				minutes: String(minutes)
			});
		}
		//#endregion
		//#region src/client/key-usage-period.ts
		const DAY = 864e5;
		const stamp = (date) => date.toISOString().slice(0, 10);
		/** Desk days are China calendar days, independent of the browser's timezone. */
		function periodRange(period, now) {
			const date = new Date(now + 8 * 36e5);
			const today = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
			const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
			const monday = /* @__PURE__ */ new Date(+today - (today.getUTCDay() + 6) % 7 * DAY);
			switch (period) {
				case "thisWeek": return {
					start: stamp(monday),
					end: stamp(today)
				};
				case "lastWeek": return {
					start: stamp(/* @__PURE__ */ new Date(+monday - 7 * DAY)),
					end: stamp(/* @__PURE__ */ new Date(+monday - DAY))
				};
				case "thisMonth": return {
					start: stamp(month),
					end: stamp(today)
				};
				case "lastMonth": return {
					start: stamp(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))),
					end: stamp(/* @__PURE__ */ new Date(+month - DAY))
				};
				case "last30": return {
					start: stamp(/* @__PURE__ */ new Date(+today - 29 * DAY)),
					end: stamp(today)
				};
			}
		}
		const tokenKeys = [
			"inputTokens",
			"outputTokens",
			"reasoningTokens",
			"cacheReadTokens",
			"cacheWriteTokens",
			"totalTokens"
		];
		const callKeys = [
			"calls",
			"successCalls",
			"failedCalls",
			"streamCalls"
		];
		function sumUsage(rows) {
			const result = {
				inputTokens: 0,
				outputTokens: 0,
				reasoningTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				totalTokens: 0
			};
			for (const key of tokenKeys) for (const row of rows) result[key] += row[key];
			for (const key of callKeys) if (rows.length > 0 && rows.every((row) => row[key] !== void 0)) result[key] = rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
			return result;
		}
		/** Missing detail stays unknown; bounds describe the API window, not first activity. */
		function sliceUsage(usage, range) {
			const empty = {
				totals: void 0,
				models: [],
				daily: [],
				coverage: "unavailable"
			};
			if (!usage) return empty;
			const inside = (date) => date >= range.start && date <= range.end;
			const points = usage.points.filter((point) => inside(point.date));
			const covered = usage.startDate !== void 0 && usage.endDate !== void 0 && usage.startDate <= range.start && usage.endDate >= range.end;
			if (!(usage.startDate !== void 0 && usage.endDate !== void 0 && usage.startDate <= range.end && usage.endDate >= range.start) && points.length === 0) return empty;
			const exactWindow = usage.startDate === range.start && usage.endDate === range.end;
			const detailKnown = usage.points.length > 0 || usage.window?.totalTokens === 0;
			const daily = detailKnown ? [...new Set(points.map((point) => point.date))].sort().map((date) => ({
				date,
				...sumUsage(points.filter((point) => point.date === date))
			})) : usage.daily.filter((day) => inside(day.date));
			const models = detailKnown ? [...new Set(points.map((point) => point.model))].map((model) => ({
				model,
				...sumUsage(points.filter((point) => point.model === model))
			})).sort((a, b) => b.totalTokens - a.totalTokens) : exactWindow ? [...usage.models] : [];
			const totals = detailKnown ? sumUsage(points) : daily.length > 0 ? sumUsage(daily) : exactWindow ? usage.window : void 0;
			return {
				totals,
				models,
				daily,
				coverage: totals === void 0 ? "unavailable" : covered ? "complete" : "partial"
			};
		}
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/MemberAnalysis.module.css.mjs
		const css$6 = ".pXw9Qa_root{flex-direction:column;gap:16px;min-width:0;display:flex}.pXw9Qa_head{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;min-width:0;display:flex}.pXw9Qa_title{color:var(--dsw-alias-label-primary);margin:0;font-size:15px;font-weight:600;line-height:22px}.pXw9Qa_meta{min-width:0;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.pXw9Qa_label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.pXw9Qa_hero{border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg);flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:16px 40px;padding:20px 24px;display:flex}.pXw9Qa_heroMain{flex-direction:column;gap:4px;min-width:0;display:flex}.pXw9Qa_heroFigure{flex-wrap:wrap;align-items:center;gap:6px 12px;display:flex}.pXw9Qa_heroValue{color:var(--dsw-alias-label-primary);letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;font-size:32px;font-weight:600;line-height:40px}.pXw9Qa_badgeOk{background:color-mix(in srgb, var(--qm-ok) 14%, transparent);height:20px;color:var(--qm-ok);white-space:nowrap;border-radius:10px;align-items:center;padding:0 8px;font-size:12px;font-weight:500;line-height:20px;display:inline-flex}.pXw9Qa_statusNote{color:var(--qm-warn);overflow-wrap:anywhere;font-size:12px;line-height:18px}.pXw9Qa_heroStats{flex-wrap:wrap;gap:12px 32px;margin:0;display:flex}.pXw9Qa_heroStats>div{flex-direction:column;gap:2px;min-width:0;display:flex}.pXw9Qa_heroStats dt{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.pXw9Qa_heroStats dd{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin:0;font-size:18px;font-weight:600;line-height:26px}.pXw9Qa_heroMeter{flex-basis:100%;align-items:center;gap:12px;display:flex}.pXw9Qa_heroMeter .pXw9Qa_meter{flex:auto}.pXw9Qa_heroMeter .pXw9Qa_meta{font-variant-numeric:tabular-nums;flex:none}.pXw9Qa_meter{background:var(--qm-track);border-radius:3px;height:6px;display:block;overflow:hidden}.pXw9Qa_meter>i{border-radius:inherit;background:var(--qm-accent);height:100%;display:block}.pXw9Qa_periodBar{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 12px;display:flex}.pXw9Qa_pills{flex-wrap:wrap;gap:4px;display:flex}.pXw9Qa_pill{height:28px;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:14px;align-items:center;padding:0 12px;font-size:13px;line-height:20px;transition:background-color .15s,color .15s;display:inline-flex}.pXw9Qa_pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.pXw9Qa_pill[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:500}.pXw9Qa_note{background:color-mix(in srgb, var(--qm-warn) 10%, transparent);color:var(--dsw-alias-label-primary);border-radius:10px;margin:0;padding:10px 14px;font-size:12px;line-height:18px}.pXw9Qa_tiles{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;display:grid}.pXw9Qa_tile{border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg);flex-direction:column;gap:4px;min-width:0;padding:16px 20px;display:flex}.pXw9Qa_tileValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;font-size:22px;font-weight:600;line-height:30px}.pXw9Qa_memberList{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.pXw9Qa_memberCard{border:1px solid var(--qm-card-border);border-radius:var(--qm-tile-radius);background:var(--qm-card-bg);width:100%;min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;align-items:flex-start;gap:12px;padding:12px 14px;transition:background-color .15s,border-color .15s;display:flex}.pXw9Qa_memberCard:hover{background:var(--dsw-alias-interactive-bg-hover)}.pXw9Qa_memberCard[aria-pressed=true]{border-color:color-mix(in srgb, var(--qm-accent) 45%, transparent);background:var(--qm-accent-soft)}.pXw9Qa_memberRank{background:var(--qm-tile-bg);width:24px;height:24px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;border-radius:8px;flex:none;justify-content:center;align-items:center;font-size:12px;font-weight:600;display:inline-flex}.pXw9Qa_memberBody{flex-direction:column;flex:auto;gap:6px;min-width:0;display:flex}.pXw9Qa_memberTop{justify-content:space-between;align-items:baseline;gap:8px;min-width:0;display:flex}.pXw9Qa_memberTop strong{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;overflow:hidden}.pXw9Qa_memberTop>span{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;flex:none;font-size:13px;font-weight:600}.pXw9Qa_memberMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:2px 10px;font-size:12px;line-height:18px;display:flex}.pXw9Qa_subHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;margin-top:8px;display:flex}.pXw9Qa_subTitle{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0;font-size:15px;font-weight:600;line-height:22px}.pXw9Qa_extras{flex-direction:column;gap:8px;display:flex}.pXw9Qa_more{border:1px solid var(--qm-card-border);border-radius:var(--qm-tile-radius);background:var(--qm-card-bg);min-width:0}.pXw9Qa_more>summary{color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:inherit;align-items:center;gap:10px;padding:10px 14px;font-size:13px;font-weight:500;line-height:20px;list-style:none;display:flex}.pXw9Qa_more>summary::-webkit-details-marker{display:none}.pXw9Qa_more>summary:hover{color:var(--dsw-alias-label-primary)}.pXw9Qa_chevron{border-bottom:1.5px solid;border-right:1.5px solid;width:6px;height:6px;margin:0 2px;transition:transform .15s;transform:rotate(-45deg)}.pXw9Qa_more[open]>summary .pXw9Qa_chevron{transform:rotate(45deg)}.pXw9Qa_tableWrap{padding:0 6px 8px;overflow-x:auto}.pXw9Qa_table{border-collapse:collapse;width:100%;font-size:13px;line-height:20px}.pXw9Qa_table th{border-bottom:1px solid var(--qm-divider);color:var(--dsw-alias-label-tertiary);text-align:left;white-space:nowrap;padding:8px 10px;font-size:12px;font-weight:500;line-height:18px}.pXw9Qa_table td{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;padding:8px 10px}.pXw9Qa_table tbody tr+tr td{border-top:1px solid var(--qm-divider)}.pXw9Qa_table tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}.pXw9Qa_numeric{font-variant-numeric:tabular-nums}.pXw9Qa_mono{font-family:var(--qm-font-mono);font-size:12px}.pXw9Qa_empty{border-radius:var(--qm-tile-radius);background:var(--qm-tile-bg);color:var(--dsw-alias-label-tertiary);text-align:center;margin:0;padding:16px;font-size:13px}.pXw9Qa_footnotes{flex-direction:column;gap:2px;display:flex}.pXw9Qa_footnotes p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}@media (width<=600px){.pXw9Qa_hero{padding:16px}.pXw9Qa_heroValue{font-size:28px;line-height:36px}}@media (prefers-reduced-motion:reduce){.pXw9Qa_pill,.pXw9Qa_memberCard,.pXw9Qa_chevron{transition:none}}";
		const tagId$6 = "@deepseek-ai/dsh-extension-quota-monitor/MemberAnalysis.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var MemberAnalysis_module_css_default = {
			"badgeOk": "pXw9Qa_badgeOk",
			"chevron": "pXw9Qa_chevron",
			"empty": "pXw9Qa_empty",
			"extras": "pXw9Qa_extras",
			"footnotes": "pXw9Qa_footnotes",
			"head": "pXw9Qa_head",
			"hero": "pXw9Qa_hero",
			"heroFigure": "pXw9Qa_heroFigure",
			"heroMain": "pXw9Qa_heroMain",
			"heroMeter": "pXw9Qa_heroMeter",
			"heroStats": "pXw9Qa_heroStats",
			"heroValue": "pXw9Qa_heroValue",
			"label": "pXw9Qa_label",
			"memberBody": "pXw9Qa_memberBody",
			"memberCard": "pXw9Qa_memberCard",
			"memberList": "pXw9Qa_memberList",
			"memberMeta": "pXw9Qa_memberMeta",
			"memberRank": "pXw9Qa_memberRank",
			"memberTop": "pXw9Qa_memberTop",
			"meta": "pXw9Qa_meta",
			"meter": "pXw9Qa_meter",
			"mono": "pXw9Qa_mono",
			"more": "pXw9Qa_more",
			"note": "pXw9Qa_note",
			"numeric": "pXw9Qa_numeric",
			"periodBar": "pXw9Qa_periodBar",
			"pill": "pXw9Qa_pill",
			"pills": "pXw9Qa_pills",
			"root": "pXw9Qa_root",
			"statusNote": "pXw9Qa_statusNote",
			"subHead": "pXw9Qa_subHead",
			"subTitle": "pXw9Qa_subTitle",
			"table": "pXw9Qa_table",
			"tableWrap": "pXw9Qa_tableWrap",
			"tile": "pXw9Qa_tile",
			"tileValue": "pXw9Qa_tileValue",
			"tiles": "pXw9Qa_tiles",
			"title": "pXw9Qa_title"
		};
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/UsageCharts.module.css.mjs
		const css$5 = "._6kywuW_dashboard{flex-direction:column;gap:12px;min-width:0;display:flex;container-type:inline-size}._6kywuW_chartPair{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;display:grid}._6kywuW_chart{min-width:0;padding:var(--qm-card-pad,20px);border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg);flex-direction:column;gap:12px;margin:0;display:flex}._6kywuW_heading{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px}._6kywuW_donutBody{flex:auto;align-items:center;gap:20px;min-width:0;display:flex}._6kywuW_ring{flex:0 0 120px;width:120px;height:120px;position:relative}._6kywuW_ring svg{width:100%;height:100%;display:block;overflow:visible}._6kywuW_ring circle{transition:opacity .15s,stroke-width .15s}._6kywuW_track{stroke:var(--qm-track)}._6kywuW_center{pointer-events:none;flex-direction:column;justify-content:center;align-items:center;gap:2px;padding:20px;display:flex;position:absolute;inset:0}._6kywuW_center strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:15px;font-weight:600;line-height:22px}._6kywuW_center span{max-width:72px;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}._6kywuW_legend{flex-direction:column;flex:auto;gap:2px;min-width:0;display:flex}._6kywuW_legendRow{min-width:0;min-height:30px;color:var(--dsw-alias-label-secondary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:8px;grid-template-columns:8px minmax(0,1fr) auto 44px;align-items:center;gap:10px;padding:4px 8px;font-size:13px;line-height:20px;transition:background-color .15s;display:grid}._6kywuW_legendRow:hover,._6kywuW_legendRow[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover)}._6kywuW_legendRow[aria-pressed=true]{color:var(--dsw-alias-label-primary)}._6kywuW_swatch{border-radius:50%;flex-shrink:0;width:8px;height:8px;display:inline-block}._6kywuW_legendName{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}._6kywuW_legendValue{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}._6kywuW_legendShare{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;font-size:12px}._6kywuW_empty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}._6kywuW_modelDetail{min-width:0;padding:16px var(--qm-card-pad,20px);border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg)}._6kywuW_detailHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px 12px;margin-bottom:12px;display:flex}._6kywuW_detailHead h4{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;align-items:center;gap:8px;margin:0;font-size:13px;font-weight:600;line-height:20px;display:flex}._6kywuW_detailHead>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}._6kywuW_detailMetrics{grid-template-columns:repeat(6,minmax(0,1fr));gap:12px 16px;display:grid}._6kywuW_detailMetrics>div{flex-direction:column;gap:4px;min-width:0;display:flex}._6kywuW_detailMetrics span{color:var(--dsw-alias-label-secondary);white-space:nowrap;align-items:center;gap:6px;font-size:12px;line-height:18px;display:flex}._6kywuW_detailMetrics strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-size:17px;font-weight:600;line-height:24px}._6kywuW_trendHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;display:flex}._6kywuW_trendValue{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}._6kywuW_plot{border-bottom:1px solid var(--dsw-alias-border-l2);height:160px;margin:8px 0 0 48px;position:relative}._6kywuW_plot:before,._6kywuW_plot:after{content:\"\";border-top:1px dashed var(--qm-divider);pointer-events:none;position:absolute;left:0;right:0}._6kywuW_plot:before{top:0}._6kywuW_plot:after{top:50%}._6kywuW_grid{width:40px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;pointer-events:none;flex-direction:column;justify-content:space-between;align-items:flex-end;font-size:11px;line-height:16px;display:flex;position:absolute;inset:-8px auto -8px -48px}._6kywuW_bars{z-index:1;align-items:stretch;gap:3px;height:100%;display:flex;position:relative}._6kywuW_barSlot{cursor:pointer;background:0 0;border:0;border-radius:4px 4px 0 0;flex:1;justify-content:center;align-items:flex-end;min-width:0;height:100%;padding:0;display:flex;position:relative}._6kywuW_barSlot:hover,._6kywuW_barSlot:focus-visible{background:var(--qm-accent-soft)}._6kywuW_bar{background:var(--qm-accent);border-radius:4px 4px 0 0;width:100%;max-width:28px;min-height:2px;transition:height .2s}._6kywuW_unknown ._6kywuW_bar{background:var(--dsw-alias-label-tertiary);opacity:.35}._6kywuW_axis{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;justify-content:space-between;margin:6px 0 0 48px;font-size:11px;line-height:16px;display:flex}@container (width<=720px){._6kywuW_chartPair{grid-template-columns:minmax(0,1fr)}._6kywuW_detailMetrics{grid-template-columns:repeat(3,minmax(0,1fr))}}@container (width<=420px){._6kywuW_chart{padding:16px}._6kywuW_donutBody{flex-direction:column;align-items:stretch}._6kywuW_ring{align-self:center}._6kywuW_detailMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}._6kywuW_bars{gap:1px}}@media (prefers-reduced-motion:reduce){._6kywuW_ring circle,._6kywuW_bar,._6kywuW_legendRow{transition:none}}";
		const tagId$5 = "@deepseek-ai/dsh-extension-quota-monitor/UsageCharts.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var UsageCharts_module_css_default = {
			"axis": "_6kywuW_axis",
			"bar": "_6kywuW_bar",
			"barSlot": "_6kywuW_barSlot",
			"bars": "_6kywuW_bars",
			"center": "_6kywuW_center",
			"chart": "_6kywuW_chart",
			"chartPair": "_6kywuW_chartPair",
			"dashboard": "_6kywuW_dashboard",
			"detailHead": "_6kywuW_detailHead",
			"detailMetrics": "_6kywuW_detailMetrics",
			"donutBody": "_6kywuW_donutBody",
			"empty": "_6kywuW_empty",
			"grid": "_6kywuW_grid",
			"heading": "_6kywuW_heading",
			"legend": "_6kywuW_legend",
			"legendName": "_6kywuW_legendName",
			"legendRow": "_6kywuW_legendRow",
			"legendShare": "_6kywuW_legendShare",
			"legendValue": "_6kywuW_legendValue",
			"modelDetail": "_6kywuW_modelDetail",
			"plot": "_6kywuW_plot",
			"ring": "_6kywuW_ring",
			"swatch": "_6kywuW_swatch",
			"track": "_6kywuW_track",
			"trendHead": "_6kywuW_trendHead",
			"trendValue": "_6kywuW_trendValue",
			"unknown": "_6kywuW_unknown"
		};
		//#endregion
		//#region src/client/UsageCharts.tsx
		const colors = [
			"#4f8ff7",
			"#20b8a5",
			"#a184ed",
			"#f0ae47",
			"#e9798c",
			"#60b8dc",
			"#9fb168"
		];
		function modelColor(index) {
			return `hsl(${(210 + Math.max(0, index) * 137.508) % 360} 65% 60%)`;
		}
		const bucketKeys = [
			"inputTokens",
			"outputTokens",
			"cacheReadTokens",
			"cacheWriteTokens"
		];
		const bucketLabels = [
			"usage.input",
			"usage.output",
			"usage.cacheRead",
			"usage.cacheWrite"
		];
		/** Legends support keyboard/touch; hover highlights slices while the centre keeps the total. */
		function Donut({ title, slices, t, available, reportedTotal, onInspect }) {
			const [highlight, setHighlight] = (0, react.useState)();
			const inspect = (label) => {
				setHighlight(label);
				onInspect?.(label);
			};
			const clear = () => {
				if (!onInspect) setHighlight(void 0);
			};
			const total = reportedTotal ?? slices.reduce((sum, slice) => sum + slice.value, 0);
			const selected = slices.find((slice) => slice.label === highlight);
			let offset = 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
				className: UsageCharts_module_css_default.chart,
				"aria-label": title,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
					className: UsageCharts_module_css_default.heading,
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsageCharts_module_css_default.donutBody,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageCharts_module_css_default.ring,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							viewBox: "0 0 160 160",
							role: "img",
							"aria-label": `${title}: ${available ? fmtNumber(total) : t("analysis.unavailable")}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								cx: "80",
								cy: "80",
								r: "64",
								fill: "none",
								className: UsageCharts_module_css_default.track,
								strokeWidth: "15"
							}), slices.map((slice) => {
								const share = total > 0 ? slice.value / total * 100 : 0;
								const start = offset;
								offset += share;
								return share > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
									cx: "80",
									cy: "80",
									r: "64",
									fill: "none",
									stroke: slice.color,
									strokeWidth: 15,
									pathLength: "100",
									strokeDasharray: `${Math.max(0, share - Math.min(.75, share / 4))} ${100 - Math.max(0, share - Math.min(.75, share / 4))}`,
									strokeDashoffset: -start,
									transform: "rotate(-90 80 80)",
									opacity: selected && selected.label !== slice.label ? .35 : 1,
									onMouseEnter: () => inspect(slice.label),
									onMouseLeave: clear,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("title", { children: [
										slice.label,
										": ",
										fmtNumber(slice.value),
										" · ",
										fmtPercent(share)
									] })
								}, slice.label);
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageCharts_module_css_default.center,
							"aria-live": "polite",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: available ? fmtTokens(total) : "—" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("analysis.tokens") })]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UsageCharts_module_css_default.legend,
						children: available && slices.some((slice) => slice.value > 0) ? slices.filter((slice) => slice.value > 0).map((slice) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: UsageCharts_module_css_default.legendRow,
							"aria-pressed": highlight === slice.label,
							onMouseEnter: () => inspect(slice.label),
							onMouseLeave: clear,
							onFocus: () => inspect(slice.label),
							onBlur: clear,
							onClick: () => inspect(slice.label),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
									className: UsageCharts_module_css_default.swatch,
									style: { background: slice.color },
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageCharts_module_css_default.legendName,
									title: slice.label,
									children: slice.label
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageCharts_module_css_default.legendValue,
									title: fmtNumber(slice.value),
									children: fmtTokens(slice.value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageCharts_module_css_default.legendShare,
									children: fmtPercent(slice.value / total * 100)
								})
							]
						}, slice.label)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsageCharts_module_css_default.empty,
							children: t(!available ? "analysis.unavailable" : total > 0 ? "charts.breakdownUnavailable" : "charts.zero")
						})
					})]
				})]
			});
		}
		/** Include calendar gaps so adjacent bars never conceal idle or unavailable days. */
		function calendarSeries(daily, range, availableStart, availableEnd) {
			const byDate = new Map(daily.map((day) => [day.date, day.totalTokens]));
			const series = [];
			for (let stamp = Date.parse(`${range.start}T00:00:00Z`); stamp <= Date.parse(`${range.end}T00:00:00Z`); stamp += 864e5) {
				const date = new Date(stamp).toISOString().slice(0, 10);
				const known = availableStart !== void 0 && availableEnd !== void 0 && date >= availableStart && date <= availableEnd;
				series.push({
					date,
					value: byDate.get(date) ?? (known ? 0 : void 0)
				});
			}
			return series;
		}
		function UsageCharts({ t, totals, models, daily, range, startDate, endDate, modelNames = [] }) {
			const dailyComplete = totals !== void 0 && daily.reduce((sum, day) => sum + day.totalTokens, 0) === totals.totalTokens;
			const series = calendarSeries(daily, range, dailyComplete ? startDate : void 0, dailyComplete ? endDate : void 0);
			const max = Math.max(1, ...series.map((day) => day.value ?? 0));
			const peak = series.reduce((peak, day) => day.value !== void 0 && day.value > (peak?.value ?? 0) ? day : peak, void 0);
			const [hovered, setHovered] = (0, react.useState)();
			const focusDay = series.find((day) => day.date === hovered);
			const tokenSlices = bucketKeys.map((key, i) => ({
				label: t(bucketLabels[i]),
				value: totals?.[key] ?? 0,
				color: colors[i]
			}));
			const bucketSum = tokenSlices.reduce((sum, slice) => sum + slice.value, 0);
			const tokenTotal = totals?.totalTokens ?? 0;
			if (bucketSum < tokenTotal) tokenSlices.push({
				label: t("charts.unclassified"),
				value: tokenTotal - bucketSum,
				color: "#8e9aaa"
			});
			if (bucketSum > tokenTotal) tokenSlices.length = 0;
			const catalog = modelNames.length ? modelNames : models.map((model) => model.model).sort();
			const sorted = [...models].sort((a, b) => b.totalTokens - a.totalTokens);
			const modelSlices = sorted.map((model) => ({
				label: model.model,
				value: model.totalTokens,
				color: modelColor(catalog.indexOf(model.model))
			}));
			const [inspectedModel, setInspectedModel] = (0, react.useState)();
			const modelDetail = sorted.find((model) => model.model === inspectedModel) ?? sorted[0];
			const modelTotal = sorted.reduce((sum, model) => sum + model.totalTokens, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsageCharts_module_css_default.dashboard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsageCharts_module_css_default.chartPair,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Donut, {
							title: t("charts.tokens"),
							slices: tokenSlices,
							available: totals !== void 0,
							t,
							...totals === void 0 ? {} : { reportedTotal: totals.totalTokens }
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Donut, {
							title: t("charts.models"),
							slices: modelSlices,
							available: models.some((model) => model.totalTokens > 0) || totals?.totalTokens === 0,
							t,
							onInspect: setInspectedModel
						})]
					}),
					modelDetail && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsageCharts_module_css_default.modelDetail,
						"aria-label": t("charts.modelDetail"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageCharts_module_css_default.detailHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
								className: UsageCharts_module_css_default.swatch,
								style: { background: modelColor(catalog.indexOf(modelDetail.model)) }
							}), modelDetail.model] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								fmtPercent(modelTotal > 0 ? modelDetail.totalTokens / modelTotal * 100 : void 0),
								" · ",
								t("charts.inspect")
							] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsageCharts_module_css_default.detailMetrics,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("analysis.tokens") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									title: fmtNumber(modelDetail.totalTokens),
									children: fmtTokens(modelDetail.totalTokens)
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("analysis.calls") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: fmtNumber(modelDetail.calls) })] }),
								bucketKeys.map((key, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
									className: UsageCharts_module_css_default.swatch,
									style: { background: colors[index] }
								}), t(bucketLabels[index])] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									title: fmtNumber(modelDetail[key]),
									children: fmtTokens(modelDetail[key])
								})] }, key))
							]
						})]
					}),
					totals !== void 0 && models.length > 0 && models.reduce((sum, model) => sum + model.totalTokens, 0) !== totals.totalTokens && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: UsageCharts_module_css_default.empty,
						children: t("charts.modelsPartial")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
						className: UsageCharts_module_css_default.chart,
						"aria-label": t("charts.trend"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageCharts_module_css_default.trendHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
									className: UsageCharts_module_css_default.heading,
									children: t("charts.trend")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsageCharts_module_css_default.trendValue,
									children: focusDay ? `${focusDay.date} · ${focusDay.value === void 0 ? t("analysis.unavailable") : fmtTokens(focusDay.value)}` : peak ? `${t("charts.peak")} ${peak.date} · ${fmtTokens(peak.value)}` : t(series.every((day) => day.value === 0) ? "charts.zero" : "analysis.unavailable")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageCharts_module_css_default.plot,
								role: "group",
								"aria-label": t("charts.trend"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsageCharts_module_css_default.grid,
									"aria-hidden": "true",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtTokens(max === 1 ? 0 : max) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtTokens(max === 1 ? 0 : max / 2) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "0" })
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsageCharts_module_css_default.bars,
									children: series.map((day) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${UsageCharts_module_css_default.barSlot} ${day.value === void 0 ? UsageCharts_module_css_default.unknown : ""}`,
										title: `${day.date}: ${day.value === void 0 ? t("analysis.unavailable") : fmtNumber(day.value)}`,
										"aria-label": `${day.date}: ${day.value === void 0 ? t("analysis.unavailable") : `${fmtNumber(day.value)} tokens`}`,
										onMouseEnter: () => setHovered(day.date),
										onMouseLeave: () => setHovered(void 0),
										onFocus: () => setHovered(day.date),
										onBlur: () => setHovered(void 0),
										onClick: () => setHovered(day.date),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsageCharts_module_css_default.bar,
											style: { height: `${day.value === void 0 ? 0 : day.value / max * 100}%` }
										})
									}, day.date))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsageCharts_module_css_default.axis,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: range.start }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: range.end })]
							}),
							series.some((day) => day.value === void 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: UsageCharts_module_css_default.empty,
								children: t("charts.unknownDays")
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/MemberAnalysis.tsx
		const periods = [
			"thisWeek",
			"lastWeek",
			"thisMonth",
			"lastMonth",
			"last30"
		];
		const buckets = [
			"inputTokens",
			"outputTokens",
			"cacheReadTokens",
			"cacheWriteTokens"
		];
		const labels = [
			"usage.input",
			"usage.output",
			"usage.cacheRead",
			"usage.cacheWrite"
		];
		function billingRate(period) {
			return period?.totalTokens && period.used !== void 0 ? period.used / period.totalTokens * 1e6 : void 0;
		}
		function BucketCells({ value }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: buckets.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
				className: MemberAnalysis_module_css_default.numeric,
				title: fmtNumber(value[key]),
				children: fmtTokens(value[key])
			}, key)) });
		}
		/** Uses the parent snapshot and selection: opening the analysis never triggers another fetch. */
		function MemberAnalysis({ t, providers, provider, credential, capturedAt, onSelect, mode = "team" }) {
			const [period, setPeriod] = (0, react.useState)("thisMonth");
			const range = (0, react.useMemo)(() => periodRange(period, capturedAt), [period, capturedAt]);
			const entry = providers.find((item) => item.id === provider);
			const modelNames = (0, react.useMemo)(() => [...new Set((entry?.accounts ?? []).flatMap((account) => [...(account.keyUsage?.models ?? []).map((model) => model.model), ...(account.keyUsage?.points ?? []).map((point) => point.model)]))].sort(), [entry]);
			const rows = (0, react.useMemo)(() => (entry?.credentialRefs.length ? entry.credentialRefs : [void 0]).map((ref) => {
				const account = entry?.accounts.find((item) => item.credentialRef === ref) ?? (ref === void 0 ? entry?.accounts[0] : void 0);
				return {
					ref,
					name: (ref === void 0 ? void 0 : entry?.keyNames?.[ref]) ?? account?.keyName ?? account?.accountName ?? (ref === void 0 ? t("keypage.identity.default") : ref.replace(/^QUOTA_KEY_/, "").slice(0, 14) + "…"),
					account,
					usage: sliceUsage(account?.keyUsage, range)
				};
			}).sort((a, b) => (b.usage.totals?.totalTokens ?? -1) - (a.usage.totals?.totalTokens ?? -1)), [
				entry,
				range,
				t
			]);
			const active = rows.find((row) => row.ref === (entry?.activeCredentialRef ?? entry?.credentialRefs[0])) ?? rows[0];
			const visibleRows = mode === "current" ? active ? [active] : [] : rows;
			const metered = visibleRows.filter((row) => row.usage.totals !== void 0);
			const total = sumUsage(metered.map((row) => row.usage.totals));
			const selected = mode === "current" ? active : rows.find((row) => row.ref === credential) ?? rows[0];
			const detail = selected?.usage;
			const partial = visibleRows.some((row) => row.usage.coverage === "partial");
			const retained = visibleRows.flatMap((row) => row.account?.keyUsageFetchedAt === void 0 ? [] : [row.account.keyUsageFetchedAt]);
			const retainedAt = retained.length ? new Date(Math.min(...retained)).toLocaleString(void 0, {
				timeZone: "Asia/Shanghai",
				hour12: false
			}) : void 0;
			const fullTotal = metered.length === visibleRows.length && !partial;
			const cacheShare = total.totalTokens > 0 ? total.cacheReadTokens / total.totalTokens * 100 : void 0;
			const header = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.model") }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.calls") }),
				labels.map((label) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t(label) }, label)),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.tokens") })
			] });
			const billing = selected?.account?.keyUsage?.period;
			const price = billing?.totalTokens && billing.used !== void 0 ? billing.used / billing.totalTokens * 1e6 : void 0;
			const account = selected?.account;
			const used = billing?.used ?? account?.used;
			const usedPercent = used !== void 0 && account?.limit !== void 0 && account.limit > 0 ? Math.min(100, Math.max(0, used / account.limit * 100)) : void 0;
			const exact = (title, label, head, body) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				className: MemberAnalysis_module_css_default.more,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: MemberAnalysis_module_css_default.chevron,
					"aria-hidden": "true"
				}), title] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: MemberAnalysis_module_css_default.tableWrap,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: MemberAnalysis_module_css_default.table,
						"aria-label": label,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: head }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: body })]
					})
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: MemberAnalysis_module_css_default.root,
				"aria-label": t(mode === "current" ? "analysis.current" : "analysis.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: MemberAnalysis_module_css_default.title,
							children: t(mode === "current" ? "analysis.current" : "analysis.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: MemberAnalysis_module_css_default.meta,
							children: mode === "current" ? `${entry?.name ?? ""} · ${selected?.name ?? "—"}` : t("analysis.hint")
						})]
					}),
					mode === "current" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.hero,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: MemberAnalysis_module_css_default.heroMain,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: MemberAnalysis_module_css_default.label,
										children: t("account.remaining")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: MemberAnalysis_module_css_default.heroFigure,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											className: MemberAnalysis_module_css_default.heroValue,
											children: fmtAmount(account?.remaining, account?.currency)
										}), account?.status === "ok" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: MemberAnalysis_module_css_default.badgeOk,
											children: t("status.ok")
										})]
									}),
									account?.status !== "ok" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: MemberAnalysis_module_css_default.statusNote,
										children: account?.reason ?? t("status.unavailable")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
								className: MemberAnalysis_module_css_default.heroStats,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: [
									t("keypage.tile.used"),
									" · ",
									billing?.periodKey ?? "—"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtAmount(used, account?.currency) })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("analysis.limit") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtAmount(account?.limit, account?.currency) })] })]
							}),
							usedPercent !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: MemberAnalysis_module_css_default.heroMeter,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: MemberAnalysis_module_css_default.meter,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${usedPercent}%` } })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: MemberAnalysis_module_css_default.meta,
									children: t("keypage.key.percent", { percent: fmtPercent(usedPercent) })
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.periodBar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: MemberAnalysis_module_css_default.pills,
							role: "group",
							"aria-label": t("analysis.period"),
							children: periods.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: MemberAnalysis_module_css_default.pill,
								"aria-pressed": period === value,
								onClick: () => setPeriod(value),
								children: t(`analysis.${value}`)
							}, value))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: MemberAnalysis_module_css_default.meta,
							children: [
								range.start,
								" — ",
								range.end
							]
						})]
					}),
					mode === "team" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: MemberAnalysis_module_css_default.meta,
						children: t("analysis.scope")
					}),
					account && account.status !== "ok" && account.keyUsage === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						className: MemberAnalysis_module_css_default.note,
						children: t("analysis.readFailed", { reason: account.reason ?? account.status })
					}),
					retainedAt && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						className: MemberAnalysis_module_css_default.note,
						children: t("analysis.retained", {
							count: retained.length,
							time: retainedAt
						})
					}),
					partial && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						className: MemberAnalysis_module_css_default.note,
						children: t("analysis.coverage")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.tiles,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: MemberAnalysis_module_css_default.tile,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: MemberAnalysis_module_css_default.label,
										children: [t("analysis.tokens"), fullTotal ? "" : ` · ${t("analysis.partial")}`]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										className: MemberAnalysis_module_css_default.tileValue,
										children: metered.length ? fmtTokens(total.totalTokens) : "—"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: MemberAnalysis_module_css_default.meta,
										children: [
											range.start,
											" — ",
											range.end
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: MemberAnalysis_module_css_default.tile,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: MemberAnalysis_module_css_default.label,
									children: t("analysis.calls")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									className: MemberAnalysis_module_css_default.tileValue,
									children: metered.length ? fmtNumber(total.calls) : "—"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: MemberAnalysis_module_css_default.tile,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: MemberAnalysis_module_css_default.label,
									children: t("analysis.cacheShare")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									className: MemberAnalysis_module_css_default.tileValue,
									children: fmtPercent(cacheShare)
								})]
							}),
							mode === "team" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: MemberAnalysis_module_css_default.tile,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: MemberAnalysis_module_css_default.label,
									children: t("analysis.members")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
									className: MemberAnalysis_module_css_default.tileValue,
									children: [
										metered.filter((row) => (row.usage.totals?.totalTokens ?? 0) > 0 || (row.usage.totals?.calls ?? 0) > 0).length,
										" / ",
										rows.length
									]
								})]
							})
						]
					}),
					mode === "team" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: MemberAnalysis_module_css_default.memberList,
						"aria-label": t("analysis.member"),
						children: rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: MemberAnalysis_module_css_default.memberCard,
							"aria-label": row.name,
							"aria-pressed": row === selected,
							onClick: () => entry && onSelect(entry.id, row.ref),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: MemberAnalysis_module_css_default.memberRank,
								children: index + 1
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: MemberAnalysis_module_css_default.memberBody,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: MemberAnalysis_module_css_default.memberTop,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											title: row.name,
											children: row.name
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtTokens(row.usage.totals?.totalTokens) })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: MemberAnalysis_module_css_default.meter,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${total.totalTokens > 0 ? (row.usage.totals?.totalTokens ?? 0) / total.totalTokens * 100 : 0}%` } })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: MemberAnalysis_module_css_default.memberMeta,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("usage.calls", { calls: fmtNumber(row.usage.totals?.calls) }) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("keypage.key.cacheShare", { percent: fmtPercent(row.usage.totals && row.usage.totals.totalTokens > 0 ? row.usage.totals.cacheReadTokens / row.usage.totals.totalTokens * 100 : void 0) }) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("keypage.key.rateShort", { amount: fmtAmount(billingRate(row.account?.keyUsage?.period), row.account?.currency) }) })
										]
									}),
									row.usage.coverage !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: MemberAnalysis_module_css_default.meta,
										children: t(row.usage.coverage === "partial" ? "analysis.partial" : "analysis.unavailable")
									})
								]
							})]
						}) }, row.ref ?? "default"))
					}),
					mode === "team" && exact(t("analysis.exactMembers"), t("analysis.member"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.member") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.tokens") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.share") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.calls") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.activeDays") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.cacheShare") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("keypage.tile.used") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.currentRate") })
					] }), rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [row.name, row.usage.coverage !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: MemberAnalysis_module_css_default.meta,
							children: [" ", t(row.usage.coverage === "partial" ? "analysis.partial" : "analysis.unavailable")]
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							title: fmtNumber(row.usage.totals?.totalTokens),
							children: fmtTokens(row.usage.totals?.totalTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtPercent(row.usage.totals && total.totalTokens > 0 ? row.usage.totals.totalTokens / total.totalTokens * 100 : void 0) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtNumber(row.usage.totals?.calls) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.usage.totals ? row.usage.daily.filter((day) => day.totalTokens > 0 || (day.calls ?? 0) > 0).length : "—" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtPercent(row.usage.totals && row.usage.totals.totalTokens > 0 ? row.usage.totals.cacheReadTokens / row.usage.totals.totalTokens * 100 : void 0) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							title: row.account?.keyUsage?.period?.periodKey,
							children: fmtAmount(row.account?.keyUsage?.period?.used, row.account?.currency)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							title: row.account?.keyUsage?.period?.periodKey,
							children: fmtAmount(billingRate(row.account?.keyUsage?.period), row.account?.currency)
						})
					] }, row.ref ?? "default"))),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.subHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
							className: MemberAnalysis_module_css_default.subTitle,
							children: [
								selected?.name,
								" · ",
								t("charts.overview")
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: MemberAnalysis_module_css_default.meta,
							children: [
								range.start,
								" — ",
								range.end
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageCharts, {
						modelNames,
						t,
						totals: detail?.totals,
						models: detail?.models ?? [],
						daily: detail?.daily ?? [],
						range,
						startDate: selected?.account?.keyUsage?.startDate,
						endDate: selected?.account?.keyUsage?.endDate
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.extras,
						children: [detail?.models.length ? exact(t("analysis.exactModels"), t("analysis.models"), header, detail.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: MemberAnalysis_module_css_default.mono,
								children: model.model
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtNumber(model.calls) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BucketCells, { value: model }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								title: fmtNumber(model.totalTokens),
								children: fmtTokens(model.totalTokens)
							})
						] }, model.model))) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: MemberAnalysis_module_css_default.empty,
							children: t("analysis.empty")
						}), exact(`${t("analysis.daily")} · ${selected?.name ?? ""}`, t("analysis.daily"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.date") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.calls") }),
							labels.map((label) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t(label) }, label)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("analysis.tokens") })
						] }), detail?.daily.map((day) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: day.date }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtNumber(day.calls) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BucketCells, { value: day }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(day.totalTokens) })
						] }, day.date)))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MemberAnalysis_module_css_default.footnotes,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("analysis.money") }),
							billing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
								selected?.name,
								" · ",
								billing.periodKey,
								" · ",
								t("keypage.tile.used"),
								": ",
								fmtAmount(billing.used, billing.currency ?? selected?.account?.currency),
								" · ",
								t("keypage.tile.periodTokens", { tokens: fmtTokens(billing.totalTokens) }),
								price === void 0 ? "" : ` · ${t("keypage.key.rateShort", { amount: fmtAmount(price, billing.currency ?? selected?.account?.currency) })}`
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("analysis.freshness", { date: entry?.accounts.find((item) => item.keyUsage?.endDate)?.keyUsage?.endDate ?? "—" }) })
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/windows.ts
		/** Dictionary key naming each plan window kind. */
		const WINDOW_KEYS = Object.freeze({
			"session": "window.session",
			"five-hour": "window.fiveHour",
			"daily": "window.daily",
			"weekly": "window.weekly",
			"monthly": "window.monthly",
			"billing": "window.billing",
			"quota": "window.quota"
		});
		/**
		* The windows a compact surface shows: the most spent first.
		*
		* The order a reading carries is the endpoint's own; a pill that has room for
		* two of five windows should state the two closest to their ceiling, because
		* those are the ones that change what the reader does next.
		* @param account - the reading whose windows are ranked.
		* @param limit - how many windows to keep.
		* @returns the worst windows, most spent first.
		*/
		function worstWindows(account, limit) {
			return [...account.planWindows ?? []].sort((left, right) => right.percentUsed - left.percentUsed).slice(0, limit);
		}
		/**
		* The severity a reading draws with.
		*
		* A Host-resolved `warning` wins, because the adapter knows its own scale; a
		* reading that carries none falls back to the spent share of its windows.
		* @param account - the reading to tone.
		* @returns the severity level.
		*/
		function accountTone(account) {
			if (account.warning !== void 0) return account.warning;
			const spent = Math.max(0, ...(account.planWindows ?? []).map((window) => window.percentUsed));
			if (spent >= 100) return "critical";
			return spent >= 80 ? "warning" : "normal";
		}
		/**
		* Whether a reading carries any figure worth a compact surface.
		* @param account - the reading to test.
		* @returns true when it states a window or a balance.
		*/
		function hasFigure(account) {
			if (account.planWindows !== void 0 && account.planWindows.length > 0) return true;
			return account.unlimited === true || account.remaining !== void 0;
		}
		/**
		* The figure a selector chip states for one reading.
		*
		* A balance states what is left, which is the number that ranks keys against
		* each other. A plan states the spent share of its tightest window, because
		* that is the one that runs out first. A reading that could not be read, or
		* that carries no figure at all, states nothing and leaves its dot to say why.
		* @param account - the reading to summarize.
		* @returns the compact figure, or undefined when the reading carries none.
		*/
		function chipFigure(account) {
			if (account === void 0 || account.status !== "ok") return void 0;
			if (account.remaining !== void 0) return fmtAmount(account.remaining, account.currency);
			const tightest = worstWindows(account, 1)[0];
			return tightest === void 0 ? void 0 : `${Math.round(tightest.percentUsed)}%`;
		}
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/Keys.module.css.mjs
		const css$4 = ".-KlfeG_manager{box-sizing:border-box;min-width:0;padding:var(--qm-card-pad);border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg);color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;margin:0;font-size:13px;line-height:20px;display:flex}.-KlfeG_manager legend{float:left;width:100%;padding:0;font-size:13px;font-weight:600;line-height:20px}.-KlfeG_hint{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.-KlfeG_list{flex-direction:column;gap:4px;min-width:0;display:flex}.-KlfeG_row{box-sizing:border-box;border-radius:10px;align-items:center;gap:12px;min-width:0;min-height:48px;padding:10px 12px;display:flex}.-KlfeG_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.-KlfeG_row.-KlfeG_selected{background:var(--qm-accent-soft)}.-KlfeG_view{min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex:1;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 12px;padding:0;display:grid}.-KlfeG_view strong{text-overflow:ellipsis;white-space:nowrap;grid-area:1/1;min-width:0;font-size:13px;font-weight:500;overflow:hidden}.-KlfeG_reference{min-width:0;color:var(--dsw-alias-label-tertiary);font-family:var(--qm-font-mono);text-overflow:ellipsis;white-space:nowrap;grid-area:2/1;font-size:12px;line-height:18px;overflow:hidden}.-KlfeG_figure{font-variant-numeric:tabular-nums;text-align:right;grid-area:1/2;font-size:13px;font-weight:600}.-KlfeG_badge{box-sizing:border-box;background:var(--qm-tile-bg);max-width:100%;min-height:20px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;border-radius:10px;grid-area:2/2;justify-self:end;align-items:center;padding:0 8px;font-size:12px;line-height:18px;display:inline-flex}.-KlfeG_row>button{flex:none}.-KlfeG_row>.-KlfeG_view{flex:1}.-KlfeG_active:disabled{background:var(--qm-tile-bg);color:var(--dsw-alias-label-secondary);opacity:1;border-color:#0000;border-radius:10px}.-KlfeG_form,.-KlfeG_controls{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}.-KlfeG_form input{flex:180px}.-KlfeG_manager input,.-KlfeG_manager select{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--qm-control-radius);min-width:0;max-width:100%;height:32px;color:var(--dsw-alias-label-primary);font:inherit;background:0 0;padding:0 10px;font-size:13px}.-KlfeG_manager input::placeholder{color:var(--dsw-alias-label-tertiary)}.-KlfeG_manager input:hover,.-KlfeG_manager select:hover{border-color:var(--dsw-alias-border-l3)}.-KlfeG_manager button:focus-visible,.-KlfeG_manager summary:focus-visible,.-KlfeG_manager input:focus-visible,.-KlfeG_manager select:focus-visible{outline:2px solid var(--qm-accent);outline-offset:1px}.-KlfeG_disclosure,.-KlfeG_routing{border-top:1px solid var(--qm-divider);min-width:0;padding-top:16px}.-KlfeG_disclosure summary{width:fit-content;color:var(--dsw-alias-label-secondary);cursor:pointer;align-items:center;gap:8px;font-size:13px;font-weight:500;list-style:none;display:flex}.-KlfeG_disclosure summary::-webkit-details-marker{display:none}.-KlfeG_chevron{flex:none;transition:transform .16s}.-KlfeG_disclosure[open] .-KlfeG_chevron{transform:rotate(90deg)}.-KlfeG_disclosure[open]>summary{color:var(--dsw-alias-label-primary);margin-bottom:16px}.-KlfeG_disclosure .-KlfeG_hint{margin-top:12px}.-KlfeG_routing{justify-content:space-between;align-items:center;gap:16px 24px;display:flex}.-KlfeG_fieldText{flex:1;min-width:0}.-KlfeG_fieldText label{margin-bottom:4px;font-size:13px;font-weight:500;display:block}.-KlfeG_controls{flex:0 320px;justify-content:flex-end}.-KlfeG_controls select{flex:150px}.-KlfeG_controls input{flex:100%}.-KlfeG_manager>p[role=status]{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.-KlfeG_error{color:var(--qm-error);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}@media (width<=599px){.-KlfeG_routing{flex-direction:column;align-items:stretch}.-KlfeG_controls{flex:auto}.-KlfeG_row{flex-wrap:wrap}.-KlfeG_view,.-KlfeG_row>.-KlfeG_view{flex-basis:100%}.-KlfeG_row>button:last-child{margin-left:auto}}@media (prefers-reduced-motion:reduce){.-KlfeG_chevron{transition:none}}";
		const tagId$4 = "@deepseek-ai/dsh-extension-quota-monitor/Keys.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var Keys_module_css_default = {
			"active": "-KlfeG_active",
			"badge": "-KlfeG_badge",
			"chevron": "-KlfeG_chevron",
			"controls": "-KlfeG_controls",
			"disclosure": "-KlfeG_disclosure",
			"error": "-KlfeG_error",
			"fieldText": "-KlfeG_fieldText",
			"figure": "-KlfeG_figure",
			"form": "-KlfeG_form",
			"hint": "-KlfeG_hint",
			"list": "-KlfeG_list",
			"manager": "-KlfeG_manager",
			"reference": "-KlfeG_reference",
			"routing": "-KlfeG_routing",
			"row": "-KlfeG_row",
			"selected": "-KlfeG_selected",
			"view": "-KlfeG_view"
		};
		//#endregion
		//#region src/client/KeyManager.tsx
		/** Provider-scoped key inventory and routing controls. */
		function KeyManager({ t, entry, selected, onSelect, onManage }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [label, setLabel] = (0, react.useState)("");
			const [key, setKey] = (0, react.useState)("");
			const [rename, setRename] = (0, react.useState)("");
			const [mode, setMode] = (0, react.useState)(entry.routing?.mode ?? "manual");
			const [jevKey, setJevKey] = (0, react.useState)("");
			const routingId = (0, react.useId)();
			const ref = selected ?? entry.credentialRefs[0];
			(0, react.useEffect)(() => {
				setRename(ref === void 0 ? "" : entry.keyNames?.[ref] ?? "");
			}, [ref, entry.keyNames]);
			(0, react.useEffect)(() => {
				setMode(entry.routing?.mode ?? "manual");
			}, [entry.routing?.mode]);
			async function run(request, done) {
				setBusy(true);
				setError("");
				try {
					await onManage({
						provider: entry.id,
						...request
					});
					done?.();
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : t("keys.failed"));
				} finally {
					setBusy(false);
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
				className: Keys_module_css_default.manager,
				disabled: busy,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: t("keys.heading", { count: String(entry.credentialRefs.length) }) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Keys_module_css_default.hint,
						children: t("keys.viewHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Keys_module_css_default.list,
						children: entry.credentialRefs.map((reference) => {
							const account = entry.accounts.find((item) => item.credentialRef === reference);
							const active = entry.activeCredentialRef === reference;
							const name = entry.keyNames?.[reference] ?? account?.accountName ?? reference;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: `${Keys_module_css_default.row} ${ref === reference || active ? Keys_module_css_default.selected : ""}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: Keys_module_css_default.view,
									"aria-pressed": ref === reference,
									onClick: () => onSelect(reference),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											title: name,
											children: name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", {
											className: Keys_module_css_default.reference,
											title: reference,
											children: [account?.accountName && entry.keyNames?.[reference] ? `${account.accountName} · ` : "", reference]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Keys_module_css_default.figure,
											children: account?.unlimited ? t("account.unlimited") : chipFigure(account) ?? "—"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
											className: Keys_module_css_default.badge,
											children: account?.status ?? t("keys.unread")
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: active ? "outline" : "ghost",
									size: "sm",
									className: active ? Keys_module_css_default.active : void 0,
									disabled: active,
									onClick: () => void run({
										action: "activate",
										credentialRef: reference
									}),
									children: active ? t("keys.active") : t("keys.activate")
								})]
							}, reference);
						})
					}),
					ref === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: Keys_module_css_default.form,
						onSubmit: (event) => {
							event.preventDefault();
							run({
								action: "rename",
								credentialRef: ref,
								name: rename
							});
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								"aria-label": t("keys.name"),
								placeholder: t("keys.name"),
								value: rename,
								onChange: (event) => setRename(event.target.value),
								maxLength: 120
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								type: "submit",
								children: t("keys.rename")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								disabled: entry.credentialRefs.length < 2 || entry.activeCredentialRef === ref,
								onClick: () => void run({
									action: "remove",
									credentialRef: ref
								}, () => {
									const next = entry.credentialRefs.find((item) => item !== ref);
									if (next) onSelect(next);
								}),
								children: t("keys.remove")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: Keys_module_css_default.disclosure,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, {
								className: Keys_module_css_default.chevron,
								size: 14
							}), t("keys.add")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
								className: Keys_module_css_default.form,
								onSubmit: (event) => {
									event.preventDefault();
									run({
										action: "add",
										name: label,
										key
									}, () => {
										setKey("");
										setLabel("");
									});
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										"aria-label": t("keys.name"),
										placeholder: t("keys.name"),
										value: label,
										onChange: (event) => setLabel(event.target.value),
										maxLength: 120
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "password",
										autoComplete: "new-password",
										required: true,
										"aria-label": t("keys.secret"),
										placeholder: t("keys.secret"),
										value: key,
										onChange: (event) => setKey(event.target.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										type: "submit",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }),
										children: t("keys.add")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Keys_module_css_default.hint,
								children: t("keys.storageHint")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: Keys_module_css_default.routing,
						onSubmit: (event) => {
							event.preventDefault();
							run({
								action: "routing",
								mode,
								...jevKey ? { jevKey } : {}
							}, () => setJevKey(""));
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Keys_module_css_default.fieldText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: routingId,
								children: t("routing.heading")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Keys_module_css_default.hint,
								children: t("routing.hint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Keys_module_css_default.controls,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									id: routingId,
									value: mode,
									onChange: (event) => {
										const value = event.target.value;
										if (value === "manual" || value === "quota" || value === "jev") setMode(value);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "manual",
											children: t("routing.manual")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "quota",
											children: t("routing.quota")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "jev",
											children: t("routing.jev")
										})
									]
								}),
								mode === "jev" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "password",
									autoComplete: "new-password",
									"aria-label": t("routing.jevKey"),
									placeholder: entry.routing?.jevConfigured ? t("routing.keepKey") : t("routing.jevKey"),
									value: jevKey,
									onChange: (event) => setJevKey(event.target.value)
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									type: "submit",
									children: t("routing.save")
								})
							]
						})]
					}),
					entry.routing?.lastDecision === "jev-fallback" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						children: t("routing.fallback")
					}) : null,
					busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						children: t("keys.saving")
					}) : null,
					error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						className: Keys_module_css_default.error,
						children: error
					}) : null
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/AccountCard.module.css.mjs
		const css$3 = ".C8IriG_stack{flex-direction:column;gap:16px;min-width:0;display:flex}.C8IriG_card{min-width:0;padding:var(--qm-card-pad);border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg);color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;font-size:13px;line-height:20px;display:flex}.C8IriG_accountHead{flex-wrap:wrap;align-items:center;gap:12px;min-width:0;display:flex}.C8IriG_avatar{background:var(--qm-tile-bg);width:32px;height:32px;color:var(--dsw-alias-label-secondary);text-transform:uppercase;border-radius:8px;flex:none;place-items:center;font-size:12px;font-weight:600;display:grid}.C8IriG_accountIdentity{flex-direction:column;flex:140px;gap:4px;min-width:0;display:flex}.C8IriG_accountName{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}.C8IriG_accountMeta{flex-wrap:wrap;gap:4px;min-width:0;display:flex}.C8IriG_chip,.C8IriG_pill{box-sizing:border-box;background:var(--qm-tile-bg);max-width:100%;min-height:20px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;border-radius:10px;align-items:center;padding:0 8px;font-size:12px;font-weight:500;line-height:18px;display:inline-flex}.C8IriG_pillOk{background:color-mix(in srgb, var(--qm-ok) 14%, transparent);color:var(--qm-ok)}.C8IriG_pillWarn{background:color-mix(in srgb, var(--qm-warn) 14%, transparent);color:var(--qm-warn)}.C8IriG_pillError{background:color-mix(in srgb, var(--qm-error) 14%, transparent);color:var(--qm-error)}.C8IriG_figures{grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px;display:grid}.C8IriG_figure{border-radius:var(--qm-tile-radius);background:var(--qm-tile-bg);flex-direction:column;gap:4px;min-width:0;padding:12px 14px;display:flex}.C8IriG_figureLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.C8IriG_figureValue{font-variant-numeric:tabular-nums;overflow-wrap:anywhere;font-size:22px;font-weight:600;line-height:30px}.C8IriG_normal{color:var(--dsw-alias-label-primary)}.C8IriG_warning{color:var(--qm-warn)}.C8IriG_critical{color:var(--qm-error)}.C8IriG_windows{flex-direction:column;gap:16px;display:flex}.C8IriG_windowRow,.C8IriG_poolRow{flex-direction:column;gap:8px;min-width:0;display:flex}.C8IriG_windowHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;display:flex}.C8IriG_windowName{color:var(--dsw-alias-label-secondary);font-size:13px}.C8IriG_windowValue{font-variant-numeric:tabular-nums;font-size:13px;font-weight:500}.C8IriG_bar{background:var(--qm-track);border-radius:3px;height:6px;overflow:hidden}.C8IriG_barFill{border-radius:inherit;background:var(--qm-accent);height:100%}.C8IriG_barFill.C8IriG_warning{background:var(--qm-warn)}.C8IriG_barFill.C8IriG_critical{background:var(--qm-error)}.C8IriG_windowMeta,.C8IriG_reason,.C8IriG_gatewayHint,.C8IriG_gatewayMore{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.C8IriG_pools{border-top:1px solid var(--qm-divider);flex-direction:column;gap:12px;min-width:0;padding-top:16px;display:flex}.C8IriG_poolsTitle{margin:0;font-size:13px;font-weight:600;line-height:20px}.C8IriG_poolList{flex-direction:column;gap:16px;margin:0;padding:0;list-style:none;display:flex}.C8IriG_poolRow{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:13px}.C8IriG_cardMeta{border-top:1px solid var(--qm-divider);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;padding-top:16px;font-size:12px;line-height:18px}.C8IriG_tableScroll{min-width:0;overflow-x:auto}.C8IriG_gatewayTable{border-collapse:collapse;width:100%;font-size:13px}.C8IriG_gatewayTable th{border-bottom:1px solid var(--qm-divider);color:var(--dsw-alias-label-tertiary);text-align:left;padding:8px 12px;font-size:12px;font-weight:500;line-height:18px}.C8IriG_gatewayTable td{padding:10px 12px}.C8IriG_gatewayTable th:last-child,.C8IriG_gatewayTable td:last-child{text-align:right;font-variant-numeric:tabular-nums}.C8IriG_gatewayTable tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}.C8IriG_gatewayLabel{text-overflow:ellipsis;white-space:nowrap;max-width:260px;display:block;overflow:hidden}.C8IriG_gatewayValue{color:var(--dsw-alias-label-secondary);white-space:nowrap}.C8IriG_manual{border-top:1px solid var(--qm-divider);justify-content:space-between;align-items:center;gap:12px 24px;padding-top:16px;display:flex}.C8IriG_manualHead{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.C8IriG_manualTitle{font-size:13px;font-weight:500}.C8IriG_manualValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:13px}.C8IriG_manualHint{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.C8IriG_manualInput{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--qm-control-radius);width:160px;max-width:100%;height:32px;color:var(--dsw-alias-label-primary);font:inherit;background:0 0;padding:0 10px;font-size:13px}.C8IriG_manualInput:hover{border-color:var(--dsw-alias-border-l3)}.C8IriG_manualInput:focus-visible{outline:2px solid var(--qm-accent);outline-offset:1px}@media (width<=599px){.C8IriG_manual{flex-direction:column;align-items:stretch}.C8IriG_manualInput{width:100%}.C8IriG_gatewayLabel{max-width:160px}}";
		const tagId$3 = "@deepseek-ai/dsh-extension-quota-monitor/AccountCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var AccountCard_module_css_default = {
			"accountHead": "C8IriG_accountHead",
			"accountIdentity": "C8IriG_accountIdentity",
			"accountMeta": "C8IriG_accountMeta",
			"accountName": "C8IriG_accountName",
			"avatar": "C8IriG_avatar",
			"bar": "C8IriG_bar",
			"barFill": "C8IriG_barFill",
			"card": "C8IriG_card",
			"cardMeta": "C8IriG_cardMeta",
			"chip": "C8IriG_chip",
			"critical": "C8IriG_critical",
			"figure": "C8IriG_figure",
			"figureLabel": "C8IriG_figureLabel",
			"figureValue": "C8IriG_figureValue",
			"figures": "C8IriG_figures",
			"gatewayHint": "C8IriG_gatewayHint",
			"gatewayLabel": "C8IriG_gatewayLabel",
			"gatewayMore": "C8IriG_gatewayMore",
			"gatewayTable": "C8IriG_gatewayTable",
			"gatewayValue": "C8IriG_gatewayValue",
			"manual": "C8IriG_manual",
			"manualHead": "C8IriG_manualHead",
			"manualHint": "C8IriG_manualHint",
			"manualInput": "C8IriG_manualInput",
			"manualTitle": "C8IriG_manualTitle",
			"manualValue": "C8IriG_manualValue",
			"normal": "C8IriG_normal",
			"pill": "C8IriG_pill",
			"pillError": "C8IriG_pillError",
			"pillOk": "C8IriG_pillOk",
			"pillWarn": "C8IriG_pillWarn",
			"poolList": "C8IriG_poolList",
			"poolRow": "C8IriG_poolRow",
			"pools": "C8IriG_pools",
			"poolsTitle": "C8IriG_poolsTitle",
			"reason": "C8IriG_reason",
			"stack": "C8IriG_stack",
			"tableScroll": "C8IriG_tableScroll",
			"warning": "C8IriG_warning",
			"windowHead": "C8IriG_windowHead",
			"windowMeta": "C8IriG_windowMeta",
			"windowName": "C8IriG_windowName",
			"windowRow": "C8IriG_windowRow",
			"windowValue": "C8IriG_windowValue",
			"windows": "C8IriG_windows"
		};
		//#endregion
		//#region src/client/AccountCard.tsx
		/**
		* The selected provider's balance, plan windows, key management and read status.
		* Provider selection belongs to the page toolbar.
		*
		* A non-`ok` status renders its reason instead of a figure. The card never
		* substitutes zero for a number it could not read.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/AccountCard
		*/
		/** Dictionary key naming each account status. */
		const STATUS_KEYS = Object.freeze({
			"ok": "status.ok",
			"not-configured": "status.notConfigured",
			"unauthorized": "status.unauthorized",
			"rate-limited": "status.rateLimited",
			"unsupported": "status.unsupported",
			"invalid-response": "status.invalidResponse",
			"blocked": "status.blocked",
			"unavailable": "status.unavailable"
		});
		/** Dictionary key naming each card frame. */
		const MODE_KEYS = Object.freeze({
			balance: "account.mode.balance",
			subscription: "account.mode.subscription",
			unsupported: "account.mode.unsupported"
		});
		/** Severity class for a figure, from the account's own warning level. */
		function toneOf(warning) {
			if (warning === "critical") return AccountCard_module_css_default.critical ?? "";
			if (warning === "warning") return AccountCard_module_css_default.warning ?? "";
			return AccountCard_module_css_default.normal ?? "";
		}
		/** Status-pill class: a read that succeeded is tinted by its own severity. */
		function pillOf(account) {
			if (account.status !== "ok") return account.status === "not-configured" || account.status === "unsupported" ? "" : AccountCard_module_css_default.pillError ?? "";
			if (account.warning === "critical") return AccountCard_module_css_default.pillError ?? "";
			return account.warning === "warning" ? AccountCard_module_css_default.pillWarn ?? "" : AccountCard_module_css_default.pillOk ?? "";
		}
		/**
		* The slot references a route's selector draws a chip for.
		*
		* A route that configured no reference still watches one credential, the one
		* its profile supplies, so it draws one unnamed chip.
		* @param entry - the route.
		* @returns one entry per chip, `undefined` for the route's own credential.
		*/
		function slotsOf(entry) {
			return entry.credentialRefs.length === 0 ? [void 0] : entry.credentialRefs;
		}
		/** One plan window: a labelled bar with its used share and reset countdown. */
		function WindowRow({ t, window: entry, tone }) {
			const reset = resetLabel(t, entry.resetAt);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AccountCard_module_css_default.windowRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: AccountCard_module_css_default.windowHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.windowName,
							children: t(WINDOW_KEYS[entry.kind])
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.windowValue,
							children: t("window.used", { percent: String(entry.percentUsed) })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: AccountCard_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${AccountCard_module_css_default.barFill} ${tone}`,
							style: { width: `${entry.percentUsed}%` }
						})
					}),
					reset === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AccountCard_module_css_default.windowMeta,
						children: reset
					})
				]
			});
		}
		/** One budget pool row. */
		function PoolRow({ t, pool }) {
			const amount = fmtAmount(pool.remaining);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: AccountCard_module_css_default.poolRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pool.limit === void 0 ? t("pool.remaining", {
					name: pool.name,
					amount
				}) : t("pool.remainingOfLimit", {
					name: pool.name,
					amount,
					limit: fmtAmount(pool.limit)
				}) }), pool.percentUsed === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: AccountCard_module_css_default.bar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: AccountCard_module_css_default.barFill,
						style: { width: `${pool.percentUsed}%` }
					})
				})]
			});
		}
		/** Rows of one gateway table the card shows before it says how many it hides. */
		const GATEWAY_ROWS$1 = 6;
		/** Dictionary key naming each gateway usage table, in display order. */
		const GATEWAY_GROUPS = Object.freeze({
			day: "gateway.days",
			model: "gateway.models",
			pool: "gateway.pools"
		});
		/** Display order of the gateway usage tables. */
		const GATEWAY_ORDER$1 = Object.freeze([
			"day",
			"model",
			"pool"
		]);
		/** The endpoint's own token total for a row: its own, or the four buckets summed. */
		function gatewayTokens$1(row) {
			if (row.totalTokens !== void 0) return row.totalTokens;
			const present = [
				row.inputTokens,
				row.outputTokens,
				row.cacheReadTokens,
				row.cacheWriteTokens
			].filter((value) => value !== void 0);
			return present.length === 0 ? void 0 : present.reduce((total, value) => total + value, 0);
		}
		/** One row of a gateway table: its label and the figures the endpoint reported. */
		function GatewayRow({ t, row }) {
			const parts = [];
			if (row.requests !== void 0) parts.push(t("gateway.requests", { count: fmtNumber(row.requests) }));
			const tokens = gatewayTokens$1(row);
			if (tokens !== void 0) parts.push(fmtTokens(tokens));
			if (row.cost !== void 0) parts.push(fmtAmount(row.cost, row.currency));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: AccountCard_module_css_default.gatewayLabel,
				title: row.label,
				children: row.label
			}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
				className: AccountCard_module_css_default.gatewayValue,
				children: parts.join(" · ")
			})] });
		}
		/**
		* Usage the account endpoint reported for its own credential.
		*
		* This is the gateway's ledger, not this plugin's fold: it is what makes two
		* keys behind one provider route tell themselves apart, and it covers calls
		* that predate this process.
		*/
		function GatewayUsage({ t, usage }) {
			const groups = GATEWAY_ORDER$1.map((kind) => [kind, usage.filter((row) => row.kind === kind)]).filter(([, rows]) => rows.length > 0);
			if (groups.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AccountCard_module_css_default.pools,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AccountCard_module_css_default.poolsTitle,
						children: t("gateway.heading")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: AccountCard_module_css_default.gatewayHint,
						children: t("gateway.hint")
					}),
					groups.map(([kind, rows]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: AccountCard_module_css_default.tableScroll,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: AccountCard_module_css_default.gatewayTable,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								children: t(GATEWAY_GROUPS[kind])
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								children: t("gateway.figures")
							})] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.slice(0, GATEWAY_ROWS$1).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayRow, {
								t,
								row
							}, `${row.kind}:${row.label}`)) })]
						})
					}), rows.length <= GATEWAY_ROWS$1 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AccountCard_module_css_default.gatewayMore,
						children: t("gateway.more", { count: String(GATEWAY_ROWS$1) })
					})] }, kind))
				]
			});
		}
		/** The manual allowance input, shown when the provider publishes no account endpoint. */
		function ManualBalance({ t, provider, total, remaining, onChange }) {
			const [draft, setDraft] = (0, react.useState)(total === void 0 ? "" : String(total));
			(0, react.useEffect)(() => {
				setDraft(total === void 0 ? "" : String(total));
			}, [provider, total]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AccountCard_module_css_default.manual,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: AccountCard_module_css_default.manualHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.manualTitle,
							children: t("manual.heading")
						}),
						remaining === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.manualValue,
							children: t("manual.remaining", { amount: fmtAmount(remaining) })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: AccountCard_module_css_default.manualHint,
							children: t("manual.hint")
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: AccountCard_module_css_default.manualInput,
					type: "number",
					inputMode: "decimal",
					value: draft,
					placeholder: t("manual.placeholder"),
					"aria-label": t("manual.heading"),
					onChange: (event) => {
						setDraft(event.target.value);
					},
					onBlur: () => {
						onChange(provider, Number(draft));
					}
				})]
			});
		}
		/**
		* The card head: avatar, provider name, mode, adapter and key chips, status
		* pill, then the card's action. The name is said once, as the card title.
		*/
		function Identity({ t, name, credential, account, action }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AccountCard_module_css_default.accountHead,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AccountCard_module_css_default.avatar,
						"aria-hidden": "true",
						children: initialsOf(name)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: AccountCard_module_css_default.accountIdentity,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: AccountCard_module_css_default.accountName,
							title: name,
							children: name
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: AccountCard_module_css_default.accountMeta,
							children: [
								account === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: AccountCard_module_css_default.chip,
									children: t(MODE_KEYS[account.mode])
								}),
								account === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: AccountCard_module_css_default.chip,
									children: account.adapter
								}),
								credential === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: AccountCard_module_css_default.chip,
									children: credential
								}),
								account?.plan === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: AccountCard_module_css_default.chip,
									children: account.plan
								})
							]
						})]
					}),
					account === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${AccountCard_module_css_default.pill} ${pillOf(account)}`,
						children: t(STATUS_KEYS[account.status])
					}),
					action
				]
			});
		}
		/** The figures of a balance account: its remainder, then what it was measured against. */
		function Figures({ t, account, tone }) {
			if (account.remaining === void 0 && account.unlimited !== true) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AccountCard_module_css_default.figures,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: AccountCard_module_css_default.figure,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.figureLabel,
							children: t("account.remaining")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${AccountCard_module_css_default.figureValue} ${tone}`,
							children: account.unlimited === true ? t("account.unlimited") : fmtAmount(account.remaining, account.currency)
						})]
					}),
					account.used === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: AccountCard_module_css_default.figure,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.figureLabel,
							children: t("account.used")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.figureValue,
							children: fmtAmount(account.used, account.currency)
						})]
					}),
					account.limit === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: AccountCard_module_css_default.figure,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.figureLabel,
							children: t("account.limit")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AccountCard_module_css_default.figureValue,
							children: fmtAmount(account.limit, account.currency)
						})]
					})
				]
			});
		}
		function AccountCard({ t, providers, selected, selectedCredential, account, manualTotal, manualRemaining, onSelect, onManage, onRefresh, onManualChange }) {
			const tone = toneOf(account?.warning);
			const windows = account?.planWindows ?? [];
			const pools = account?.budgetPools ?? [];
			const showManual = account !== void 0 && account.status !== "ok";
			const entry = providers.find((candidate) => candidate.id === selected);
			const name = entry?.name ?? selected ?? "";
			const slots = entry === void 0 ? [] : slotsOf(entry);
			const slot = {
				id: selected,
				credentialRef: selectedCredential ?? slots[0]
			};
			const credential = slots.length > 1 ? account?.credentialRef : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AccountCard_module_css_default.stack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: AccountCard_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Identity, {
							t,
							name,
							credential,
							account,
							action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }),
								onClick: onRefresh,
								children: t("action.refresh")
							})
						}),
						account?.accountName ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: AccountCard_module_css_default.reason,
							children: account.accountName
						}) : null,
						account === void 0 ? null : account.status === "ok" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Figures, {
								t,
								account,
								tone
							}),
							windows.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: AccountCard_module_css_default.windows,
								children: windows.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WindowRow, {
									t,
									window: entry,
									tone
								}, entry.kind))
							}),
							pools.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: AccountCard_module_css_default.pools,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
									className: AccountCard_module_css_default.poolsTitle,
									children: t("pools.heading")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: AccountCard_module_css_default.poolList,
									children: pools.map((pool) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PoolRow, {
										t,
										pool
									}, pool.name))
								})]
							}),
							account.usage === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayUsage, {
								t,
								usage: account.usage
							})
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [account.reason === void 0 || account.reason === t(STATUS_KEYS[account.status]) ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: AccountCard_module_css_default.reason,
							children: account.reason
						}), account.missingCredentials === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: AccountCard_module_css_default.reason,
							children: t("status.missingCredentials", { names: account.missingCredentials.join(", ") })
						})] }),
						showManual && selected !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ManualBalance, {
							t,
							provider: selected,
							total: manualTotal,
							remaining: manualRemaining,
							onChange: onManualChange
						}) : null,
						account?.status !== "ok" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: AccountCard_module_css_default.cardMeta,
							children: [
								t("account.source", { adapter: account.adapter }),
								" · ",
								t("account.updated", { time: fmtTime(account.fetchedAt) })
							]
						})
					]
				}), entry === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyManager, {
					t,
					entry,
					selected: slot.credentialRef,
					onSelect: (ref) => onSelect(entry.id, ref),
					onManage
				}, entry.id)]
			});
		}
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/LocalStats.module.css.mjs
		const css$2 = ".GcfQpa_stack{min-width:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;font-size:13px;line-height:20px;display:flex}.GcfQpa_section{min-width:0;padding:var(--qm-card-pad);border:1px solid var(--qm-card-border);border-radius:var(--qm-card-radius);background:var(--qm-card-bg);flex-direction:column;gap:16px;display:flex}.GcfQpa_sectionHead,.GcfQpa_headingGroup{flex-wrap:wrap;align-items:center;gap:8px 16px;min-width:0;display:flex}.GcfQpa_sectionHead{justify-content:space-between}.GcfQpa_sectionTitle{margin:0;font-size:15px;font-weight:600;line-height:22px}.GcfQpa_sectionMeta,.GcfQpa_totalsMeta,.GcfQpa_modelNote,.GcfQpa_providerMeta{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.GcfQpa_empty{border-radius:var(--qm-tile-radius);background:var(--qm-tile-bg);color:var(--dsw-alias-label-tertiary);text-align:center;margin:0;padding:20px;font-size:13px;line-height:20px}.GcfQpa_totals,.GcfQpa_modelUsage,.GcfQpa_providerList,.GcfQpa_calendar,.GcfQpa_export{flex-direction:column;gap:16px;min-width:0;display:flex}.GcfQpa_totalGrid,.GcfQpa_budgetGrid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;display:grid}.GcfQpa_totalCard{border-radius:var(--qm-tile-radius);background:var(--qm-tile-bg);flex-direction:column;gap:4px;min-width:0;padding:12px 14px;display:flex}.GcfQpa_totalLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.GcfQpa_totalValue{font-variant-numeric:tabular-nums;overflow-wrap:anywhere;font-size:22px;font-weight:600;line-height:30px}.GcfQpa_totalCost{color:var(--qm-accent);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.GcfQpa_totalNote{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.GcfQpa_totalSplit{flex-direction:column;gap:4px;margin:8px 0 0;display:flex}.GcfQpa_splitRow{justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;line-height:18px;display:flex}.GcfQpa_splitRow dt{color:var(--dsw-alias-label-secondary);margin:0}.GcfQpa_splitRow dd{font-variant-numeric:tabular-nums;margin:0}.GcfQpa_budgetGrid{border-top:1px solid var(--qm-divider);padding-top:16px}.GcfQpa_budgetCard{flex-direction:column;gap:8px;min-width:0;display:flex}.GcfQpa_budgetHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;display:flex}.GcfQpa_budgetName{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.GcfQpa_budgetValue{font-variant-numeric:tabular-nums;font-size:12px;font-weight:500;line-height:18px}.GcfQpa_windowMeta{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.GcfQpa_bar{background:var(--qm-track);border-radius:3px;width:100%;height:6px;display:block;overflow:hidden}.GcfQpa_barFill{border-radius:inherit;background:var(--qm-accent);height:100%;display:block}.GcfQpa_warning{color:var(--qm-warn)}.GcfQpa_critical{color:var(--qm-error)}.GcfQpa_barFill.GcfQpa_warning{background:var(--qm-warn)}.GcfQpa_barFill.GcfQpa_critical{background:var(--qm-error)}.GcfQpa_selector{flex-wrap:wrap;gap:4px;min-width:0;display:flex}.GcfQpa_selectorChip{height:28px;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:14px;padding:0 12px;font-size:13px}.GcfQpa_selectorChip:hover,.GcfQpa_selectorChipActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.GcfQpa_selectorChipActive{font-weight:500}.GcfQpa_providerTools{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;display:flex}.GcfQpa_providerRow{border-radius:10px;flex-direction:column;gap:8px;min-width:0;min-height:48px;padding:10px 12px;display:flex}.GcfQpa_providerRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.GcfQpa_providerRowActive,.GcfQpa_providerRowActive:hover{background:var(--qm-accent-soft)}.GcfQpa_providerHead{flex-wrap:wrap;align-items:baseline;gap:4px 8px;min-width:0;display:flex}.GcfQpa_providerName{overflow-wrap:anywhere;font-size:13px;font-weight:600}.GcfQpa_providerId{color:var(--dsw-alias-label-tertiary);font-family:var(--qm-font-mono);overflow-wrap:anywhere;font-size:12px}.GcfQpa_providerTokens{font-variant-numeric:tabular-nums;margin-left:auto;font-weight:600}.GcfQpa_providerFoot{color:var(--dsw-alias-label-secondary);flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;font-size:12px;line-height:18px;display:flex}.GcfQpa_providerShare,.GcfQpa_providerCost{font-variant-numeric:tabular-nums}.GcfQpa_providerCost{font-weight:500}.GcfQpa_tableCard{min-width:0;max-width:100%;overflow-x:auto}.GcfQpa_table{border-collapse:collapse;width:100%;font-size:13px;line-height:20px}.GcfQpa_table th,.GcfQpa_table td{border-bottom:1px solid var(--qm-divider);text-align:left;white-space:nowrap;padding:10px 12px}.GcfQpa_table thead th{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:500;line-height:18px}.GcfQpa_table tbody th{font-weight:500}.GcfQpa_table tbody tr:last-child>*{border-bottom:none}.GcfQpa_table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}.GcfQpa_table .GcfQpa_numeric{text-align:right;font-variant-numeric:tabular-nums}.GcfQpa_mono{font-family:var(--qm-font-mono)}.GcfQpa_table .GcfQpa_mono{white-space:normal;overflow-wrap:anywhere;min-width:140px;max-width:240px}.GcfQpa_modelNote{font-weight:400;display:block}.GcfQpa_modelRate{font-variant-numeric:tabular-nums;display:block}.GcfQpa_routes{text-overflow:ellipsis;max-width:260px;color:var(--dsw-alias-label-secondary);overflow:hidden}.GcfQpa_calendarHead{justify-content:center;align-items:center;gap:12px;display:flex}.GcfQpa_calendarMonth{text-align:center;font-variant-numeric:tabular-nums;min-width:96px;font-size:13px;font-weight:600}.GcfQpa_navButton{width:28px;padding:0}.GcfQpa_weekdayRow,.GcfQpa_monthGrid{grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;display:grid}.GcfQpa_weekday{color:var(--dsw-alias-label-tertiary);text-align:center;font-size:12px;line-height:18px}.GcfQpa_dayCell{background:var(--qm-tile-bg);min-width:0;min-height:64px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;flex-direction:column;justify-content:space-between;align-items:flex-start;gap:4px;padding:8px;display:flex}.GcfQpa_dayCell:hover{border-color:var(--qm-accent)}.GcfQpa_dayBlank{min-height:64px}.GcfQpa_dayNumber{font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.GcfQpa_dayTokens{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;max-width:100%;font-size:12px;line-height:18px;overflow:hidden}.GcfQpa_dayCellToday .GcfQpa_dayNumber{color:var(--qm-accent);text-underline-offset:4px;font-weight:600;text-decoration:underline}.GcfQpa_dayCellActive{outline:2px solid var(--qm-accent);outline-offset:1px}.GcfQpa_dayCell[data-level=\"1\"],.GcfQpa_legendCell[data-level=\"1\"]{background:color-mix(in srgb, var(--qm-accent) 10%, var(--qm-card-bg))}.GcfQpa_dayCell[data-level=\"2\"],.GcfQpa_legendCell[data-level=\"2\"]{background:color-mix(in srgb, var(--qm-accent) 20%, var(--qm-card-bg))}.GcfQpa_dayCell[data-level=\"3\"],.GcfQpa_legendCell[data-level=\"3\"]{background:color-mix(in srgb, var(--qm-accent) 30%, var(--qm-card-bg))}.GcfQpa_dayCell[data-level=\"4\"],.GcfQpa_legendCell[data-level=\"4\"]{background:color-mix(in srgb, var(--qm-accent) 40%, var(--qm-card-bg))}.GcfQpa_legend{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:4px;font-size:12px;line-height:18px;display:flex}.GcfQpa_legendCell{background:var(--qm-tile-bg);border-radius:4px;width:12px;height:12px}.GcfQpa_exportRow{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.GcfQpa_stack button:focus-visible{outline:2px solid var(--qm-accent);outline-offset:2px}@media (width<=600px){.GcfQpa_weekdayRow,.GcfQpa_monthGrid{gap:4px}.GcfQpa_dayCell{min-height:48px;padding:4px}.GcfQpa_dayBlank{min-height:48px}.GcfQpa_dayTokens{font-size:12px}.GcfQpa_headingGroup{flex-direction:column;align-items:flex-start;gap:4px}}";
		const tagId$2 = "@deepseek-ai/dsh-extension-quota-monitor/LocalStats.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var LocalStats_module_css_default = {
			"bar": "GcfQpa_bar",
			"barFill": "GcfQpa_barFill",
			"budgetCard": "GcfQpa_budgetCard",
			"budgetGrid": "GcfQpa_budgetGrid",
			"budgetHead": "GcfQpa_budgetHead",
			"budgetName": "GcfQpa_budgetName",
			"budgetValue": "GcfQpa_budgetValue",
			"calendar": "GcfQpa_calendar",
			"calendarHead": "GcfQpa_calendarHead",
			"calendarMonth": "GcfQpa_calendarMonth",
			"critical": "GcfQpa_critical",
			"dayBlank": "GcfQpa_dayBlank",
			"dayCell": "GcfQpa_dayCell",
			"dayCellActive": "GcfQpa_dayCellActive",
			"dayCellToday": "GcfQpa_dayCellToday",
			"dayNumber": "GcfQpa_dayNumber",
			"dayTokens": "GcfQpa_dayTokens",
			"empty": "GcfQpa_empty",
			"export": "GcfQpa_export",
			"exportRow": "GcfQpa_exportRow",
			"headingGroup": "GcfQpa_headingGroup",
			"legend": "GcfQpa_legend",
			"legendCell": "GcfQpa_legendCell",
			"modelNote": "GcfQpa_modelNote",
			"modelRate": "GcfQpa_modelRate",
			"modelUsage": "GcfQpa_modelUsage",
			"mono": "GcfQpa_mono",
			"monthGrid": "GcfQpa_monthGrid",
			"navButton": "GcfQpa_navButton",
			"numeric": "GcfQpa_numeric",
			"providerCost": "GcfQpa_providerCost",
			"providerFoot": "GcfQpa_providerFoot",
			"providerHead": "GcfQpa_providerHead",
			"providerId": "GcfQpa_providerId",
			"providerList": "GcfQpa_providerList",
			"providerMeta": "GcfQpa_providerMeta",
			"providerName": "GcfQpa_providerName",
			"providerRow": "GcfQpa_providerRow",
			"providerRowActive": "GcfQpa_providerRowActive",
			"providerShare": "GcfQpa_providerShare",
			"providerTokens": "GcfQpa_providerTokens",
			"providerTools": "GcfQpa_providerTools",
			"routes": "GcfQpa_routes",
			"section": "GcfQpa_section",
			"sectionHead": "GcfQpa_sectionHead",
			"sectionMeta": "GcfQpa_sectionMeta",
			"sectionTitle": "GcfQpa_sectionTitle",
			"selector": "GcfQpa_selector",
			"selectorChip": "GcfQpa_selectorChip",
			"selectorChipActive": "GcfQpa_selectorChipActive",
			"splitRow": "GcfQpa_splitRow",
			"stack": "GcfQpa_stack",
			"table": "GcfQpa_table",
			"tableCard": "GcfQpa_tableCard",
			"totalCard": "GcfQpa_totalCard",
			"totalCost": "GcfQpa_totalCost",
			"totalGrid": "GcfQpa_totalGrid",
			"totalLabel": "GcfQpa_totalLabel",
			"totalNote": "GcfQpa_totalNote",
			"totalSplit": "GcfQpa_totalSplit",
			"totalValue": "GcfQpa_totalValue",
			"totals": "GcfQpa_totals",
			"totalsMeta": "GcfQpa_totalsMeta",
			"warning": "GcfQpa_warning",
			"weekday": "GcfQpa_weekday",
			"weekdayRow": "GcfQpa_weekdayRow",
			"windowMeta": "GcfQpa_windowMeta"
		};
		//#endregion
		//#region src/client/TotalsRow.tsx
		/** Dictionary key naming each budget state. */
		const BUDGET_STATUS_KEYS = Object.freeze({
			normal: "budget.status.normal",
			warning: "budget.status.warning",
			critical: "budget.status.critical",
			unknown: "budget.status.unknown"
		});
		/** Severity class for a budget window. */
		function budgetTone(status) {
			if (status === "critical") return LocalStats_module_css_default.critical ?? "";
			return status === "warning" ? LocalStats_module_css_default.warning ?? "" : "";
		}
		/** One totals tile: its headline figure, its derived spend, and its split. */
		function TotalsCard({ t, label, totals, cost }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.totalCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LocalStats_module_css_default.totalLabel,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LocalStats_module_css_default.totalValue,
						children: fmtTokens(totals?.totalTokens)
					}),
					cost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LocalStats_module_css_default.totalCost,
						children: fmtCost(cost)
					}),
					cost === void 0 || cost.unpricedCalls === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LocalStats_module_css_default.totalNote,
						children: t("cost.unpriced", { calls: String(cost.unpricedCalls) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
						className: LocalStats_module_css_default.totalSplit,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LocalStats_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.input") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.inputTokens) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LocalStats_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.output") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.outputTokens) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LocalStats_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.cacheRead") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.cacheReadTokens) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LocalStats_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.cacheWrite") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.cacheWriteTokens) })]
							})
						]
					})
				]
			});
		}
		/** One budget window: its ceiling, its spend, and a bar of the used share. */
		function BudgetCard({ t, label, currency, window: entry }) {
			const spent = {
				amount: entry.spent,
				currency,
				unpricedCalls: entry.unpricedCalls
			};
			const limit = {
				amount: entry.limit,
				currency,
				unpricedCalls: 0
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.budgetCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.budgetHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LocalStats_module_css_default.budgetName,
							children: label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${LocalStats_module_css_default.budgetValue} ${budgetTone(entry.status)}`,
							children: t("budget.spentOfLimit", {
								spent: fmtCost(spent),
								limit: fmtCost(limit)
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LocalStats_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${LocalStats_module_css_default.barFill} ${budgetTone(entry.status)}`,
							style: { width: `${Math.min(100, entry.percentUsed)}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: LocalStats_module_css_default.windowMeta,
						children: [
							t(BUDGET_STATUS_KEYS[entry.status]),
							" · ",
							fmtPercent(entry.percentUsed),
							entry.unpricedCalls === 0 ? "" : ` · ${t("cost.unpriced", { calls: String(entry.unpricedCalls) })}`
						]
					})
				]
			});
		}
		function TotalsRow({ t, usage }) {
			const budgets = usage?.budgets;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.totals,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.totalGrid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TotalsCard, {
								t,
								label: t("usage.today"),
								totals: usage?.todayTotals,
								cost: usage?.todayCost
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TotalsCard, {
								t,
								label: t("usage.month"),
								totals: usage?.monthTotals,
								cost: usage?.monthCost
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TotalsCard, {
								t,
								label: t("usage.allTime"),
								totals: usage?.allTimeTotals,
								cost: usage?.allTimeCost
							})
						]
					}),
					budgets === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.budgetGrid,
						children: [budgets.daily === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BudgetCard, {
							t,
							label: t("budget.daily"),
							currency: budgets.currency,
							window: budgets.daily
						}), budgets.monthly === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BudgetCard, {
							t,
							label: t("budget.monthly"),
							currency: budgets.currency,
							window: budgets.monthly
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LocalStats_module_css_default.totalsMeta,
						children: usage === void 0 ? t("usage.empty") : usage.folding ? t("usage.folding") : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							t("usage.cacheHitToday", { percent: fmtPercent(usage.todayCacheHitPercent) }),
							" · ",
							t("usage.sessions", { count: String(usage.sessionCount) }),
							usage.foldedAt > 0 ? ` · ${t("usage.foldedAt", { time: fmtTime(usage.foldedAt) })}` : "",
							usage.allTimeCost === void 0 ? ` · ${t("cost.unconfigured")}` : ""
						] })
					})
				]
			});
		}
		//#endregion
		//#region src/client/ModelUsage.tsx
		/**
		* Per-model token usage and configured price rates for the selected provider.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/ModelUsage
		*/
		const SCOPES = {
			today: "usage.today",
			month: "usage.month",
			all: "usage.allTime"
		};
		/**
		* Render model counters by range, with partial spend and current rate labels.
		* @param props - Model summaries, provider names, and localized copy.
		* @returns The model usage table or an empty-state message.
		*/
		function ModelUsage({ t, models, names }) {
			const [scope, setScope] = (0, react.useState)("month");
			const sorted = (0, react.useMemo)(() => [...models].sort((a, b) => b[scope].totalTokens - a[scope].totalTokens || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model)), [models, scope]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.modelUsage,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.sectionHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: LocalStats_module_css_default.sectionTitle,
							children: t("model.heading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LocalStats_module_css_default.selector,
							role: "group",
							"aria-label": t("model.range"),
							children: Object.keys(SCOPES).map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${LocalStats_module_css_default.selectorChip} ${scope === key ? LocalStats_module_css_default.selectorChipActive : ""}`,
								"aria-pressed": scope === key,
								onClick: () => setScope(key),
								children: t(SCOPES[key])
							}, key))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LocalStats_module_css_default.sectionMeta,
						children: t("model.estimate")
					}),
					sorted.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LocalStats_module_css_default.empty,
						children: t("model.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LocalStats_module_css_default.tableCard,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: LocalStats_module_css_default.table,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									children: t("detail.model")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									children: t("detail.provider")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("model.calls")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("usage.input")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("usage.output")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("usage.cacheRead")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("usage.cacheWrite")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("usage.cacheHit")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									className: LocalStats_module_css_default.numeric,
									children: t("detail.cost")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									children: t("model.rates")
								})
							] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: sorted.map((row) => {
								const figures = row[scope];
								const rate = row.rate;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
										scope: "row",
										className: LocalStats_module_css_default.mono,
										children: row.model
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [names[row.provider] ?? row.provider, names[row.provider] === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: LocalStats_module_css_default.modelNote,
										children: row.provider
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: LocalStats_module_css_default.numeric,
										children: fmtNumber(figures.calls)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: LocalStats_module_css_default.numeric,
										children: fmtNumber(figures.inputTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: LocalStats_module_css_default.numeric,
										children: fmtNumber(figures.outputTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: LocalStats_module_css_default.numeric,
										children: fmtNumber(figures.cacheReadTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: LocalStats_module_css_default.numeric,
										children: fmtNumber(figures.cacheWriteTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: LocalStats_module_css_default.numeric,
										children: fmtPercent(figures.cacheHitPercent)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
										className: LocalStats_module_css_default.numeric,
										children: [fmtCost(figures.cost), figures.cost === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelNote,
											children: t("model.unpriced")
										}) : figures.cost.unpricedCalls > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelNote,
											children: t("cost.unpriced", { calls: fmtNumber(figures.cost.unpricedCalls) })
										}) : null]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rate === void 0 ? t("model.noRates") : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelRate,
											children: t("model.rate.input", { amount: fmtAmount(rate.inputPerMillion, rate.currency) })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelRate,
											children: t("model.rate.output", { amount: fmtAmount(rate.outputPerMillion, rate.currency) })
										}),
										rate.cacheReadPerMillion === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelRate,
											children: t("model.rate.cacheRead", { amount: fmtAmount(rate.cacheReadPerMillion, rate.currency) })
										}),
										rate.cacheWritePerMillion === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelRate,
											children: t("model.rate.cacheWrite", { amount: fmtAmount(rate.cacheWritePerMillion, rate.currency) })
										}),
										rate.from === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LocalStats_module_css_default.modelNote,
											children: t("model.rate.from", { date: rate.from })
										})
									] }) })
								] }, JSON.stringify([row.provider, row.model]));
							}) })]
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/ProviderUsage.tsx
		/**
		* The provider breakdown: folded token totals per provider route.
		*
		* The panel's statistics follow one selected route, so this section is how that
		* route is chosen — a row selects it — and it states what the choice costs: a
		* compact view of the selected route against every route's total, or the whole
		* list once the reader asks for it. The range chips pick which scope the rows
		* state, and the rows are ordered by that scope's tokens.
		*
		* The report carries route keys only, so a route the snapshot knows is labelled
		* with its display name and an unknown one falls back to the key itself.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/ProviderUsage
		*/
		/** Dictionary keys for the scope chips, in the order they render. */
		const SCOPE_KEYS = Object.freeze({
			today: "usage.today",
			month: "usage.month",
			allTime: "usage.allTime"
		});
		/** Dictionary keys for the share line, which names the range it is a share of. */
		const SHARE_KEYS = Object.freeze({
			today: "provider.share.today",
			month: "provider.share.month",
			allTime: "provider.share.allTime"
		});
		/**
		* One route's figures for the selected range.
		* @param row - the route's folded usage.
		* @param scope - the selected range.
		* @returns the figures the row states.
		*/
		function figuresOf(row, scope) {
			if (scope === "today") return {
				tokens: row.todayTokens,
				calls: row.todayCalls,
				cacheHitPercent: row.todayCacheHitPercent,
				cost: row.todayCost
			};
			if (scope === "month") return {
				tokens: row.monthTokens,
				calls: row.monthCalls,
				cacheHitPercent: row.monthCacheHitPercent,
				cost: row.monthCost
			};
			return {
				tokens: row.totalTokens,
				calls: row.calls,
				cacheHitPercent: row.cacheHitPercent,
				cost: row.cost
			};
		}
		/**
		* One route's row: its figures for the selected range, its share of that range,
		* and the lifetime facts that belong to no single range. Provider selection
		* belongs to the page toolbar.
		* @param props - the row and the state it renders against.
		* @returns the row element.
		*/
		function ProviderRow({ t, row, names, scope, denominator, selected }) {
			const name = names[row.provider];
			const figures = figuresOf(row, scope);
			const share = denominator <= 0 ? 0 : Math.round(figures.tokens / denominator * 1e3) / 10;
			const meta = [
				t("provider.meta", {
					calls: fmtNumber(figures.calls),
					models: fmtNumber(row.models)
				}),
				figures.cacheHitPercent === void 0 ? void 0 : t("provider.cache", { percent: fmtPercent(figures.cacheHitPercent) }),
				t("provider.lastDay", { date: row.lastDay })
			].filter((part) => part !== void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${LocalStats_module_css_default.providerRow} ${selected ? LocalStats_module_css_default.providerRowActive : ""}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: LocalStats_module_css_default.providerHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.providerName,
								children: name ?? row.provider
							}),
							name === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.providerId,
								children: t("provider.archived")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.providerId,
								children: row.provider
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.providerTokens,
								children: fmtTokens(figures.tokens)
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LocalStats_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LocalStats_module_css_default.barFill,
							style: { width: `${Math.min(100, share)}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: LocalStats_module_css_default.providerFoot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LocalStats_module_css_default.providerShare,
							children: t(SHARE_KEYS[scope], { percent: fmtPercent(share) })
						}), figures.cost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LocalStats_module_css_default.providerCost,
							children: fmtCost(figures.cost)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LocalStats_module_css_default.providerMeta,
						children: meta.join(" · ")
					})
				]
			});
		}
		function ProviderUsage({ t, providers, names, selected, allTimeTokens, todayTokens, monthTokens }) {
			const [scope, setScope] = (0, react.useState)("month");
			const [expanded, setExpanded] = (0, react.useState)(false);
			const denominator = scope === "today" ? todayTokens : scope === "month" ? monthTokens : allTimeTokens;
			const sorted = (0, react.useMemo)(() => [...providers].sort((left, right) => figuresOf(right, scope).tokens - figuresOf(left, scope).tokens), [providers, scope]);
			if (providers.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: LocalStats_module_css_default.empty,
				children: t("provider.empty")
			});
			const chosen = sorted.find((row) => row.provider === selected);
			const active = sorted.filter((row) => figuresOf(row, scope).tokens > 0);
			const focused = chosen ?? active[0] ?? sorted[0];
			const rows = expanded ? active : focused === void 0 ? [] : [focused];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.providerList,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.providerTools,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LocalStats_module_css_default.selector,
							role: "group",
							"aria-label": t("provider.heading"),
							children: Object.keys(SCOPE_KEYS).map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${LocalStats_module_css_default.selectorChip} ${key === scope ? LocalStats_module_css_default.selectorChipActive : ""}`,
								"aria-pressed": key === scope,
								onClick: () => setScope(key),
								children: t(SCOPE_KEYS[key])
							}, key))
						}), providers.length === 1 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							"aria-expanded": expanded,
							onClick: () => setExpanded((current) => !current),
							children: expanded ? t("provider.showSelected") : t("provider.showAll", { count: String(providers.length) })
						})]
					}),
					rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderRow, {
						t,
						row,
						names,
						scope,
						denominator,
						selected: row.provider === selected
					}, row.provider)),
					sorted.length > active.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LocalStats_module_css_default.sectionMeta,
						children: t("provider.idle", { count: String(sorted.length - active.length) })
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/UsageHeatmap.tsx
		/**
		* The month calendar: one cell per day of the shown month, shaded by that
		* day's token total and labelled with its day number, with month navigation
		* and day selection.
		*
		* The calendar is built from the month string alone, so a month with 28, 30,
		* or 31 days and any leading weekday renders without a special case.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/UsageHeatmap
		*/
		/** Shading steps, from no usage to the month's own maximum. */
		const LEVELS = 5;
		/** Weekday headers, starting on Monday to match the cell order. */
		const WEEKDAYS = Object.freeze([
			"weekday.mon",
			"weekday.tue",
			"weekday.wed",
			"weekday.thu",
			"weekday.fri",
			"weekday.sat",
			"weekday.sun"
		]);
		/** Days in one `YYYY-MM` month, and the weekday its first day falls on. */
		function calendarOf(month) {
			const [year = 0, index = 1] = month.split("-").map(Number);
			return {
				days: new Date(year, index, 0).getDate(),
				leading: (new Date(year, index - 1, 1).getDay() + 6) % 7
			};
		}
		/** The month before or after `month`, as `YYYY-MM`. */
		function shiftMonth(month, delta) {
			const [year = 0, index = 1] = month.split("-").map(Number);
			const shifted = new Date(year, index - 1 + delta, 1);
			return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
		}
		function UsageHeatmap({ t, days, month, today, selected, onSelect, onMonthChange }) {
			const byDate = (0, react.useMemo)(() => new Map(days.map((day) => [day.date, day])), [days]);
			const cells = (0, react.useMemo)(() => {
				if (month === void 0) return [];
				const { days: count, leading } = calendarOf(month);
				const rows = Array.from({ length: leading }, () => ({
					day: 0,
					totalTokens: 0,
					calls: 0
				}));
				for (let index = 1; index <= count; index += 1) {
					const date = `${month}-${String(index).padStart(2, "0")}`;
					const usage = byDate.get(date);
					rows.push({
						date,
						day: index,
						totalTokens: usage?.totalTokens ?? 0,
						calls: usage?.calls ?? 0
					});
				}
				return rows;
			}, [month, byDate]);
			const peak = (0, react.useMemo)(() => cells.reduce((highest, cell) => Math.max(highest, cell.totalTokens), 0), [cells]);
			if (month === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: LocalStats_module_css_default.empty,
				children: t("usage.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.calendar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.calendarHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								className: LocalStats_module_css_default.navButton,
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 14 }),
								"aria-label": t("heatmap.prev"),
								onClick: () => {
									onMonthChange(shiftMonth(month, -1));
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.calendarMonth,
								children: month
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								className: LocalStats_module_css_default.navButton,
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 }),
								"aria-label": t("heatmap.next"),
								onClick: () => {
									onMonthChange(shiftMonth(month, 1));
								}
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LocalStats_module_css_default.weekdayRow,
						"aria-hidden": "true",
						children: WEEKDAYS.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LocalStats_module_css_default.weekday,
							children: t(key)
						}, key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LocalStats_module_css_default.monthGrid,
						children: cells.map((cell, index) => {
							if (cell.date === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.dayBlank,
								"aria-hidden": "true"
							}, `blank-${index}`);
							const level = peak <= 0 || cell.totalTokens <= 0 ? 0 : Math.max(1, Math.ceil(cell.totalTokens / peak * (LEVELS - 1)));
							const label = cell.totalTokens > 0 ? t("heatmap.day", {
								date: cell.date,
								tokens: fmtTokens(cell.totalTokens),
								calls: fmtNumber(cell.calls)
							}) : t("heatmap.dayEmpty", { date: cell.date });
							const date = cell.date;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								title: label,
								"aria-label": label,
								"aria-pressed": selected === date,
								"data-level": level,
								className: [
									LocalStats_module_css_default.dayCell,
									selected === date ? LocalStats_module_css_default.dayCellActive : "",
									date === today ? LocalStats_module_css_default.dayCellToday : ""
								].filter((name) => name !== "").join(" "),
								onClick: () => {
									onSelect(date);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LocalStats_module_css_default.dayNumber,
									children: cell.day
								}), cell.totalTokens > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LocalStats_module_css_default.dayTokens,
									children: fmtTokens(cell.totalTokens)
								}) : null]
							}, date);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LocalStats_module_css_default.legend,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmap.less") }),
							Array.from({ length: LEVELS }, (_, level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-level": level,
								className: LocalStats_module_css_default.legendCell,
								"aria-hidden": "true"
							}, level)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmap.more") })
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/DayBreakdown.tsx
		function DayBreakdown({ t, date, day }) {
			if (date === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: LocalStats_module_css_default.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: LocalStats_module_css_default.empty,
					children: t("detail.hint")
				})
			});
			const priced = day?.cost !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LocalStats_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: LocalStats_module_css_default.sectionHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: LocalStats_module_css_default.sectionTitle,
						children: t("detail.heading", { date })
					}), day?.cost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LocalStats_module_css_default.sectionMeta,
						children: fmtCost(day.cost)
					})]
				}), day === void 0 || day.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: LocalStats_module_css_default.empty,
					children: t("detail.empty")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: LocalStats_module_css_default.tableCard,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: LocalStats_module_css_default.table,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								children: t("detail.provider")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								children: t("detail.model")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								className: LocalStats_module_css_default.numeric,
								children: t("detail.tokens")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								className: LocalStats_module_css_default.numeric,
								children: t("detail.calls")
							}),
							priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								className: LocalStats_module_css_default.numeric,
								children: t("detail.cost")
							}) : null
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: day.models.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.provider }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.model }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: LocalStats_module_css_default.numeric,
								children: fmtTokens(row.totalTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: LocalStats_module_css_default.numeric,
								children: fmtNumber(row.calls)
							}),
							priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: LocalStats_module_css_default.numeric,
								children: fmtCost(row.cost)
							}) : null
						] }, `${row.provider}/${row.model}`)) })]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/SessionList.tsx
		/** How many rows the list shows before it stops, so one busy corpus stays readable. */
		const MAX_ROWS = 20;
		function SessionList({ t, sessions }) {
			if (sessions.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: LocalStats_module_css_default.empty,
				children: t("session.empty")
			});
			const rows = sessions.slice(0, MAX_ROWS);
			const priced = rows.some((session) => session.cost !== void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: LocalStats_module_css_default.tableCard,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: LocalStats_module_css_default.table,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							children: t("session.id")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							children: t("session.routes")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							className: LocalStats_module_css_default.numeric,
							children: t("session.tokens")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							className: LocalStats_module_css_default.numeric,
							children: t("session.calls")
						}),
						priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							className: LocalStats_module_css_default.numeric,
							children: t("session.cost")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							children: t("session.lastActive")
						})
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: LocalStats_module_css_default.mono,
							children: session.id
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: LocalStats_module_css_default.routes,
							children: session.routes.join(", ")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: LocalStats_module_css_default.numeric,
							children: fmtTokens(session.totalTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: LocalStats_module_css_default.numeric,
							children: fmtNumber(session.calls)
						}),
						priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: LocalStats_module_css_default.numeric,
							children: fmtCost(session.cost)
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtDateTime(session.lastActiveAt) })
					] }, session.id)) })]
				})
			}), sessions.length > rows.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: LocalStats_module_css_default.sectionMeta,
				children: t("session.more", { count: String(rows.length) })
			}) : null] });
		}
		//#endregion
		//#region src/client/ExportBar.tsx
		/**
		* The export row: three buttons that ask the Host for a document and save it
		* through the browser.
		*
		* The Host returns the document's text; the download itself happens here, so no
		* new HTTP route is opened on the loopback server for a file the Remote face
		* can already deliver.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/ExportBar
		*/
		/** Buttons in the order they are offered. */
		const KINDS = Object.freeze([
			Object.freeze(["daily-csv", "export.daily"]),
			Object.freeze(["sessions-csv", "export.sessions"]),
			Object.freeze(["report-json", "export.json"])
		]);
		/** Hand one document to the browser's own save flow. */
		function save(document_, file) {
			const url = URL.createObjectURL(new Blob([file.content], { type: file.mediaType }));
			try {
				const anchor = document_.createElement("a");
				anchor.href = url;
				anchor.download = file.filename;
				anchor.click();
			} finally {
				URL.revokeObjectURL(url);
			}
		}
		function ExportBar({ t, onExport }) {
			const [busy, setBusy] = (0, react.useState)();
			const [failed, setFailed] = (0, react.useState)(false);
			const run = (0, react.useCallback)(async (kind) => {
				setBusy(kind);
				setFailed(false);
				try {
					const file = await onExport(kind);
					if (file === void 0) setFailed(true);
					else save(document, file);
				} finally {
					setBusy(void 0);
				}
			}, [onExport]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.export,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: LocalStats_module_css_default.exportRow,
					children: KINDS.map(([kind, key]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 14 }),
						disabled: busy !== void 0,
						onClick: () => void run(kind),
						children: t(key)
					}, kind))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: LocalStats_module_css_default.sectionMeta,
					children: failed ? t("export.failed") : t("export.hint")
				})]
			});
		}
		//#endregion
		//#region src/client/LocalStats.tsx
		/** Local accounting keeps its own surfaces while the panel owns its selection. */
		function LocalStats({ t, usage, allUsage, names, provider, scopeName, month, selectedDay, onSelectDay, onMonthChange, onExport, onReset }) {
			const days = usage?.days ?? [];
			const selected = days.find((day) => day.date === selectedDay);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LocalStats_module_css_default.stack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LocalStats_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LocalStats_module_css_default.sectionHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LocalStats_module_css_default.headingGroup,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: LocalStats_module_css_default.sectionTitle,
									children: t("usage.heading")
								}), scopeName === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LocalStats_module_css_default.sectionMeta,
									children: t("usage.scope", { provider: scopeName })
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: onReset,
								children: t("action.reset")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TotalsRow, {
							t,
							usage
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
						className: LocalStats_module_css_default.section,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelUsage, {
							t,
							models: usage?.models ?? [],
							names
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LocalStats_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LocalStats_module_css_default.sectionHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: LocalStats_module_css_default.sectionTitle,
								children: t("provider.heading")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LocalStats_module_css_default.sectionMeta,
								children: t("provider.hint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderUsage, {
							t,
							providers: allUsage?.providers ?? [],
							names,
							selected: provider,
							allTimeTokens: allUsage?.allTimeTotals.totalTokens ?? 0,
							todayTokens: allUsage?.todayTotals.totalTokens ?? 0,
							monthTokens: allUsage?.monthTotals.totalTokens ?? 0
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LocalStats_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LocalStats_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: LocalStats_module_css_default.sectionTitle,
								children: t("heatmap.heading")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeatmap, {
							t,
							days,
							month,
							today: usage?.today,
							selected: selectedDay,
							onSelect: onSelectDay,
							onMonthChange
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DayBreakdown, {
						t,
						date: selectedDay,
						day: selected
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LocalStats_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LocalStats_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: LocalStats_module_css_default.sectionTitle,
								children: t("session.heading")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionList, {
							t,
							sessions: usage?.sessions ?? []
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LocalStats_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LocalStats_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: LocalStats_module_css_default.sectionTitle,
								children: t("export.heading")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExportBar, {
							t,
							onExport
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/UsagePanel.module.css.mjs
		const css$1 = ".-cY2Bq_panel{--qm-card-bg:var(--dsw-alias-bg-layer-1);--qm-card-border:var(--dsw-alias-border-l1);--qm-card-radius:var(--dsw-radius-lg,16px);--qm-card-pad:20px;--qm-tile-bg:color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent);--qm-tile-radius:var(--dsw-radius-md,12px);--qm-control-radius:var(--dsw-radius-sm,8px);--qm-divider:var(--dsw-alias-border-l1);--qm-accent:var(--dsw-alias-state-business-primary);--qm-accent-soft:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);--qm-track:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);--qm-ok:var(--dsw-alias-state-success-primary);--qm-warn:var(--dsw-alias-state-warn-primary);--qm-error:var(--dsw-alias-state-error-primary);--qm-font-mono:var(--dsw-font-mono,ui-monospace, sfmono-regular, menlo, consolas, monospace);overscroll-behavior:contain;box-sizing:border-box;background:var(--dsw-alias-bg-base);min-height:0;color:var(--dsw-alias-label-primary);flex:auto;padding:0 clamp(16px,4vw,48px) 48px;font-size:13px;line-height:20px;overflow-y:auto}.-cY2Bq_page{flex-direction:column;gap:20px;width:100%;min-width:0;max-width:960px;margin:0 auto;display:flex}.-cY2Bq_pageHead{flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px 16px;padding-top:28px;display:flex}[data-platform=darwin] .-cY2Bq_pageHead{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}.-cY2Bq_pageHeading{min-width:0}.-cY2Bq_pageTitle{margin:0;font-size:20px;font-weight:500;line-height:28px}.-cY2Bq_pageIntro{color:var(--dsw-alias-label-secondary);margin:4px 0 0;font-size:13px;line-height:20px}.-cY2Bq_toolbar{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}.-cY2Bq_scope{min-width:0;color:var(--dsw-alias-label-tertiary);align-items:center;gap:8px;font-size:13px;display:inline-flex}.-cY2Bq_select{border:1px solid var(--dsw-alias-border-l2);border-radius:var(--qm-control-radius);background:var(--dsw-alias-bg-layer-1);min-width:0;max-width:min(260px,100%);height:28px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;padding:0 8px;font-size:13px}.-cY2Bq_select:hover{border-color:var(--dsw-alias-border-l3)}.-cY2Bq_tabs{flex-wrap:wrap;align-items:center;gap:4px 8px;display:flex}.-cY2Bq_tab{height:32px;color:var(--dsw-alias-label-tertiary);font:inherit;white-space:nowrap;cursor:pointer;background:0 0;border:0;border-radius:16px;align-items:center;padding:0 14px;font-size:14px;line-height:22px;transition:background-color .12s,color .12s;display:inline-flex}.-cY2Bq_tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.-cY2Bq_tab[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:500}.-cY2Bq_view{flex-direction:column;gap:16px;min-width:0;display:flex}.-cY2Bq_empty{border-radius:var(--qm-tile-radius);background:var(--qm-tile-bg);color:var(--dsw-alias-label-tertiary);text-align:center;margin:0;padding:20px;font-size:13px}.-cY2Bq_panel button:focus-visible,.-cY2Bq_panel summary:focus-visible,.-cY2Bq_panel input:focus-visible,.-cY2Bq_panel select:focus-visible{outline:2px solid var(--qm-accent);outline-offset:2px}@media (width<=600px){.-cY2Bq_pageHead{padding-top:20px}.-cY2Bq_toolbar{width:100%}.-cY2Bq_scope{flex:auto}.-cY2Bq_select{flex:auto;max-width:none}.-cY2Bq_tab{padding:0 12px}}@media (prefers-reduced-motion:reduce){.-cY2Bq_tab{transition:none}}";
		const tagId$1 = "@deepseek-ai/dsh-extension-quota-monitor/UsagePanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var UsagePanel_module_css_default = {
			"empty": "-cY2Bq_empty",
			"page": "-cY2Bq_page",
			"pageHead": "-cY2Bq_pageHead",
			"pageHeading": "-cY2Bq_pageHeading",
			"pageIntro": "-cY2Bq_pageIntro",
			"pageTitle": "-cY2Bq_pageTitle",
			"panel": "-cY2Bq_panel",
			"scope": "-cY2Bq_scope",
			"select": "-cY2Bq_select",
			"tab": "-cY2Bq_tab",
			"tabs": "-cY2Bq_tabs",
			"toolbar": "-cY2Bq_toolbar",
			"view": "-cY2Bq_view"
		};
		//#endregion
		//#region src/client/UsagePanel.tsx
		/**
		* The usage panel: the provider account card, token totals with derived spend
		* and budgets, the month calendar, the selected day's breakdown, the session
		* list, and the export row.
		*
		* Every figure arrives from the `quotaMonitor` Remote face. The panel derives
		* presentation only — it never computes a total the Host did not report, so
		* one authority owns the accounting.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/UsagePanel
		*/
		/** The local calendar month a date string belongs to, as `YYYY-MM`. */
		function monthOf(date) {
			return date.slice(0, 7);
		}
		/**
		* Whether a provider's upstream reports per-key token history.
		*
		* Only the StepCode / AgentRouter desk does today. Any other provider would
		* render an analysis of empty tiles and charts, so the panel shows its
		* allowance and the local calls instead. The adapter decides it, so a
		* temporary failed read cannot remove a known analysis surface.
		*/
		function supportsAnalysis(entry) {
			return entry.adapter === "stepcode" || entry.accounts.some((account) => account.keyUsage !== void 0);
		}
		const viewLabels = {
			current: "tab.current",
			members: "analysis.openMembers",
			account: "tab.account",
			local: "tab.local"
		};
		/** The tab a walk key lands on, per the WAI-ARIA tabs pattern; wraps at both ends. */
		function walkTab(key, index, count) {
			switch (key) {
				case "ArrowRight": return (index + 1) % count;
				case "ArrowLeft": return (index + count - 1) % count;
				case "Home": return 0;
				case "End": return count - 1;
				default: return;
			}
		}
		function UsagePanel({ t, quota, subscribeProviders }) {
			const [snapshot, setSnapshot] = (0, react.useState)();
			const [account, setAccount] = (0, react.useState)();
			/** The selected route's own figures: the totals, calendar, and sessions below. */
			const [usage, setUsage] = (0, react.useState)();
			/** Every route together, which is what the provider comparison reads. */
			const [allUsage, setAllUsage] = (0, react.useState)();
			const [provider, setProvider] = (0, react.useState)();
			/** Credential reference of the shown reading; absent is the route's own key. */
			const [credential, setCredential] = (0, react.useState)();
			const [month, setMonth] = (0, react.useState)();
			const [selectedDay, setSelectedDay] = (0, react.useState)();
			const [busy, setBusy] = (0, react.useState)(false);
			/** The view the reader picked; a provider without it falls back to its first view. */
			const [view, setView] = (0, react.useState)();
			const [memberCredential, setMemberCredential] = (0, react.useState)();
			const tabsId = (0, react.useId)();
			const selection = (0, react.useRef)({
				id: provider,
				credentialRef: credential
			});
			const requests = (0, react.useRef)({
				usage: 0,
				account: 0,
				snapshot: 0
			});
			selection.current = {
				id: provider,
				credentialRef: credential
			};
			(0, react.useEffect)(() => () => {
				requests.current.usage++;
				requests.current.account++;
				requests.current.snapshot++;
			}, []);
			const applySnapshot = (0, react.useCallback)((value) => {
				const current = selection.current;
				const entry = value.providers.find((candidate) => candidate.id === current.id) ?? value.providers.filter(supportsAnalysis).sort((a, b) => b.credentialRefs.length - a.credentialRefs.length)[0] ?? value.providers[0];
				const id = entry?.id;
				const credentialRef = id === current.id && (current.credentialRef === void 0 || entry?.credentialRefs.includes(current.credentialRef)) ? current.credentialRef : entry?.activeCredentialRef ?? entry?.credentialRefs[0];
				setSnapshot(value);
				if (id === current.id && credentialRef === current.credentialRef) return;
				selection.current = {
					id,
					credentialRef
				};
				requests.current.account++;
				requests.current.usage++;
				setAccount(void 0);
				setUsage(void 0);
				setProvider(id);
				setCredential(credentialRef);
			}, []);
			const loadSnapshot = (0, react.useCallback)(async () => {
				const request = ++requests.current.snapshot;
				const result = await quota.getSnapshot();
				if (!result.ok || request !== requests.current.snapshot) return;
				applySnapshot(result.value);
			}, [quota, applySnapshot]);
			/**
			* Open the panel: read the monitored credentials no round has taken yet and
			* adopt the snapshot that answers.
			*
			* This is the whole opening round trip. Every key a deployment monitors then
			* states its own figure, while readings a background round already took are
			* served from cache instead of being queried again.
			*/
			const loadPending = (0, react.useCallback)(async () => {
				const request = ++requests.current.snapshot;
				const result = await quota.readPendingAccounts();
				if (!result.ok || request !== requests.current.snapshot) return;
				applySnapshot(result.value);
			}, [quota, applySnapshot]);
			const loadUsage = (0, react.useCallback)(async (id, refresh) => {
				if (selection.current.id !== id) return;
				const request = ++requests.current.usage;
				const result = await quota.getUsage({
					refresh,
					...id === void 0 ? {} : { provider: id }
				});
				if (request !== requests.current.usage) return;
				if (result.ok && selection.current.id === id) setUsage(result.value);
				const all = await quota.getUsage({});
				if (all.ok && request === requests.current.usage) setAllUsage(all.value);
			}, [quota]);
			const loadAccount = (0, react.useCallback)(async (id, credentialRef, refresh) => {
				if (selection.current.id !== id || selection.current.credentialRef !== credentialRef) return;
				const request = ++requests.current.account;
				const result = await quota.getAccount({
					provider: id,
					...credentialRef === void 0 ? {} : { credentialRef },
					refresh
				});
				if (result.ok && request === requests.current.account && selection.current.id === id && selection.current.credentialRef === credentialRef) {
					const reading = result.value;
					setAccount(reading);
					setSnapshot((previous) => previous === void 0 ? previous : {
						...previous,
						capturedAt: Math.max(previous.capturedAt, reading.fetchedAt),
						providers: previous.providers.map((entry) => {
							if (entry.id !== reading.id) return entry;
							const others = entry.accounts.filter((item) => item.credentialRef !== reading.credentialRef);
							return {
								...entry,
								accounts: [...others, reading]
							};
						})
					});
				}
			}, [quota]);
			(0, react.useEffect)(() => {
				loadPending();
			}, [loadPending]);
			(0, react.useEffect)(() => subscribeProviders?.(() => {
				loadSnapshot();
			}), [subscribeProviders, loadSnapshot]);
			const hasSnapshot = snapshot !== void 0;
			const hasProvider = snapshot?.providers.some((entry) => entry.id === provider) === true;
			(0, react.useEffect)(() => {
				if (!hasSnapshot) return;
				setAccount(void 0);
				setUsage(void 0);
				if (provider !== void 0 && hasProvider) loadAccount(provider, credential, false);
				loadUsage(provider, false);
			}, [
				provider,
				credential,
				hasSnapshot,
				hasProvider,
				loadAccount,
				loadUsage
			]);
			const refreshAll = (0, react.useCallback)(async () => {
				setBusy(true);
				try {
					const request = ++requests.current.snapshot;
					const result = await quota.refreshAccounts();
					if (result.ok && request === requests.current.snapshot) applySnapshot(result.value);
					await Promise.all([loadUsage(provider, true), provider === void 0 ? Promise.resolve() : loadAccount(provider, credential, false)]);
				} finally {
					setBusy(false);
				}
			}, [
				quota,
				applySnapshot,
				loadUsage,
				loadAccount,
				provider,
				credential
			]);
			const resetStats = (0, react.useCallback)(async () => {
				const result = await quota.resetStats({});
				if (result.ok) {
					setSnapshot(result.value);
					await loadUsage(provider, false);
				}
			}, [
				quota,
				loadUsage,
				provider
			]);
			const setManual = (0, react.useCallback)(async (id, value) => {
				await quota.setBalances({ balances: { [id]: value } });
				await loadSnapshot();
				await loadAccount(id, credential, false);
			}, [
				quota,
				loadSnapshot,
				loadAccount,
				credential
			]);
			const exportUsage = (0, react.useCallback)(async (kind) => {
				const result = await quota.exportUsage({ kind });
				return result.ok ? result.value : void 0;
			}, [quota]);
			const activeMonth = month ?? (usage === void 0 ? void 0 : monthOf(usage.today));
			const providers = snapshot?.providers ?? [];
			const selectedEntry = providers.find((entry) => entry.id === provider);
			const analysis = selectedEntry !== void 0 && supportsAnalysis(selectedEntry);
			const members = analysis && (selectedEntry?.credentialRefs.length ?? 0) > 1;
			const views = analysis ? members ? [
				"current",
				"members",
				"account",
				"local"
			] : [
				"current",
				"account",
				"local"
			] : ["account", "local"];
			const shown = view !== void 0 && views.includes(view) ? view : views[0];
			const tabId = (value) => `${tabsId}-${value}`;
			const onTabKey = (event, index) => {
				const next = walkTab(event.key, index, views.length);
				if (next === void 0) return;
				event.preventDefault();
				setView(views[next]);
				event.currentTarget.parentElement?.querySelectorAll("[role=\"tab\"]").item(next).focus();
			};
			const row = snapshot?.rows.find((entry) => entry.id === provider);
			const providerNames = (0, react.useMemo)(() => Object.fromEntries(providers.map((entry) => [entry.id, entry.name])), [providers]);
			/** The selected route's display name, which the statistics section states. */
			const scopeName = provider === void 0 ? void 0 : providerNames[provider] ?? provider;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: UsagePanel_module_css_default.panel,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsagePanel_module_css_default.page,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: UsagePanel_module_css_default.pageHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsagePanel_module_css_default.pageHeading,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
									className: UsagePanel_module_css_default.pageTitle,
									children: t("panel.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: UsagePanel_module_css_default.pageIntro,
									children: t("panel.subtitle")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsagePanel_module_css_default.toolbar,
								children: [providers.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: UsagePanel_module_css_default.scope,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("keypage.scope") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: UsagePanel_module_css_default.select,
										value: provider ?? "",
										onChange: (event) => {
											const entry = providers.find((item) => item.id === event.target.value);
											if (entry === void 0) return;
											setProvider(entry.id);
											setCredential(entry.activeCredentialRef ?? entry.credentialRefs[0]);
											setMemberCredential(void 0);
										},
										children: providers.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: entry.id,
											children: entry.name
										}, entry.id))
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }),
									onClick: () => void refreshAll(),
									disabled: busy,
									"aria-busy": busy,
									children: busy ? t("action.refreshing") : t("action.refresh")
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.tabs,
							role: "tablist",
							"aria-label": t("tab.label"),
							children: views.map((value, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								id: tabId(value),
								type: "button",
								role: "tab",
								className: UsagePanel_module_css_default.tab,
								"aria-selected": shown === value,
								"aria-controls": `${tabsId}-panel`,
								tabIndex: shown === value ? 0 : -1,
								onClick: () => {
									setView(value);
								},
								onKeyDown: (event) => {
									onTabKey(event, index);
								},
								children: t(viewLabels[value])
							}, value))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							id: `${tabsId}-panel`,
							role: "tabpanel",
							"aria-labelledby": tabId(shown),
							className: UsagePanel_module_css_default.view,
							children: [
								shown === "current" && snapshot !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemberAnalysis, {
									t,
									providers,
									provider,
									credential,
									capturedAt: snapshot.capturedAt,
									mode: "current",
									onSelect: () => {}
								}),
								shown === "members" && snapshot !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemberAnalysis, {
									t,
									providers,
									provider,
									credential: memberCredential,
									capturedAt: snapshot.capturedAt,
									onSelect: (id, ref) => {
										setProvider(id);
										setMemberCredential(ref);
									}
								}),
								shown === "account" && (providers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: UsagePanel_module_css_default.empty,
									children: t("account.empty")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountCard, {
									t,
									providers,
									selected: provider,
									selectedCredential: credential,
									account,
									manualTotal: row?.balance?.total,
									manualRemaining: row?.balance?.remaining,
									onSelect: (id, credentialRef) => {
										setProvider(id);
										setCredential(credentialRef);
									},
									onRefresh: () => {
										if (provider !== void 0) loadAccount(provider, credential, true);
									},
									onManage: async (request) => {
										const result = await quota.manageKey(request);
										if (!result.ok) throw new Error(result.error.message);
										applySnapshot(result.value);
										await loadPending();
									},
									onManualChange: (id, value) => {
										setManual(id, value);
									}
								})),
								shown === "local" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalStats, {
									t,
									usage,
									allUsage,
									names: providerNames,
									provider,
									scopeName,
									month: activeMonth,
									selectedDay,
									onSelectDay: setSelectedDay,
									onMonthChange: setMonth,
									onExport: exportUsage,
									onReset: () => void resetStats()
								})
							]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/yield.ts
		/**
		* When this plugin's composer pill stands down.
		*
		* The composer's tool row is a list seat, and a provider-specific plugin may
		* put its own allowance chip there — `dsh-cline-pass` publishes
		* `cline-pass-usage`. Such a chip is registered **unconditionally** and states
		* nothing about the routes it does not own: it renders `null` unless the
		* selected route is its own. Presence in the seat therefore says nothing about
		* what the user is looking at, and yielding on presence alone would retire this
		* pill for good — every route, including the ones the rival chip stays silent
		* about.
		*
		* So the decision is scoped to the route: a sibling stands this pill down only
		* when the route its entry id names is the selected one. A sibling whose id
		* names no route at all claims every route, and still wins.
		* @module @deepseek-ai/dsh-extension-quota-monitor/yield
		*/
		/** This plugin's entry id in the composer's tool row. */
		const PILL_ID = "quota-monitor-pill";
		/**
		* Entry-id segments that mean "this entry states an allowance".
		*
		* Compared as whole segments, so `cline-pass-usage` and a bare `usage` count
		* while `myquotathing` does not.
		*/
		const ALLOWANCE_WORDS = new Set([
			"usage",
			"quota",
			"balance",
			"allowance"
		]);
		/** Split an entry id into its segments; every separator Cordis ids use. */
		const SEPARATORS = /[-_.]/u;
		/**
		* Whether a segment states an allowance.
		* @param segment - one segment of an entry id.
		* @returns true for `usage` and its plural, and for each sibling spelling.
		*/
		function isAllowanceWord(segment) {
			const word = segment.toLowerCase().replace(/s$/u, "");
			return ALLOWANCE_WORDS.has(word);
		}
		/**
		* The route an entry id names, if it names one.
		*
		* The id is split into segments and its allowance words are dropped, so
		* `cline-pass-usage` names route `cline-pass` and `usage` names none.
		* @param id - a sibling entry id.
		* @returns the route name, or the empty string when the id names no route.
		*/
		function routeOf(id) {
			return id.split(SEPARATORS).filter((segment) => !isAllowanceWord(segment)).join("-");
		}
		/**
		* Whether a sibling already states this route's allowance.
		*
		* @param ids - every entry id registered in the seat, this plugin's included.
		* @param self - this plugin's own entry id, which never counts as a rival.
		* @param provider - the route the session selected, which is what decides it.
		* @returns true when a sibling speaks for this route and this pill should stand
		* down for it.
		*/
		function rivalStatesRoute(ids, self, provider) {
			const selected = provider.toLowerCase();
			return ids.some((id) => {
				if (id === void 0 || id === self) return false;
				if (!id.split(SEPARATORS).some(isAllowanceWord)) return false;
				const route = routeOf(id);
				return route === "" || route.toLowerCase() === selected;
			});
		}
		//#endregion
		//#region \0dsh-css:/root/codes/deepseek-harness/packages/extensions/extension-quota-monitor/src/client/QuotaPill.module.css.mjs
		const css = ".dTfsUa_root{display:inline-flex;position:relative}.dTfsUa_pill{border:.5px solid var(--dsw-alias-border-l2);max-width:260px;height:24px;color:var(--dsw-alias-label-secondary);font:inherit;white-space:nowrap;cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:0 8px;font-size:11px;line-height:1;display:inline-flex;overflow:hidden}.dTfsUa_pill:hover,.dTfsUa_pill[aria-expanded=true]{border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}.dTfsUa_reading .dTfsUa_dot{animation:1.2s ease-in-out infinite dTfsUa_pulse}@keyframes dTfsUa_pulse{50%{opacity:.35}}.dTfsUa_dot{background:var(--dsw-alias-state-success-primary);border-radius:50%;flex:none;width:6px;height:6px}.dTfsUa_warning .dTfsUa_dot{background:var(--dsw-alias-state-warn-primary)}.dTfsUa_critical .dTfsUa_dot{background:var(--dsw-alias-state-error-primary)}.dTfsUa_name{text-overflow:ellipsis;font-weight:500;overflow:hidden}.dTfsUa_window,.dTfsUa_figure{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}.dTfsUa_window+.dTfsUa_window,.dTfsUa_name+.dTfsUa_window,.dTfsUa_name+.dTfsUa_figure{border-left:.5px solid var(--dsw-alias-border-l2);padding-left:6px}@container (width<=680px){.dTfsUa_name{display:none}.dTfsUa_name+.dTfsUa_figure,.dTfsUa_name+.dTfsUa_window{border-left:none;padding-left:0}.dTfsUa_window~.dTfsUa_window{display:none}.dTfsUa_pill{max-width:170px}}@container (width<=560px){.dTfsUa_figure,.dTfsUa_window{display:none}.dTfsUa_pill{max-width:40px}}.dTfsUa_panel{box-sizing:border-box;z-index:1100;overscroll-behavior:contain;background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));width:300px;max-width:calc(100vw - 24px);max-height:min(60vh,420px);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;border-radius:16px;flex-direction:column;gap:10px;padding:12px 14px;font-size:12px;line-height:1.5;display:flex;position:fixed;overflow-y:auto}.dTfsUa_panelHead{align-items:baseline;gap:8px;display:flex}.dTfsUa_panelName{font-size:13px;font-weight:600}.dTfsUa_panelPlan{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;overflow:hidden}.dTfsUa_panelAction{border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:999px;margin-left:auto;padding:2px 8px;font-size:11px}.dTfsUa_panelAction:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}.dTfsUa_panelAction:disabled{opacity:.6;cursor:default}.dTfsUa_panelHeading{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px}.dTfsUa_detailRow{flex-direction:column;gap:4px;display:flex}.dTfsUa_detailHead{justify-content:space-between;gap:8px;display:flex}.dTfsUa_detailValue{font-variant-numeric:tabular-nums}.dTfsUa_detailMeta{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px}.dTfsUa_detailList{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.dTfsUa_detailPair{justify-content:space-between;gap:8px;display:flex}.dTfsUa_detailPair dt,.dTfsUa_detailPair dd{margin:0}.dTfsUa_detailPair dd{font-variant-numeric:tabular-nums}.dTfsUa_bar{background:var(--dsw-alias-bg-layer-3);border-radius:999px;height:4px;overflow:hidden}.dTfsUa_barFill{background:var(--dsw-alias-state-business-primary);border-radius:999px;height:100%}.dTfsUa_barFill.dTfsUa_warning{background:var(--dsw-alias-state-warn-primary)}.dTfsUa_barFill.dTfsUa_critical{background:var(--dsw-alias-state-error-primary)}.dTfsUa_gatewayGroup{flex-direction:column;gap:4px;display:flex}.dTfsUa_gatewayRow{justify-content:space-between;gap:8px;display:flex}.dTfsUa_gatewayLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dTfsUa_gatewayValue{font-variant-numeric:tabular-nums;flex:none}.dTfsUa_panelMeta{border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);margin:0;padding-top:8px;font-size:11px}";
		const tagId = "@deepseek-ai/dsh-extension-quota-monitor/QuotaPill.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var QuotaPill_module_css_default = {
			"bar": "dTfsUa_bar",
			"barFill": "dTfsUa_barFill",
			"critical": "dTfsUa_critical",
			"detailHead": "dTfsUa_detailHead",
			"detailList": "dTfsUa_detailList",
			"detailMeta": "dTfsUa_detailMeta",
			"detailPair": "dTfsUa_detailPair",
			"detailRow": "dTfsUa_detailRow",
			"detailValue": "dTfsUa_detailValue",
			"dot": "dTfsUa_dot",
			"figure": "dTfsUa_figure",
			"gatewayGroup": "dTfsUa_gatewayGroup",
			"gatewayLabel": "dTfsUa_gatewayLabel",
			"gatewayRow": "dTfsUa_gatewayRow",
			"gatewayValue": "dTfsUa_gatewayValue",
			"name": "dTfsUa_name",
			"panel": "dTfsUa_panel",
			"panelAction": "dTfsUa_panelAction",
			"panelHead": "dTfsUa_panelHead",
			"panelHeading": "dTfsUa_panelHeading",
			"panelMeta": "dTfsUa_panelMeta",
			"panelName": "dTfsUa_panelName",
			"panelPlan": "dTfsUa_panelPlan",
			"pill": "dTfsUa_pill",
			"pulse": "dTfsUa_pulse",
			"reading": "dTfsUa_reading",
			"root": "dTfsUa_root",
			"warning": "dTfsUa_warning",
			"window": "dTfsUa_window"
		};
		//#endregion
		//#region src/client/QuotaPill.tsx
		/**
		* The composer pill: the selected route's allowance beside the model selector,
		* and the reading behind it once the reader asks for more.
		*
		* The pill states the two tightest plan windows, or a wallet's remainder, and
		* clicking it floats the whole reading above the composer: every window with
		* its reset countdown and disclosed remainder, the balance, the budget pools,
		* and the usage the endpoint itself reported for this credential. It renders
		* nothing when that route's provider publishes no account endpoint — a control
		* that always showed something would be noise — and it stands down when another
		* plugin's own allowance chip already speaks for that exact route (see
		* {@link rivalStatesRoute}).
		*
		* That decision belongs here rather than at registration: a rival registers its
		* entry unconditionally and renders nothing unless the selected route is its
		* own, so the seat is occupied even while the rival says nothing — and this pill
		* is the only one that would fill that silence.
		*
		* The reading is portaled to `document.body` and placed by
		* {@link useAnchoredPosition} from the pill's own rect — the platform's own
		* popover contract (see ui-schedule's `PickerPopover`). It has to be, for two
		* reasons a narrower center column makes visible at once: the composer seat is
		* a stacking context (ConversationRoot's own note says it caps an in-card
		* popup's z-index), and the seat also scrolls and clips. A reading laid out
		* inside the card therefore leans out of the column and gets cut once the
		* sidebar takes width, and `right: 0` against a pill that has the model
		* selector beside it points three hundred pixels leftward for no reason the
		* reader can see. From a body portal the panel escapes both, and the hook
		* clamps it inside the viewport and re-places it on scroll and resize.
		*
		* The route comes from the session's own `modelSelection` projection, so the
		* pill follows the model the next request will use rather than the account
		* card's independent selection.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
		*/
		/** How many windows the pill states before the panel carries the rest. */
		const PILL_WINDOWS = 2;
		/** How many rows of one gateway usage table the panel shows. */
		const GATEWAY_ROWS = 4;
		/** How often the pill re-reads the Host's cached reading. */
		const POLL_MS = 6e4;
		/** Gap between the pill and the reading it floats, and the viewport inset. */
		const PANEL_GAP = 8;
		const PANEL_MARGIN = 12;
		/**
		* Unplaced portal frame: laid out at the viewport origin but left unpainted
		* until the measuring pass in the same commit has placed it.
		*/
		const MEASURE_STYLE = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		/** Display order of the gateway usage tables. */
		const GATEWAY_ORDER = Object.freeze([
			"day",
			"model",
			"pool"
		]);
		/** Dictionary key naming each gateway usage table. */
		const GATEWAY_KEYS = Object.freeze({
			day: "gateway.days",
			model: "gateway.models",
			pool: "gateway.pools"
		});
		/**
		* The endpoint's own token total for one row: its own, or the four buckets summed.
		* @param row - one gateway usage row.
		* @returns the token figure, or undefined when the row reported none.
		*/
		function gatewayTokens(row) {
			if (row.totalTokens !== void 0) return row.totalTokens;
			const present = [
				row.inputTokens,
				row.outputTokens,
				row.cacheReadTokens,
				row.cacheWriteTokens
			].filter((value) => value !== void 0);
			return present.length === 0 ? void 0 : present.reduce((total, value) => total + value, 0);
		}
		/**
		* One gateway usage row's figures, as a single line.
		* @param t - the panel's namespace-bound translate.
		* @param row - the row to describe.
		* @returns the figures the endpoint reported for it.
		*/
		function gatewayFacts(t, row) {
			const parts = [];
			if (row.requests !== void 0) parts.push(t("gateway.requests", { count: fmtNumber(row.requests) }));
			const tokens = gatewayTokens(row);
			if (tokens !== void 0) parts.push(fmtTokens(tokens));
			if (row.cost !== void 0) parts.push(fmtAmount(row.cost, row.currency));
			return parts.join(" · ");
		}
		/**
		* One plan window inside the panel: its bar, its share, and what resets it.
		* @param props - the window, its account, and the translate seat.
		* @returns the row element.
		*/
		function WindowDetail({ t, account, window: entry }) {
			const meta = [resetLabel(t, entry.resetAt), entry.remaining === void 0 ? void 0 : t("window.remaining", { amount: fmtAmount(entry.remaining, account.currency) })].filter((part) => part !== void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: QuotaPill_module_css_default.detailRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: QuotaPill_module_css_default.detailHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.detailLabel,
							children: t(WINDOW_KEYS[entry.kind])
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.detailValue,
							children: fmtPercent(entry.percentUsed)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: QuotaPill_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${QuotaPill_module_css_default.barFill} ${entry.percentUsed >= 100 ? QuotaPill_module_css_default.critical : entry.percentUsed >= 80 ? QuotaPill_module_css_default.warning : ""}`,
							style: { width: `${Math.min(100, entry.percentUsed)}%` }
						})
					}),
					meta.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: QuotaPill_module_css_default.detailMeta,
						children: meta.join(" · ")
					})
				]
			});
		}
		function QuotaPill({ t, quota, rivals, useProjection }) {
			const provider = useProjection("modelSelection")?.next?.provider;
			const standsDown = (0, react.useMemo)(() => {
				return provider === void 0 ? false : rivalStatesRoute(rivals.ids(), PILL_ID, provider);
			}, [
				rivals,
				(0, react.useSyncExternalStore)(rivals.subscribe, rivals.version),
				provider
			]);
			const [account, setAccount] = (0, react.useState)();
			const [reading, setReading] = (0, react.useState)(false);
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const position = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: rootRef,
				panelRef,
				side: "top",
				align: "end",
				gap: PANEL_GAP,
				margin: PANEL_MARGIN
			});
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen, panelRef);
			const read = (0, react.useCallback)(async (id, refresh) => {
				setReading(true);
				try {
					const result = await quota.getAccount({
						provider: id,
						refresh
					});
					if (result.ok) setAccount(result.value);
				} finally {
					setReading(false);
				}
			}, [quota]);
			(0, react.useEffect)(() => {
				if (provider === void 0) return;
				setAccount(void 0);
				setOpen(false);
				read(provider, false);
				const timer = setInterval(() => {
					read(provider, false);
				}, POLL_MS);
				return () => {
					clearInterval(timer);
				};
			}, [provider, read]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);
			if (provider === void 0 || standsDown || account === void 0) return null;
			if (account.id !== provider || account.status !== "ok" || !hasFigure(account)) return null;
			const tone = accountTone(account);
			const toneClass = tone === "critical" ? QuotaPill_module_css_default.critical : tone === "warning" ? QuotaPill_module_css_default.warning : void 0;
			const windows = worstWindows(account, PILL_WINDOWS);
			const unlimited = account.unlimited === true;
			const showBalance = !unlimited && windows.length === 0 && account.remaining !== void 0;
			const groups = GATEWAY_ORDER.map((kind) => [kind, (account.usage ?? []).filter((row) => row.kind === kind)]).filter(([, rows]) => rows.length > 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: QuotaPill_module_css_default.root,
				ref: rootRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `${QuotaPill_module_css_default.pill} ${toneClass ?? ""} ${reading ? QuotaPill_module_css_default.reading : ""}`,
					"aria-expanded": open,
					"aria-haspopup": "dialog",
					"aria-label": t("pill.label", { provider: account.name }),
					onClick: () => setOpen((current) => !current),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.dot,
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.name,
							children: account.name
						}),
						unlimited ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.figure,
							children: t("pill.unlimited")
						}) : windows.map((window) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.window,
							children: t("pill.window", {
								label: t(WINDOW_KEYS[window.kind]),
								percent: fmtPercent(window.percentUsed)
							})
						}, window.kind)),
						showBalance ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: QuotaPill_module_css_default.figure,
							children: fmtAmount(account.remaining, account.currency)
						}) : null
					]
				}), !open ? null : (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					role: "dialog",
					"aria-label": t("pill.details", { provider: account.name }),
					className: QuotaPill_module_css_default.panel,
					style: position ?? MEASURE_STYLE,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: QuotaPill_module_css_default.panelHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: QuotaPill_module_css_default.panelName,
									children: account.name
								}),
								account.plan === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: QuotaPill_module_css_default.panelPlan,
									children: account.plan
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: QuotaPill_module_css_default.panelAction,
									disabled: reading,
									onClick: () => void read(provider, true),
									children: reading ? t("action.refreshing") : t("action.refresh")
								})
							]
						}),
						(account.planWindows ?? []).map((window) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WindowDetail, {
							t,
							account,
							window
						}, window.kind)),
						unlimited ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: QuotaPill_module_css_default.detailMeta,
							children: t("account.unlimited")
						}) : account.remaining === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
							className: QuotaPill_module_css_default.detailList,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: QuotaPill_module_css_default.detailPair,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("account.remaining") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtAmount(account.remaining, account.currency) })]
								}),
								account.used === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: QuotaPill_module_css_default.detailPair,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("account.used") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtAmount(account.used, account.currency) })]
								}),
								account.limit === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: QuotaPill_module_css_default.detailPair,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("account.limit") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtAmount(account.limit, account.currency) })]
								})
							]
						}),
						account.budgetPools === void 0 || account.budgetPools.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: QuotaPill_module_css_default.panelHeading,
							children: t("pools.heading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: QuotaPill_module_css_default.detailList,
							children: account.budgetPools.map((pool) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								className: QuotaPill_module_css_default.detailMeta,
								children: pool.limit === void 0 ? t("pool.remaining", {
									name: pool.name,
									amount: fmtAmount(pool.remaining)
								}) : t("pool.remainingOfLimit", {
									name: pool.name,
									amount: fmtAmount(pool.remaining),
									limit: fmtAmount(pool.limit)
								})
							}, pool.name))
						})] }),
						groups.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: QuotaPill_module_css_default.panelHeading,
							children: t("gateway.heading")
						}), groups.map(([kind, rows]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: QuotaPill_module_css_default.gatewayGroup,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: QuotaPill_module_css_default.panelHeading,
									children: t(GATEWAY_KEYS[kind])
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: QuotaPill_module_css_default.detailList,
									children: rows.slice(0, GATEWAY_ROWS).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: QuotaPill_module_css_default.gatewayRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: QuotaPill_module_css_default.gatewayLabel,
											title: row.label,
											children: row.label
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: QuotaPill_module_css_default.gatewayValue,
											children: gatewayFacts(t, row)
										})]
									}, row.label))
								}),
								rows.length > GATEWAY_ROWS ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: QuotaPill_module_css_default.detailMeta,
									children: t("gateway.more", { count: String(GATEWAY_ROWS) })
								}) : null
							]
						}, kind))] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: QuotaPill_module_css_default.panelMeta,
							children: [
								t("account.updated", { time: fmtTime(account.fetchedAt) }),
								" · ",
								t("account.source", { adapter: account.adapter })
							]
						})
					]
				}), document.body)]
			});
		}
		//#endregion
		//#region src/client/UsageIcon.tsx
		function UsageIcon({ size, active }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: active ? 2.2 : 1.8,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				focusable: "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 20h18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "5",
						y: "12",
						width: "3.4",
						height: "6",
						rx: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "10.3",
						y: "8",
						width: "3.4",
						height: "10",
						rx: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "15.6",
						y: "4",
						width: "3.4",
						height: "14",
						rx: "1"
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Locale namespace the panel's entries declare. */
		const NS = "quotaMonitor";
		/** Simplified Chinese quota monitor copy. */
		const zh = {
			"charts.overview": "用量概览",
			"charts.modelDetail": "选中模型明细",
			"charts.inspect": "悬停或点选模型查看明细",
			"analysis.exactModels": "模型精确数据",
			"analysis.exactMembers": "成员精确数据",
			"charts.unclassified": "未细分",
			"charts.breakdownUnavailable": "接口未提供完整分类",
			"charts.unknownDays": "灰色短线表示无数据，不计作零用量。",
			"charts.modelsPartial": "模型占比仅统计已归属模型的 Tokens。",
			"charts.tokens": "Token 构成",
			"charts.models": "模型用量占比",
			"charts.trend": "每日用量趋势",
			"charts.peak": "峰值",
			"charts.other": "其他模型",
			"charts.zero": "该周期暂无用量",
			"analysis.current": "当前使用 Key",
			"analysis.openMembers": "成员分析",
			"analysis.closeMembers": "收起成员分析",
			"analysis.limit": "额度",
			"analysis.currentRate": "本期单价 / 百万 Token",
			"analysis.title": "成员 AI 使用分析",
			"analysis.hint": "按 Key 对应成员统计 · 上海时区 · 周一为每周起点",
			"analysis.period": "统计周期",
			"analysis.thisWeek": "本周",
			"analysis.lastWeek": "上周",
			"analysis.thisMonth": "本月",
			"analysis.lastMonth": "上月",
			"analysis.last30": "近 30 天",
			"analysis.member": "成员 / Key",
			"analysis.tokens": "Tokens",
			"analysis.calls": "调用次数",
			"analysis.activeDays": "活跃天数",
			"analysis.share": "用量占比",
			"analysis.cacheShare": "缓存读占比",
			"analysis.models": "模型用量明细",
			"analysis.model": "模型",
			"analysis.daily": "每日用量明细",
			"analysis.date": "日期",
			"analysis.partial": "部分覆盖",
			"analysis.coverage": "数据窗口不足，当前显示可获取的部分记录；缺失日期不代表零用量。",
			"analysis.unavailable": "无可用明细",
			"analysis.empty": "该周期暂无可用模型明细",
			"analysis.members": "有记录成员",
			"analysis.scope": "同一供应商内比较；一把 Key 对应一位成员，共用 Key 无法区分个人。",
			"analysis.money": "消费与单价仅来自下方当前计费周期；上游未提供历史周期或逐模型消费。",
			"analysis.local": "本机调用记录（仅此 DSH 实例）",
			"analysis.account": "额度与 Key 管理",
			"analysis.readFailed": "此 Key 暂未读取到成功的历史数据：{reason}。可点击页面顶部「刷新」重试。",
			"analysis.retained": "{count} 个 Key 暂时刷新失败，图表保留上次成功数据，最早更新于 {time}（上海时间）；稍后可重试。",
			"analysis.freshness": "统计截至 {date}；上游尚未提供的历史记录不计入。",
			"tab.label": "页面视图",
			"tab.current": "当前 Key",
			"tab.account": "额度与 Key",
			"tab.local": "本机记录",
			"nav.label": "用量/余额",
			"panel.title": "用量与余额",
			"panel.subtitle": "供应商账户与 Token 用量分析",
			"action.refresh": "刷新",
			"action.refreshing": "刷新中…",
			"action.reset": "重置本次统计",
			"action.retry": "重试",
			"keys.heading": "此供应商的 Key（{count}）",
			"keys.viewHint": "点击 Key 查看额度；“设为当前”会切换实际请求使用的 Key，并固定为手动模式。",
			"keys.name": "Key 名称（可选）",
			"keys.secret": "API Key",
			"keys.add": "添加 Key",
			"keys.rename": "保存名称",
			"keys.remove": "移出列表",
			"keys.active": "当前使用",
			"keys.activate": "设为当前",
			"keys.storageHint": "Key 仅写入服务端凭据库。移出列表不会删除凭据；账户接口未返回名称时使用自定义名称或凭据引用。",
			"keys.failed": "操作失败",
			"keys.saving": "保存中…",
			"keys.unread": "尚未查询",
			"routing.heading": "Key 路由",
			"routing.manual": "手动固定",
			"routing.quota": "按剩余额度",
			"routing.jev": "Jev 智能选择",
			"routing.jevKey": "Jev 使用的 OpenRouter API Key",
			"routing.keepKey": "已保存，留空保留原 Key",
			"routing.save": "保存路由",
			"routing.hint": "自动路由在该供应商的 Key 之间选择，模型保持当前选择。排除耗尽、查询失败及近期请求失败的 Key；Jev 只接收匿名额度数据，调用失败回退额度规则。保存自动路由会连接该供应商的请求凭据。",
			"routing.fallback": "Jev 本次未返回可信选择，已回退额度规则。",
			"account.heading": "供应商账户",
			"account.provider": "供应商",
			"account.remaining": "剩余",
			"account.used": "已用",
			"account.limit": "额度",
			"account.unlimited": "不限量",
			"account.plan": "订阅方案",
			"account.source": "数据来源：{adapter}",
			"account.updated": "更新于 {time}",
			"account.empty": "尚未配置任何供应商",
			"account.mode.balance": "余额账户",
			"account.mode.subscription": "订阅套餐",
			"account.mode.unsupported": "无账户接口",
			"status.ok": "正常",
			"status.notConfigured": "未配置",
			"status.unauthorized": "凭据无效",
			"status.rateLimited": "请求过于频繁",
			"status.unsupported": "该供应商未提供账户接口",
			"status.invalidResponse": "响应无法解析",
			"status.blocked": "已按本机安全策略阻止",
			"status.unavailable": "暂时不可用",
			"status.missingCredentials": "缺少凭据：{names}",
			"window.session": "当前窗口",
			"window.fiveHour": "5 小时",
			"window.daily": "每日",
			"window.weekly": "本周",
			"window.monthly": "本月",
			"window.billing": "订阅周期",
			"window.quota": "总额度",
			"window.used": "已用 {percent}%",
			"window.remaining": "剩余 {amount}",
			"pools.heading": "预算池",
			"pool.remaining": "{name}：剩余 {amount}",
			"pool.remainingOfLimit": "{name}：剩余 {amount} / {limit}",
			"gateway.figures": "网关报告用量",
			"gateway.heading": "账号用量（网关报告）",
			"gateway.hint": "该账号端点自行上报的用量，按凭据分开，与上方本地统计无关",
			"gateway.days": "按天",
			"gateway.models": "按模型",
			"gateway.pools": "按预算池",
			"gateway.requests": "{count} 次调用",
			"gateway.more": "仅显示前 {count} 行",
			"reset.expired": "窗口已到期",
			"reset.hours": "{at} 重置 · 还有 {hours} 小时 {minutes} 分",
			"reset.minutes": "{at} 重置 · 还有 {minutes} 分",
			"manual.heading": "手动余额",
			"manual.hint": "该供应商无公开账户接口时，可手动填写额度作为参考",
			"manual.placeholder": "未设置",
			"manual.remaining": "手动剩余 {amount}",
			"usage.heading": "Token 用量",
			"usage.today": "今日",
			"usage.month": "本月",
			"usage.allTime": "累计",
			"usage.cacheHit": "缓存命中率",
			"usage.cacheHitToday": "今日缓存命中率 {percent}",
			"usage.input": "输入",
			"usage.output": "输出",
			"usage.cacheRead": "缓存读取",
			"usage.cacheWrite": "缓存写入",
			"usage.calls": "{calls} 次调用",
			"usage.sessions": "已统计 {count} 个会话",
			"usage.folding": "正在统计历史会话…",
			"usage.foldedAt": "统计于 {time}",
			"usage.empty": "暂无用量记录",
			"usage.scope": "仅 {provider}",
			"cost.unpriced": "另有 {calls} 次调用未配置价格",
			"cost.unconfigured": "配置 pricing.rules 后显示预估费用",
			"model.heading": "按模型统计",
			"model.range": "模型用量时间范围",
			"model.calls": "请求数",
			"model.empty": "暂无按模型的用量",
			"model.estimate": "费用为按配置价格估算的金额，不代表供应商账单；单价为当前配置，每百万 Token 计价，历史费用按请求日期匹配价格。",
			"model.rates": "当前配置单价 / 1M Token",
			"model.unpriced": "未计价",
			"model.noRates": "未配置单价",
			"model.rate.input": "输入 {amount}",
			"model.rate.output": "输出 {amount}",
			"model.rate.cacheRead": "缓存读取 {amount}",
			"model.rate.cacheWrite": "缓存写入 {amount}",
			"model.rate.from": "生效日期 {date}",
			"provider.heading": "按供应商统计",
			"provider.empty": "暂无按供应商的用量",
			"provider.hint": "各供应商用量对比；在页面顶部切换供应商",
			"provider.archived": "历史供应商",
			"provider.showAll": "全部 {count} 个",
			"provider.showSelected": "只看当前",
			"provider.idle": "另有 {count} 条路由在该范围内没有用量",
			"provider.share.today": "占今日 {percent}",
			"provider.share.month": "占本月 {percent}",
			"provider.share.allTime": "占累计 {percent}",
			"provider.meta": "{calls} 次调用 · {models} 个模型",
			"provider.cache": "缓存命中 {percent}",
			"provider.lastDay": "最近 {date}",
			"pill.label": "{provider} 额度",
			"pill.details": "{provider} 的额度与用量",
			"pill.window": "{label} {percent}",
			"pill.unlimited": "不限量",
			"budget.heading": "预算",
			"budget.daily": "今日预算",
			"budget.monthly": "本月预算",
			"budget.spentOfLimit": "{spent} / {limit}",
			"budget.status.normal": "正常",
			"budget.status.warning": "接近上限",
			"budget.status.critical": "已超上限",
			"budget.status.unknown": "费用不完整",
			"heatmap.heading": "当月每日用量",
			"heatmap.less": "少",
			"heatmap.more": "多",
			"heatmap.day": "{date}：{tokens} tokens · {calls} 次调用",
			"heatmap.dayEmpty": "{date}：无用量",
			"heatmap.prev": "上一月",
			"heatmap.next": "下一月",
			"detail.heading": "{date} 明细",
			"detail.provider": "供应商",
			"detail.model": "模型",
			"detail.tokens": "Tokens",
			"detail.calls": "调用",
			"detail.cost": "预估费用",
			"detail.empty": "当日无用量",
			"detail.hint": "点击上方日历中的某一天查看明细",
			"session.heading": "会话用量",
			"session.id": "会话",
			"session.routes": "路由",
			"session.tokens": "Tokens",
			"session.calls": "调用",
			"session.cost": "预估费用",
			"session.lastActive": "最近活动",
			"session.empty": "暂无会话用量",
			"session.more": "仅显示用量最新的 {count} 个会话",
			"export.heading": "导出",
			"export.daily": "每日明细 CSV",
			"export.sessions": "会话明细 CSV",
			"export.json": "完整报告 JSON",
			"export.hint": "导出内容仅包含用量与预估费用，不含账户余额或凭据",
			"export.failed": "导出失败",
			"weekday.mon": "一",
			"weekday.tue": "二",
			"weekday.wed": "三",
			"weekday.thu": "四",
			"weekday.fri": "五",
			"weekday.sat": "六",
			"weekday.sun": "日",
			"keynav.label": "Key 用量",
			"keypage.title": "Key 用量明细",
			"keypage.subtitle": "每个 Key 各自的额度与 Token 消耗",
			"keypage.scope": "供应商",
			"keypage.tile.used": "本期消费",
			"keypage.tile.calls": "总调用",
			"keypage.tile.tokens": "总 Tokens",
			"keypage.tile.keys": "Key 数量",
			"keypage.tile.keysNote": "{ok} 正常 · {bad} 异常",
			"keypage.tile.windowNote": "近 {days} 天",
			"keypage.tile.periodTokens": "本期 {tokens} tokens",
			"keypage.keys.heading": "按 Key 明细",
			"keypage.keys.hint": "点击卡片查看该 Key 的用量构成",
			"keypage.keys.empty": "该供应商还没有监控中的 Key",
			"keypage.key.percent": "使用率 {percent}",
			"keypage.key.windowTokens": "近 {days} 天 {tokens}",
			"keypage.key.rate": "本期 {amount}/百万 token",
			"keypage.key.rateShort": "{amount}/百万 token",
			"keypage.key.cacheShare": "缓存读 {percent}",
			"keypage.key.noUsage": "该 Key 未返回 Token 用量",
			"keypage.detail.close": "收起",
			"keypage.detail.allowance": "额度与预算池",
			"keypage.detail.tokens": "Token 构成",
			"keypage.detail.period": "计费周期",
			"keypage.detail.periodRange": "{start} 至 {end}",
			"keypage.detail.models": "按模型（近 {days} 天）",
			"keypage.detail.modelsEmpty": "暂无按模型的记录",
			"keypage.detail.daily": "每日 Token（近 {days} 天）",
			"keypage.detail.dailyEmpty": "暂无每日记录",
			"keypage.detail.dailyHint": "点击柱形查看当日各模型",
			"keypage.detail.reasoning": "其中推理 {value}（已含在输出内）",
			"keypage.detail.calls": "调用",
			"keypage.detail.outcomes": "成功 {success} · 失败 {failed}",
			"keypage.detail.updated": "接口更新于 {time}",
			"keypage.detail.usageUnavailable": "该 Key 未返回用量明细",
			"keypage.detail.poolFigures": "{amount} / {limit}",
			"keypage.total": "合计",
			"keypage.identity.default": "路由默认凭据",
			"keypage.day.heading": "{date} 各模型用量",
			"keypage.day.empty": "该日没有记录",
			"keypage.day.model": "模型",
			"keypage.day.tokens": "Tokens",
			"keypage.day.calls": "调用"
		};
		/** English quota monitor copy. */
		const en = {
			"charts.overview": "Usage overview",
			"charts.modelDetail": "Selected model detail",
			"charts.inspect": "Hover or select a model for details",
			"analysis.exactModels": "Exact model figures",
			"analysis.exactMembers": "Exact member figures",
			"charts.unclassified": "Unclassified",
			"charts.breakdownUnavailable": "Complete breakdown unavailable",
			"charts.unknownDays": "Grey marks indicate missing data, not zero usage.",
			"charts.modelsPartial": "Model shares include only tokens attributed to a model.",
			"charts.tokens": "Token composition",
			"charts.models": "Model usage share",
			"charts.trend": "Daily usage trend",
			"charts.peak": "Peak",
			"charts.other": "Other models",
			"charts.zero": "No usage in this period",
			"analysis.current": "Active key",
			"analysis.openMembers": "Member analysis",
			"analysis.closeMembers": "Close member analysis",
			"analysis.limit": "Allowance",
			"analysis.currentRate": "Billing period / million tokens",
			"analysis.title": "Member AI usage",
			"analysis.hint": "Members identified by key · Asia/Shanghai · Weeks start Monday",
			"analysis.period": "Analysis period",
			"analysis.thisWeek": "This week",
			"analysis.lastWeek": "Last week",
			"analysis.thisMonth": "This month",
			"analysis.lastMonth": "Last month",
			"analysis.last30": "Last 30 days",
			"analysis.member": "Member / key",
			"analysis.tokens": "Tokens",
			"analysis.calls": "Calls",
			"analysis.activeDays": "Active days",
			"analysis.share": "Usage share",
			"analysis.cacheShare": "Cache read share",
			"analysis.models": "Model usage breakdown",
			"analysis.model": "Model",
			"analysis.daily": "Daily usage breakdown",
			"analysis.date": "Date",
			"analysis.partial": "Partial coverage",
			"analysis.coverage": "The data window covers only part of this period. Missing dates do not mean zero usage.",
			"analysis.unavailable": "No available detail",
			"analysis.empty": "No model detail available for this period",
			"analysis.members": "Members with records",
			"analysis.scope": "Compare within one provider. One key identifies one member; shared keys cannot distinguish people.",
			"analysis.money": "Spend and unit cost below belong to the current billing period. Historical and per-model spend are not provided upstream.",
			"analysis.local": "Local calls (this DSH instance only)",
			"analysis.account": "Allowance and key management",
			"analysis.readFailed": "No successful history read is available for this key: {reason}. Use Refresh at the top of the page to retry.",
			"analysis.retained": "{count} keys could not refresh. Charts retain their last successful data, oldest update {time} (Shanghai time); retry shortly.",
			"analysis.freshness": "Statistics through {date}; history not supplied upstream is excluded.",
			"tab.label": "Page views",
			"tab.current": "Current key",
			"tab.account": "Allowance & keys",
			"tab.local": "Local calls",
			"nav.label": "Usage",
			"panel.title": "Usage and balance",
			"panel.subtitle": "Provider accounts and token usage analytics",
			"action.refresh": "Refresh",
			"action.refreshing": "Refreshing…",
			"action.reset": "Reset session stats",
			"action.retry": "Retry",
			"keys.heading": "Provider keys ({count})",
			"keys.viewHint": "Select a key to view quota. “Use this key” switches actual requests and pins manual mode.",
			"keys.name": "Key name (optional)",
			"keys.secret": "API key",
			"keys.add": "Add key",
			"keys.rename": "Save name",
			"keys.remove": "Detach key",
			"keys.active": "Active key",
			"keys.activate": "Use this key",
			"keys.storageHint": "Secrets are stored in the server credential store. Detaching keeps the credential. Names fall back to your label or reference when the endpoint provides no identity.",
			"keys.failed": "Operation failed",
			"keys.saving": "Saving…",
			"keys.unread": "Not read yet",
			"routing.heading": "Key routing",
			"routing.manual": "Manual pin",
			"routing.quota": "Most quota remaining",
			"routing.jev": "Jev decision",
			"routing.jevKey": "OpenRouter API key for Jev",
			"routing.keepKey": "Saved; leave blank to keep",
			"routing.save": "Save routing",
			"routing.hint": "Routes among this provider’s keys, preserving the selected model. Excludes depleted, unreadable and recently failed keys. Jev receives anonymous quota metadata and falls back to quota rules on failure. Saving automatic routing connects the provider credential.",
			"routing.fallback": "Jev returned no confident decision; quota rules were used.",
			"account.heading": "Provider accounts",
			"account.provider": "Provider",
			"account.remaining": "Remaining",
			"account.used": "Used",
			"account.limit": "Limit",
			"account.unlimited": "Unlimited",
			"account.plan": "Plan",
			"account.source": "Source: {adapter}",
			"account.updated": "Updated {time}",
			"account.empty": "No provider is configured yet",
			"account.mode.balance": "Balance account",
			"account.mode.subscription": "Subscription plan",
			"account.mode.unsupported": "No account endpoint",
			"status.ok": "OK",
			"status.notConfigured": "Not configured",
			"status.unauthorized": "Credential rejected",
			"status.rateLimited": "Rate limited",
			"status.unsupported": "This provider publishes no account endpoint",
			"status.invalidResponse": "Response could not be read",
			"status.blocked": "Blocked by the local safety rules",
			"status.unavailable": "Temporarily unavailable",
			"status.missingCredentials": "Missing credentials: {names}",
			"window.session": "Current window",
			"window.fiveHour": "5 hours",
			"window.daily": "Daily",
			"window.weekly": "This week",
			"window.monthly": "This month",
			"window.billing": "Billing period",
			"window.quota": "Quota allowance",
			"window.used": "{percent}% used",
			"window.remaining": "{amount} left",
			"pools.heading": "Budget pools",
			"pool.remaining": "{name}: {amount} left",
			"pool.remainingOfLimit": "{name}: {amount} of {limit} left",
			"gateway.figures": "Reported usage",
			"gateway.heading": "Account usage (reported by the gateway)",
			"gateway.hint": "What this account endpoint reports for its own credential, split per key and independent of the local totals above",
			"gateway.days": "By day",
			"gateway.models": "By model",
			"gateway.pools": "By budget pool",
			"gateway.requests": "{count} calls",
			"gateway.more": "Showing the first {count} rows",
			"reset.expired": "Window elapsed",
			"reset.hours": "Resets at {at} · {hours}h {minutes}m left",
			"reset.minutes": "Resets at {at} · {minutes}m left",
			"manual.heading": "Manual balance",
			"manual.hint": "Enter an allowance to track a provider with no public account endpoint",
			"manual.placeholder": "Not set",
			"manual.remaining": "Manual remainder {amount}",
			"usage.heading": "Token usage",
			"usage.today": "Today",
			"usage.month": "This month",
			"usage.allTime": "All time",
			"usage.cacheHit": "Cache hit rate",
			"usage.cacheHitToday": "Today's cache hit rate {percent}",
			"usage.input": "Input",
			"usage.output": "Output",
			"usage.cacheRead": "Cache read",
			"usage.cacheWrite": "Cache write",
			"usage.calls": "{calls} calls",
			"usage.sessions": "{count} sessions folded",
			"usage.folding": "Folding session history…",
			"usage.foldedAt": "Folded {time}",
			"usage.empty": "No usage recorded yet",
			"usage.scope": "{provider} only",
			"cost.unpriced": "{calls} more calls have no configured price",
			"cost.unconfigured": "Configure pricing.rules to see estimated cost",
			"model.heading": "Usage by model",
			"model.range": "Model usage range",
			"model.calls": "Requests",
			"model.empty": "No per-model usage yet",
			"model.estimate": "Costs are estimates from configured prices, not provider invoices. Rates show the current configuration per million tokens; historical costs use prices matched to the request date.",
			"model.rates": "Current configured rates / 1M tokens",
			"model.unpriced": "Unpriced",
			"model.noRates": "No configured rates",
			"model.rate.input": "Input {amount}",
			"model.rate.output": "Output {amount}",
			"model.rate.cacheRead": "Cache read {amount}",
			"model.rate.cacheWrite": "Cache write {amount}",
			"model.rate.from": "Effective {date}",
			"provider.heading": "Usage by provider",
			"provider.empty": "No per-provider usage yet",
			"provider.hint": "Compare provider usage; switch providers at the top of the page",
			"provider.archived": "Historical provider",
			"provider.showAll": "All {count}",
			"provider.showSelected": "Selected only",
			"provider.idle": "{count} more routes have no usage in this range",
			"provider.share.today": "{percent} of today",
			"provider.share.month": "{percent} of this month",
			"provider.share.allTime": "{percent} of all tokens",
			"provider.meta": "{calls} calls · {models} models",
			"provider.cache": "Cache hit {percent}",
			"provider.lastDay": "Last {date}",
			"pill.label": "{provider} allowance",
			"pill.details": "{provider} allowance and usage",
			"pill.window": "{label} {percent}",
			"pill.unlimited": "Unlimited",
			"budget.heading": "Budgets",
			"budget.daily": "Daily budget",
			"budget.monthly": "Monthly budget",
			"budget.spentOfLimit": "{spent} / {limit}",
			"budget.status.normal": "On track",
			"budget.status.warning": "Near the ceiling",
			"budget.status.critical": "Over the ceiling",
			"budget.status.unknown": "Cost incomplete",
			"heatmap.heading": "Daily usage this month",
			"heatmap.less": "Less",
			"heatmap.more": "More",
			"heatmap.day": "{date}: {tokens} tokens · {calls} calls",
			"heatmap.dayEmpty": "{date}: no usage",
			"heatmap.prev": "Previous month",
			"heatmap.next": "Next month",
			"detail.heading": "{date} breakdown",
			"detail.provider": "Provider",
			"detail.model": "Model",
			"detail.tokens": "Tokens",
			"detail.calls": "Calls",
			"detail.cost": "Est. cost",
			"detail.empty": "No usage on this day",
			"detail.hint": "Select a day in the calendar above to see its breakdown",
			"session.heading": "Session usage",
			"session.id": "Session",
			"session.routes": "Routes",
			"session.tokens": "Tokens",
			"session.calls": "Calls",
			"session.cost": "Est. cost",
			"session.lastActive": "Last active",
			"session.empty": "No session usage yet",
			"session.more": "Showing the {count} most recently active sessions",
			"export.heading": "Export",
			"export.daily": "Daily CSV",
			"export.sessions": "Sessions CSV",
			"export.json": "Full report JSON",
			"export.hint": "Exports carry usage and estimated cost only — no account balance and no credential",
			"export.failed": "Export failed",
			"weekday.mon": "Mon",
			"weekday.tue": "Tue",
			"weekday.wed": "Wed",
			"weekday.thu": "Thu",
			"weekday.fri": "Fri",
			"weekday.sat": "Sat",
			"weekday.sun": "Sun",
			"keynav.label": "Key usage",
			"keypage.title": "Per-key usage",
			"keypage.subtitle": "Each key’s own allowance and token spend",
			"keypage.scope": "Provider",
			"keypage.tile.used": "Spend this period",
			"keypage.tile.calls": "Calls",
			"keypage.tile.tokens": "Tokens",
			"keypage.tile.keys": "Keys",
			"keypage.tile.keysNote": "{ok} healthy · {bad} failing",
			"keypage.tile.windowNote": "last {days} days",
			"keypage.tile.periodTokens": "{tokens} tokens this period",
			"keypage.keys.heading": "Keys",
			"keypage.keys.hint": "Open a card for that key’s own breakdown",
			"keypage.keys.empty": "No monitored key on this provider yet",
			"keypage.key.percent": "{percent} used",
			"keypage.key.windowTokens": "{tokens} in the last {days} days",
			"keypage.key.rate": "{amount} per million tokens this period",
			"keypage.key.rateShort": "{amount} per million",
			"keypage.key.cacheShare": "cache read {percent}",
			"keypage.key.noUsage": "This key returned no token usage",
			"keypage.detail.close": "Close",
			"keypage.detail.allowance": "Allowance and budget pools",
			"keypage.detail.tokens": "Token split",
			"keypage.detail.period": "Billing period",
			"keypage.detail.periodRange": "{start} to {end}",
			"keypage.detail.models": "By model (last {days} days)",
			"keypage.detail.modelsEmpty": "No per-model record",
			"keypage.detail.daily": "Daily tokens (last {days} days)",
			"keypage.detail.dailyEmpty": "No daily record",
			"keypage.detail.dailyHint": "Click a bar for that day’s models",
			"keypage.detail.reasoning": "including {value} reasoning (already inside output)",
			"keypage.detail.calls": "Calls",
			"keypage.detail.outcomes": "{success} succeeded · {failed} failed",
			"keypage.detail.updated": "Endpoint updated {time}",
			"keypage.detail.usageUnavailable": "This key returned no usage detail",
			"keypage.detail.poolFigures": "{amount} / {limit}",
			"keypage.total": "Total",
			"keypage.identity.default": "Route default credential",
			"keypage.day.heading": "{date} by model",
			"keypage.day.empty": "Nothing recorded that day",
			"keypage.day.model": "Model",
			"keypage.day.tokens": "Tokens",
			"keypage.day.calls": "Calls"
		};
		//#endregion
		//#region src/client/index.ts
		/**
		* Sidebar entry id, and the `main` key it addresses.
		*/
		const PANEL_ID = "quota-monitor";
		/**
		* Required services: the typed Remote mount, the slot registry, and the
		* locale service owning the panel's dictionaries.
		*
		* `remote.quotaMonitor` is deliberately absent: this plugin mounts that
		* namespace itself, and listing a service the same `apply` registers would
		* deadlock on its own dependency.
		*/
		const inject = [
			"remote",
			"slots",
			"locale"
		];
		/**
		* Client plugin body: register the panel's copy, mount the Host face, then
		* register the rail entry and the panel it addresses.
		*
		* The mount is awaited and the registrations run in a child scope declaring
		* `remote.quotaMonitor`: the namespace service exists only once `$mount`
		* resolves, and the panel reads it through that scope's injected record.
		* @param ctx - client root context.
		*/
		async function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "quota-monitor.copy");
			const t = ctx.locale.bind(NS);
			await ctx.remote.$mount(TYPERT_REMOTE);
			ctx.inject(["slots", "remote.quotaMonitor"], (scope) => {
				scope.slots.inject("sidebar.panellist", () => scope.slots.register({
					name: "sidebar.panellist",
					id: PANEL_ID,
					order: 40,
					label: () => t("nav.label")
				}, UsageIcon));
				scope.slots.inject("main", () => scope.slots.register({
					name: "main",
					key: PANEL_ID,
					locale: NS,
					inject: () => ({
						quota: scope.remote.quotaMonitor,
						subscribeProviders: (listener) => scope.remote.$on("llm/adapters-updated", listener)
					})
				}, UsagePanel));
				scope.slots.inject("conversation.input.right", () => {
					const rivals = {
						version: () => scope.slots.getVersion("conversation.input.right"),
						subscribe: (listener) => scope.slots.subscribe("conversation.input.right", listener),
						ids: () => scope.slots.entriesOfSlot("conversation.input.right").map((candidate) => candidate.options.id)
					};
					return scope.slots.register({
						name: "conversation.input.right",
						id: PILL_ID,
						order: 90,
						locale: NS,
						inject: () => ({
							quota: scope.remote.quotaMonitor,
							rivals
						})
					}, QuotaPill);
				});
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map