//#region src/core/compiler/compile-ignored-value-types.ts
const compileIgnoredValueTypes = (configured) => {
	return Object.freeze({
		bigint: configured?.bigint === true,
		Date: configured?.Date === true,
		Error: configured?.Error === true,
		Map: configured?.Map === true,
		RegExp: configured?.RegExp === true,
		Set: configured?.Set === true,
		URL: configured?.URL === true
	});
};
//#endregion
//#region src/transformers/built-ins.ts
const bigintTransformer = (value) => {
	if (typeof value !== "bigint") return value;
	return {
		_transformer: "bigint",
		value: {
			radix: 10,
			number: value.toString(10)
		}
	};
};
const dateTransformer = (value) => {
	if (!(value instanceof Date)) return value;
	return {
		_transformer: "date",
		datetime: value.toISOString()
	};
};
const errorTransformer = (value) => {
	if (!(value instanceof Error)) return value;
	return {
		_transformer: "error",
		value: {
			type: value.constructor.name,
			message: value.message,
			stack: value.stack
		}
	};
};
const mapTransformer = (value) => {
	if (!(value instanceof Map)) return value;
	return {
		_transformer: "map",
		value: Object.fromEntries(value.entries())
	};
};
const regexTransformer = (value) => {
	if (!(value instanceof RegExp)) return value;
	return {
		_transformer: "regex",
		value: {
			source: value.source,
			flags: value.flags
		}
	};
};
const setTransformer = (value) => {
	if (!(value instanceof Set)) return value;
	return {
		_transformer: "set",
		value: Array.from(value.values())
	};
};
const urlTransformer = (value) => {
	if (!(value instanceof URL)) return value;
	return {
		_transformer: "url",
		value: value.href
	};
};
//#endregion
//#region src/core/compiler/compile-transformers.ts
const emptyTransformers = Object.freeze([]);
const mergeTransformers = (configured, builtIns = emptyTransformers) => {
	return Object.freeze([...configured ?? emptyTransformers, ...builtIns]);
};
const compileByType = (configured) => {
	return Object.freeze({
		bigint: mergeTransformers(configured?.bigint, Object.freeze([bigintTransformer])),
		object: mergeTransformers(configured?.object)
	});
};
const compileByConstructor = (configured) => {
	return Object.freeze({
		Date: mergeTransformers(configured?.Date, Object.freeze([dateTransformer])),
		Error: mergeTransformers(configured?.Error, Object.freeze([errorTransformer])),
		Map: mergeTransformers(configured?.Map, Object.freeze([mapTransformer])),
		RegExp: mergeTransformers(configured?.RegExp, Object.freeze([regexTransformer])),
		Set: mergeTransformers(configured?.Set, Object.freeze([setTransformer])),
		URL: mergeTransformers(configured?.URL, Object.freeze([urlTransformer]))
	});
};
const compileTransformers = (configured) => {
	return Object.freeze({
		byType: compileByType(configured?.byType),
		byConstructor: compileByConstructor(configured?.byConstructor),
		fallback: mergeTransformers(configured?.fallback)
	});
};
//#endregion
//#region src/core/validation/regex-safety.ts
const cloneRegExp = (pattern) => {
	return new RegExp(pattern.source, pattern.flags);
};
const maxRegexSourceLength = 256;
const nestedQuantifierRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?(?:\\.|[^()[\]\\]|\[[^\]]*])*(?:[+*]|\{\d+(?:,\d*)?\})(?:\\.|[^()[\]\\]|\[[^\]]*])*\)(?:[+*]|\{\d+(?:,\d*)?\})/;
const quantifiedGroupRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?((?:\\.|[^()[\]\\]|\[[^\]]*])*)\)(?:[+*]|\{\d+(?:,\d*)?\})/g;
const isRegExp = (value) => {
	return value instanceof RegExp;
};
const splitRegexAlternatives = (source) => {
	const alternatives = [""];
	let inCharacterClass = false;
	let groupDepth = 0;
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
		if (!inCharacterClass) {
			if (character === "(") {
				groupDepth++;
				alternatives[alternatives.length - 1] += character;
				continue;
			}
			if (character === ")") {
				groupDepth--;
				alternatives[alternatives.length - 1] += character;
				continue;
			}
			if (character === "|" && groupDepth === 0) {
				alternatives.push("");
				continue;
			}
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
	for (const match of source.matchAll(quantifiedGroupRegexPattern)) {
		const alternatives = splitRegexAlternatives(match[1] ?? "");
		if (alternatives.length > 1 && hasPrefixOverlappingAlternatives(alternatives)) return true;
	}
	return false;
};
const lowercaseInitial = (value) => {
	return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
};
const getUnsupportedRegexMessage = (selector, label, options = {}) => {
	if (selector.sticky) return options.allowGlobal === true ? `${label} must not use sticky flag.` : `${label} must not use global or sticky flags.`;
	if (selector.global && options.allowGlobal !== true) return `${label} must not use global or sticky flags.`;
	if ([...selector.source].length > maxRegexSourceLength) return `${label} source must be at most ${maxRegexSourceLength} characters.`;
	if (nestedQuantifierRegexPattern.test(selector.source)) return `Unsafe ${lowercaseInitial(label)} uses a nested quantified pattern.`;
	if (hasUnsafeOverlappingAlternation(selector.source)) return `Unsafe ${lowercaseInitial(label)} uses an overlapping alternation pattern.`;
};
//#endregion
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
const cloneRegexMatcher = (matcher) => {
	return new RegExp(matcher.source, matcher.flags);
};
const createRegexPathSegment = (matcher) => {
	return Object.freeze({
		kind: "regex",
		matcher: cloneRegexMatcher(matcher)
	});
};
const createIgnoreRegexPathSegment = (matcher) => {
	return Object.freeze({
		kind: "ignore-regex",
		matcher: cloneRegexMatcher(matcher)
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
	if (regexLikeSegmentPattern.test(value)) throw new PathSyntaxError(renderRawSelector(selector), `Unsupported regex-like segment "${value}".`);
	return createPropertyPathSegment(value);
};
const createLiteralStructuredIndexSegment = (selector, value) => {
	if (!Number.isInteger(value) || value < 0) throw new PathSyntaxError(renderRawSelector(selector), "Structured numeric segments must be non-negative integers.");
	return createIndexPathSegment(value);
};
const createLiteralStructuredIgnorePropertySegment = (selector, value) => {
	if (value.length === 0) throw new PathSyntaxError(renderRawSelector(selector), "Path selectors must not contain empty segments.");
	if (regexLikeSegmentPattern.test(value)) throw new PathSyntaxError(renderRawSelector(selector), `Unsupported regex-like segment "${value}".`);
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
		if (isRegExp(segment)) return createRegexPathSegment(segment);
		if (typeof segment === "string" || typeof segment === "number") return typeof segment === "string" ? createLiteralStructuredPropertySegment(selector, segment) : createLiteralStructuredIndexSegment(selector, segment);
		if (!isIgnorePathSegment(segment)) throw new PathSyntaxError(renderRawSelector(selector), `Unsupported structured selector segment ${JSON.stringify(segment)}.`);
		if (typeof segment.ignore === "string") return createLiteralStructuredIgnorePropertySegment(selector, segment.ignore);
		if (typeof segment.ignore === "number") return createLiteralStructuredIgnoreIndexSegment(selector, segment.ignore);
		if (isRegExp(segment.ignore)) return createIgnoreRegexPathSegment(segment.ignore);
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
//#region src/core/matching/key-normaliser.ts
const canonicaliseKey = (value) => {
	return value.toLowerCase().trim().replace(/[_-]/g, "");
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
	if (segment.kind === "regex") return `${isRoot ? "" : "."}{regex:${JSON.stringify({
		source: segment.matcher.source,
		flags: segment.matcher.flags
	})}}`;
	if (segment.kind === "ignore-regex") return `${isRoot ? "" : "."}{ignore-regex:${JSON.stringify({
		source: segment.matcher.source,
		flags: segment.matcher.flags
	})}}`;
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
const toPublicPathSegment = (segment) => {
	if (segment.kind === "property") return segment.value;
	if (segment.kind === "index") return segment.value;
	if (segment.kind === "wildcard") return Object.freeze({ any: true });
	if (segment.kind === "recursive-wildcard") return Object.freeze({ anyDepth: true });
	if (segment.kind === "ignore-property") return Object.freeze({ ignore: segment.value });
	if (segment.kind === "ignore-index") return Object.freeze({ ignore: segment.value });
	if (segment.kind === "regex") return new RegExp(segment.matcher.source, segment.matcher.flags);
	return Object.freeze({ ignore: new RegExp(segment.matcher.source, segment.matcher.flags) });
};
const compileRulePath = (segments) => {
	return Object.freeze(segments.map(toPublicPathSegment));
};
const createDefaultPolicy = (options) => {
	return Object.freeze({
		censor: options.censor,
		remove: options.remove ?? false,
		replaceStringByLength: options.replaceStringByLength ?? false,
		retainStructure: options.retainStructure ?? false
	});
};
const createKeyMatchDefaults = (options) => {
	return Object.freeze({
		caseSensitiveKeyMatch: options.caseSensitiveKeyMatch ?? true,
		fuzzyKeyMatch: options.fuzzyKeyMatch ?? false
	});
};
const mergePolicy = (defaults, overrides) => {
	return Object.freeze({
		censor: overrides.censor ?? defaults.censor,
		remove: overrides.remove ?? defaults.remove,
		replaceStringByLength: overrides.replaceStringByLength ?? defaults.replaceStringByLength,
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
	const rulePath = compileRulePath(parsedPath.segments);
	if (parsedPath.segments.some(isDynamicPathSegment)) return Object.freeze({
		signature: renderSelectorSignature(parsedPath.segments),
		policy,
		rulePath,
		segments: parsedPath.segments
	});
	const normalisedPath = normaliseParsedPath(parsedPath);
	return Object.freeze({
		canonicalPath: normalisedPath.canonicalPath,
		policy,
		rulePath,
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
const isKeyRule = (keySelector) => {
	return typeof keySelector === "object" && keySelector !== null && !(keySelector instanceof RegExp) && "key" in keySelector;
};
const toLiteralKeyRule = (keySelector, defaults) => {
	const configuredKey = typeof keySelector === "string" ? keySelector : keySelector.key;
	const fuzzyKeyMatch = typeof keySelector === "string" ? defaults.fuzzyKeyMatch : keySelector.fuzzyKeyMatch ?? defaults.fuzzyKeyMatch;
	const caseSensitiveKeyMatch = typeof keySelector === "string" ? defaults.caseSensitiveKeyMatch : keySelector.caseSensitiveKeyMatch ?? defaults.caseSensitiveKeyMatch;
	let matchMode = "exact";
	if (fuzzyKeyMatch) matchMode = caseSensitiveKeyMatch ? "contains" : "canonical-contains";
	else if (!caseSensitiveKeyMatch) matchMode = "canonical-exact";
	return Object.freeze({
		canonicalKey: canonicaliseKey(configuredKey),
		configuredKey,
		matchMode,
		rulePath: Object.freeze([configuredKey])
	});
};
const compileExactKeyRules = (keys, defaults, keyDefaults) => {
	const literalMatchers = [];
	for (const key of keys) if (typeof key === "string" || isKeyRule(key)) literalMatchers.push(toLiteralKeyRule(key, keyDefaults));
	return Object.freeze({
		literalMatchers: Object.freeze(literalMatchers),
		policy: defaults,
		requiresCanonicalKey: literalMatchers.some((rule) => rule.matchMode.startsWith("canonical"))
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
const isSubstringRule = (stringTest) => {
	return !(stringTest instanceof RegExp);
};
const compileSubstringRules = (stringTests, defaults) => {
	return Object.freeze(stringTests.map((stringTest) => {
		if (isSubstringRule(stringTest)) return Object.freeze({
			kind: "structured-replacer",
			pattern: cloneRegExp(stringTest.pattern),
			replacer: stringTest.replacer
		});
		return Object.freeze({
			kind: "whole-value",
			pattern: cloneRegExp(stringTest),
			policy: defaults
		});
	}));
};
const compileRedactorPlan = (options = {}) => {
	const defaults = createDefaultPolicy(options);
	const keyDefaults = createKeyMatchDefaults(options);
	const compiledPathRules = compilePathRules(options.paths ?? [], defaults);
	return Object.freeze({
		defaults,
		dynamicPathRules: compiledPathRules.dynamicPathRules,
		exactKeyRules: compileExactKeyRules(options.keys ?? [], defaults, keyDefaults),
		exactPathRules: compiledPathRules.exactPathRules,
		ignoredValueTypes: compileIgnoredValueTypes(options.ignoredValueTypes),
		regexKeyRules: compileRegexKeyRules(options.keys ?? [], defaults),
		serialise: options.serialise,
		substringRules: compileSubstringRules(options.stringTests ?? [], defaults),
		transformers: compileTransformers(options.transformers)
	});
};
//#endregion
//#region src/core/replacement/apply-redaction.ts
const defaultCensor = "[REDACTED]";
const removedValue = Symbol("deep-redact.removed");
const isRemovedValue = (value) => {
	return value === removedValue;
};
const buildSameLengthReplacement = (token, targetLength) => {
	if (targetLength === 0) return "";
	const tokenLength = token.length;
	if (tokenLength === 0) return "";
	const quotient = Math.floor(targetLength / tokenLength);
	const remainder = targetLength % tokenLength;
	return token.repeat(quotient) + token.slice(0, remainder);
};
const applyRedaction = (value, policy, context) => {
	if (policy.remove) return removedValue;
	if (typeof policy.censor === "function") return policy.censor.call(void 0, value, context);
	const literalCensor = policy.censor ?? defaultCensor;
	if (policy.replaceStringByLength && typeof value === "string") return buildSameLengthReplacement(literalCensor, value.length);
	return literalCensor;
};
//#endregion
//#region src/transformers/resolve-transformer.ts
const supportedConstructorMatchers = Object.freeze([
	{
		name: "Date",
		matches: (value) => value instanceof Date
	},
	{
		name: "Error",
		matches: (value) => value instanceof Error
	},
	{
		name: "Map",
		matches: (value) => value instanceof Map
	},
	{
		name: "RegExp",
		matches: (value) => value instanceof RegExp
	},
	{
		name: "Set",
		matches: (value) => value instanceof Set
	},
	{
		name: "URL",
		matches: (value) => value instanceof URL
	}
]);
const resolveSupportedConstructorName = (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return;
	for (const matcher of supportedConstructorMatchers) if (matcher.matches(value)) return matcher.name;
};
const resolveSupportedTransformableValueKind = (value) => {
	if (typeof value === "bigint") return "bigint";
	return resolveSupportedConstructorName(value);
};
const isSupportedTransformableObject = (value) => {
	return resolveSupportedConstructorName(value) !== void 0;
};
const isSupportedTransformableValue = (value) => {
	return resolveSupportedTransformableValueKind(value) !== void 0;
};
const applyFirstChangingTransformer = (value, transformers) => {
	for (const transformer of transformers) {
		const transformed = transformer(value);
		if (transformed !== value) return transformed;
	}
};
const resolveTransformedValue = (value, plan) => {
	const supportedValueKind = resolveSupportedTransformableValueKind(value);
	if (supportedValueKind === void 0) return;
	if (supportedValueKind === "bigint") return applyFirstChangingTransformer(value, [...plan.byType.bigint, ...plan.fallback]);
	return applyFirstChangingTransformer(value, [
		...plan.byType.object,
		...plan.byConstructor[supportedValueKind],
		...plan.fallback
	]);
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
const canRetainStructure = (value) => {
	return isTraversableContainer(value) || isSupportedTransformableValue(value);
};
const hasLookupValue = (table, key) => {
	return Object.hasOwn(table, key);
};
const findMatchingRegexKey = (matchers, key) => {
	return matchers.find((matcher) => {
		matcher.lastIndex = 0;
		return matcher.test(key);
	});
};
const findMatchingLiteralKey = (literalMatchers, requiresCanonicalKey, key) => {
	let canonicalKey;
	for (const rule of literalMatchers) {
		if (rule.matchMode === "exact" && key === rule.configuredKey) return rule;
		if (rule.matchMode === "contains" && key.includes(rule.configuredKey)) return rule;
		if (requiresCanonicalKey && (rule.matchMode === "canonical-exact" || rule.matchMode === "canonical-contains")) {
			canonicalKey ??= canonicaliseKey(key);
			if (rule.matchMode === "canonical-exact" && canonicalKey === rule.canonicalKey) return rule;
			if (rule.matchMode === "canonical-contains" && canonicalKey.includes(rule.canonicalKey)) return rule;
		}
	}
};
const renderPathSegmentText = (pathSegment) => {
	return pathSegment.kind === "index" ? String(pathSegment.value) : pathSegment.value;
};
const createTraversalState = () => {
	return {
		completedIdentities: /* @__PURE__ */ new WeakMap(),
		completedSnapshots: /* @__PURE__ */ new WeakMap()
	};
};
const createTraversalBranchState = () => {
	return { activePaths: /* @__PURE__ */ new WeakMap() };
};
const renderRulePathSegment = (segment) => {
	if (typeof segment === "string") return `property:${segment}`;
	if (typeof segment === "number") return `index:${segment}`;
	if (segment instanceof RegExp) return `regex:${segment.source}/${segment.flags}`;
	if ("any" in segment && segment.any === true) return "wildcard:*";
	if ("anyDepth" in segment && segment.anyDepth === true) return "wildcard:**";
	if (!("ignore" in segment)) return "unknown";
	const ignored = segment.ignore;
	if (ignored instanceof RegExp) return `ignore-regex:${ignored.source}/${ignored.flags}`;
	return typeof ignored === "number" ? `ignore-index:${ignored}` : `ignore-property:${ignored}`;
};
const buildRuleContextKey = (activePolicy) => {
	if (activePolicy === void 0) return "none";
	return `${activePolicy.source}:${activePolicy.rulePath.map(renderRulePathSegment).join("|")}`;
};
const usesPathSensitivePolicy = (activePolicy) => {
	return activePolicy?.source === "exact-path" || activePolicy?.source === "dynamic-path" || typeof activePolicy?.policy.censor === "function";
};
const createCircularMarker = (originalPath, path) => {
	return {
		_transformer: "circular",
		path,
		value: originalPath
	};
};
const resolveCompletedTraversal = (records, canonicalPath, ruleContextKey, value) => {
	const reusableRecord = records.find((record) => {
		return record.ruleContextKey === ruleContextKey && (record.pathStable || record.canonicalPath === canonicalPath);
	});
	if (reusableRecord !== void 0) return {
		cacheValue: reusableRecord.value,
		changed: reusableRecord.value !== value,
		pathStable: reusableRecord.pathStable,
		value: reusableRecord.value
	};
};
const storeCompletedTraversal = (state, value, record) => {
	const existingRecords = state.completedIdentities.get(value);
	if (existingRecords === void 0) {
		state.completedIdentities.set(value, [record]);
		return;
	}
	existingRecords.push(record);
};
const storeCompletedSnapshot = (state, value, snapshot) => {
	state.completedSnapshots.set(value, snapshot);
};
const withActiveIdentity = (branchState, value, canonicalPath, run) => {
	branchState.activePaths.set(value, canonicalPath);
	try {
		return run();
	} finally {
		branchState.activePaths.delete(value);
	}
};
const resolveDirectKeyMatch = (plan, key) => {
	const matchingLiteralRule = findMatchingLiteralKey(plan.exactKeyRules.literalMatchers, plan.exactKeyRules.requiresCanonicalKey, key);
	if (matchingLiteralRule !== void 0) return {
		source: "exact-key",
		rulePath: matchingLiteralRule.rulePath
	};
	const matchingRegex = findMatchingRegexKey(plan.regexKeyRules.matchers, key);
	if (matchingRegex !== void 0) return {
		source: "regex-key",
		rulePath: Object.freeze([matchingRegex])
	};
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
	if (selectorSegment.kind === "regex") return selectorSegment.matcher.test(renderPathSegmentText(pathSegment));
	if (selectorSegment.kind === "ignore-regex") return !selectorSegment.matcher.test(renderPathSegmentText(pathSegment));
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
		source: "exact-path",
		rulePath: exactPathRule.rulePath
	};
	if (dynamicPathRule !== void 0) return {
		policy: dynamicPathRule.policy,
		source: "dynamic-path",
		rulePath: dynamicPathRule.rulePath
	};
	if (inheritedPolicy?.source === "exact-path" || inheritedPolicy?.source === "dynamic-path") return inheritedPolicy;
	if (directKeyMatch?.source === "exact-key") return {
		policy: plan.exactKeyRules.policy,
		source: "exact-key",
		rulePath: directKeyMatch.rulePath
	};
	if (directKeyMatch?.source === "regex-key") return {
		policy: plan.regexKeyRules.policy,
		source: "regex-key",
		rulePath: directKeyMatch.rulePath
	};
	return inheritedPolicy;
};
const buildFunctionCensorContext = (pathSegments, rulePath, rootInput) => {
	const matchedPath = Object.freeze(pathSegments.map((seg) => seg.value));
	const rulePathCopy = Object.freeze([...rulePath]);
	const terminalKey = matchedPath.length > 0 ? matchedPath[matchedPath.length - 1] : void 0;
	return terminalKey !== void 0 ? {
		matchedPath,
		rulePath: rulePathCopy,
		rootInput,
		terminalKey
	} : {
		matchedPath,
		rulePath: rulePathCopy,
		rootInput
	};
};
const buildSubstringRulePath = (pattern) => {
	return Object.freeze([cloneRegExp(pattern)]);
};
const patternMatchesString = (pattern, value) => {
	pattern.lastIndex = 0;
	const matched = pattern.test(value);
	pattern.lastIndex = 0;
	return matched;
};
const applySubstringRule = (value, rule, context) => {
	if (!patternMatchesString(rule.pattern, value)) return;
	if (rule.kind === "structured-replacer") {
		const replacement = rule.replacer(value, cloneRegExp(rule.pattern));
		return {
			cacheValue: replacement,
			changed: replacement !== value,
			pathStable: true,
			value: replacement
		};
	}
	const fnContext = buildFunctionCensorContext(context.pathSegments, buildSubstringRulePath(rule.pattern), context.rootInput);
	const redactedValue = applyRedaction(value, rule.policy, fnContext);
	return {
		cacheValue: redactedValue,
		changed: true,
		pathStable: typeof rule.policy.censor !== "function",
		value: redactedValue
	};
};
const applyRootPrimitiveSubstringMatch = (value, rule, plan, context) => {
	if (!patternMatchesString(rule.pattern, value)) return;
	const fnContext = buildFunctionCensorContext(context.pathSegments, buildSubstringRulePath(rule.pattern), context.rootInput);
	const policy = rule.kind === "whole-value" ? rule.policy : plan.defaults;
	const redactedValue = applyRedaction(value, policy, fnContext);
	return {
		cacheValue: redactedValue,
		changed: true,
		pathStable: typeof policy.censor !== "function",
		value: redactedValue
	};
};
const transformSubstringValue = (value, plan, context) => {
	if (typeof value !== "string") return;
	const isRootInput = context.pathSegments.length === 0;
	for (const rule of plan.substringRules) {
		const result = isRootInput ? applyRootPrimitiveSubstringMatch(value, rule, plan, context) : applySubstringRule(value, rule, context);
		if (result !== void 0) return result;
	}
};
const syncCompletedSnapshot = (state, identity, value) => {
	if (!isTraversableContainer(value)) return;
	const snapshot = state.completedSnapshots.get(value);
	if (snapshot !== void 0) state.completedSnapshots.set(identity, snapshot);
};
const transformTrackedIdentity = (identity, plan, context, activePolicy, state, branchState, traverse) => {
	const canonicalPath = context.canonicalPath ?? "";
	const originalPath = branchState.activePaths.get(identity);
	if (originalPath !== void 0) {
		const circularMarker = createCircularMarker(originalPath ?? "", canonicalPath);
		return {
			cacheValue: circularMarker,
			changed: true,
			pathStable: false,
			value: circularMarker
		};
	}
	const completedRecords = state.completedIdentities.get(identity);
	const ruleContextKey = buildRuleContextKey(activePolicy);
	const completedResult = completedRecords === void 0 ? void 0 : resolveCompletedTraversal(completedRecords, canonicalPath, ruleContextKey, identity);
	if (completedResult !== void 0) return completedResult;
	if (completedRecords !== void 0) {
		const snapshot = state.completedSnapshots.get(identity);
		if (snapshot !== void 0) return replayCompletedTraversal(identity, snapshot, plan, activePolicy, context, ruleContextKey, state, branchState);
	}
	return withActiveIdentity(branchState, identity, canonicalPath, () => {
		const result = traverse();
		storeCompletedTraversal(state, identity, {
			canonicalPath,
			pathStable: result.pathStable,
			ruleContextKey,
			value: result.cacheValue
		});
		return result;
	});
};
const transformArray = (value, plan, inheritedPolicy, canonicalPath, pathSegments, rootInput, suppressDescendantRedaction, state, branchState) => {
	const cacheValue = new Array(value.length);
	const snapshotItems = new Array(value.length);
	let transformedValue;
	const removedIndexes = [];
	let changed = false;
	let pathStable = true;
	for (let index = 0; index < value.length; index += 1) {
		if (!(index in value)) continue;
		const item = value[index];
		snapshotItems[index] = {
			present: true,
			value: item
		};
		const pathSegment = createIndexPathSegment(index);
		const itemResult = transformNode(item, plan, {
			canonicalPath: appendCanonicalPathSegment(canonicalPath, pathSegment),
			inheritedPolicy,
			pathSegments: Object.freeze([...pathSegments, pathSegment]),
			rootInput,
			suppressDescendantRedaction
		}, state, branchState);
		pathStable &&= itemResult.pathStable;
		if (isRemovedValue(itemResult.value)) {
			if (transformedValue === void 0) transformedValue = value.slice();
			changed = true;
			removedIndexes.push(index);
			continue;
		}
		cacheValue[index] = itemResult.cacheValue;
		if (!itemResult.changed) continue;
		if (transformedValue === void 0) transformedValue = value.slice();
		changed = true;
		transformedValue[index] = itemResult.value;
	}
	storeCompletedSnapshot(state, value, {
		items: snapshotItems,
		kind: "array"
	});
	if (transformedValue === void 0) return {
		cacheValue,
		changed: false,
		pathStable,
		value
	};
	if (removedIndexes.length === 0) return {
		cacheValue,
		changed,
		pathStable,
		value: transformedValue
	};
	const compactedValue = transformedValue.slice();
	const compactedCacheValue = cacheValue.slice();
	let removedCount = 0;
	for (const removedIndex of removedIndexes) {
		compactedValue.splice(removedIndex - removedCount, 1);
		compactedCacheValue.splice(removedIndex - removedCount, 1);
		removedCount += 1;
	}
	return {
		cacheValue: compactedCacheValue,
		changed,
		pathStable,
		value: compactedValue
	};
};
const transformObject = (value, plan, inheritedPolicy, canonicalPath, pathSegments, rootInput, suppressDescendantRedaction, state, branchState) => {
	const cacheValue = {};
	const snapshotEntries = [];
	let changed = false;
	let pathStable = true;
	let transformedValue;
	for (const [key, propertyValue] of Object.entries(value)) {
		snapshotEntries.push({
			key,
			value: propertyValue
		});
		const pathSegment = createPropertyPathSegment(key);
		const propertyResult = transformNode(propertyValue, plan, {
			canonicalPath: appendCanonicalPathSegment(canonicalPath, pathSegment),
			directKeyMatch: resolveDirectKeyMatch(plan, key),
			inheritedPolicy,
			pathSegments: Object.freeze([...pathSegments, pathSegment]),
			rootInput,
			suppressDescendantRedaction
		}, state, branchState);
		pathStable &&= propertyResult.pathStable;
		if (isRemovedValue(propertyResult.value)) {
			if (transformedValue === void 0) transformedValue = { ...value };
			changed = true;
			delete transformedValue[key];
			continue;
		}
		cacheValue[key] = propertyResult.cacheValue;
		if (!propertyResult.changed) continue;
		if (transformedValue === void 0) transformedValue = { ...value };
		changed = true;
		transformedValue[key] = propertyResult.value;
	}
	storeCompletedSnapshot(state, value, {
		entries: snapshotEntries,
		kind: "object"
	});
	return {
		cacheValue,
		changed,
		pathStable,
		value: changed ? transformedValue : value
	};
};
const transformCompletedArray = (snapshot, plan, inheritedPolicy, canonicalPath, pathSegments, rootInput, suppressDescendantRedaction, state, branchState) => {
	const cacheValue = new Array(snapshot.items.length);
	const transformedValue = new Array(snapshot.items.length);
	const removedIndexes = [];
	let pathStable = true;
	for (let index = 0; index < snapshot.items.length; index += 1) {
		const itemSnapshot = snapshot.items[index];
		if (itemSnapshot === void 0 || !itemSnapshot.present) continue;
		const pathSegment = createIndexPathSegment(index);
		const itemPath = appendCanonicalPathSegment(canonicalPath, pathSegment);
		const itemResult = transformNode(itemSnapshot.value, plan, {
			canonicalPath: itemPath,
			inheritedPolicy,
			pathSegments: Object.freeze([...pathSegments, pathSegment]),
			rootInput,
			suppressDescendantRedaction
		}, state, branchState);
		pathStable &&= itemResult.pathStable;
		if (isRemovedValue(itemResult.value)) {
			removedIndexes.push(index);
			continue;
		}
		cacheValue[index] = itemResult.cacheValue;
		transformedValue[index] = itemResult.value;
	}
	if (removedIndexes.length === 0) return {
		cacheValue,
		changed: true,
		pathStable,
		value: transformedValue
	};
	const compactedCacheValue = cacheValue.slice();
	const compactedValue = transformedValue.slice();
	let removedCount = 0;
	for (const removedIndex of removedIndexes) {
		compactedCacheValue.splice(removedIndex - removedCount, 1);
		compactedValue.splice(removedIndex - removedCount, 1);
		removedCount += 1;
	}
	return {
		cacheValue: compactedCacheValue,
		changed: true,
		pathStable,
		value: compactedValue
	};
};
const transformCompletedObject = (snapshot, plan, inheritedPolicy, canonicalPath, pathSegments, rootInput, suppressDescendantRedaction, state, branchState) => {
	const cacheValue = {};
	const transformedValue = {};
	let pathStable = true;
	for (const entry of snapshot.entries) {
		const pathSegment = createPropertyPathSegment(entry.key);
		const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment);
		const propertyResult = transformNode(entry.value, plan, {
			canonicalPath: propertyPath,
			directKeyMatch: resolveDirectKeyMatch(plan, entry.key),
			inheritedPolicy,
			pathSegments: Object.freeze([...pathSegments, pathSegment]),
			rootInput,
			suppressDescendantRedaction
		}, state, branchState);
		pathStable &&= propertyResult.pathStable;
		if (isRemovedValue(propertyResult.value)) continue;
		cacheValue[entry.key] = propertyResult.cacheValue;
		transformedValue[entry.key] = propertyResult.value;
	}
	return {
		cacheValue,
		changed: true,
		pathStable,
		value: transformedValue
	};
};
const replayCompletedTraversal = (value, snapshot, plan, inheritedPolicy, context, ruleContextKey, state, branchState) => {
	const canonicalPath = context.canonicalPath ?? "";
	const result = withActiveIdentity(branchState, value, canonicalPath, () => {
		return snapshot.kind === "array" ? transformCompletedArray(snapshot, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput, context.suppressDescendantRedaction, state, branchState) : transformCompletedObject(snapshot, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput, context.suppressDescendantRedaction, state, branchState);
	});
	storeCompletedTraversal(state, value, {
		canonicalPath,
		pathStable: result.pathStable,
		ruleContextKey,
		value: result.cacheValue
	});
	return result;
};
const transformResolvedNode = (value, plan, context, state, branchState) => {
	const activePolicy = context.suppressDescendantRedaction ? void 0 : selectActivePolicy(plan, resolveExactPathRule(plan, context.canonicalPath), resolveDynamicPathRule(plan, context.pathSegments), context.directKeyMatch, context.inheritedPolicy);
	if (activePolicy !== void 0 && (!activePolicy.policy.retainStructure || !canRetainStructure(value))) {
		const fnContext = buildFunctionCensorContext(context.pathSegments, activePolicy.rulePath, context.rootInput);
		const redactedValue = applyRedaction(value, activePolicy.policy, fnContext);
		return {
			cacheValue: redactedValue,
			changed: true,
			pathStable: !usesPathSensitivePolicy(activePolicy),
			value: redactedValue
		};
	}
	if (!isTraversableContainer(value)) {
		const substringResult = context.suppressDescendantRedaction ? void 0 : transformSubstringValue(value, plan, context);
		if (substringResult !== void 0) return substringResult;
		return {
			cacheValue: value,
			changed: false,
			pathStable: true,
			value
		};
	}
	const inheritedPolicy = activePolicy;
	return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
		return Array.isArray(value) ? transformArray(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput, context.suppressDescendantRedaction, state, branchState) : transformObject(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput, context.suppressDescendantRedaction, state, branchState);
	});
};
const transformSupportedRuntimeValue = (value, plan, context, activePolicy, state, branchState) => {
	const supportedValueKind = resolveSupportedTransformableValueKind(value);
	if (supportedValueKind === void 0) return;
	const transformedValue = resolveTransformedValue(value, plan.transformers);
	if (transformedValue === void 0) return;
	const traverseResolvedValue = (suppressDescendantRedaction = false) => {
		const result = transformResolvedNode(transformedValue, plan, {
			...context,
			suppressDescendantRedaction
		}, state, branchState);
		return {
			cacheValue: result.cacheValue,
			changed: true,
			pathStable: result.pathStable,
			value: result.value
		};
	};
	if (plan.ignoredValueTypes[supportedValueKind]) {
		if (!isSupportedTransformableObject(value)) return traverseResolvedValue(true);
		return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
			const result = traverseResolvedValue(true);
			syncCompletedSnapshot(state, value, transformedValue);
			return result;
		});
	}
	if (!isSupportedTransformableObject(value)) return traverseResolvedValue();
	return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
		const result = traverseResolvedValue();
		syncCompletedSnapshot(state, value, transformedValue);
		return result;
	});
};
const transformNode = (value, plan, context, state, branchState) => {
	const activePolicy = context.suppressDescendantRedaction ? void 0 : selectActivePolicy(plan, resolveExactPathRule(plan, context.canonicalPath), resolveDynamicPathRule(plan, context.pathSegments), context.directKeyMatch, context.inheritedPolicy);
	if (activePolicy !== void 0 && (!activePolicy.policy.retainStructure || !canRetainStructure(value))) {
		const fnContext = buildFunctionCensorContext(context.pathSegments, activePolicy.rulePath, context.rootInput);
		const redactedValue = applyRedaction(value, activePolicy.policy, fnContext);
		return {
			cacheValue: redactedValue,
			changed: true,
			pathStable: !usesPathSensitivePolicy(activePolicy),
			value: redactedValue
		};
	}
	const transformedResult = transformSupportedRuntimeValue(value, plan, context, activePolicy, state, branchState);
	if (transformedResult !== void 0) return transformedResult;
	if (!isTraversableContainer(value)) {
		const substringResult = context.suppressDescendantRedaction ? void 0 : transformSubstringValue(value, plan, context);
		if (substringResult !== void 0) return substringResult;
		return {
			cacheValue: value,
			changed: false,
			pathStable: true,
			value
		};
	}
	const inheritedPolicy = activePolicy;
	return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
		return Array.isArray(value) ? transformArray(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput, context.suppressDescendantRedaction, state, branchState) : transformObject(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput, context.suppressDescendantRedaction, state, branchState);
	});
};
const redactValue = (value, plan) => {
	const state = createTraversalState();
	const branchState = createTraversalBranchState();
	const result = transformNode(value, plan, {
		canonicalPath: void 0,
		inheritedPolicy: void 0,
		pathSegments: Object.freeze([]),
		rootInput: value
	}, state, branchState);
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
const validateRegexPathSegments = (segments, path, issues) => {
	let valid = true;
	for (const segment of segments) {
		if (segment.kind !== "regex" && segment.kind !== "ignore-regex") continue;
		const unsupportedRegexMessage = getUnsupportedRegexMessage(segment.matcher, "Regex path segment");
		if (unsupportedRegexMessage !== void 0) {
			pushIssue$1(issues, path, unsupportedRegexMessage);
			valid = false;
		}
	}
	return valid;
};
const validatePathSelectors = (selectorCandidates, issues) => {
	const seenCanonicalPaths = /* @__PURE__ */ new Map();
	const seenDynamicSelectors = /* @__PURE__ */ new Map();
	for (const selectorCandidate of selectorCandidates) try {
		const parsedPath = parsePathSelector(selectorCandidate.selector);
		if (!validateRegexPathSegments(parsedPath.segments, selectorCandidate.configPath, issues)) continue;
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
	"caseSensitiveKeyMatch",
	"censor",
	"fuzzyKeyMatch",
	"keys",
	"paths",
	"remove",
	"replaceStringByLength",
	"retainStructure",
	"ignoredValueTypes",
	"serialise",
	"stringTests",
	"transformers"
]);
const pathRuleOptionNames = new Set([
	"path",
	"censor",
	"remove",
	"replaceStringByLength",
	"retainStructure"
]);
const substringRuleOptionNames = new Set(["pattern", "replacer"]);
const keyRuleOptionNames = new Set([
	"caseSensitiveKeyMatch",
	"fuzzyKeyMatch",
	"key"
]);
const transformerOptionNames = new Set([
	"byType",
	"byConstructor",
	"fallback"
]);
const transformerByTypeOptionNames = new Set(["bigint", "object"]);
const transformerByConstructorOptionNames = new Set([
	"Date",
	"Error",
	"Map",
	"RegExp",
	"Set",
	"URL"
]);
const ignoredValueTypeOptionNames = new Set([
	"bigint",
	"Date",
	"Error",
	"Map",
	"RegExp",
	"Set",
	"URL"
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
	if (value.remove === true && value.replaceStringByLength === true) pushIssue(issues, path, "remove cannot be combined with replaceStringByLength.");
	if (value.replaceStringByLength === true && value.censor === "") pushIssue(issues, path, "replaceStringByLength cannot be combined with an empty string censor.");
};
const regexLikeKeySelectorPattern = /^\/.+\/[A-Za-z]*$/;
const getUnsupportedKeySelectorMessage = (selector) => {
	if (selector.startsWith("!")) return `Unsupported exclusion key selector "${selector}". Ignore selectors must use structured selector objects and are not supported in this configuration format.`;
	if (selector.includes("**")) return `Unsupported recursive wildcard key selector "${selector}".`;
	if (selector.includes("*")) return `Unsupported wildcard key selector "${selector}".`;
	if (regexLikeKeySelectorPattern.test(selector)) return `Unsupported regex-like key selector "${selector}".`;
};
const getUnsupportedKeyRegexMessage = (selector) => {
	return getUnsupportedRegexMessage(selector, "Regex key selector");
};
const validateLiteralKeySelector = (entry, path, issues) => {
	if (entry.length === 0) {
		pushIssue(issues, path, "key selectors must not be empty.");
		return;
	}
	const unsupportedSelectorMessage = getUnsupportedKeySelectorMessage(entry);
	if (unsupportedSelectorMessage !== void 0) pushIssue(issues, path, unsupportedSelectorMessage);
};
const validateKeyRule = (value, path, issues) => {
	validateAllowedOptions(value, keyRuleOptionNames, path, issues);
	if (typeof value.key !== "string") pushIssue(issues, `${path}.key`, "key must be a string.");
	else if (value.key.length === 0) pushIssue(issues, `${path}.key`, "key must not be empty.");
	else {
		const unsupportedSelectorMessage = getUnsupportedKeySelectorMessage(value.key);
		if (unsupportedSelectorMessage !== void 0) pushIssue(issues, `${path}.key`, unsupportedSelectorMessage);
	}
	validateBooleanOption(value.fuzzyKeyMatch, path, "fuzzyKeyMatch", issues);
	validateBooleanOption(value.caseSensitiveKeyMatch, path, "caseSensitiveKeyMatch", issues);
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
		if (typeof entry === "string") {
			validateLiteralKeySelector(entry, entryPath, issues);
			return;
		}
		if (isPlainObject(entry)) {
			validateKeyRule(entry, entryPath, issues);
			return;
		}
		pushIssue(issues, entryPath, "key selectors must be strings or RegExp instances or key-rule objects.");
	});
};
const zeroLengthProbeValues = Object.freeze([
	"",
	"a",
	"safe",
	"secret",
	"token=secret",
	"api-key=secret",
	"prefix-secret-suffix"
]);
const patternCanMatchZeroLength = (pattern) => {
	const matcher = new RegExp(pattern.source, pattern.flags);
	return zeroLengthProbeValues.some((probe) => {
		matcher.lastIndex = 0;
		const match = matcher.exec(probe);
		matcher.lastIndex = 0;
		return match?.[0] === "";
	});
};
const validateSubstringPattern = (pattern, path, issues) => {
	const unsupportedRegexMessage = getUnsupportedRegexMessage(pattern, "Substring rule pattern", { allowGlobal: true });
	if (unsupportedRegexMessage !== void 0) pushIssue(issues, path, unsupportedRegexMessage);
	if (patternCanMatchZeroLength(pattern)) pushIssue(issues, path, "Substring rule pattern must not match zero-length strings.");
};
const validateStringTests = (value, path, issues) => {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		pushIssue(issues, path, "stringTests must be an array.");
		return;
	}
	value.forEach((entry, index) => {
		const entryPath = `${path}[${index}]`;
		if (isRegExp(entry)) {
			validateSubstringPattern(entry, entryPath, issues);
			return;
		}
		if (!isPlainObject(entry)) {
			pushIssue(issues, entryPath, "string test entries must be RegExp instances or substring rule objects.");
			return;
		}
		validateAllowedOptions(entry, substringRuleOptionNames, entryPath, issues);
		if (!isRegExp(entry.pattern)) pushIssue(issues, `${entryPath}.pattern`, "pattern must be a RegExp instance.");
		else validateSubstringPattern(entry.pattern, `${entryPath}.pattern`, issues);
		if (typeof entry.replacer !== "function") pushIssue(issues, `${entryPath}.replacer`, "replacer must be a function.");
	});
};
const validateTransformerEntries = (value, path, issues) => {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		pushIssue(issues, path, `${path.split(".").at(-1) ?? "transformers"} must be an array.`);
		return;
	}
	value.forEach((entry, index) => {
		if (typeof entry !== "function") pushIssue(issues, `${path}[${index}]`, "Transformer entries must be functions.");
	});
};
const validateTransformerBuckets = (value, path, allowedOptions, issues) => {
	if (value === void 0) return;
	if (!isPlainObject(value)) {
		pushIssue(issues, path, `${path.split(".").at(-1) ?? "bucket"} must be an object.`);
		return;
	}
	validateAllowedOptions(value, allowedOptions, path, issues);
	for (const [bucketName, entries] of Object.entries(value)) {
		if (!allowedOptions.has(bucketName)) continue;
		validateTransformerEntries(entries, `${path}.${bucketName}`, issues);
	}
};
const validateTransformers = (value, path, issues) => {
	if (value === void 0) return;
	if (!isPlainObject(value)) {
		pushIssue(issues, path, "transformers must be an object.");
		return;
	}
	validateAllowedOptions(value, transformerOptionNames, path, issues);
	validateTransformerBuckets(value.byType, `${path}.byType`, transformerByTypeOptionNames, issues);
	validateTransformerBuckets(value.byConstructor, `${path}.byConstructor`, transformerByConstructorOptionNames, issues);
	validateTransformerEntries(value.fallback, `${path}.fallback`, issues);
};
const validateIgnoredValueTypes = (value, path, issues) => {
	if (value === void 0) return;
	if (!isPlainObject(value)) {
		pushIssue(issues, path, "ignoredValueTypes must be an object.");
		return;
	}
	validateAllowedOptions(value, ignoredValueTypeOptionNames, path, issues);
	for (const optionName of Object.keys(value)) {
		if (!ignoredValueTypeOptionNames.has(optionName)) continue;
		validateBooleanOption(value[optionName], path, optionName, issues);
	}
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
	validateBooleanOption(value.replaceStringByLength, path, "replaceStringByLength", issues);
	const effectiveReplaceStringByLength = typeof value.replaceStringByLength === "boolean" ? value.replaceStringByLength : defaults.replaceStringByLength;
	validateConflictingOptions({
		censor: value.censor ?? defaults.censor,
		remove: value.remove ?? defaults.remove,
		retainStructure: value.retainStructure ?? defaults.retainStructure,
		replaceStringByLength: effectiveReplaceStringByLength
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
	validateBooleanOption(options.caseSensitiveKeyMatch, "options", "caseSensitiveKeyMatch", issues);
	validateCensorOption(options.censor, "options", issues);
	validateBooleanOption(options.fuzzyKeyMatch, "options", "fuzzyKeyMatch", issues);
	validateIgnoredValueTypes(options.ignoredValueTypes, "options.ignoredValueTypes", issues);
	validateKeys(options.keys, "options.keys", issues);
	validateStringTests(options.stringTests, "options.stringTests", issues);
	validateTransformers(options.transformers, "options.transformers", issues);
	validateBooleanOption(options.remove, "options", "remove", issues);
	validateBooleanOption(options.retainStructure, "options", "retainStructure", issues);
	validateBooleanOption(options.replaceStringByLength, "options", "replaceStringByLength", issues);
	validateSerialiseOption(options.serialise, "options", issues);
	validateConflictingOptions({
		censor: options.censor,
		remove: options.remove === true,
		retainStructure: options.retainStructure === true,
		replaceStringByLength: options.replaceStringByLength === true
	}, "options", issues);
	validatePaths(options.paths, "options.paths", {
		censor: options.censor,
		remove: options.remove === true,
		retainStructure: options.retainStructure === true,
		replaceStringByLength: options.replaceStringByLength === true
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
