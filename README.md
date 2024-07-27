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
import {DeepRedact} from 'deep-redact';

const redaction = new DeepRedact({
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
| remove | Determines whether or not to remove the key from the object when it is redacted. | boolean |  | false | N |
| retainStructure | Determines whether or not keep all nested values of a key that is going to be redacted. Circular references are always removed. | boolean |  | false | N |
| replacement | When a value is going to be redacted, what would you like to replace it with? | string |  | [REDACTED] | N |
| replaceStringByLength | When a string value is going to be replaced, optionally replace it by repeating the `replacement` to match the length of the value. For example, if `replaceStringByLength` were set to `true` and `replacement` was set to "x", then redacting "secret" would return "xxxxxx". This is sometimes useful for debugging purposes, although it may be less secure as it could give hints to the original value. | boolean |  | false | N |
| types | JS types (values of `typeof` keyword). Only values with a typeof equal to `string`, `number`, `bigint`, `boolean` or `object` may be redacted. The other types are only listed as options to keep TypeScript happy, so you never need to list them. | array | Array<'string'￨'number'￨'bigint'￨'boolean'￨'symbol'￨'undefined'￨'object'￨'function'> | ['string'] | N |
| serialise | Determines whether or not to serialise the object after redacting. Typical use cases for this are when you want to send it over the network or save to a file, both of which are common use cases for redacting sensitive information. | boolean |  | true | N |
| unsupportedTransformer | When an unsafe value is encountered or a value that cannot be serialised. By default, this function will transform an unsupported value `Unsupported` object. BigInt values are converted a string. Dates are returned using their own `toISOString` method. Regular expressions are returned as objects with their `source` and `flags` values. Errors are converted objects. This is useful when you have a custom class that you would like to redact. For safety reasons, you should always transform a BigInt to avoid JSON.stringify throwing an error. | (value: unknown) => unknown |  | DeepRedact.transformUnsupported | N |

### BlacklistKeyConfig

| key | type | default | required |
| --- | --- | --- | --- |
| key | string | RegExp |  | Y |
| fuzzyKeyMatch | boolean | Main options `fuzzyKeyMatch` | N |
| caseSensitiveKeyMatch | boolean | Main options `caseSensitiveKeyMatch` | N |
| remove | boolean | Main options `remove` | N |
| retainStructure | boolean | Main options `retainStructure` | N |

### Benchmark
Comparisons are made against JSON.stringify and fast-redact as well as different configurations of deep-redact, using
[this test object](./test/setup/dummyUser.ts). The benchmark is run on a 2021 iMac with an M1 chip with 16GB memory
running Sonoma 14.5.

JSON.stringify is included as a benchmark because it is the fastest way to deeply iterate over an object although it
doesn't redact any sensitive information. Fast-redact is included as a benchmark because it's the next fastest redaction
library available. Neither JSON.stringify nor fast-redact offer the same level of configurability as deep-redact.

![Benchmark](./benchmark.png)

| scenario | ops / sec | op duration (ms) | margin of error | sample count |
| --- | --- | --- | --- | --- |
| JSON.stringify, single object | 295911.06 | 0.0033793938 | 0.00002 | 147956 |
| DeepRedact, default config, single object | 95593.11 | 0.0104610048 | 0.00005 | 47797 |
| DeepRedact, remove item, single object | 92531.99 | 0.0108070737 | 0.00005 | 46266 |
| DeepRedact, fuzzy and case insensitive matching, single object | 90517.53 | 0.0110475833 | 0.00005 | 45259 |
| DeepRedact, case insensitive matching, single object | 90109.12 | 0.0110976562 | 0.00007 | 45055 |
| DeepRedact, fuzzy matching, single object | 89621.55 | 0.0111580312 | 0.00014 | 44811 |
| DeepRedact, replace string by length, single object | 85194.47 | 0.0117378506 | 0.00005 | 42598 |
| DeepRedact, config per key, single object | 71293.68 | 0.014026489 | 0.00008 | 35647 |
| DeepRedact, retain structure, single object | 67052.16 | 0.0149137623 | 0.00021 | 33527 |
| fast redact, single object | 19892.24 | 0.0502708627 | 0.00023 | 9947 |
| DeepRedact, default config, 1000 objects | 13558.45 | 0.0737547209 | 0.00039 | 6780 |
| JSON.stringify, 1000 objects | 423.19 | 2.3629901509 | 0.00811 | 212 |
| fast redact, 1000 objects | 76.35 | 13.0976421538 | 0.2063 | 39 |