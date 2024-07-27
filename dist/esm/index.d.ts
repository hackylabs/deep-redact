export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object' | 'function';
export interface BlacklistKeyConfig {
    fuzzyKeyMatch?: boolean;
    caseSensitiveKeyMatch?: boolean;
    retainStructure?: boolean;
    remove?: boolean;
    key: string | RegExp;
}
export interface DeepRedactConfig {
    blacklistedKeys?: Array<string | BlacklistKeyConfig>;
    stringTests?: RegExp[];
    fuzzyKeyMatch?: boolean;
    caseSensitiveKeyMatch?: boolean;
    retainStructure?: boolean;
    replaceStringByLength?: boolean;
    replacement?: string;
    remove?: boolean;
    types?: Types[];
    serialise?: boolean;
    unsupportedTransformer?: (value: unknown) => unknown;
}
declare class DeepRedact {
    private circularReference;
    private readonly config;
    constructor(config: DeepRedactConfig);
    private static unsupportedTransformer;
    private removeCircular;
    private redactString;
    private static complexShouldRedact;
    private shouldRedactObjectValue;
    private deepRedact;
    redact: (value: unknown) => unknown;
}
export { DeepRedact as default, DeepRedact };
