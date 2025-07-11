# Deep Redact

[![npm version](https://badge.fury.io/js/@hackylabs%2Fdeep-redact.svg)](https://badge.fury.io/js/@hackylabs%2Fdeep-redact)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/hackylabs/deep-redact/blob/main/LICENSE)

Safer and more configurable than many other redaction solutions, Deep Redact is a zero-dependency tool that redacts
sensitive information from strings and objects. It is designed to be used in a production environment where sensitive
information needs to be redacted from logs, error messages, files, and other outputs. Supporting both strings and objects
or a mix of both, Deep Redact can be used to redact sensitive information from more data structures than any other
redaction library. Even partially redacting sensitive information from strings is supported, by way of custom regex
patterns and replacers.

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
| stringTests | Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. Can redact whole or partial string values. If a replacer function is provided in the config for the associated test, it will be used to redact the value if the value matches the test. | array | Array<RegExp￨StringTestConfig> | [] | N |
| fuzzyKeyMatch | Loosely compare key names by checking if the key name of your unredacted object is included anywhere within the name of your blacklisted key. For example, is "pass" (your key) included in "password" (from config). | boolean |  | false | N |
| caseSensitiveKeyMatch | Loosely compare key names by normalising the strings. This involves removing non-word characters and transforms the string to lowercase. This means you never have to worry having to list duplicate keys in different formats such as snake_case, camelCase, PascalCase or any other case. | boolean |  | true | N |
| remove | Determines whether or not to remove the key from the object when it is redacted. | boolean |  | false | N |
| retainStructure | Determines whether or not keep all nested values of a key that is going to be redacted. Circular references are always removed. | boolean |  | false | N |
| replacement | When a value is going to be redacted, what would you like to replace it with? | string ￨ function |  | [REDACTED] | N |
| replaceStringByLength | When a string value is going to be replaced, optionally replace it by repeating the `replacement` to match the length of the value. For example, if `replaceStringByLength` were set to `true` and `replacement` was set to "x", then redacting "secret" would return "xxxxxx". This is sometimes useful for debugging purposes, although it may be less secure as it could give hints to the original value. | boolean |  | false | N |
| types | JS types (values of `typeof` keyword). Only values with a typeof equal to `string`, `number`, `bigint`, `boolean`, `symbol`, `object`, or `function` will be redacted. Undefined values will never be redacted, although the type `undefined` is included in this list to keep TypeScript happy. | array | Array<'string'￨'number'￨'bigint'￨'boolean'￨'symbol'￨'undefined'￨'object'￨'function'> | ['string'] | N |
| serialise | Determines whether or not to serialise the object after redacting. Typical use cases for this are when you want to send it over the network or save to a file, both of which are common use cases for redacting sensitive information. | boolean |  | true | N |
| serialize | Alias of `serialise` for International-English users. | boolean |  | Value of `serialise` | N |
| transformers | A list of transformers to apply when transforming unsupported values. Each transformer should conditionally transform the value, or return the value unchanged to be passed to the next transformer. Transformers will be run in the order they are provided over the entire object. | array | Array<Transformer> | All standard transformers (bigint, date, error, map, regex, set, and url) | N |

### BlacklistKeyConfig

| key | type | default | required |
| --- | --- | --- | --- |
| key | string￨RegExp |  | Y |
| fuzzyKeyMatch | boolean | Main options `fuzzyKeyMatch` | N |
| caseSensitiveKeyMatch | boolean | Main options `caseSensitiveKeyMatch` | N |
| remove | boolean | Main options `remove` | N |
| replacement | string￨function | Main options `replacement` | N |
| replaceStringByLength | boolean | Main options `replaceStringByLength` | N |
| retainStructure | boolean | Main options `retainStructure` | N |

### StringTestConfig

| key | description | type | required |
| --- | --- | --- | --- |
| pattern | A regular expression to perform against a string value, whether that value is a flat string or nested within an object. | RegExp | Y |
| replacer | A function that will be called with the value of the string that matched the pattern and the pattern itself. This function should return the new (redacted) value to replace the original value. | function | Y |
