# Deep Redact

[![npm version](https://badge.fury.io/js/@hackylabs%2Fdeep-redact.svg)](https://badge.fury.io/js/@hackylabs%2Fdeep-redact)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/hackylabs/deep-redact/blob/main/LICENSE)

Faster than Fast Redact <sup>1</sup> as well as being safer and more configurable than many other redaction solutions,
Deep Redact is a zero-dependency tool that redacts sensitive information from strings and objects. It is designed to be
used in a production environment where sensitive information needs to be redacted from logs, error messages, files,
and other outputs. Supporting both strings and objects or a mix of both, Deep Redact can be used to redact sensitive
information from more data structures than any other redaction library. Even partially redacting sensitive information
from strings is supported, by way of custom regex patterns and replacers.

Circular references and other unsupported values are handled gracefully, and the library is designed to be as fast as
possible while still being easy to use and configure.

Supporting both CommonJS and ESM, with named and default exports, Deep Redact is designed to be versatile and easy to
use in any modern JavaScript or TypeScript project in Node or the browser.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/hackylabs)

## Installation

```bash
npm install @hackylabs/deep-redact
```

## Usage

<h4 style="color: red">In order to maintain a consistent usage throughout your project, it is not advised to call this
library outside of your global logging/error-reporting libraries.</h4>

```typescript
// ./src/example.ts
import {DeepRedact} from '@hackylabs/deep-redact'; // If you're using CommonJS, import with require('@hackylabs/deep-redact') instead. Both CommonJS and ESM support named and default imports.

const objRedaction = new DeepRedact({
  blacklistedKeys: ['sensitive', 'password', /name/i],
})

const obj = {
  keepThis: 'This is fine',
  sensitive: 'This is not fine',
  user: {
    id: 1,
    password: '<h1><strong>Password</strong></h1>',
    firstName: 'John',
  }
}

// Recursively redact sensitive information from an object
objRedaction.redact(obj)
// {
//  keepThis: 'This is fine',
//  sensitive: '[REDACTED]',
//  user: {
//    id: 1,
//    password: '[REDACTED]',
//    firstName: '[REDACTED]'
//  }
// }

const strRedaction = new DeepRedact({
  partialStringTests: [
    {
      pattern: /<(email|password)>([^<]+)<\/\1>/gi,
      replacer: (value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'),
    },
  ],
})

// Partially redact sensitive information from a string
strRedaction.redact('<email>someone@somewhere.com</email><keepThis>This is fine</keepThis><password>secret</password>')
// '<email>[REDACTED]</email><keepThis>This is fine</keepThis><password>[REDACTED]</password>'
```

// Override the `unsupportedTransformer` method to handle unsupported values

```typescript
class CustomRedaction extends DeepRedact {
  constructor(options) {
    super(options)
    this.rewriteUnsupported = (value) => {
      if (value instanceof BigInt) return value.toString()

      // Add more conditional statements for unsupported value types here (e.g. Error, Date, Map, Set, etc.)

      // If the value is supported, return it
      return value
    }
  }
}

const customRedaction = new CustomRedaction({
  blacklistedKeys: ['sensitive', 'password', /name/i],
})

customRedaction.redact({ a: BigInt(1) })
```

## Configuration

### Main Options

| key | description | type | options | default | required |
| --- | --- | --- | --- | --- | --- |
| blacklistedKeys | Deeply compare names of these keys against the keys in your object. | array | Array<string￨RegExp￨BlacklistKeyConfig> | [] | N |
| stringTests | Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. Will redact whole string values. If you want to redact only part of the string, use `partialStringTests` instead. If a replacer function is provided in the config for the associated test, it will be used to redact the value. | array | Array<RegExp￨StringTestConfig> | [] | N |
| partialStringTests | Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. Will redact only the matched part of the string using the replacer function provided in the config for the associated test. | array | StringTestConfig[] | [] | N |
| fuzzyKeyMatch | Loosely compare key names by checking if the key name of your unredacted object is included anywhere within the name of your blacklisted key. For example, is "pass" (your key) included in "password" (from config). | boolean |  | false | N |
| caseSensitiveKeyMatch | Loosely compare key names by normalising the strings. This involves removing non-word characters and transforms the string to lowercase. This means you never have to worry having to list duplicate keys in different formats such as snake_case, camelCase, PascalCase or any other case. | boolean |  | true | N |
| remove | Determines whether or not to remove the key from the object when it is redacted. | boolean |  | false | N |
| retainStructure | Determines whether or not keep all nested values of a key that is going to be redacted. Circular references are always removed. | boolean |  | false | N |
| replacement | When a value is going to be redacted, what would you like to replace it with? | string ￨ function |  | [REDACTED] | N |
| replaceStringByLength | When a string value is going to be replaced, optionally replace it by repeating the `replacement` to match the length of the value. For example, if `replaceStringByLength` were set to `true` and `replacement` was set to "x", then redacting "secret" would return "xxxxxx". This is sometimes useful for debugging purposes, although it may be less secure as it could give hints to the original value. | boolean |  | false | N |
| types | JS types (values of `typeof` keyword). Only values with a typeof equal to `string`, `number`, `bigint`, `boolean`, `symbol`, `object`, or `function` will be redacted. Undefined values will never be redacted, although the type `undefined` is included in this list to keep TypeScript happy. | array | Array<'string'￨'number'￨'bigint'￨'boolean'￨'symbol'￨'undefined'￨'object'￨'function'> | ['string'] | N |
| serialise | Determines whether or not to serialise the object after redacting. Typical use cases for this are when you want to send it over the network or save to a file, both of which are common use cases for redacting sensitive information. | boolean |  | false | N |
| serialize | Alias of `serialise` for International-English users. | boolean |  | false | N |

### BlacklistKeyConfig

| key | type | default | required |
| --- | --- | --- | --- |
| key | string￨RegExp |  | Y |
| fuzzyKeyMatch | boolean | Main options `fuzzyKeyMatch` | N |
| caseSensitiveKeyMatch | boolean | Main options `caseSensitiveKeyMatch` | N |
| remove | boolean | Main options `remove` | N |
| retainStructure | boolean | Main options `retainStructure` | N |

### StringTestConfig

| key | description | type | required |
| --- | --- | --- | --- |
| pattern | A regular expression to perform against a string value, whether that value is a flat string or nested within an object. | RegExp | Y |
| replacer | A function that will be called with the value of the string that matched the pattern and the pattern itself. This function should return the new (redacted) value to replace the original value. | function | Y |

### Benchmark
Comparisons are made against JSON.stringify, Regex.replace, Fast Redact &
(one of my other creations, [@hackylabs/obglob](https://npmjs.com/package/@hackylabs/obglob)) as well as different
configurations of Deep Redact, using [this test object](./test/setup/dummyUser.ts). Fast Redact was configured to redact
the same keys on the same object as Deep Redact without using wildcards.

The benchmark is run on a 2021 iMac with an M1 chip with 16GB memory running macOS Sequoia 15.0.0.

JSON.stringify is included as a benchmark because it is the fastest way to deeply iterate over an object, although it
doesn't redact any sensitive information.

Regex.replace is included as a benchmark because it is the fastest way to redact sensitive information from a string.
However, a regex pattern for all keys to be redacted is much harder to configure than a dedicated redaction library,
especially when dealing with multiple types of values. It also doesn't handle circular references or other unsupported
values as gracefully as deep-redact unless a third-party library is used to stringify the object beforehand.

Fast-redact is included as a benchmark because it's the next fastest library available specifically for redaction.

Neither JSON.stringify, Regex.replace nor Fast Redact offer the same level of configurability as deep-redact. Both Fast
Redact and Obglob are slower and rely on dependencies.

![Benchmark](./benchmark.png)

| scenario | ops / sec | op duration (ms) | margin of error | sample count |
| --- | --- | --- | --- | --- |
| JSON.stringify, large object | 355007.3 | 0.0028168435 | 0.00001 | 177504 |
| DeepRedact, partial redaction | 353864.27 | 0.0028259423 | 0.00001 | 176933 |
| DeepRedact, remove item, single object | 45734.7 | 0.0218652378 | 0.00013 | 22868 |
| Regex replace, large object | 44868.18 | 0.0222875115 | 0.00014 | 22435 |
| DeepRedact, default config, large object | 43171.22 | 0.0231635811 | 0.00009 | 21586 |
| DeepRedact, custom replacer function, single object | 42452.4 | 0.0235557936 | 0.00013 | 21227 |
| DeepRedact, replace string by length, single object | 40153.18 | 0.0249046271 | 0.00009 | 20077 |
| DeepRedact, retain structure, single object | 34212.96 | 0.0292286939 | 0.00007 | 17107 |
| DeepRedact, fuzzy matching, single object | 31162.72 | 0.0320896248 | 0.00027 | 15582 |
| DeepRedact, config per key, single object | 27706.99 | 0.0360919767 | 0.00065 | 13854 |
| DeepRedact, default config, 1000 large objects | 13549.95 | 0.0738009882 | 0.00076 | 6775 |
| ObGlob, large object | 13474.62 | 0.0742136129 | 0.00221 | 6738 |
| fast redact, large object | 11756.94 | 0.0850561221 | 0.00099 | 5879 |
| DeepRedact, case insensitive matching, single object | 5751.82 | 0.1738580222 | 0.0006 | 2877 |
| DeepRedact, fuzzy and case insensitive matching, single object | 5434.07 | 0.1840240066 | 0.00058 | 2718 |
| JSON.stringify, 1000 large objects | 495.93 | 2.0164315968 | 0.00589 | 248 |
| ObGlob, 1000 large objects | 463.24 | 2.1586986164 | 0.01234 | 232 |
| DeepRedact, partial redaction large string | 354.9 | 2.8176872809 | 0.03739 | 178 |
| fast redact, 1000 large objects | 236.94 | 4.2203893445 | 0.02089 | 119 |
| Regex replace, 1000 large objects | 228.78 | 4.3709254 | 0.05537 | 115 |