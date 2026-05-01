//#region src/core/matching/path-parser.ts
const barePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const indexSegmentPattern = /^(0|[1-9]\d*)$/;
const regexLikeSegmentPattern = /^\/.+\/[A-Za-z]*$/;
var PathSyntaxError = class extends SyntaxError {
	selector;
	constructor(selector, message) {
		super(message);
		this.name = "PathSyntaxError";
		this.selector = selector;
	}
};
const createPropertyPathSegment = (value) => {
	return Object.freeze({
		kind: "property",
		value
	});
};
const createIndexPathSegment = (value) => {
	return Object.freeze({
		kind: "index",
		value
	});
};
const createWildcardPathSegment = () => {
	return Object.freeze({ kind: "wildcard" });
};
const createRecursiveWildcardPathSegment = () => {
	return Object.freeze({ kind: "recursive-wildcard" });
};
const createIgnorePropertyPathSegment = (value) => {
	return Object.freeze({
		kind: "ignore-property",
		value
	});
};
const createIgnoreIndexPathSegment = (value) => {
	return Object.freeze({
		kind: "ignore-index",
		value
	});
};
const renderRawSelector = (selector) => {
	return typeof selector === "string" ? selector : JSON.stringify(selector);
};
const createUnsupportedWildcardError = (selector, segment) => {
	const rawSelector = renderRawSelector(selector);
	if (segment === "**") return new PathSyntaxError(rawSelector, "Unsupported recursive wildcard segment \"**\".");
	if (segment === "*") return new PathSyntaxError(rawSelector, "Unsupported wildcard segment \"*\".");
	return new PathSyntaxError(rawSelector, `Unsupported wildcard syntax in segment "${segment}".`);
};
const createExactSegment = (selector, value) => {
	if (typeof value === "number") return createIndexPathSegment(value);
	if (value.length === 0) throw new PathSyntaxError(renderRawSelector(selector), "Path selectors must not contain empty segments.");
	if (value.includes("*")) throw createUnsupportedWildcardError(selector, value);
	if (regexLikeSegmentPattern.test(value)) throw new PathSyntaxError(renderRawSelector(selector), `Unsupported regex-like segment "${value}".`);
	if (value.startsWith("!")) throw new PathSyntaxError(renderRawSelector(selector), `Unsupported exclusion syntax in segment "${value}". Ignore selectors are structured-selector only.`);
	if (indexSegmentPattern.test(value)) return createIndexPathSegment(Number(value));
	if (barePropertyPattern.test(value)) return createPropertyPathSegment(value);
	throw new PathSyntaxError(renderRawSelector(selector), `Unsupported exact path segment "${value}". Use bracket-quoted property syntax for literal special-character keys.`);
};
const createLiteralStructuredPropertySegment = (selector, value) => {
	if (value.length === 0) throw new PathSyntaxError(renderRawSelector(selector), "Path selectors must not contain empty segments.");
	return createPropertyPathSegment(value);
};
const createLiteralStructuredIndexSegment = (selector, value) => {
	if (!Number.isInteger(value) || value < 0) throw new PathSyntaxError(renderRawSelector(selector), "Structured numeric segments must be non-negative integers.");
	return createIndexPathSegment(value);
};
const createLiteralStructuredIgnorePropertySegment = (selector, value) => {
	if (value.length === 0) throw new PathSyntaxError(renderRawSelector(selector), "Path selectors must not contain empty segments.");
	return createIgnorePropertyPathSegment(value);
};
const createLiteralStructuredIgnoreIndexSegment = (selector, value) => {
	if (!Number.isInteger(value) || value < 0) throw new PathSyntaxError(renderRawSelector(selector), "Structured ignore indexes must be non-negative integers.");
	return createIgnoreIndexPathSegment(value);
};
const parseQuotedProperty = (selector, rawSelector, startIndex) => {
	const quote = selector[startIndex];
	let index = startIndex + 1;
	let value = "";
	while (index < selector.length) {
		const character = selector[index];
		if (character === "\\") {
			index += 1;
			if (index >= selector.length) throw new PathSyntaxError(rawSelector, "Quoted property selector has an unfinished escape sequence.");
			value += selector[index];
			index += 1;
			continue;
		}
		if (character === quote) {
			if (value.length === 0) throw new PathSyntaxError(rawSelector, "Path selectors must not contain empty segments.");
			return {
				nextIndex: index + 1,
				segment: createPropertyPathSegment(value)
			};
		}
		value += character;
		index += 1;
	}
	throw new PathSyntaxError(rawSelector, "Quoted property selector is not closed.");
};
const parseBracketSegment = (selector, rawSelector, startIndex) => {
	let index = startIndex + 1;
	if (index >= selector.length) throw new PathSyntaxError(rawSelector, "Bracket selector is not closed.");
	if (selector[index] === "\"" || selector[index] === "'") {
		const quotedProperty = parseQuotedProperty(selector, rawSelector, index);
		if (selector[quotedProperty.nextIndex] !== "]") throw new PathSyntaxError(rawSelector, "Quoted property selector must be closed with ].");
		return {
			nextIndex: quotedProperty.nextIndex + 1,
			segment: quotedProperty.segment
		};
	}
	const closingIndex = selector.indexOf("]", index);
	if (closingIndex === -1) throw new PathSyntaxError(rawSelector, "Bracket selector is not closed.");
	const value = selector.slice(index, closingIndex);
	if (value.length === 0) throw new PathSyntaxError(rawSelector, "Path selectors must not contain empty segments.");
	if (value.includes("*")) throw createUnsupportedWildcardError(rawSelector, value);
	if (regexLikeSegmentPattern.test(value)) throw new PathSyntaxError(rawSelector, `Unsupported regex-like segment "${value}".`);
	if (!indexSegmentPattern.test(value)) throw new PathSyntaxError(rawSelector, `Unsupported bracket segment "${value}". Use numeric indexes or quoted property selectors only.`);
	return {
		nextIndex: closingIndex + 1,
		segment: createIndexPathSegment(Number(value))
	};
};
const parseBareSegment = (selector, rawSelector, startIndex) => {
	let index = startIndex;
	while (index < selector.length && selector[index] !== "." && selector[index] !== "[") {
		if (selector[index] === "]") throw new PathSyntaxError(rawSelector, "Unexpected ] in path selector.");
		index += 1;
	}
	const value = selector.slice(startIndex, index);
	if (value === "*") return {
		nextIndex: index,
		segment: createWildcardPathSegment()
	};
	if (value === "**") return {
		nextIndex: index,
		segment: createRecursiveWildcardPathSegment()
	};
	return {
		nextIndex: index,
		segment: createExactSegment(rawSelector, value)
	};
};
const parseStringPathSelector = (selector) => {
	if (selector.length === 0) throw new PathSyntaxError(selector, "Path selectors must not be empty.");
	const segments = [];
	let index = 0;
	let recursiveWildcardCount = 0;
	while (index < selector.length) {
		if (selector[index] === ".") throw new PathSyntaxError(selector, "Path selectors must not contain empty segments.");
		const parsedSegment = selector[index] === "[" ? parseBracketSegment(selector, selector, index) : parseBareSegment(selector, selector, index);
		segments.push(parsedSegment.segment);
		if (parsedSegment.segment.kind === "recursive-wildcard") {
			recursiveWildcardCount += 1;
			if (recursiveWildcardCount > 1) throw new PathSyntaxError(selector, "Path selectors may contain at most one recursive wildcard segment \"**\".");
		}
		index = parsedSegment.nextIndex;
		while (index < selector.length && selector[index] === "[") {
			const bracketSegment = parseBracketSegment(selector, selector, index);
			segments.push(bracketSegment.segment);
			index = bracketSegment.nextIndex;
		}
		if (index >= selector.length) break;
		if (selector[index] !== ".") throw new PathSyntaxError(selector, `Unexpected character "${selector[index]}" in path selector.`);
		index += 1;
		if (index >= selector.length || selector[index] === "." || selector[index] === "[") throw new PathSyntaxError(selector, "Path selectors must not contain empty segments.");
	}
	return Object.freeze({
		raw: selector,
		segments: Object.freeze(segments)
	});
};
const isIgnorePathSegment = (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	const keys = Object.keys(value);
	return keys.length === 1 && keys[0] === "ignore";
};
const parseStructuredPathSelector = (selector) => {
	if (selector.length === 0) throw new PathSyntaxError(renderRawSelector(selector), "Path selectors must not be empty.");
	const segments = selector.map((segment) => {
		if (typeof segment === "string" || typeof segment === "number") return typeof segment === "string" ? createLiteralStructuredPropertySegment(selector, segment) : createLiteralStructuredIndexSegment(selector, segment);
		if (!isIgnorePathSegment(segment)) throw new PathSyntaxError(renderRawSelector(selector), `Unsupported structured selector segment ${JSON.stringify(segment)}.`);
		if (typeof segment.ignore === "string") return createLiteralStructuredIgnorePropertySegment(selector, segment.ignore);
		if (typeof segment.ignore === "number") return createLiteralStructuredIgnoreIndexSegment(selector, segment.ignore);
		throw new PathSyntaxError(renderRawSelector(selector), `Unsupported structured selector segment ${JSON.stringify(segment)}.`);
	});
	return Object.freeze({
		raw: selector,
		segments: Object.freeze(segments)
	});
};
const isExactPathSegment = (segment) => {
	return segment.kind === "property" || segment.kind === "index";
};
const isDynamicPathSegment = (segment) => {
	return !isExactPathSegment(segment);
};
const parsePathSelector = (selector) => {
	return typeof selector === "string" ? parseStringPathSelector(selector) : parseStructuredPathSelector(selector);
};
//#endregion
//#region src/core/matching/path-normaliser.ts
const canonicalBarePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const renderPropertySegment = (value, isRoot) => {
	if (canonicalBarePropertyPattern.test(value)) return `${isRoot ? "" : "."}${value}`;
	return `[${JSON.stringify(value)}]`;
};
const renderExactPathSegment = (segment, isRoot) => {
	if (segment.kind === "index") return `${isRoot ? "" : "."}${segment.value}`;
	return renderPropertySegment(segment.value, isRoot);
};
const renderCanonicalPath = (segments) => {
	return segments.map((segment, index) => renderExactPathSegment(segment, index === 0)).join("");
};
const appendCanonicalPathSegment = (parentPath, segment) => {
	return `${parentPath ?? ""}${renderExactPathSegment(segment, parentPath === void 0)}`;
};
const renderDynamicPathSegment = (segment, isRoot) => {
	if (segment.kind === "wildcard") return `${isRoot ? "" : "."}*`;
	if (segment.kind === "recursive-wildcard") return `${isRoot ? "" : "."}**`;
	if (segment.kind === "ignore-index") return `${isRoot ? "" : "."}{ignore:${segment.value}}`;
	if (segment.kind === "ignore-property") return `${isRoot ? "" : "."}{ignore:${JSON.stringify(segment.value)}}`;
	return renderExactPathSegment(segment, isRoot);
};
const renderSelectorSignature = (segments) => {
	return segments.map((segment, index) => renderDynamicPathSegment(segment, index === 0)).join("");
};
const normaliseParsedPath = (parsedPath) => {
	if (!parsedPath.segments.every(isExactPathSegment)) throw new TypeError("Dynamic selectors cannot be canonicalised as exact paths.");
	return Object.freeze({
		canonicalPath: renderCanonicalPath(parsedPath.segments),
		segments: parsedPath.segments
	});
};
//#endregion
//#region src/core/compiler/compile-redactor-plan.ts
const createLookupTable = () => {
	return Object.create(null);
};
const createDefaultPolicy = (options) => {
	return Object.freeze({
		censor: options.censor,
		remove: options.remove ?? false,
		retainStructure: options.retainStructure ?? false
	});
};
const mergePolicy = (defaults, overrides) => {
	return Object.freeze({
		censor: overrides.censor ?? defaults.censor,
		remove: overrides.remove ?? defaults.remove,
		retainStructure: overrides.retainStructure ?? defaults.retainStructure
	});
};
const isPathRule = (pathEntry) => {
	return typeof pathEntry === "object" && pathEntry !== null && !Array.isArray(pathEntry) && "path" in pathEntry;
};
const toPathRule = (pathEntry) => {
	return !isPathRule(pathEntry) ? { path: pathEntry } : pathEntry;
};
const compilePathRule = (pathEntry, defaults) => {
	const parsedPath = parsePathSelector(toPathRule(pathEntry).path);
	const policy = mergePolicy(defaults, isPathRule(pathEntry) ? pathEntry : {});
	if (parsedPath.segments.some(isDynamicPathSegment)) return Object.freeze({
		signature: renderSelectorSignature(parsedPath.segments),
		policy,
		segments: parsedPath.segments
	});
	const normalisedPath = normaliseParsedPath(parsedPath);
	return Object.freeze({
		canonicalPath: normalisedPath.canonicalPath,
		policy,
		segments: normalisedPath.segments
	});
};
const compilePathRules = (pathEntries, defaults) => {
	const exactPathRules = createLookupTable();
	const dynamicPathRules = [];
	for (const pathEntry of pathEntries) {
		const compiledRule = compilePathRule(pathEntry, defaults);
		if ("canonicalPath" in compiledRule) {
			exactPathRules[compiledRule.canonicalPath] = compiledRule;
			continue;
		}
		dynamicPathRules.push(compiledRule);
	}
	return Object.freeze({
		dynamicPathRules: Object.freeze(dynamicPathRules),
		exactPathRules: Object.freeze(exactPathRules)
	});
};
const compileExactKeyRules = (keys, defaults) => {
	const exactKeys = createLookupTable();
	for (const key of keys) if (typeof key === "string") exactKeys[key] = true;
	return Object.freeze({
		keys: Object.freeze(exactKeys),
		policy: defaults
	});
};
const compileRegexKeyRules = (keys, defaults) => {
	const matchers = [];
	for (const key of keys) if (key instanceof RegExp) matchers.push(new RegExp(key.source, key.flags));
	return Object.freeze({
		matchers: Object.freeze(matchers),
		policy: defaults
	});
};
const compileRedactorPlan = (options = {}) => {
	const defaults = createDefaultPolicy(options);
	const compiledPathRules = compilePathRules(options.paths ?? [], defaults);
	return Object.freeze({
		defaults,
		dynamicPathRules: compiledPathRules.dynamicPathRules,
		exactKeyRules: compileExactKeyRules(options.keys ?? [], defaults),
		exactPathRules: compiledPathRules.exactPathRules,
		regexKeyRules: compileRegexKeyRules(options.keys ?? [], defaults),
		serialise: options.serialise
	});
};
//#endregion
//#region src/core/replacement/apply-redaction.ts
const defaultCensor = "[REDACTED]";
const removedValue = Symbol("deep-redact.removed");
const isRemovedValue = (value) => {
	return value === removedValue;
};
const applyRedaction = (value, policy) => {
	if (policy.remove) return removedValue;
	if (typeof policy.censor === "function") return policy.censor(value);
	return policy.censor ?? defaultCensor;
};
//#endregion
//#region src/core/runtime/redact-value.ts
const isPlainObject$1 = (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};
const isTraversableContainer = (value) => {
	return Array.isArray(value) || isPlainObject$1(value);
};
const hasLookupValue = (table, key) => {
	return Object.hasOwn(table, key);
};
const matchesRegexKey = (matchers, key) => {
	return matchers.some((matcher) => matcher.test(key));
};
const resolveDirectKeyMatch = (plan, key) => {
	if (hasLookupValue(plan.exactKeyRules.keys, key)) return "exact-key";
	return matchesRegexKey(plan.regexKeyRules.matchers, key) ? "regex-key" : void 0;
};
const resolveExactPathRule = (plan, canonicalPath) => {
	if (canonicalPath === void 0) return;
	return hasLookupValue(plan.exactPathRules, canonicalPath) ? plan.exactPathRules[canonicalPath] : void 0;
};
const matchesSingleSegment = (selectorSegment, pathSegment) => {
	if (selectorSegment.kind === "wildcard") return true;
	if (selectorSegment.kind === "recursive-wildcard") return false;
	if (selectorSegment.kind === "ignore-index") return pathSegment.kind === "index" && pathSegment.value !== selectorSegment.value;
	if (selectorSegment.kind === "ignore-property") return pathSegment.kind === "property" && pathSegment.value !== selectorSegment.value;
	if (selectorSegment.kind === "index") return pathSegment.kind === "index" && pathSegment.value === selectorSegment.value;
	return pathSegment.kind === "property" && pathSegment.value === selectorSegment.value;
};
const matchesDynamicRule = (selectorSegments, pathSegments, selectorIndex = 0, pathIndex = 0) => {
	if (selectorIndex >= selectorSegments.length) return pathIndex === pathSegments.length;
	const selectorSegment = selectorSegments[selectorIndex];
	if (selectorSegment.kind === "recursive-wildcard") {
		for (let nextPathIndex = pathIndex; nextPathIndex <= pathSegments.length; nextPathIndex += 1) if (matchesDynamicRule(selectorSegments, pathSegments, selectorIndex + 1, nextPathIndex)) return true;
		return false;
	}
	if (pathIndex >= pathSegments.length) return false;
	return matchesSingleSegment(selectorSegment, pathSegments[pathIndex]) && matchesDynamicRule(selectorSegments, pathSegments, selectorIndex + 1, pathIndex + 1);
};
const resolveDynamicPathRule = (plan, pathSegments) => {
	return plan.dynamicPathRules.find((rule) => matchesDynamicRule(rule.segments, pathSegments));
};
const selectActivePolicy = (plan, exactPathRule, dynamicPathRule, directKeyMatch, inheritedPolicy) => {
	if (exactPathRule !== void 0) return {
		policy: exactPathRule.policy,
		source: "exact-path"
	};
	if (dynamicPathRule !== void 0) return {
		policy: dynamicPathRule.policy,
		source: "dynamic-path"
	};
	if (inheritedPolicy?.source === "exact-path" || inheritedPolicy?.source === "dynamic-path") return inheritedPolicy;
	if (directKeyMatch === "exact-key") return {
		policy: plan.exactKeyRules.policy,
		source: "exact-key"
	};
	if (directKeyMatch === "regex-key") return {
		policy: plan.regexKeyRules.policy,
		source: "regex-key"
	};
	return inheritedPolicy;
};
const transformArray = (value, plan, inheritedPolicy, canonicalPath, pathSegments) => {
	let transformedValue;
	const removedIndexes = [];
	let changed = false;
	for (let index = 0; index < value.length; index += 1) {
		if (!(index in value)) continue;
		const item = value[index];
		const pathSegment = createIndexPathSegment(index);
		const itemResult = transformNode(item, plan, {
			canonicalPath: appendCanonicalPathSegment(canonicalPath, pathSegment),
			inheritedPolicy,
			pathSegments: Object.freeze([...pathSegments, pathSegment])
		});
		if (isRemovedValue(itemResult.value)) {
			if (transformedValue === void 0) transformedValue = value.slice();
			changed = true;
			removedIndexes.push(index);
			continue;
		}
		if (!itemResult.changed) continue;
		if (transformedValue === void 0) transformedValue = value.slice();
		changed = true;
		transformedValue[index] = itemResult.value;
	}
	if (transformedValue === void 0) return {
		changed: false,
		value
	};
	if (removedIndexes.length === 0) return {
		changed,
		value: transformedValue
	};
	const compactedValue = transformedValue.slice();
	let removedCount = 0;
	for (const removedIndex of removedIndexes) {
		compactedValue.splice(removedIndex - removedCount, 1);
		removedCount += 1;
	}
	return {
		changed,
		value: compactedValue
	};
};
const transformObject = (value, plan, inheritedPolicy, canonicalPath, pathSegments) => {
	let changed = false;
	let transformedValue;
	for (const [key, propertyValue] of Object.entries(value)) {
		const pathSegment = createPropertyPathSegment(key);
		const propertyResult = transformNode(propertyValue, plan, {
			canonicalPath: appendCanonicalPathSegment(canonicalPath, pathSegment),
			directKeyMatch: resolveDirectKeyMatch(plan, key),
			inheritedPolicy,
			pathSegments: Object.freeze([...pathSegments, pathSegment])
		});
		if (isRemovedValue(propertyResult.value)) {
			if (transformedValue === void 0) transformedValue = { ...value };
			changed = true;
			delete transformedValue[key];
			continue;
		}
		if (!propertyResult.changed) continue;
		if (transformedValue === void 0) transformedValue = { ...value };
		changed = true;
		transformedValue[key] = propertyResult.value;
	}
	return {
		changed,
		value: changed ? transformedValue : value
	};
};
const transformNode = (value, plan, context) => {
	const activePolicy = selectActivePolicy(plan, resolveExactPathRule(plan, context.canonicalPath), resolveDynamicPathRule(plan, context.pathSegments), context.directKeyMatch, context.inheritedPolicy);
	if (activePolicy !== void 0 && (!activePolicy.policy.retainStructure || !isTraversableContainer(value))) return {
		changed: true,
		value: applyRedaction(value, activePolicy.policy)
	};
	if (!isTraversableContainer(value)) return {
		changed: false,
		value
	};
	const inheritedPolicy = activePolicy;
	return Array.isArray(value) ? transformArray(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments) : transformObject(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments);
};
const redactValue = (value, plan) => {
	const result = transformNode(value, plan, {
		canonicalPath: void 0,
		inheritedPolicy: void 0,
		pathSegments: Object.freeze([])
	});
	return isRemovedValue(result.value) ? void 0 : result.value;
};
//#endregion
//#region src/core/validation/validation-report.ts
const formatValidationIssues = (issues) => {
	return issues.map((issue, index) => `${index + 1}. ${issue.path}: ${issue.message}`).join("\n");
};
var DeepRedactValidationError = class extends TypeError {
	issues;
	constructor(issues) {
		super(formatValidationIssues(issues));
		this.name = "DeepRedactValidationError";
		this.issues = Object.freeze([...issues]);
	}
};
const createValidationReport = (issues) => {
	return Object.freeze({
		valid: issues.length === 0,
		issues: Object.freeze([...issues])
	});
};
const assertValidConfig = (report) => {
	if (!report.valid) throw new DeepRedactValidationError(report.issues);
};
//#endregion
//#region src/core/validation/validate-paths.ts
const pushIssue$1 = (issues, path, message) => {
	issues.push({
		path,
		message
	});
};
const validatePathSelectors = (selectorCandidates, issues) => {
	const seenCanonicalPaths = /* @__PURE__ */ new Map();
	const seenDynamicSelectors = /* @__PURE__ */ new Map();
	for (const selectorCandidate of selectorCandidates) try {
		const parsedPath = parsePathSelector(selectorCandidate.selector);
		if (parsedPath.segments.some(isDynamicPathSegment)) {
			const signature = renderSelectorSignature(parsedPath.segments);
			const previousDefinitionPath = seenDynamicSelectors.get(signature);
			if (previousDefinitionPath !== void 0) {
				pushIssue$1(issues, selectorCandidate.configPath, `Duplicate dynamic selector "${signature}" already defined at ${previousDefinitionPath}.`);
				continue;
			}
			seenDynamicSelectors.set(signature, selectorCandidate.configPath);
			continue;
		}
		const normalisedPath = normaliseParsedPath(parsedPath);
		const previousDefinitionPath = seenCanonicalPaths.get(normalisedPath.canonicalPath);
		if (previousDefinitionPath !== void 0) {
			pushIssue$1(issues, selectorCandidate.configPath, `Duplicate canonical selector "${normalisedPath.canonicalPath}" already defined at ${previousDefinitionPath}.`);
			continue;
		}
		seenCanonicalPaths.set(normalisedPath.canonicalPath, selectorCandidate.configPath);
	} catch (error) {
		pushIssue$1(issues, selectorCandidate.configPath, error instanceof Error ? error.message : "Invalid path selector.");
	}
};
//#endregion
//#region src/core/validation/validate-config.ts
const rootOptionNames = new Set([
	"censor",
	"keys",
	"paths",
	"remove",
	"retainStructure",
	"serialise"
]);
const pathRuleOptionNames = new Set([
	"path",
	"censor",
	"remove",
	"retainStructure"
]);
const isPlainObject = (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};
const isPathSelector = (value) => {
	return typeof value === "string" || Array.isArray(value);
};
const pushIssue = (issues, path, message) => {
	issues.push({
		path,
		message
	});
};
const validateAllowedOptions = (value, allowedOptions, path, issues) => {
	for (const optionName of Object.keys(value)) if (!allowedOptions.has(optionName)) pushIssue(issues, path, `Unsupported option "${optionName}".`);
};
const validateBooleanOption = (value, path, optionName, issues) => {
	if (value !== void 0 && typeof value !== "boolean") pushIssue(issues, `${path}.${optionName}`, `${optionName} must be a boolean.`);
};
const validateCensorOption = (value, path, issues) => {
	if (value !== void 0 && typeof value !== "string" && typeof value !== "function") pushIssue(issues, `${path}.censor`, "censor must be a string or function.");
};
const validateSerialiseOption = (value, path, issues) => {
	if (value !== void 0 && typeof value !== "boolean" && typeof value !== "function") {
		pushIssue(issues, `${path}.serialise`, "serialise must be a boolean or function.");
		return false;
	}
	return true;
};
const validateConflictingOptions = (value, path, issues) => {
	if (value.remove === true && value.censor !== void 0) pushIssue(issues, path, "remove cannot be combined with censor.");
	if (value.remove === true && value.retainStructure === true) pushIssue(issues, path, "remove cannot be combined with retainStructure.");
};
const regexLikeKeySelectorPattern = /^\/.+\/[A-Za-z]*$/;
const maxKeyRegexSourceLength = 256;
const nestedQuantifierKeyRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?(?:\\.|[^()[\]\\]|\[[^\]]*])*(?:[+*]|\{\d+(?:,\d*)?\})(?:\\.|[^()[\]\\]|\[[^\]]*])*\)(?:[+*]|\{\d+(?:,\d*)?\})/;
const quantifiedGroupKeyRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?((?:\\.|[^()[\]\\]|\[[^\]]*])*)\)(?:[+*]|\{\d+(?:,\d*)?\})/g;
const isRegExp = (value) => {
	return value instanceof RegExp;
};
const splitRegexAlternatives = (source) => {
	const alternatives = [""];
	let inCharacterClass = false;
	let escaped = false;
	for (const character of source) {
		if (escaped) {
			alternatives[alternatives.length - 1] += character;
			escaped = false;
			continue;
		}
		if (character === "\\") {
			alternatives[alternatives.length - 1] += character;
			escaped = true;
			continue;
		}
		if (character === "[") {
			inCharacterClass = true;
			alternatives[alternatives.length - 1] += character;
			continue;
		}
		if (character === "]" && inCharacterClass) {
			inCharacterClass = false;
			alternatives[alternatives.length - 1] += character;
			continue;
		}
		if (character === "|" && !inCharacterClass) {
			alternatives.push("");
			continue;
		}
		alternatives[alternatives.length - 1] += character;
	}
	return alternatives;
};
const hasPrefixOverlappingAlternatives = (alternatives) => {
	const nonEmptyAlternatives = alternatives.filter((alternative) => alternative.length > 0);
	return nonEmptyAlternatives.some((alternative, index) => {
		return nonEmptyAlternatives.some((otherAlternative, otherIndex) => {
			return index !== otherIndex && otherAlternative.startsWith(alternative);
		});
	});
};
const hasUnsafeOverlappingAlternation = (source) => {
	for (const match of source.matchAll(quantifiedGroupKeyRegexPattern)) {
		const alternatives = splitRegexAlternatives(match[1] ?? "");
		if (alternatives.length > 1 && hasPrefixOverlappingAlternatives(alternatives)) return true;
	}
	return false;
};
const getUnsupportedKeySelectorMessage = (selector) => {
	if (selector.startsWith("!")) return `Unsupported exclusion key selector "${selector}". Ignore selectors must use structured selector objects and are not supported in this configuration format.`;
	if (selector.includes("**")) return `Unsupported recursive wildcard key selector "${selector}".`;
	if (selector.includes("*")) return `Unsupported wildcard key selector "${selector}".`;
	if (regexLikeKeySelectorPattern.test(selector)) return `Unsupported regex-like key selector "${selector}".`;
};
const getUnsupportedKeyRegexMessage = (selector) => {
	if (selector.global || selector.sticky) return "Regex key selectors must not use global or sticky flags.";
	if (selector.source.length > maxKeyRegexSourceLength) return `Regex key selector source must be at most ${maxKeyRegexSourceLength} characters.`;
	if (nestedQuantifierKeyRegexPattern.test(selector.source)) return "Unsafe regex key selector uses a nested quantified pattern.";
	if (hasUnsafeOverlappingAlternation(selector.source)) return "Unsafe regex key selector uses an overlapping alternation pattern.";
};
const validateKeys = (value, path, issues) => {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		pushIssue(issues, path, "keys must be an array.");
		return;
	}
	value.forEach((entry, index) => {
		const entryPath = `${path}[${index}]`;
		if (isRegExp(entry)) {
			const unsupportedRegexMessage = getUnsupportedKeyRegexMessage(entry);
			if (unsupportedRegexMessage !== void 0) pushIssue(issues, entryPath, unsupportedRegexMessage);
			return;
		}
		if (typeof entry !== "string") {
			pushIssue(issues, entryPath, "key selectors must be strings or RegExp instances.");
			return;
		}
		if (entry.length === 0) {
			pushIssue(issues, entryPath, "key selectors must not be empty.");
			return;
		}
		const unsupportedSelectorMessage = getUnsupportedKeySelectorMessage(entry);
		if (unsupportedSelectorMessage !== void 0) pushIssue(issues, entryPath, unsupportedSelectorMessage);
	});
};
const validatePathRule = (value, path, defaults, issues, selectorCandidates) => {
	if (!isPlainObject(value)) {
		pushIssue(issues, path, `${path.split(".").at(-1) ?? "entry"} must be a string selector or path-rule object.`);
		return;
	}
	validateAllowedOptions(value, pathRuleOptionNames, path, issues);
	if (!isPathSelector(value.path)) pushIssue(issues, `${path}.path`, "path must be a string or structured selector array.");
	else selectorCandidates.push({
		configPath: `${path}.path`,
		selector: value.path
	});
	validateCensorOption(value.censor, path, issues);
	validateBooleanOption(value.remove, path, "remove", issues);
	validateBooleanOption(value.retainStructure, path, "retainStructure", issues);
	validateConflictingOptions({
		censor: value.censor ?? defaults.censor,
		remove: value.remove ?? defaults.remove,
		retainStructure: value.retainStructure ?? defaults.retainStructure
	}, path, issues);
};
const validatePaths = (value, path, defaults, issues, selectorCandidates) => {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		pushIssue(issues, path, "paths must be an array.");
		return;
	}
	value.forEach((entry, index) => {
		const entryPath = `${path}[${index}]`;
		if (isPathSelector(entry)) {
			selectorCandidates.push({
				configPath: entryPath,
				selector: entry
			});
			return;
		}
		if (!isPlainObject(entry)) {
			pushIssue(issues, entryPath, `${entryPath.split(".").at(-1) ?? "entry"} must be a string selector or path-rule object.`);
			return;
		}
		validatePathRule(entry, entryPath, defaults, issues, selectorCandidates);
	});
};
const validateConfig = (options) => {
	const issues = [];
	const selectorCandidates = [];
	if (options === void 0) return createValidationReport(issues);
	if (!isPlainObject(options)) {
		pushIssue(issues, "options", "options must be an object.");
		return createValidationReport(issues);
	}
	validateAllowedOptions(options, rootOptionNames, "options", issues);
	validateCensorOption(options.censor, "options", issues);
	validateKeys(options.keys, "options.keys", issues);
	validateBooleanOption(options.remove, "options", "remove", issues);
	validateBooleanOption(options.retainStructure, "options", "retainStructure", issues);
	validateSerialiseOption(options.serialise, "options", issues);
	validateConflictingOptions(options, "options", issues);
	validatePaths(options.paths, "options.paths", {
		censor: options.censor,
		remove: options.remove === true,
		retainStructure: options.retainStructure === true
	}, issues, selectorCandidates);
	validatePathSelectors(selectorCandidates, issues);
	return createValidationReport(issues);
};
//#endregion
//#region src/core/create-redactor.ts
const applySerialisation = (value, serialise) => {
	if (serialise === true) return JSON.stringify(value);
	if (typeof serialise === "function") return serialise(value);
	return value;
};
const createCallableRedactor = (plan) => {
	return function redact(value) {
		return applySerialisation(redactValue(value, plan), plan.serialise);
	};
};
const createRedactor$1 = (options) => {
	assertValidConfig(validateConfig(options));
	return createCallableRedactor(compileRedactorPlan(options ?? {}));
};
//#endregion
//#region src/index.ts
const deepRedact = createRedactor$1;
const createRedactor = deepRedact;
//#endregion
export { createRedactor, deepRedact };
