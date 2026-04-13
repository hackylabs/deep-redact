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
//#region src/core/validation/validate-config.ts
const rootOptionNames = new Set([
	"censor",
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
const validatePathRule = (value, path, defaults, issues) => {
	if (!isPlainObject(value)) {
		pushIssue(issues, path, `${path.split(".").at(-1) ?? "entry"} must be a string selector or path-rule object.`);
		return;
	}
	validateAllowedOptions(value, pathRuleOptionNames, path, issues);
	if (typeof value.path !== "string") pushIssue(issues, `${path}.path`, "path must be a string.");
	validateCensorOption(value.censor, path, issues);
	validateBooleanOption(value.remove, path, "remove", issues);
	validateBooleanOption(value.retainStructure, path, "retainStructure", issues);
	validateConflictingOptions({
		censor: value.censor ?? defaults.censor,
		remove: value.remove ?? defaults.remove,
		retainStructure: value.retainStructure ?? defaults.retainStructure
	}, path, issues);
};
const validatePaths = (value, path, defaults, issues) => {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		pushIssue(issues, path, "paths must be an array.");
		return;
	}
	value.forEach((entry, index) => {
		const entryPath = `${path}[${index}]`;
		if (typeof entry === "string") return;
		if (!isPlainObject(entry)) {
			pushIssue(issues, entryPath, `${entryPath.split(".").at(-1) ?? "entry"} must be a string selector or path-rule object.`);
			return;
		}
		validatePathRule(entry, entryPath, defaults, issues);
	});
};
const validateConfig = (options) => {
	const issues = [];
	if (options === void 0) return createValidationReport(issues);
	if (!isPlainObject(options)) {
		pushIssue(issues, "options", "options must be an object.");
		return createValidationReport(issues);
	}
	validateAllowedOptions(options, rootOptionNames, "options", issues);
	validateCensorOption(options.censor, "options", issues);
	validateBooleanOption(options.remove, "options", "remove", issues);
	validateBooleanOption(options.retainStructure, "options", "retainStructure", issues);
	validateSerialiseOption(options.serialise, "options", issues);
	validateConflictingOptions(options, "options", issues);
	validatePaths(options.paths, "options.paths", {
		censor: options.censor,
		remove: options.remove === true,
		retainStructure: options.retainStructure === true
	}, issues);
	return createValidationReport(issues);
};
//#endregion
//#region src/core/create-redactor.ts
const initialisePathEntry = (entry, defaults) => {
	if (typeof entry === "string") return entry;
	return Object.freeze({
		...entry,
		censor: entry.censor ?? defaults.censor,
		remove: entry.remove ?? defaults.remove,
		retainStructure: entry.retainStructure ?? defaults.retainStructure
	});
};
const createInitialisedPlan = (options = {}) => {
	const defaults = {
		censor: options.censor,
		remove: options.remove ?? false,
		retainStructure: options.retainStructure ?? false
	};
	return Object.freeze({
		...defaults,
		paths: Object.freeze((options.paths ?? []).map((entry) => initialisePathEntry(entry, defaults))),
		serialise: options.serialise
	});
};
const applySerialisation = (value, serialise) => {
	if (serialise === true) return JSON.stringify(value);
	if (typeof serialise === "function") return serialise(value);
	return value;
};
const createCallableRedactor = (plan) => {
	return function redact(value) {
		return applySerialisation(value, plan.serialise);
	};
};
const createRedactor$1 = (options) => {
	assertValidConfig(validateConfig(options));
	return createCallableRedactor(createInitialisedPlan(options ?? {}));
};
//#endregion
//#region src/index.ts
const deepRedact = createRedactor$1;
const createRedactor = deepRedact;
//#endregion
export { createRedactor, deepRedact };
