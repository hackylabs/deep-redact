# Deep Redact

Faster than fast-redact <sup>1</sup> and more configurable than many other redaction libraries, Deep Redact is a
zero-dependency tool that redacts sensitive information from strings and objects. It is designed to be used in a
production environment where sensitive information needs to be redacted from logs, error messages, and other outputs.

## Installation

```bash
npm install deep-redact
```

## Usage

<h4 style="color: red">In order to maintain a consistent usage throughout your project, it is not advised to call this
library outside of your global logging/error-reporting libraries.</h4>

```typescript
// ./src/example.ts
import {Redaction} from 'deep-redact';

const redaction = new Redaction({
  replacement: '*',
  replaceStringByLength: true,
  blacklistedKeys: ['password'],
  stringTests: [
    /^[\d]{13,16}$/, // payment card number
    /^[\d]{3,4}$/ // CVV
  ],
});

const obj = {
  password: '<h1><strong>Password</strong></h1>',
  cardNumber: '1234567812345678',
  cvv: '123',
};

redaction.redact(obj) // { password: '**********************************', cardNumber: '****************', cvv: '***' }
```

## Configuration

### Main Options

| key | description | type | options | default | required |
| --- | --- | --- | --- | --- | --- |
| blacklistedKeys | Deeply compare names of these keys against the keys in your object. | array | Array<string￨BlacklistKeyConfig> | [] | N |
| stringTests | Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. | array | RegExp[] | [] | N |
| fuzzyKeyMatch | Loosely compare key names by checking if the key name of your unredacted object is included anywhere within the name of your blacklisted key. For example, is "pass" (your key) included in "password" (from config). | boolean |  | false | N |
| caseSensitiveKeyMatch | Loosely compare key names by normalising the strings. This involves removing non-word characters and transforms the string to lowercase. This means you never have to worry having to list duplicate keys in different formats such as snake_case, camelCase, PascalCase or any other case. | boolean |  | true | N |
| retainStructure | Determines whether or not keep all nested values of a key that is going to be redacted. | boolean |  | false | N |
| replacement | When a value is going to be redacted, what would you like to replace it with? | string |  | [REDACTED] | N |
| replaceStringByLength | When a string value is going to be replaced, optionally replace it by repeating the `replacement` to match the length of the value. For example, if `replaceStringByLength` were set to `true` and `replacement` was set to "x", then redacting "secret" would return "xxxxxx". This is sometimes useful for debugging purposes, although it may be less secure as it could give hints to the original value. | boolean |  | false | N |
| types | JS types (values of `typeof` keyword). Only values with a typeof equal to `string`, `number`, `bigint`, `boolean` or `object` may be redacted. The other types are only listed as options to keep TypeScript happy, so you never need to list them. | array | Array<'string'￨'number'￨'bigint'￨'boolean'￨'symbol'￨'undefined'￨'object'￨'function'> | ['string'] | N |

### BlacklistKeyConfig

| key | type | default | required |
| --- | --- | --- | --- |
| key | string |  | Y |
| fuzzyKeyMatch | boolean | Main options `fuzzyKeyMatch` | N |
| caseSensitiveKeyMatch | boolean | Main options `caseSensitiveKeyMatch` | N |
| retainStructure | boolean | Main options `retainStructure` | N |

### Benchmark
Comparisons are made against JSON.stringify and fast-redact as well as different configurations of deep-redact, using
[this test object](./test/setup/dummyUser.ts). The benchmark is run on a 2021 iMac with an M1 chip with 16GB memory
running Sonoma 14.5.

JSON.stringify is included as a benchmark because it is the fastest way to deeply iterate over an object although it
doesn't redact any sensitive information. Fast-redact is included as a benchmark because it's the next fastest redaction
library available. Neither JSON.stringify nor fast-redact offer the same level of configurability as deep-redact.

![Benchmark](./benchmark.png)

| scenario | ops / sec | margin of error | sample count |
| --- | --- | --- | --- |
| JSON.stringify, single object | 287108.7 | 0.00002 | 143555 |
| remove item, single object | 102943.33 | 0.00004 | 51472 |
| case insensitive matching, single object | 85863.81 | 0.00005 | 42932 |
| fuzzy and case insensitive matching, single object | 85524.15 | 0.00005 | 42763 |
| retain structure, single object | 85500.88 | 0.00005 | 42751 |
| default config, single object | 84626.94 | 0.00012 | 42314 |
| replace string by length, single object | 81961.66 | 0.00007 | 40981 |
| fuzzy matching, single object | 81756.69 | 0.00008 | 40879 |
| config per key, single object | 66679.53 | 0.00006 | 33340 |
| fast redact, single object | 19880.48 | 0.00022 | 9941 |
| JSON.stringify, 1000 objects | 378.3 | 0.01761 | 190 |
| default config, 1000 objects | 102.96 | 0.05863 | 52 |
| fast redact, 1000 objects | 73.82 | 0.1877 | 37 |