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

Comparisons are made against fast-redact as well as different configurations of deep-redact. The benchmark is run on a
2021 iMac with an M1 chip with 16GB memory running Sonoma 14.5.

| scenario | ops / sec | margin of error | sample count |
| --- | --- | --- | --- |
| default config, single user | 109266.69 | 0.00004 | 54634 |
| fuzzy matching, single user | 99994.92 | 0.00005 | 49998 |
| case insensitive matching, single user | 99233.13 | 0.00005 | 49617 |
| fuzzy and case insensitive matching, single user | 98810.66 | 0.00007 | 49406 |
| replace string by length, single user | 93204.99 | 0.00005 | 46603 |
| retain structure, single user | 76531.47 | 0.0002 | 38266 |
| config per key, single user | 74752.86 | 0.00006 | 37377 |
| fast redact, single user | 18618.31 | 0.00046 | 9311 |
| default config, 1000 users | 97.89 | 0.08195 | 49 |
| fast redact, 1000 users | 75.99 | 0.17738 | 38 |