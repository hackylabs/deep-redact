type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function';

export interface RedactionConfig {
  blacklistedKeys?: string[]
  stringTests?: RegExp[]
  fuzzy?: boolean
  caseSensitive?: boolean
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
    fuzzy: false,
    caseSensitive: true,
    retainStructure: false,
    replaceStringByLength: false,
    replacement: 'REDACTED',
    types: ['string'],
  };

  constructor(config: RedactionConfig) {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  private deepRedact = (value: unknown, parentShouldRedact = false): unknown => {
    if (!(value instanceof Object)) {
      if (!this.config.types.includes(typeof value)) return value;

      let shouldRedact = parentShouldRedact;

      if (typeof value === 'string') {
        shouldRedact = shouldRedact || this.config.stringTests.some((test) => test.test(value));

        if (!shouldRedact) return value;

        return this.config.replaceStringByLength
          ? this.config.replacement.repeat(value.length)
          : this.config.replacement;
      }

      return shouldRedact ? this.config.replacement : value;
    }

    if (parentShouldRedact && !this.config.retainStructure) {
      return this.config.replacement;
    }

    if (Array.isArray(value)) return value.map((val) => this.deepRedact(val, parentShouldRedact));

    return Object.fromEntries(Object.entries(value).map(([key, val]) => {
      const shouldRedact = parentShouldRedact
        || this.config.blacklistedKeys.some((redactableKey) => {
          if (this.config.fuzzy && this.config.caseSensitive) {
            return key.includes(redactableKey);
          }

          if (this.config.fuzzy && !this.config.caseSensitive) {
            return normaliseString(key).includes(normaliseString(redactableKey));
          }

          if (!this.config.fuzzy && this.config.caseSensitive) {
            return key === redactableKey;
          }

          return normaliseString(key) === normaliseString(redactableKey);
        });

      return [key, this.deepRedact(val, shouldRedact)];
    }));
  };

  redact = (value: unknown): unknown => this.deepRedact(value);
}
