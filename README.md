# Deep Redact

[![npm version](https://badge.fury.io/js/@hackylabs%2Fdeep-redact.svg)](https://badge.fury.io/js/@hackylabs%2Fdeep-redact)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/hackylabs/deep-redact/blob/main/LICENSE)

Faster than Fast Redact <sup>1</sup> as well as being safer and more configurable than many other redaction libraries,
Deep Redact is a zero-dependency tool that redacts sensitive information from strings and objects. It is designed to be
used in a production environment where sensitive information needs to be redacted from logs, error messages, files,
and other outputs.

Circular references and other unsupported values are handled gracefully, and the library is designed to be as fast as
possible while still being configurable.

Supporting both CommonJS and ESM, with named and default exports, Deep Redact is designed to be versatile and easy to
use in any modern JavaScript or TypeScript project in Node or the browser.

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

const redaction = new DeepRedact({
  blacklistedKeys: ['sensitive', 'password', /name/i],
  serialise: false,
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

redaction.redact(obj)
// {
//  keepThis: 'This is fine',
//  sensitive: '[REDACTED]',
//  user: {
//    id: 1,
//    password: '[REDACTED]',
//    firstName: '[REDACTED]'
//  }
// }
```

## Configuration

### Main Options

| key | description | type | options | default | required |
| --- | --- | --- | --- | --- | --- |
| blacklistedKeys | Deeply compare names of these keys against the keys in your object. | array | Array<string￨RegExp￨BlacklistKeyConfig> | [] | N |
| stringTests | Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. | array | RegExp[] | [] | N |
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

### Benchmark
Comparisons are made against JSON.stringify and Fast Redact as well as different configurations of Deep Redact, using
[this test object](./test/setup/dummyUser.ts). Fast Redact was configured to redact the same keys on the same object as
Deep Redact without using wildcards.

The benchmark is run on a 2021 iMac with an M1 chip with 16GB memory running Sonoma 14.5.

JSON.stringify is included as a benchmark because it is the fastest way to deeply iterate over an object although it
doesn't redact any sensitive information. Fast-redact is included as a benchmark because it's the next fastest redaction
library available. Neither JSON.stringify nor Fast Redact offer the same level of configurability as deep-redact.

![Benchmark](./benchmark.png)

| scenario | ops / sec | op duration (ms) | margin of error | sample count |
| --- | --- | --- | --- | --- |
| JSON.stringify, large object | 295500.62 | 0.0033840876 | 0.00002 | 147751 |
| DeepRedact, remove item, single object | 36272.4 | 0.0275691709 | 0.00016 | 18137 |
| DeepRedact, custom replacer function, single object | 30314.59 | 0.0329874115 | 0.00028 | 15158 |
| DeepRedact, default config, large object | 30028.19 | 0.0333020395 | 0.0002 | 15015 |
| DeepRedact, replace string by length, single object | 28756.9 | 0.0347742688 | 0.00028 | 14379 |
| DeepRedact, retain structure, single object | 24803.01 | 0.0403176903 | 0.00032 | 12402 |
| DeepRedact, fuzzy matching, single object | 22243.3 | 0.0449573621 | 0.00038 | 11122 |
| DeepRedact, config per key, single object | 21603.85 | 0.0462880355 | 0.0013 | 10802 |
| fast redact, large object | 9529.2 | 0.1049406557 | 0.00064 | 4765 |
| DeepRedact, case insensitive matching, single object | 6503.72 | 0.1537581959 | 0.00105 | 3252 |
| DeepRedact, default config, 1000 large objects | 5915.05 | 0.1690602382 | 0.00296 | 2958 |
| DeepRedact, fuzzy and case insensitive matching, single object | 5591.96 | 0.1788283015 | 0.00184 | 2796 |
| JSON.stringify, 1000 large objects | 394.41 | 2.5354059248 | 0.01001 | 198 |
| fast redact, 1000 large objects | 172.23 | 5.8060829174 | 0.06886 | 87 |