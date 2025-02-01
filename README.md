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
| DeepRedact, partial redaction | 349212.62 | 0.002863585 | 0.00001 | 174607 |
| JSON.stringify, large object | 348396.61 | 0.002870292 | 0.00002 | 174199 |
| Regex replace, large object | 48125.76 | 0.0207788937 | 0.0001 | 24063 |
| DeepRedact, remove item, single object | 47677.46 | 0.0209742723 | 0.00005 | 23839 |
| DeepRedact, default config, large object | 43360.06 | 0.0230626985 | 0.00011 | 21681 |
| DeepRedact, custom replacer function, single object | 42102.85 | 0.0237513599 | 0.00013 | 21052 |
| DeepRedact, replace string by length, single object | 39457.16 | 0.0253439449 | 0.00023 | 19729 |
| DeepRedact, retain structure, single object | 33723.76 | 0.0296526868 | 0.00008 | 16862 |
| DeepRedact, fuzzy matching, single object | 30967.85 | 0.0322915537 | 0.00024 | 15484 |
| DeepRedact, config per key, single object | 30399.35 | 0.0328954383 | 0.00009 | 15200 |
| DeepRedact, default config, 1000 large objects | 14735.4 | 0.067863774 | 0.00031 | 7368 |
| ObGlob, large object | 13665.45 | 0.0731772678 | 0.00229 | 6844 |
| fast redact, large object | 12389.07 | 0.08071634 | 0.00024 | 6195 |
| DeepRedact, case insensitive matching, single object | 6026.27 | 0.1659399891 | 0.0008 | 3014 |
| DeepRedact, fuzzy and case insensitive matching, single object | 5848.2 | 0.1709929135 | 0.00045 | 2925 |
| JSON.stringify, 1000 large objects | 491.92 | 2.0328389146 | 0.01754 | 246 |
| ObGlob, 1000 large objects | 461.4 | 2.1673329307 | 0.01581 | 231 |
| DeepRedact, partial redaction large string | 359.03 | 2.7852842611 | 0.05916 | 180 |
| fast redact, 1000 large objects | 238.07 | 4.2004663833 | 0.02104 | 120 |
| Regex replace, 1000 large objects | 227.8 | 4.3897496316 | 0.07207 | 114 |