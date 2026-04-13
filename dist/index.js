//#region src/index.ts
const foundationPlaceholderMessage = "Deep Redact v4 foundation placeholder: the runtime redactor is not implemented yet.";
const createPlaceholderRedactor = () => {
	return function redact(_value) {
		throw new Error(foundationPlaceholderMessage);
	};
};
const deepRedact = (_options = {}) => {
	return createPlaceholderRedactor();
};
const createRedactor = deepRedact;
//#endregion
export { createRedactor, deepRedact };
