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
const createUnsupportedWildcardError = (selector, segment) => {
	if (segment === "**") return new PathSyntaxError(selector, "Unsupported recursive wildcard segment \"**\".");
	if (segment === "*") return new PathSyntaxError(selector, "Unsupported wildcard segment \"*\".");
	return new PathSyntaxError(selector, `Unsupported wildcard syntax in segment "${segment}".`);
};
const createBareSegment = (selector, value) => {
	if (value.length === 0) throw new PathSyntaxError(selector, "Path selectors must not contain empty segments.");
	if (value.includes("*")) throw createUnsupportedWildcardError(selector, value);
	if (regexLikeSegmentPattern.test(value)) throw new PathSyntaxError(selector, `Unsupported regex-like segment "${value}".`);
	if (indexSegmentPattern.test(value)) return createIndexPathSegment(Number(value));
	if (barePropertyPattern.test(value)) return createPropertyPathSegment(value);
	throw new PathSyntaxError(selector, `Unsupported exact path segment "${value}". Use bracket-quoted property syntax for literal special-character keys.`);
};
const parseQuotedProperty = (selector, startIndex) => {
	const quote = selector[startIndex];
	let index = startIndex + 1;
	let value = "";
	while (index < selector.length) {
		const character = selector[index];
		if (character === "\\") {
			index += 1;
			if (index >= selector.length) throw new PathSyntaxError(selector, "Quoted property selector has an unfinished escape sequence.");
			value += selector[index];
			index += 1;
			continue;
		}
		if (character === quote) {
			if (value.length === 0) throw new PathSyntaxError(selector, "Path selectors must not contain empty segments.");
			return {
				nextIndex: index + 1,
				segment: createPropertyPathSegment(value)
			};
		}
		value += character;
		index += 1;
	}
	throw new PathSyntaxError(selector, "Quoted property selector is not closed.");
};
const parseBracketSegment = (selector, startIndex) => {
	let index = startIndex + 1;
	if (index >= selector.length) throw new PathSyntaxError(selector, "Bracket selector is not closed.");
	if (selector[index] === "\"" || selector[index] === "'") {
		const quotedProperty = parseQuotedProperty(selector, index);
		if (selector[quotedProperty.nextIndex] !== "]") throw new PathSyntaxError(selector, "Quoted property selector must be closed with ].");
		return {
			nextIndex: quotedProperty.nextIndex + 1,
			segment: quotedProperty.segment
		};
	}
	const closingIndex = selector.indexOf("]", index);
	if (closingIndex === -1) throw new PathSyntaxError(selector, "Bracket selector is not closed.");
	const value = selector.slice(index, closingIndex);
	if (value.length === 0) throw new PathSyntaxError(selector, "Path selectors must not contain empty segments.");
	if (value.includes("*")) throw createUnsupportedWildcardError(selector, value);
	if (regexLikeSegmentPattern.test(value)) throw new PathSyntaxError(selector, `Unsupported regex-like segment "${value}".`);
	if (!indexSegmentPattern.test(value)) throw new PathSyntaxError(selector, `Unsupported bracket segment "${value}". Use numeric indexes or quoted property selectors only.`);
	return {
		nextIndex: closingIndex + 1,
		segment: createIndexPathSegment(Number(value))
	};
};
const parseBareSegment = (selector, startIndex) => {
	let index = startIndex;
	while (index < selector.length && selector[index] !== "." && selector[index] !== "[") {
		if (selector[index] === "]") throw new PathSyntaxError(selector, "Unexpected ] in path selector.");
		index += 1;
	}
	const value = selector.slice(startIndex, index);
	return {
		nextIndex: index,
		segment: createBareSegment(selector, value)
	};
};
const parsePathSelector = (selector) => {
	if (selector.length === 0) throw new PathSyntaxError(selector, "Path selectors must not be empty.");
	const segments = [];
	let index = 0;
	while (index < selector.length) {
		if (selector[index] === ".") throw new PathSyntaxError(selector, "Path selectors must not contain empty segments.");
		const parsedSegment = selector[index] === "[" ? parseBracketSegment(selector, index) : parseBareSegment(selector, index);
		segments.push(parsedSegment.segment);
		index = parsedSegment.nextIndex;
		while (index < selector.length && selector[index] === "[") {
			const bracketSegment = parseBracketSegment(selector, index);
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
//#endregion
//#region src/core/matching/path-normaliser.ts
const canonicalBarePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const renderPropertySegment = (value, isRoot) => {
	if (canonicalBarePropertyPattern.test(value)) return `${isRoot ? "" : "."}${value}`;
	return `[${JSON.stringify(value)}]`;
};
const renderPathSegment = (segment, isRoot) => {
	if (segment.kind === "index") return `${isRoot ? "" : "."}${segment.value}`;
	return renderPropertySegment(segment.value, isRoot);
};
const renderCanonicalPath = (segments) => {
	return segments.map((segment, index) => renderPathSegment(segment, index === 0)).join("");
};
const appendCanonicalPathSegment = (parentPath, segment) => {
	return `${parentPath ?? ""}${renderPathSegment(segment, parentPath === void 0)}`;
};
const normaliseParsedPath = (parsedPath) => {
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
const compilePathRule = (pathEntry, defaults) => {
	const normalisedPath = normaliseParsedPath(parsePathSelector((typeof pathEntry === "string" ? { path: pathEntry } : pathEntry).path));
	return Object.freeze({
		canonicalPath: normalisedPath.canonicalPath,
		policy: mergePolicy(defaults, typeof pathEntry === "string" ? {} : pathEntry),
		segments: normalisedPath.segments
	});
};
const compileExactPathRules = (pathEntries, defaults) => {
	const exactPathRules = createLookupTable();
	for (const pathEntry of pathEntries) {
		const compiledRule = compilePathRule(pathEntry, defaults);
		exactPathRules[compiledRule.canonicalPath] = compiledRule;
	}
	return Object.freeze(exactPathRules);
};
const compileExactKeyRules = (keys, defaults) => {
	const exactKeys = createLookupTable();
	for (const key of keys) exactKeys[key] = true;
	return Object.freeze({
		keys: Object.freeze(exactKeys),
		policy: defaults
	});
};
const compileRedactorPlan = (options = {}) => {
	const defaults = createDefaultPolicy(options);
	return Object.freeze({
		defaults,
		exactKeyRules: compileExactKeyRules(options.keys ?? [], defaults),
		exactPathRules: compileExactPathRules(options.paths ?? [], defaults),
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
const resolvePathRule = (plan, canonicalPath) => {
	if (canonicalPath === void 0) return;
	return hasLookupValue(plan.exactPathRules, canonicalPath) ? plan.exactPathRules[canonicalPath] : void 0;
};
const selectActivePolicy = (plan, pathRule, directKeyMatch, inheritedPolicy) => {
	if (pathRule !== void 0) return {
		policy: pathRule.policy,
		source: "path"
	};
	if (inheritedPolicy?.source === "path") return inheritedPolicy;
	if (directKeyMatch) return {
		policy: plan.exactKeyRules.policy,
		source: "key"
	};
	return inheritedPolicy;
};
const transformArray = (value, plan, inheritedPolicy, canonicalPath) => {
	let transformedValue;
	const removedIndexes = [];
	let changed = false;
	for (let index = 0; index < value.length; index += 1) {
		if (!(index in value)) continue;
		const item = value[index];
		const itemResult = transformNode(item, plan, {
			canonicalPath: appendCanonicalPathSegment(canonicalPath, createIndexPathSegment(index)),
			directKeyMatch: false,
			inheritedPolicy
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
const transformObject = (value, plan, inheritedPolicy, canonicalPath) => {
	let changed = false;
	let transformedValue;
	for (const [key, propertyValue] of Object.entries(value)) {
		const propertyResult = transformNode(propertyValue, plan, {
			canonicalPath: appendCanonicalPathSegment(canonicalPath, createPropertyPathSegment(key)),
			directKeyMatch: hasLookupValue(plan.exactKeyRules.keys, key),
			inheritedPolicy
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
	const activePolicy = selectActivePolicy(plan, resolvePathRule(plan, context.canonicalPath), context.directKeyMatch, context.inheritedPolicy);
	if (activePolicy !== void 0 && (!activePolicy.policy.retainStructure || !isTraversableContainer(value))) return {
		changed: true,
		value: applyRedaction(value, activePolicy.policy)
	};
	if (!isTraversableContainer(value)) return {
		changed: false,
		value
	};
	const inheritedPolicy = activePolicy;
	return Array.isArray(value) ? transformArray(value, plan, inheritedPolicy, context.canonicalPath) : transformObject(value, plan, inheritedPolicy, context.canonicalPath);
};
const redactValue = (value, plan) => {
	const result = transformNode(value, plan, {
		canonicalPath: void 0,
		directKeyMatch: false,
		inheritedPolicy: void 0
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
const validateExactPathSelectors = (selectorCandidates, issues) => {
	const seenCanonicalPaths = /* @__PURE__ */ new Map();
	for (const selectorCandidate of selectorCandidates) try {
		const normalisedPath = normaliseParsedPath(parsePathSelector(selectorCandidate.selector));
		const previousDefinitionPath = seenCanonicalPaths.get(normalisedPath.canonicalPath);
		if (previousDefinitionPath !== void 0) {
			pushIssue$1(issues, selectorCandidate.configPath, `Duplicate canonical selector "${normalisedPath.canonicalPath}" already defined at ${previousDefinitionPath}.`);
			continue;
		}
		seenCanonicalPaths.set(normalisedPath.canonicalPath, selectorCandidate.configPath);
	} catch (error) {
		pushIssue$1(issues, selectorCandidate.configPath, error instanceof Error ? error.message : "Invalid exact path selector.");
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
const getUnsupportedKeySelectorMessage = (selector) => {
	if (selector.startsWith("!")) return `Unsupported exclusion key selector "${selector}". Ignore selectors must use structured selector objects and are not supported in this configuration format.`;
	if (selector.includes("**")) return `Unsupported recursive wildcard key selector "${selector}".`;
	if (selector.includes("*")) return `Unsupported wildcard key selector "${selector}".`;
	if (regexLikeKeySelectorPattern.test(selector)) return `Unsupported regex-like key selector "${selector}".`;
};
const validateKeys = (value, path, issues) => {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		pushIssue(issues, path, "keys must be an array.");
		return;
	}
	value.forEach((entry, index) => {
		const entryPath = `${path}[${index}]`;
		if (typeof entry !== "string") {
			pushIssue(issues, entryPath, "key selectors must be strings.");
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
	if (typeof value.path !== "string") pushIssue(issues, `${path}.path`, "path must be a string.");
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
		if (typeof entry === "string") {
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
	validateExactPathSelectors(selectorCandidates, issues);
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
