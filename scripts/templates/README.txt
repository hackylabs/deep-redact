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

<--MAIN_OPTIONS-->

### BlacklistKeyConfig

<--BLACKLIST_KEY_CONFIG-->

### StringTestConfig

<--STRING_TEST_CONFIG-->

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

<--BENCH-->