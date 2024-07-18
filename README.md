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

![Benchmark](./benchmark.png)

| scenario | ops / sec | margin of error | sample count |
| --- | --- | --- | --- |
| default config, single object | 116212.26 | 0.00004 | 58107 |
| fuzzy matching, single object | 107920.15 | 0.00005 | 53961 |
| case insensitive matching, single object | 107873.24 | 0.00005 | 53937 |
| fuzzy and case insensitive matching, single object | 107616 | 0.00005 | 53808 |
| replace string by length, single object | 97006.48 | 0.00012 | 48504 |
| retain structure, single object | 87680.67 | 0.00005 | 43841 |
| config per key, single object | 73718 | 0.00007 | 36859 |
| fast redact, single object | 18751.42 | 0.00042 | 9376 |
| default config, 1000 objects | 107.78 | 0.04764 | 54 |
| fast redact, 1000 objects | 73.25 | 0.17148 | 37 |