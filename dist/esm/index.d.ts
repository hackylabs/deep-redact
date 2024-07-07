type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function';
export interface RedactionConfig {
    blacklistedKeys?: string[];
    stringTests?: RegExp[];
    fuzzy?: boolean;
    caseSensitive?: boolean;
    retainStructure?: boolean;
    replaceStringByLength?: boolean;
    replacement?: string;
    types?: Types[];
}
export declare class Redaction {
    private readonly config;
    constructor(config: RedactionConfig);
    private deepRedact;
    redact: (value: unknown) => unknown;
}
export {};
