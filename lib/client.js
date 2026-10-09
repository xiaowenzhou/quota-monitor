window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-extension-quota-monitor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
				throw new Error("cached value already set");
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) Object.assign(mergedDescriptors, Object.getOwnPropertyDescriptors(def));
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const _undefined$2 = /^undefined$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
				else bag.exclusiveMaximum = def.value;
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
				else bag.exclusiveMinimum = def.value;
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUndefined = /*@__PURE__*/ $constructor("$ZodUndefined", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _undefined$2;
			inst._zod.values = new Set([void 0]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (typeof input === "undefined") return payload;
				payload.issues.push({
					expected: "undefined",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!isPlainObject(input)) {
					payload.issues.push({
						expected: "record",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				const proms = [];
				const values = def.keyType._zod.values;
				if (values) {
					payload.value = {};
					const recordKeys = /* @__PURE__ */ new Set();
					for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
						recordKeys.add(typeof key === "number" ? key.toString() : key);
						const keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (keyResult.issues.length) {
							payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const outKey = keyResult.value;
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}
					}
					let unrecognized;
					for (const key in input) if (!recordKeys.has(key)) {
						unrecognized = unrecognized ?? [];
						unrecognized.push(key);
					}
					if (unrecognized && unrecognized.length > 0) payload.issues.push({
						code: "unrecognized_keys",
						input,
						inst,
						keys: unrecognized
					});
				} else {
					payload.value = {};
					for (const key of Reflect.ownKeys(input)) {
						if (key === "__proto__") continue;
						if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
						let keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (typeof key === "string" && number$1.test(key) && keyResult.issues.length) {
							const retryResult = def.keyType._zod.run({
								value: Number(key),
								issues: []
							}, ctx);
							if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
							if (retryResult.issues.length === 0) keyResult = retryResult;
						}
						if (keyResult.issues.length) {
							if (def.mode === "loose") payload.value[key] = input[key];
							else payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[keyResult.value] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[keyResult.value] = result.value;
						}
					}
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _undefined$1(Class, params) {
			return new Class({
				type: "undefined",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) if (ctx.target === "draft-2020-12") result.$defs = defs;
			else result.definitions = defs;
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) if (legacy) {
				json.minimum = exclusiveMinimum;
				json.exclusiveMinimum = true;
			} else json.exclusiveMinimum = exclusiveMinimum;
			else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) if (legacy) {
				json.maximum = exclusiveMaximum;
				json.exclusiveMaximum = true;
			} else json.exclusiveMaximum = exclusiveMaximum;
			else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const undefinedProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Undefined cannot be represented in JSON Schema");
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
			else vals.push(Number(val));
			else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const recordProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			const keyType = def.keyType;
			const patterns = keyType._zod.bag?.patterns;
			if (def.mode === "loose" && patterns && patterns.size > 0) {
				const valueSchema = process(def.valueType, ctx, {
					...params,
					path: [
						...params.path,
						"patternProperties",
						"*"
					]
				});
				json.patternProperties = {};
				for (const pattern of patterns) json.patternProperties[pattern.source] = valueSchema;
			} else {
				if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") json.propertyNames = process(def.keyType, ctx, {
					...params,
					path: [...params.path, "propertyNames"]
				});
				json.additionalProperties = process(def.valueType, ctx, {
					...params,
					path: [...params.path, "additionalProperties"]
				});
			}
			const keyValues = keyType._zod.values;
			if (keyValues) {
				const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
				if (validKeyValues.length > 0) json.required = validKeyValues;
			}
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUndefined = /*@__PURE__*/ $constructor("ZodUndefined", (inst, def) => {
			$ZodUndefined.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
		});
		function _undefined(params) {
			return /* @__PURE__ */ _undefined$1(ZodUndefined, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			return new ZodObject({
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			});
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
			$ZodRecord.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
			inst.keyType = def.keyType;
			inst.valueType = def.valueType;
		});
		function record(keyType, valueType, params) {
			if (!valueType || !valueType._zod) return new ZodRecord({
				type: "record",
				keyType: string(),
				valueType: keyType,
				...normalizeParams(valueType)
			});
			return new ZodRecord({
				type: "record",
				keyType,
				valueType,
				...normalizeParams(params)
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			return new ZodEnum({
				type: "enum",
				entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
		//#region lib/typert.remote-client.js
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema$value ??= object({ "kind": union([
			literal("daily-csv"),
			literal("sessions-csv"),
			literal("report-json")
		]) });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema$value ??= object({
			"kind": union([
				literal("daily-csv"),
				literal("sessions-csv"),
				literal("report-json")
			]),
			"filename": string(),
			"mediaType": string(),
			"content": string()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema$value ??= object({
			"provider": string(),
			"refresh": boolean().optional()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema$value ??= object({
			"id": string().readonly(),
			"name": string(),
			"mode": union([
				literal("balance"),
				literal("subscription"),
				literal("unsupported")
			]),
			"status": union([
				literal("blocked"),
				literal("unsupported"),
				literal("ok"),
				literal("not-configured"),
				literal("unauthorized"),
				literal("rate-limited"),
				literal("invalid-response"),
				literal("unavailable")
			]),
			"adapter": string(),
			"fetchedAt": number(),
			"remaining": number().optional(),
			"used": number().optional(),
			"limit": number().optional(),
			"currency": string().optional(),
			"unlimited": boolean().optional(),
			"plan": string().optional(),
			"planWindows": array(object({
				"kind": union([
					literal("session"),
					literal("five-hour"),
					literal("daily"),
					literal("weekly"),
					literal("monthly"),
					literal("billing"),
					literal("quota")
				]),
				"percentUsed": number(),
				"resetAt": string().optional(),
				"remaining": number().optional()
			})).optional(),
			"budgetPools": array(object({
				"name": string(),
				"remaining": number(),
				"limit": number().optional(),
				"percentUsed": number().optional()
			})).optional(),
			"usage": array(object({
				"kind": union([
					literal("day"),
					literal("model"),
					literal("pool")
				]).readonly(),
				"label": string().readonly(),
				"requests": number().optional(),
				"inputTokens": number().optional(),
				"outputTokens": number().optional(),
				"cacheReadTokens": number().optional(),
				"cacheWriteTokens": number().optional(),
				"totalTokens": number().optional(),
				"cost": number().optional(),
				"currency": string().optional()
			})).optional(),
			"warning": union([
				literal("normal"),
				literal("warning"),
				literal("critical")
			]).optional(),
			"missingCredentials": array(string()).optional(),
			"reason": string().optional(),
			"manual": object({
				"total": number(),
				"spent": number(),
				"remaining": number(),
				"pct": number()
			}).optional()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema$value ??= object({
			"capturedAt": number(),
			"providers": array(object({
				"id": string().readonly(),
				"name": string(),
				"mode": union([
					literal("balance"),
					literal("subscription"),
					literal("unsupported")
				]),
				"adapter": string(),
				"status": union([
					literal("blocked"),
					literal("unsupported"),
					literal("ok"),
					literal("not-configured"),
					literal("unauthorized"),
					literal("rate-limited"),
					literal("invalid-response"),
					literal("unavailable")
				]),
				"warning": union([
					literal("normal"),
					literal("warning"),
					literal("critical")
				]).optional()
			})),
			"rows": array(object({
				"id": string().readonly(),
				"name": string(),
				"calls": number(),
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"reasoningTokens": number(),
				"totalTokens": number(),
				"errorCount": number(),
				"lastCallAt": number(),
				"lastModel": string(),
				"balance": union([literal(null), object({
					"total": number(),
					"spent": number(),
					"remaining": number(),
					"pct": number()
				})])
			})),
			"balances": record(string(), number()),
			"aggregate": object({
				"calls": number(),
				"inputTokens": number(),
				"outputTokens": number(),
				"totalTokens": number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema$value ??= object({
			"refresh": boolean().optional(),
			"provider": string().optional()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema$value ??= object({
			"today": string(),
			"todayTotals": object({
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"totalTokens": number()
			}),
			"monthTotals": object({
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"totalTokens": number()
			}),
			"allTimeTotals": object({
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"totalTokens": number()
			}),
			"todayCost": object({
				"amount": number(),
				"currency": string(),
				"unpricedCalls": number()
			}).optional(),
			"monthCost": object({
				"amount": number(),
				"currency": string(),
				"unpricedCalls": number()
			}).optional(),
			"allTimeCost": object({
				"amount": number(),
				"currency": string(),
				"unpricedCalls": number()
			}).optional(),
			"budgets": object({
				"currency": string(),
				"daily": object({
					"limit": number(),
					"spent": number(),
					"percentUsed": number(),
					"status": union([
						literal("normal"),
						literal("warning"),
						literal("critical"),
						literal("unknown")
					]),
					"unpricedCalls": number()
				}).optional(),
				"monthly": object({
					"limit": number(),
					"spent": number(),
					"percentUsed": number(),
					"status": union([
						literal("normal"),
						literal("warning"),
						literal("critical"),
						literal("unknown")
					]),
					"unpricedCalls": number()
				}).optional()
			}).optional(),
			"todayCacheHitPercent": number().optional(),
			"providers": array(object({
				"provider": string().readonly(),
				"calls": number(),
				"cacheHitPercent": number().optional(),
				"cost": object({
					"amount": number(),
					"currency": string(),
					"unpricedCalls": number()
				}).optional(),
				"todayCalls": number(),
				"todayTokens": number(),
				"todayCacheHitPercent": number().optional(),
				"todayCost": object({
					"amount": number(),
					"currency": string(),
					"unpricedCalls": number()
				}).optional(),
				"monthCalls": number(),
				"monthTokens": number(),
				"monthCacheHitPercent": number().optional(),
				"monthCost": object({
					"amount": number(),
					"currency": string(),
					"unpricedCalls": number()
				}).optional(),
				"models": number(),
				"lastDay": string(),
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"totalTokens": number()
			})),
			"days": array(object({
				"date": string().readonly(),
				"calls": number(),
				"models": array(object({
					"provider": string().readonly(),
					"model": string().readonly(),
					"calls": number(),
					"cost": object({
						"amount": number(),
						"currency": string(),
						"unpricedCalls": number()
					}).optional(),
					"inputTokens": number(),
					"outputTokens": number(),
					"cacheReadTokens": number(),
					"cacheWriteTokens": number(),
					"totalTokens": number()
				})),
				"cost": object({
					"amount": number(),
					"currency": string(),
					"unpricedCalls": number()
				}).optional(),
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"totalTokens": number()
			})),
			"sessions": array(object({
				"id": string().readonly(),
				"calls": number(),
				"routes": array(string()),
				"lastActiveAt": number(),
				"cost": object({
					"amount": number(),
					"currency": string(),
					"unpricedCalls": number()
				}).optional(),
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"totalTokens": number()
			})),
			"sessionCount": number(),
			"foldedAt": number(),
			"folding": boolean()
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema$value ??= object({ "provider": union([_undefined(), string()]).optional() });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema$value ??= object({
			"capturedAt": number(),
			"providers": array(object({
				"id": string().readonly(),
				"name": string(),
				"mode": union([
					literal("balance"),
					literal("subscription"),
					literal("unsupported")
				]),
				"adapter": string(),
				"status": union([
					literal("blocked"),
					literal("unsupported"),
					literal("ok"),
					literal("not-configured"),
					literal("unauthorized"),
					literal("rate-limited"),
					literal("invalid-response"),
					literal("unavailable")
				]),
				"warning": union([
					literal("normal"),
					literal("warning"),
					literal("critical")
				]).optional()
			})),
			"rows": array(object({
				"id": string().readonly(),
				"name": string(),
				"calls": number(),
				"inputTokens": number(),
				"outputTokens": number(),
				"cacheReadTokens": number(),
				"cacheWriteTokens": number(),
				"reasoningTokens": number(),
				"totalTokens": number(),
				"errorCount": number(),
				"lastCallAt": number(),
				"lastModel": string(),
				"balance": union([literal(null), object({
					"total": number(),
					"spent": number(),
					"remaining": number(),
					"pct": number()
				})])
			})),
			"balances": record(string(), number()),
			"aggregate": object({
				"calls": number(),
				"inputTokens": number(),
				"outputTokens": number(),
				"totalTokens": number()
			})
		});
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema$value ??= object({ "balances": record(string(), number()) });
		let _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema$value;
		const _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema = () => _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema$value ??= record(string(), number());
		const TYPERT_REMOTE = {
			package: "@deepseek-ai/dsh-extension-quota-monitor",
			descriptors: [
				{
					id: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/exportUsage",
					service: "quotaMonitor",
					namespace: "quotaMonitor",
					method: "exportUsage",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaExportRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaExportDocument",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_exportUsage_result$schema
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 238,
						"column": 3
					}
				},
				{
					id: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/getAccount",
					service: "quotaMonitor",
					namespace: "quotaMonitor",
					method: "getAccount",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaAccountRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaAccount",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getAccount_result$schema
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 213,
						"column": 9
					}
				},
				{
					id: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/getSnapshot",
					service: "quotaMonitor",
					namespace: "quotaMonitor",
					method: "getSnapshot",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getSnapshot_result$schema
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 203,
						"column": 3
					}
				},
				{
					id: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/getUsage",
					service: "quotaMonitor",
					namespace: "quotaMonitor",
					method: "getUsage",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaUsageRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaUsageReport",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_getUsage_result$schema
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 227,
						"column": 9
					}
				},
				{
					id: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/resetStats",
					service: "quotaMonitor",
					namespace: "quotaMonitor",
					method: "resetStats",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaResetStatsRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSnapshot",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_resetStats_result$schema
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 263,
						"column": 3
					}
				},
				{
					id: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/setBalances",
					service: "quotaMonitor",
					namespace: "quotaMonitor",
					method: "setBalances",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor/types#QuotaSetBalancesRequest",
							create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-extension-quota-monitor#quotaMonitor/setBalances:result",
						create: _deepseek_ai_dsh_extension_quota_monitor_quotaMonitor_setBalances_result$schema
					},
					sourceLocation: {
						"file": "packages/extensions/extension-quota-monitor/src/index.ts",
						"line": 248,
						"column": 3
					}
				}
			]
		};
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
		//#endregion
		//#region \0dsh-css:D:\work\codes\deepseek-harness\packages\extensions\extension-quota-monitor\src\client\UsagePanel.module.css.mjs
		const css$1 = ".wxwaxa_panel{overscroll-behavior:contain;box-sizing:border-box;background:var(--dsw-alias-bg-base);min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;flex:auto;gap:16px;padding:20px;font-size:13px;line-height:1.5;display:flex;overflow-y:auto}.wxwaxa_header{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;display:flex}.wxwaxa_brand{align-items:center;gap:12px;min-width:0;display:flex}.wxwaxa_brandMark{background:linear-gradient(135deg, var(--dsw-alias-state-business-primary), color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, white));width:40px;height:40px;color:var(--dsw-alias-label-primary-foreground);border-radius:12px;flex:none;place-items:center;display:grid}.wxwaxa_brandGlyph{width:22px;height:22px;display:block}.wxwaxa_title{letter-spacing:-.01em;margin:0;font-size:17px;font-weight:600}.wxwaxa_subtitle{color:var(--dsw-alias-label-tertiary);margin:2px 0 0;font-size:12px}.wxwaxa_actions{align-items:center;gap:8px;display:flex}.wxwaxa_action{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:30px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:8px;align-items:center;gap:6px;padding:0 12px;font-size:12px;display:inline-flex}.wxwaxa_action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.wxwaxa_action:disabled{opacity:.55;cursor:default}.wxwaxa_actionPrimary{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);border-color:#0000}.wxwaxa_actionPrimary:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 88%, black);color:var(--dsw-alias-label-primary-foreground)}.wxwaxa_section{flex-direction:column;gap:10px;display:flex}.wxwaxa_sectionHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px;display:flex}.wxwaxa_sectionTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600}.wxwaxa_sectionMeta{color:var(--dsw-alias-label-caption);margin:0;font-size:11px}.wxwaxa_empty{border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);text-align:center;border-radius:12px;margin:0;padding:20px;font-size:12px}.wxwaxa_card{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);border-radius:16px;flex-direction:column;gap:14px;padding:16px;display:flex}.wxwaxa_cardTint{background:linear-gradient(135deg, color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, var(--dsw-alias-bg-layer-1)), var(--dsw-alias-bg-layer-1) 65%)}.wxwaxa_selector{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.wxwaxa_selectorChip{border:.5px solid var(--dsw-alias-border-l2);corner-shape:round;background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:999px;align-items:center;gap:6px;padding:0 10px;font-size:12px;display:inline-flex}.wxwaxa_selectorChip:hover{background:var(--dsw-alias-interactive-bg-hover)}.wxwaxa_selectorChipActive{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-business-primary)}.wxwaxa_dot{corner-shape:round;background:var(--dsw-alias-label-caption);border-radius:50%;width:6px;height:6px}.wxwaxa_dotOk{background:var(--dsw-alias-state-success-primary)}.wxwaxa_dotWarn{background:var(--dsw-alias-state-warn-primary)}.wxwaxa_dotError{background:var(--dsw-alias-state-error-primary)}.wxwaxa_accountHead{align-items:center;gap:12px;display:flex}.wxwaxa_avatar{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, var(--dsw-alias-bg-layer-2));width:42px;height:42px;color:var(--dsw-alias-state-business-primary);text-transform:uppercase;border-radius:14px;flex:none;place-items:center;font-size:15px;font-weight:600;display:grid}.wxwaxa_accountIdentity{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}.wxwaxa_accountName{text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;overflow:hidden}.wxwaxa_accountMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;align-items:center;gap:6px;font-size:11px;display:flex}.wxwaxa_chip{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:1px 7px;font-size:11px}.wxwaxa_pill{corner-shape:round;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;align-items:center;gap:5px;padding:3px 9px;font-size:11px;font-weight:500;display:inline-flex}.wxwaxa_pillOk{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-success-primary)}.wxwaxa_pillWarn{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-warn-primary)}.wxwaxa_pillError{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-error-primary)}.wxwaxa_hero{flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:16px;display:flex}.wxwaxa_heroFigure{flex-direction:column;gap:2px;min-width:0;display:flex}.wxwaxa_heroLabel{color:var(--dsw-alias-label-tertiary);font-size:11px}.wxwaxa_heroValue{letter-spacing:-.02em;font-variant-numeric:tabular-nums;font-size:28px;font-weight:650;line-height:1.15}.wxwaxa_heroSecondaries{flex-wrap:wrap;align-items:flex-end;gap:18px;display:flex}.wxwaxa_secondary{flex-direction:column;gap:2px;display:flex}.wxwaxa_secondaryLabel{color:var(--dsw-alias-label-tertiary);font-size:11px}.wxwaxa_secondaryValue{font-variant-numeric:tabular-nums;font-size:14px;font-weight:500}.wxwaxa_normal{color:var(--dsw-alias-label-primary)}.wxwaxa_warning{color:var(--dsw-alias-state-warn-primary)}.wxwaxa_critical{color:var(--dsw-alias-state-error-primary)}.wxwaxa_windows{flex-direction:column;gap:12px;display:flex}.wxwaxa_windowRow{flex-direction:column;gap:5px;display:flex}.wxwaxa_windowHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.wxwaxa_windowName{color:var(--dsw-alias-label-secondary);font-size:12px}.wxwaxa_windowValue{font-variant-numeric:tabular-nums;font-size:12px;font-weight:500}.wxwaxa_bar{corner-shape:round;background:var(--dsw-alias-bg-layer-3);border-radius:999px;height:6px;overflow:hidden}.wxwaxa_barFill{corner-shape:round;background:var(--dsw-alias-state-business-primary);border-radius:999px;height:100%;transition:width .16s ease-out}.wxwaxa_barFill.wxwaxa_warning{background:var(--dsw-alias-state-warn-primary)}.wxwaxa_barFill.wxwaxa_critical{background:var(--dsw-alias-state-error-primary)}.wxwaxa_windowMeta{color:var(--dsw-alias-label-caption);font-size:11px}.wxwaxa_pools{border-top:.5px solid var(--dsw-alias-border-l1);flex-direction:column;gap:6px;padding-top:12px;display:flex}.wxwaxa_poolsTitle{color:var(--dsw-alias-label-tertiary);font-size:11px}.wxwaxa_poolList{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.wxwaxa_poolRow{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px}.wxwaxa_cardMeta{border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-caption);margin:0;padding-top:10px;font-size:11px}.wxwaxa_gatewayHint{color:var(--dsw-alias-label-caption);margin:0;font-size:11px}.wxwaxa_gatewayGroup{color:var(--dsw-alias-label-tertiary);padding:6px 0 2px;font-size:11px;display:block}.wxwaxa_gatewayRow{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;justify-content:space-between;gap:8px;font-size:12px;display:flex}.wxwaxa_gatewayLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.wxwaxa_gatewayValue{color:var(--dsw-alias-label-tertiary);flex:none}.wxwaxa_gatewayMore{color:var(--dsw-alias-label-caption);font-size:11px}.wxwaxa_status{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;font-weight:500}.wxwaxa_reason{color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:12px}.wxwaxa_manual{border-top:.5px solid var(--dsw-alias-border-l1);flex-direction:column;gap:6px;padding-top:12px;display:flex}.wxwaxa_manualHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.wxwaxa_manualTitle{font-size:12px;font-weight:500}.wxwaxa_manualValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px}.wxwaxa_manualInput{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:30px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:0 10px;font-size:12px}.wxwaxa_manualInput:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}.wxwaxa_manualHint{color:var(--dsw-alias-label-caption);margin:0;font-size:11px}.wxwaxa_totals{flex-direction:column;gap:10px;display:flex}.wxwaxa_totalGrid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;display:grid}.wxwaxa_totalCard{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:6px;padding:14px;display:flex}.wxwaxa_totalLabel{color:var(--dsw-alias-label-tertiary);font-size:11px}.wxwaxa_totalValue{letter-spacing:-.02em;font-variant-numeric:tabular-nums;font-size:22px;font-weight:650;line-height:1.15}.wxwaxa_totalCost{color:var(--dsw-alias-state-business-primary);font-variant-numeric:tabular-nums;font-size:12px;font-weight:500}.wxwaxa_totalNote{color:var(--dsw-alias-label-caption);font-size:11px}.wxwaxa_totalSplit{border-top:.5px solid var(--dsw-alias-border-l1);flex-direction:column;gap:3px;margin:4px 0 0;padding-top:8px;display:flex}.wxwaxa_splitRow{color:var(--dsw-alias-label-tertiary);justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;display:flex}.wxwaxa_splitRow dt,.wxwaxa_splitRow dd{margin:0}.wxwaxa_splitRow dd{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.wxwaxa_totalsMeta{color:var(--dsw-alias-label-caption);margin:0;font-size:11px}.wxwaxa_budgetGrid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;display:grid}.wxwaxa_budgetCard{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:14px;flex-direction:column;gap:7px;padding:12px 14px;display:flex}.wxwaxa_budgetHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.wxwaxa_budgetName{color:var(--dsw-alias-label-secondary);font-size:12px}.wxwaxa_budgetValue{font-variant-numeric:tabular-nums;font-size:12px;font-weight:500}.wxwaxa_providerList{flex-direction:column;gap:10px;display:flex}.wxwaxa_providerTools{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;display:flex}.wxwaxa_providerToggle{border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:4px 10px;font-size:11px}.wxwaxa_providerToggle:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}.wxwaxa_providerRow{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:14px;flex-direction:column;gap:6px;padding:12px 14px;display:flex}.wxwaxa_providerRow:hover{border-color:var(--dsw-alias-border-l1)}.wxwaxa_providerRowActive{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-business-primary)}.wxwaxa_providerHead{align-items:baseline;gap:8px;display:flex}.wxwaxa_providerName{white-space:nowrap;text-overflow:ellipsis;font-size:13px;font-weight:500;overflow:hidden}.wxwaxa_providerId{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-family:ui-monospace,sfmono-regular,menlo,consolas,monospace;font-size:11px;overflow:hidden}.wxwaxa_providerTokens{font-variant-numeric:tabular-nums;margin-left:auto;font-weight:600}.wxwaxa_providerFoot{color:var(--dsw-alias-label-secondary);justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;display:flex}.wxwaxa_providerShare{font-variant-numeric:tabular-nums}.wxwaxa_providerCost{font-variant-numeric:tabular-nums;font-weight:500}.wxwaxa_providerMeta{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:11px}.wxwaxa_calendar{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:16px;flex-direction:column;gap:10px;padding:14px;display:flex}.wxwaxa_calendarHead{justify-content:center;align-items:center;gap:10px;display:flex}.wxwaxa_calendarMonth{text-align:center;font-variant-numeric:tabular-nums;min-width:96px;font-size:13px;font-weight:600}.wxwaxa_navButton{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:26px;height:26px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:8px;place-items:center;font-size:14px;line-height:1;display:grid}.wxwaxa_navButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.wxwaxa_weekdayRow,.wxwaxa_monthGrid{grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;display:grid}.wxwaxa_weekday{color:var(--dsw-alias-label-caption);text-align:center;font-size:11px}.wxwaxa_dayCell{background:var(--dsw-alias-bg-layer-3);min-height:46px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border:1px solid #0000;border-radius:10px;flex-direction:column;justify-content:space-between;align-items:flex-start;gap:2px;padding:5px 6px;display:flex}.wxwaxa_dayCell:hover{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent)}.wxwaxa_dayBlank{min-height:46px}.wxwaxa_dayNumber{font-variant-numeric:tabular-nums;font-size:11px}.wxwaxa_dayTokens{opacity:.85;font-variant-numeric:tabular-nums;font-size:10px}.wxwaxa_dayCellToday{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent)}.wxwaxa_dayCellActive{border-color:var(--dsw-alias-state-business-primary)}.wxwaxa_dayCell[data-level=\"0\"]{background:var(--dsw-alias-bg-layer-3)}.wxwaxa_dayCell[data-level=\"1\"]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, var(--dsw-alias-bg-layer-1))}.wxwaxa_dayCell[data-level=\"2\"]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-bg-layer-1))}.wxwaxa_dayCell[data-level=\"3\"]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary-foreground)}.wxwaxa_dayCell[data-level=\"4\"]{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground)}.wxwaxa_legend{color:var(--dsw-alias-label-caption);justify-content:flex-end;align-items:center;gap:4px;font-size:11px;display:flex}.wxwaxa_legendCell{background:var(--dsw-alias-bg-layer-3);border-radius:4px;width:12px;height:12px}.wxwaxa_legendCell[data-level=\"1\"]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, var(--dsw-alias-bg-layer-1))}.wxwaxa_legendCell[data-level=\"2\"]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-bg-layer-1))}.wxwaxa_legendCell[data-level=\"3\"]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-bg-layer-1))}.wxwaxa_legendCell[data-level=\"4\"]{background:var(--dsw-alias-state-business-primary)}.wxwaxa_tableCard{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:16px;padding:6px 14px 10px;overflow-x:auto}.wxwaxa_table{border-collapse:collapse;width:100%;font-size:12px}.wxwaxa_table th,.wxwaxa_table td{border-bottom:.5px solid var(--dsw-alias-border-l1);text-align:left;white-space:nowrap;padding:8px}.wxwaxa_table th{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:500}.wxwaxa_table tbody tr:last-child td{border-bottom:none}.wxwaxa_numeric{text-align:right;font-variant-numeric:tabular-nums}.wxwaxa_mono{font-family:ui-monospace,sfmono-regular,menlo,consolas,monospace;font-size:11px}.wxwaxa_routes{text-overflow:ellipsis;max-width:260px;color:var(--dsw-alias-label-secondary);overflow:hidden}.wxwaxa_exportRow{flex-wrap:wrap;align-items:center;gap:8px;display:flex}";
		const tagId$1 = "@deepseek-ai/dsh-extension-quota-monitor/UsagePanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var UsagePanel_module_css_default = {
			"accountHead": "wxwaxa_accountHead",
			"accountIdentity": "wxwaxa_accountIdentity",
			"accountMeta": "wxwaxa_accountMeta",
			"accountName": "wxwaxa_accountName",
			"action": "wxwaxa_action",
			"actionPrimary": "wxwaxa_actionPrimary",
			"actions": "wxwaxa_actions",
			"avatar": "wxwaxa_avatar",
			"bar": "wxwaxa_bar",
			"barFill": "wxwaxa_barFill",
			"brand": "wxwaxa_brand",
			"brandGlyph": "wxwaxa_brandGlyph",
			"brandMark": "wxwaxa_brandMark",
			"budgetCard": "wxwaxa_budgetCard",
			"budgetGrid": "wxwaxa_budgetGrid",
			"budgetHead": "wxwaxa_budgetHead",
			"budgetName": "wxwaxa_budgetName",
			"budgetValue": "wxwaxa_budgetValue",
			"calendar": "wxwaxa_calendar",
			"calendarHead": "wxwaxa_calendarHead",
			"calendarMonth": "wxwaxa_calendarMonth",
			"card": "wxwaxa_card",
			"cardMeta": "wxwaxa_cardMeta",
			"cardTint": "wxwaxa_cardTint",
			"chip": "wxwaxa_chip",
			"critical": "wxwaxa_critical",
			"dayBlank": "wxwaxa_dayBlank",
			"dayCell": "wxwaxa_dayCell",
			"dayCellActive": "wxwaxa_dayCellActive",
			"dayCellToday": "wxwaxa_dayCellToday",
			"dayNumber": "wxwaxa_dayNumber",
			"dayTokens": "wxwaxa_dayTokens",
			"dot": "wxwaxa_dot",
			"dotError": "wxwaxa_dotError",
			"dotOk": "wxwaxa_dotOk",
			"dotWarn": "wxwaxa_dotWarn",
			"empty": "wxwaxa_empty",
			"exportRow": "wxwaxa_exportRow",
			"gatewayGroup": "wxwaxa_gatewayGroup",
			"gatewayHint": "wxwaxa_gatewayHint",
			"gatewayLabel": "wxwaxa_gatewayLabel",
			"gatewayMore": "wxwaxa_gatewayMore",
			"gatewayRow": "wxwaxa_gatewayRow",
			"gatewayValue": "wxwaxa_gatewayValue",
			"header": "wxwaxa_header",
			"hero": "wxwaxa_hero",
			"heroFigure": "wxwaxa_heroFigure",
			"heroLabel": "wxwaxa_heroLabel",
			"heroSecondaries": "wxwaxa_heroSecondaries",
			"heroValue": "wxwaxa_heroValue",
			"legend": "wxwaxa_legend",
			"legendCell": "wxwaxa_legendCell",
			"manual": "wxwaxa_manual",
			"manualHead": "wxwaxa_manualHead",
			"manualHint": "wxwaxa_manualHint",
			"manualInput": "wxwaxa_manualInput",
			"manualTitle": "wxwaxa_manualTitle",
			"manualValue": "wxwaxa_manualValue",
			"mono": "wxwaxa_mono",
			"monthGrid": "wxwaxa_monthGrid",
			"navButton": "wxwaxa_navButton",
			"normal": "wxwaxa_normal",
			"numeric": "wxwaxa_numeric",
			"panel": "wxwaxa_panel",
			"pill": "wxwaxa_pill",
			"pillError": "wxwaxa_pillError",
			"pillOk": "wxwaxa_pillOk",
			"pillWarn": "wxwaxa_pillWarn",
			"poolList": "wxwaxa_poolList",
			"poolRow": "wxwaxa_poolRow",
			"pools": "wxwaxa_pools",
			"poolsTitle": "wxwaxa_poolsTitle",
			"providerCost": "wxwaxa_providerCost",
			"providerFoot": "wxwaxa_providerFoot",
			"providerHead": "wxwaxa_providerHead",
			"providerId": "wxwaxa_providerId",
			"providerList": "wxwaxa_providerList",
			"providerMeta": "wxwaxa_providerMeta",
			"providerName": "wxwaxa_providerName",
			"providerRow": "wxwaxa_providerRow",
			"providerRowActive": "wxwaxa_providerRowActive",
			"providerShare": "wxwaxa_providerShare",
			"providerToggle": "wxwaxa_providerToggle",
			"providerTokens": "wxwaxa_providerTokens",
			"providerTools": "wxwaxa_providerTools",
			"reason": "wxwaxa_reason",
			"routes": "wxwaxa_routes",
			"secondary": "wxwaxa_secondary",
			"secondaryLabel": "wxwaxa_secondaryLabel",
			"secondaryValue": "wxwaxa_secondaryValue",
			"section": "wxwaxa_section",
			"sectionHead": "wxwaxa_sectionHead",
			"sectionMeta": "wxwaxa_sectionMeta",
			"sectionTitle": "wxwaxa_sectionTitle",
			"selector": "wxwaxa_selector",
			"selectorChip": "wxwaxa_selectorChip",
			"selectorChipActive": "wxwaxa_selectorChipActive",
			"splitRow": "wxwaxa_splitRow",
			"status": "wxwaxa_status",
			"subtitle": "wxwaxa_subtitle",
			"table": "wxwaxa_table",
			"tableCard": "wxwaxa_tableCard",
			"title": "wxwaxa_title",
			"totalCard": "wxwaxa_totalCard",
			"totalCost": "wxwaxa_totalCost",
			"totalGrid": "wxwaxa_totalGrid",
			"totalLabel": "wxwaxa_totalLabel",
			"totalNote": "wxwaxa_totalNote",
			"totalSplit": "wxwaxa_totalSplit",
			"totalValue": "wxwaxa_totalValue",
			"totals": "wxwaxa_totals",
			"totalsMeta": "wxwaxa_totalsMeta",
			"warning": "wxwaxa_warning",
			"weekday": "wxwaxa_weekday",
			"weekdayRow": "wxwaxa_weekdayRow",
			"windowHead": "wxwaxa_windowHead",
			"windowMeta": "wxwaxa_windowMeta",
			"windowName": "wxwaxa_windowName",
			"windowRow": "wxwaxa_windowRow",
			"windowValue": "wxwaxa_windowValue",
			"windows": "wxwaxa_windows"
		};
		//#endregion
		//#region src/client/AccountCard.tsx
		/**
		* The account card: one provider's balance or plan windows, with the provider
		* selector, the endpoint status, and the manual allowance fallback.
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
			if (warning === "critical") return UsagePanel_module_css_default.critical ?? "";
			if (warning === "warning") return UsagePanel_module_css_default.warning ?? "";
			return UsagePanel_module_css_default.normal ?? "";
		}
		/** Status-pill class: a read that succeeded is tinted by its own severity. */
		function pillOf(account) {
			if (account.status !== "ok") return account.status === "not-configured" || account.status === "unsupported" ? "" : UsagePanel_module_css_default.pillError ?? "";
			if (account.warning === "critical") return UsagePanel_module_css_default.pillError ?? "";
			return account.warning === "warning" ? UsagePanel_module_css_default.pillWarn ?? "" : UsagePanel_module_css_default.pillOk ?? "";
		}
		/** Selector-dot class for one route's last known status. */
		function dotOf(status, warning) {
			if (status !== "ok") return status === "not-configured" || status === "unsupported" ? "" : UsagePanel_module_css_default.dotError ?? "";
			if (warning === "critical") return UsagePanel_module_css_default.dotError ?? "";
			return warning === "warning" ? UsagePanel_module_css_default.dotWarn ?? "" : UsagePanel_module_css_default.dotOk ?? "";
		}
		/** The provider selector: one chip per watched route, with its status dot. */
		function Selector({ providers, selected, onSelect }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: UsagePanel_module_css_default.selector,
				children: providers.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": entry.id === selected,
					className: `${UsagePanel_module_css_default.selectorChip} ${entry.id === selected ? UsagePanel_module_css_default.selectorChipActive : ""}`,
					onClick: () => {
						onSelect(entry.id);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${UsagePanel_module_css_default.dot} ${dotOf(entry.status, entry.warning)}`,
						"aria-hidden": "true"
					}), entry.name]
				}, entry.id))
			});
		}
		/** One plan window: a labelled bar with its used share and reset countdown. */
		function WindowRow({ t, window: entry, tone }) {
			const reset = resetLabel(t, entry.resetAt);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.windowRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.windowHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.windowName,
							children: t(WINDOW_KEYS[entry.kind])
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.windowValue,
							children: t("window.used", { percent: String(entry.percentUsed) })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UsagePanel_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${UsagePanel_module_css_default.barFill} ${tone}`,
							style: { width: `${entry.percentUsed}%` }
						})
					}),
					reset === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.windowMeta,
						children: reset
					})
				]
			});
		}
		/** One budget pool row. */
		function PoolRow({ t, pool }) {
			const amount = fmtAmount(pool.remaining);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
				className: UsagePanel_module_css_default.poolRow,
				children: pool.limit === void 0 ? t("pool.remaining", {
					name: pool.name,
					amount
				}) : t("pool.remainingOfLimit", {
					name: pool.name,
					amount,
					limit: fmtAmount(pool.limit)
				})
			});
		}
		/** Rows of one gateway table the card shows before it says how many it hides. */
		const GATEWAY_ROWS = 6;
		/** Dictionary key naming each gateway usage table, in display order. */
		const GATEWAY_GROUPS = Object.freeze({
			day: "gateway.days",
			model: "gateway.models",
			pool: "gateway.pools"
		});
		/** Display order of the gateway usage tables. */
		const GATEWAY_ORDER = Object.freeze([
			"day",
			"model",
			"pool"
		]);
		/** The endpoint's own token total for a row: its own, or the four buckets summed. */
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
		/** One row of a gateway table: its label and the figures the endpoint reported. */
		function GatewayRow({ t, row }) {
			const parts = [];
			if (row.requests !== void 0) parts.push(t("gateway.requests", { count: fmtNumber(row.requests) }));
			const tokens = gatewayTokens(row);
			if (tokens !== void 0) parts.push(fmtTokens(tokens));
			if (row.cost !== void 0) parts.push(fmtAmount(row.cost, row.currency));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: UsagePanel_module_css_default.gatewayRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsagePanel_module_css_default.gatewayLabel,
					title: row.label,
					children: row.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsagePanel_module_css_default.gatewayValue,
					children: parts.join(" · ")
				})]
			});
		}
		/**
		* Usage the account endpoint reported for its own credential.
		*
		* This is the gateway's ledger, not this plugin's fold: it is what makes two
		* keys behind one provider route tell themselves apart, and it covers calls
		* that predate this process.
		*/
		function GatewayUsage({ t, usage }) {
			const groups = GATEWAY_ORDER.map((kind) => [kind, usage.filter((row) => row.kind === kind)]).filter(([, rows]) => rows.length > 0);
			if (groups.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.pools,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.poolsTitle,
						children: t("gateway.heading")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: UsagePanel_module_css_default.gatewayHint,
						children: t("gateway.hint")
					}),
					groups.map(([kind, rows]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.gatewayGroup,
							children: t(GATEWAY_GROUPS[kind])
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: UsagePanel_module_css_default.poolList,
							children: rows.slice(0, GATEWAY_ROWS).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayRow, {
								t,
								row
							}, `${row.kind}:${row.label}`))
						}),
						rows.length <= GATEWAY_ROWS ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.gatewayMore,
							children: t("gateway.more", { count: String(GATEWAY_ROWS) })
						})
					] }, kind))
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
				className: UsagePanel_module_css_default.manual,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.manualHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.manualTitle,
							children: t("manual.heading")
						}), remaining === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.manualValue,
							children: t("manual.remaining", { amount: fmtAmount(remaining) })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: UsagePanel_module_css_default.manualInput,
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
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: UsagePanel_module_css_default.manualHint,
						children: t("manual.hint")
					})
				]
			});
		}
		/** The identity row: avatar, provider name, mode and adapter chips, status pill. */
		function Identity({ t, name, account }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.accountHead,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.avatar,
						"aria-hidden": "true",
						children: initialsOf(name)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsagePanel_module_css_default.accountIdentity,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.accountName,
							children: name
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: UsagePanel_module_css_default.accountMeta,
							children: [
								account === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsagePanel_module_css_default.chip,
									children: t(MODE_KEYS[account.mode])
								}),
								account === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsagePanel_module_css_default.chip,
									children: account.adapter
								}),
								account?.plan === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsagePanel_module_css_default.chip,
									children: account.plan
								})
							]
						})]
					}),
					account === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${UsagePanel_module_css_default.pill} ${pillOf(account)}`,
						children: t(STATUS_KEYS[account.status])
					})
				]
			});
		}
		/** The figures of a balance account: its remainder, then what it was measured against. */
		function Figures({ t, account, tone }) {
			if (account.remaining === void 0 && account.unlimited !== true) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.hero,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsagePanel_module_css_default.heroFigure,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.heroLabel,
						children: t("account.remaining")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${UsagePanel_module_css_default.heroValue} ${tone}`,
						children: account.unlimited === true ? t("account.unlimited") : fmtAmount(account.remaining, account.currency)
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: UsagePanel_module_css_default.heroSecondaries,
					children: [account.used === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsagePanel_module_css_default.secondary,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.secondaryLabel,
							children: t("account.used")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.secondaryValue,
							children: fmtAmount(account.used, account.currency)
						})]
					}), account.limit === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsagePanel_module_css_default.secondary,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.secondaryLabel,
							children: t("account.limit")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.secondaryValue,
							children: fmtAmount(account.limit, account.currency)
						})]
					})]
				})]
			});
		}
		function AccountCard({ t, providers, selected, account, manualTotal, manualRemaining, onSelect, onRefresh, onManualChange }) {
			const tone = toneOf(account?.warning);
			const windows = account?.planWindows ?? [];
			const pools = account?.budgetPools ?? [];
			const showManual = account !== void 0 && account.status !== "ok";
			const name = providers.find((entry) => entry.id === selected)?.name ?? selected ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${UsagePanel_module_css_default.card} ${UsagePanel_module_css_default.cardTint}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.sectionHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Selector, {
							providers,
							selected,
							onSelect
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: UsagePanel_module_css_default.action,
							onClick: onRefresh,
							children: t("action.refresh")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Identity, {
						t,
						name,
						account
					}),
					account === void 0 ? null : account.status === "ok" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Figures, {
							t,
							account,
							tone
						}),
						windows.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.windows,
							children: windows.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WindowRow, {
								t,
								window: entry,
								tone
							}, entry.kind))
						}),
						pools.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsagePanel_module_css_default.pools,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.poolsTitle,
								children: t("pools.heading")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: UsagePanel_module_css_default.poolList,
								children: pools.map((pool) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PoolRow, {
									t,
									pool
								}, pool.name))
							})]
						}),
						account.usage === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayUsage, {
							t,
							usage: account.usage
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: UsagePanel_module_css_default.cardMeta,
							children: [
								t("account.source", { adapter: account.adapter }),
								" · ",
								t("account.updated", { time: fmtTime(account.fetchedAt) })
							]
						})
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.status,
							children: t(STATUS_KEYS[account.status])
						}),
						account.reason === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.reason,
							children: account.reason
						}),
						account.missingCredentials === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.reason,
							children: t("status.missingCredentials", { names: account.missingCredentials.join(", ") })
						})
					] }),
					showManual && selected !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ManualBalance, {
						t,
						provider: selected,
						total: manualTotal,
						remaining: manualRemaining,
						onChange: onManualChange
					}) : null
				]
			});
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: UsagePanel_module_css_default.exportRow,
				children: KINDS.map(([kind, key]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: UsagePanel_module_css_default.action,
					disabled: busy !== void 0,
					onClick: () => void run(kind),
					children: t(key)
				}, kind))
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: UsagePanel_module_css_default.sectionMeta,
				children: failed ? t("export.failed") : t("export.hint")
			})] });
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
				className: UsagePanel_module_css_default.empty,
				children: t("usage.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.calendar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.calendarHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsagePanel_module_css_default.navButton,
								"aria-label": t("heatmap.prev"),
								onClick: () => {
									onMonthChange(shiftMonth(month, -1));
								},
								children: "‹"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.calendarMonth,
								children: month
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsagePanel_module_css_default.navButton,
								"aria-label": t("heatmap.next"),
								onClick: () => {
									onMonthChange(shiftMonth(month, 1));
								},
								children: "›"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UsagePanel_module_css_default.weekdayRow,
						"aria-hidden": "true",
						children: WEEKDAYS.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.weekday,
							children: t(key)
						}, key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UsagePanel_module_css_default.monthGrid,
						children: cells.map((cell, index) => {
							if (cell.date === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.dayBlank,
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
									UsagePanel_module_css_default.dayCell,
									selected === date ? UsagePanel_module_css_default.dayCellActive : "",
									date === today ? UsagePanel_module_css_default.dayCellToday : ""
								].filter((name) => name !== "").join(" "),
								onClick: () => {
									onSelect(date);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsagePanel_module_css_default.dayNumber,
									children: cell.day
								}), cell.totalTokens > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: UsagePanel_module_css_default.dayTokens,
									children: fmtTokens(cell.totalTokens)
								}) : null]
							}, date);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.legend,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmap.less") }),
							Array.from({ length: LEVELS }, (_, level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-level": level,
								className: UsagePanel_module_css_default.legendCell,
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
			if (date === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: UsagePanel_module_css_default.empty,
				children: t("detail.hint")
			});
			const priced = day?.cost !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsagePanel_module_css_default.sectionHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: UsagePanel_module_css_default.sectionTitle,
						children: t("detail.heading", { date })
					}), day?.cost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: UsagePanel_module_css_default.sectionMeta,
						children: fmtCost(day.cost)
					})]
				}), day === void 0 || day.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: UsagePanel_module_css_default.empty,
					children: t("detail.empty")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsagePanel_module_css_default.tableCard,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: UsagePanel_module_css_default.table,
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
								className: UsagePanel_module_css_default.numeric,
								children: t("detail.tokens")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								className: UsagePanel_module_css_default.numeric,
								children: t("detail.calls")
							}),
							priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								className: UsagePanel_module_css_default.numeric,
								children: t("detail.cost")
							}) : null
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: day.models.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.provider }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.model }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: UsagePanel_module_css_default.numeric,
								children: fmtTokens(row.totalTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: UsagePanel_module_css_default.numeric,
								children: fmtNumber(row.calls)
							}),
							priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: UsagePanel_module_css_default.numeric,
								children: fmtCost(row.cost)
							}) : null
						] }, `${row.provider}/${row.model}`)) })]
					})
				})]
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
		* and the lifetime facts that belong to no single range. Selecting it makes it
		* the route the rest of the panel describes.
		* @param props - the row and the state it renders against.
		* @returns the row element.
		*/
		function ProviderRow({ t, row, names, scope, denominator, selected, onSelect }) {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: `${UsagePanel_module_css_default.providerRow} ${selected ? UsagePanel_module_css_default.providerRowActive : ""}`,
				"aria-pressed": selected,
				onClick: () => onSelect(row.provider),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsagePanel_module_css_default.providerHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.providerName,
								children: name ?? row.provider
							}),
							name === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.providerId,
								children: row.provider
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.providerTokens,
								children: fmtTokens(figures.tokens)
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.barFill,
							style: { width: `${Math.min(100, share)}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsagePanel_module_css_default.providerFoot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.providerShare,
							children: t(SHARE_KEYS[scope], { percent: fmtPercent(share) })
						}), figures.cost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.providerCost,
							children: fmtCost(figures.cost)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.providerMeta,
						children: meta.join(" · ")
					})
				]
			});
		}
		function ProviderUsage({ t, providers, names, selected, onSelect, allTimeTokens, todayTokens, monthTokens }) {
			const [scope, setScope] = (0, react.useState)("month");
			const [expanded, setExpanded] = (0, react.useState)(false);
			const denominator = scope === "today" ? todayTokens : scope === "month" ? monthTokens : allTimeTokens;
			const sorted = (0, react.useMemo)(() => [...providers].sort((left, right) => figuresOf(right, scope).tokens - figuresOf(left, scope).tokens), [providers, scope]);
			if (providers.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: UsagePanel_module_css_default.empty,
				children: t("provider.empty")
			});
			const chosen = sorted.find((row) => row.provider === selected);
			const active = sorted.filter((row) => figuresOf(row, scope).tokens > 0);
			const rows = expanded ? active : [chosen ?? active[0] ?? sorted[0]];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.providerList,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.providerTools,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.selector,
							role: "group",
							"aria-label": t("provider.heading"),
							children: Object.keys(SCOPE_KEYS).map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${UsagePanel_module_css_default.selectorChip} ${key === scope ? UsagePanel_module_css_default.selectorChipActive : ""}`,
								"aria-pressed": key === scope,
								onClick: () => setScope(key),
								children: t(SCOPE_KEYS[key])
							}, key))
						}), providers.length === 1 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: UsagePanel_module_css_default.providerToggle,
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
						selected: row.provider === selected,
						onSelect
					}, row.provider)),
					sorted.length > active.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: UsagePanel_module_css_default.sectionMeta,
						children: t("provider.idle", { count: String(sorted.length - active.length) })
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/SessionList.tsx
		/** How many rows the list shows before it stops, so one busy corpus stays readable. */
		const MAX_ROWS = 20;
		function SessionList({ t, sessions }) {
			if (sessions.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: UsagePanel_module_css_default.empty,
				children: t("session.empty")
			});
			const rows = sessions.slice(0, MAX_ROWS);
			const priced = rows.some((session) => session.cost !== void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: UsagePanel_module_css_default.tableCard,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: UsagePanel_module_css_default.table,
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
							className: UsagePanel_module_css_default.numeric,
							children: t("session.tokens")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							className: UsagePanel_module_css_default.numeric,
							children: t("session.calls")
						}),
						priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							className: UsagePanel_module_css_default.numeric,
							children: t("session.cost")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							scope: "col",
							children: t("session.lastActive")
						})
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: UsagePanel_module_css_default.mono,
							children: session.id
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: UsagePanel_module_css_default.routes,
							children: session.routes.join(", ")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: UsagePanel_module_css_default.numeric,
							children: fmtTokens(session.totalTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: UsagePanel_module_css_default.numeric,
							children: fmtNumber(session.calls)
						}),
						priced ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: UsagePanel_module_css_default.numeric,
							children: fmtCost(session.cost)
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtDateTime(session.lastActiveAt) })
					] }, session.id)) })]
				})
			}), sessions.length > rows.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: UsagePanel_module_css_default.sectionMeta,
				children: t("session.more", { count: String(rows.length) })
			}) : null] });
		}
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
			if (status === "critical") return UsagePanel_module_css_default.critical ?? "";
			return status === "warning" ? UsagePanel_module_css_default.warning ?? "" : "";
		}
		/** One totals tile: its headline figure, its derived spend, and its split. */
		function TotalsCard({ t, label, totals, cost }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.totalCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.totalLabel,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.totalValue,
						children: fmtTokens(totals?.totalTokens)
					}),
					cost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.totalCost,
						children: fmtCost(cost)
					}),
					cost === void 0 || cost.unpricedCalls === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UsagePanel_module_css_default.totalNote,
						children: t("cost.unpriced", { calls: String(cost.unpricedCalls) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
						className: UsagePanel_module_css_default.totalSplit,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsagePanel_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.input") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.inputTokens) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsagePanel_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.output") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.outputTokens) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsagePanel_module_css_default.splitRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("usage.cacheRead") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: fmtTokens(totals?.cacheReadTokens) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: UsagePanel_module_css_default.splitRow,
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
				className: UsagePanel_module_css_default.budgetCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.budgetHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: UsagePanel_module_css_default.budgetName,
							children: label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${UsagePanel_module_css_default.budgetValue} ${budgetTone(entry.status)}`,
							children: t("budget.spentOfLimit", {
								spent: fmtCost(spent),
								limit: fmtCost(limit)
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UsagePanel_module_css_default.bar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${UsagePanel_module_css_default.barFill} ${budgetTone(entry.status)}`,
							style: { width: `${Math.min(100, entry.percentUsed)}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: UsagePanel_module_css_default.windowMeta,
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
				className: UsagePanel_module_css_default.totals,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: UsagePanel_module_css_default.totalGrid,
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
						className: UsagePanel_module_css_default.budgetGrid,
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
						className: UsagePanel_module_css_default.totalsMeta,
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
		/** The header's mark: a compact bar chart, the panel's own subject. */
		function BrandGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: UsagePanel_module_css_default.brandGlyph,
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					fill: "currentColor",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "3",
							y: "13",
							width: "4",
							height: "8",
							rx: "1.4"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "10",
							y: "8",
							width: "4",
							height: "13",
							rx: "1.4"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "17",
							y: "3",
							width: "4",
							height: "18",
							rx: "1.4"
						})
					]
				})
			});
		}
		function UsagePanel({ t, quota }) {
			const [snapshot, setSnapshot] = (0, react.useState)();
			const [account, setAccount] = (0, react.useState)();
			/** The selected route's own figures: the totals, calendar, and sessions below. */
			const [usage, setUsage] = (0, react.useState)();
			/** Every route together, which is what the provider comparison reads. */
			const [allUsage, setAllUsage] = (0, react.useState)();
			const [provider, setProvider] = (0, react.useState)();
			const [month, setMonth] = (0, react.useState)();
			const [selectedDay, setSelectedDay] = (0, react.useState)();
			const [busy, setBusy] = (0, react.useState)(false);
			const loadSnapshot = (0, react.useCallback)(async () => {
				const result = await quota.getSnapshot();
				if (!result.ok) return;
				setSnapshot(result.value);
				setProvider((current) => current ?? result.value.providers[0]?.id);
			}, [quota]);
			const loadUsage = (0, react.useCallback)(async (id, refresh) => {
				const scoped = quota.getUsage({
					refresh,
					...id === void 0 ? {} : { provider: id }
				}).then((result) => {
					if (result.ok) setUsage(result.value);
				});
				const all = quota.getUsage({}).then((result) => {
					if (result.ok) setAllUsage(result.value);
				});
				await Promise.all([scoped, all]);
			}, [quota]);
			const loadAccount = (0, react.useCallback)(async (id, refresh) => {
				const result = await quota.getAccount({
					provider: id,
					refresh
				});
				if (result.ok) setAccount(result.value);
			}, [quota]);
			(0, react.useEffect)(() => {
				loadSnapshot();
			}, [loadSnapshot]);
			(0, react.useEffect)(() => {
				if (provider === void 0) return;
				setAccount(void 0);
				loadAccount(provider, false);
				loadUsage(provider, false);
			}, [
				provider,
				loadAccount,
				loadUsage
			]);
			const refreshAll = (0, react.useCallback)(async () => {
				setBusy(true);
				try {
					await loadSnapshot();
					await Promise.all([loadUsage(provider, true), provider === void 0 ? Promise.resolve() : loadAccount(provider, true)]);
				} finally {
					setBusy(false);
				}
			}, [
				loadSnapshot,
				loadUsage,
				loadAccount,
				provider
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
				await loadAccount(id, false);
			}, [
				quota,
				loadSnapshot,
				loadAccount
			]);
			const exportUsage = (0, react.useCallback)(async (kind) => {
				const result = await quota.exportUsage({ kind });
				return result.ok ? result.value : void 0;
			}, [quota]);
			const activeMonth = month ?? (usage === void 0 ? void 0 : monthOf(usage.today));
			const days = usage?.days ?? [];
			const selected = (0, react.useMemo)(() => days.find((day) => day.date === selectedDay), [days, selectedDay]);
			const providers = snapshot?.providers ?? [];
			const row = snapshot?.rows.find((entry) => entry.id === provider);
			const providerNames = (0, react.useMemo)(() => Object.fromEntries(providers.map((entry) => [entry.id, entry.name])), [providers]);
			/** The selected route's display name, which the statistics section states. */
			const scopeName = provider === void 0 ? void 0 : providerNames[provider] ?? provider;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: UsagePanel_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsagePanel_module_css_default.brand,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.brandMark,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandGlyph, {})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
								className: UsagePanel_module_css_default.title,
								children: t("panel.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: UsagePanel_module_css_default.subtitle,
								children: t("panel.subtitle")
							})] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsagePanel_module_css_default.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${UsagePanel_module_css_default.action} ${UsagePanel_module_css_default.actionPrimary}`,
								onClick: () => void refreshAll(),
								disabled: busy,
								children: busy ? t("action.refreshing") : t("action.refresh")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsagePanel_module_css_default.action,
								onClick: () => void resetStats(),
								children: t("action.reset")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsagePanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.sectionTitle,
								children: t("account.heading")
							})
						}), providers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.empty,
							children: t("account.empty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountCard, {
							t,
							providers,
							selected: provider,
							account,
							manualTotal: row?.balance?.total,
							manualRemaining: row?.balance?.remaining,
							onSelect: setProvider,
							onRefresh: () => {
								if (provider !== void 0) loadAccount(provider, true);
							},
							onManualChange: (id, value) => {
								setManual(id, value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsagePanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsagePanel_module_css_default.sectionHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.sectionTitle,
								children: t("usage.heading")
							}), scopeName === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.sectionMeta,
								children: t("usage.scope", { provider: scopeName })
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TotalsRow, {
							t,
							usage
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsagePanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsagePanel_module_css_default.sectionHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.sectionTitle,
								children: t("provider.heading")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: UsagePanel_module_css_default.sectionMeta,
								children: t("provider.hint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderUsage, {
							t,
							providers: allUsage?.providers ?? [],
							names: providerNames,
							selected: provider,
							onSelect: setProvider,
							allTimeTokens: allUsage?.allTimeTotals.totalTokens ?? 0,
							todayTokens: allUsage?.todayTotals.totalTokens ?? 0,
							monthTokens: allUsage?.monthTotals.totalTokens ?? 0
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsagePanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.sectionTitle,
								children: t("heatmap.heading")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeatmap, {
							t,
							days,
							month: activeMonth,
							today: usage?.today,
							selected: selectedDay,
							onSelect: setSelectedDay,
							onMonthChange: setMonth
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DayBreakdown, {
						t,
						date: selectedDay,
						day: selected
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsagePanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.sectionTitle,
								children: t("session.heading")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionList, {
							t,
							sessions: usage?.sessions ?? []
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: UsagePanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.sectionHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.sectionTitle,
								children: t("export.heading")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExportBar, {
							t,
							onExport: exportUsage
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:D:\work\codes\deepseek-harness\packages\extensions\extension-quota-monitor\src\client\QuotaPill.module.css.mjs
		const css = ".t3tzoW_pill{border:.5px solid var(--dsw-alias-border-l2);max-width:260px;height:24px;color:var(--dsw-alias-label-secondary);font:inherit;white-space:nowrap;cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:0 8px;font-size:11px;line-height:1;display:inline-flex;overflow:hidden}.t3tzoW_pill:hover{border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}.t3tzoW_reading .t3tzoW_dot{animation:1.2s ease-in-out infinite t3tzoW_pulse}@keyframes t3tzoW_pulse{50%{opacity:.35}}.t3tzoW_dot{background:var(--dsw-alias-state-success-primary);border-radius:50%;flex:none;width:6px;height:6px}.t3tzoW_warning .t3tzoW_dot{background:var(--dsw-alias-state-warn-primary)}.t3tzoW_critical .t3tzoW_dot{background:var(--dsw-alias-state-error-primary)}.t3tzoW_name{text-overflow:ellipsis;font-weight:500;overflow:hidden}.t3tzoW_window,.t3tzoW_figure{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}.t3tzoW_window+.t3tzoW_window,.t3tzoW_name+.t3tzoW_window,.t3tzoW_name+.t3tzoW_figure{border-left:.5px solid var(--dsw-alias-border-l2);padding-left:6px}";
		const tagId = "@deepseek-ai/dsh-extension-quota-monitor/QuotaPill.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-extension-quota-monitor";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var QuotaPill_module_css_default = {
			"critical": "t3tzoW_critical",
			"dot": "t3tzoW_dot",
			"figure": "t3tzoW_figure",
			"name": "t3tzoW_name",
			"pill": "t3tzoW_pill",
			"pulse": "t3tzoW_pulse",
			"reading": "t3tzoW_reading",
			"warning": "t3tzoW_warning",
			"window": "t3tzoW_window"
		};
		//#endregion
		//#region src/client/QuotaPill.tsx
		/**
		* The composer pill: the selected route's allowance, rendered beside the model
		* selector on the composer's tool row.
		*
		* It states what the selected model's own provider publishes — a subscription's
		* plan windows, or a wallet's remainder — and nothing when that provider has no
		* readable account, because a control that always showed something would be
		* noise on every session whose provider publishes no account endpoint. The
		* selection is the session's own `modelSelection` projection, so the pill
		* follows the model the next request will use rather than the account card's
		* independent selection.
		* @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
		*/
		/** How many windows the pill states before the tooltip carries the rest. */
		const PILL_WINDOWS = 2;
		/** How often the pill re-reads the Host's cached reading. */
		const POLL_MS = 6e4;
		/**
		* The tooltip: every window with its reset, the plan, and how to refresh.
		* @param t - the panel's namespace-bound translate.
		* @param account - the reading to describe.
		* @returns the tooltip lines.
		*/
		function detailOf(t, account) {
			const lines = [account.plan === void 0 ? account.name : `${account.name} · ${account.plan}`];
			for (const window of account.planWindows ?? []) {
				const reset = resetLabel(t, window.resetAt);
				lines.push(`${t(WINDOW_KEYS[window.kind])} ${fmtPercent(window.percentUsed)}${reset === void 0 ? "" : ` · ${reset}`}`);
			}
			if (account.unlimited === true) lines.push(t("pill.unlimited"));
			else if (account.remaining !== void 0) lines.push(t("window.remaining", { amount: fmtAmount(account.remaining, account.currency) }));
			lines.push(`${t("account.updated", { time: fmtTime(account.fetchedAt) })} · ${t("account.source", { adapter: account.adapter })}`);
			lines.push(t("pill.hint"));
			return lines.join("\n");
		}
		function QuotaPill({ t, quota, useProjection }) {
			const provider = useProjection("modelSelection")?.next?.provider;
			const [account, setAccount] = (0, react.useState)();
			const [reading, setReading] = (0, react.useState)(false);
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
				read(provider, false);
				const timer = setInterval(() => {
					read(provider, false);
				}, POLL_MS);
				return () => {
					clearInterval(timer);
				};
			}, [provider, read]);
			if (provider === void 0 || account === void 0) return null;
			if (account.id !== provider || account.status !== "ok" || !hasFigure(account)) return null;
			const tone = accountTone(account);
			const toneClass = tone === "critical" ? QuotaPill_module_css_default.critical : tone === "warning" ? QuotaPill_module_css_default.warning : void 0;
			const windows = worstWindows(account, PILL_WINDOWS);
			const unlimited = account.unlimited === true;
			const showBalance = !unlimited && windows.length === 0 && account.remaining !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: `${QuotaPill_module_css_default.pill} ${toneClass ?? ""} ${reading ? QuotaPill_module_css_default.reading : ""}`,
				title: detailOf(t, account),
				"aria-label": t("pill.label", { provider: account.name }),
				onClick: () => void read(provider, true),
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
			"nav.label": "用量/余额",
			"panel.title": "用量与余额",
			"panel.subtitle": "供应商账户与 Token 用量分析",
			"action.refresh": "刷新",
			"action.refreshing": "刷新中…",
			"action.reset": "重置本次统计",
			"action.retry": "重试",
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
			"provider.heading": "按供应商统计",
			"provider.empty": "暂无按供应商的用量",
			"provider.hint": "点击任一供应商即可把上方统计切换到它",
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
			"pill.window": "{label} {percent}",
			"pill.unlimited": "不限量",
			"pill.hint": "点击立即刷新",
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
			"weekday.sun": "日"
		};
		/** English quota monitor copy. */
		const en = {
			"nav.label": "Usage",
			"panel.title": "Usage and balance",
			"panel.subtitle": "Provider accounts and token usage analytics",
			"action.refresh": "Refresh",
			"action.refreshing": "Refreshing…",
			"action.reset": "Reset session stats",
			"action.retry": "Retry",
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
			"provider.heading": "Usage by provider",
			"provider.empty": "No per-provider usage yet",
			"provider.hint": "Pick a route to scope the statistics above",
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
			"pill.window": "{label} {percent}",
			"pill.unlimited": "Unlimited",
			"pill.hint": "Click to refresh now",
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
			"weekday.sun": "Sun"
		};
		//#endregion
		//#region src/client/index.ts
		/** Sidebar entry id, and the `main` key it addresses. */
		const PANEL_ID = "quota-monitor";
		/** Composer pill entry id, beside the model selector it describes. */
		const PILL_ID = "quota-monitor-pill";
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
					inject: () => ({ quota: scope.remote.quotaMonitor })
				}, UsagePanel));
				scope.slots.inject("conversation.input.right", () => scope.slots.register({
					name: "conversation.input.right",
					id: PILL_ID,
					order: 90,
					locale: NS,
					inject: () => ({ quota: scope.remote.quotaMonitor })
				}, QuotaPill));
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map