export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object';

export interface BlacklistKeyConfig {
  fuzzyKeyMatch?: boolean
  caseSensitiveKeyMatch?: boolean
  retainStructure?: boolean
  key: string
}

export interface RedactionConfig {
  blacklistedKeys?: Array<string | BlacklistKeyConfig>
  stringTests?: RegExp[]
  fuzzyKeyMatch?: boolean
  caseSensitiveKeyMatch?: boolean
  retainStructure?: boolean
  replaceStringByLength?: boolean
  replacement?: string
  types?: Types[]
}

const normaliseString = (key: string): string => key.toLowerCase().replace(/\W/g, '');

export class Redaction {
  private readonly config: Required<RedactionConfig> = {
    blacklistedKeys: [],
    stringTests: [],
    fuzzyKeyMatch: false,
    caseSensitiveKeyMatch: true,
    retainStructure: false,
    replaceStringByLength: false,
    replacement: '[REDACTED]',
    types: ['string'],
  };

  constructor(config: RedactionConfig) {
    this.config = {
      ...this.config,
      ...config,
      blacklistedKeys: config.blacklistedKeys?.map((key) => {
        if (typeof key === 'string') return key;

        return {
          fuzzyKeyMatch: this.config.fuzzyKeyMatch,
          caseSensitiveKeyMatch: this.config.caseSensitiveKeyMatch,
          retainStructure: this.config.retainStructure,
          ...key,
        };
      }) ?? [],
    };
  }

  private complexShouldRedact = (key: string, config: BlacklistKeyConfig): boolean => {
    if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return key.includes(config.key);

    if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch) return normaliseString(key).includes(normaliseString(config.key));

    if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return key === config.key;

    return normaliseString(config.key) === normaliseString(key);
  }

  private shouldReactObjectValue = (key: string): boolean => {
    return this.config.blacklistedKeys.some((redactableKey) => {
      return typeof redactableKey === 'string'
        ? key === redactableKey
        : this.complexShouldRedact(key, redactableKey);
    });
  }

  private deepRedact = (value: unknown, parentShouldRedact = false): unknown => {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined' || value === null) return value;

    if (!(value instanceof Object)) {
      // @ts-expect-error - we already know that value is not a function, symbol, undefined, null, or an object
      if (!this.config.types.includes(typeof value)) return value;

      let shouldRedact = parentShouldRedact;

      if (typeof value === 'string') {
        shouldRedact = shouldRedact || this.config.stringTests.some((test) => test.test(value));

        if (!shouldRedact) return value;

        return this.config.replaceStringByLength
          ? this.config.replacement.repeat(value.length)
          : this.config.replacement;
      }

      return shouldRedact
        ? this.config.replacement
        : value;
    }


    if (parentShouldRedact && !this.config.retainStructure) return this.config.replacement;

    if (Array.isArray(value)) return value.map((val) => this.deepRedact(val, parentShouldRedact));

    return Object.fromEntries(Object.entries(value).map(([key, val]) => {
      const shouldRedact = parentShouldRedact || this.shouldReactObjectValue(key);
      return [key, this.deepRedact(val, shouldRedact)];
    }));
  };

  redact = (value: unknown): unknown => this.deepRedact(value);
}
