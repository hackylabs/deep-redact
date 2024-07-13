export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object';
export interface BlacklistKeyConfig {
    fuzzyKeyMatch?: boolean;
    caseSensitiveKeyMatch?: boolean;
    retainStructure?: boolean;
    key: string;
}
export interface RedactionConfig {
    blacklistedKeys?: Array<string | BlacklistKeyConfig>;
    stringTests?: RegExp[];
    fuzzyKeyMatch?: boolean;
    caseSensitiveKeyMatch?: boolean;
    retainStructure?: boolean;
    replaceStringByLength?: boolean;
    replacement?: string;
    types?: Types[];
}
export declare class Redaction {
    private readonly config;
    constructor(config: RedactionConfig);
    private complexShouldRedact;
    private shouldReactObjectValue;
    private deepRedact;
    redact: (value: unknown) => unknown;
}
