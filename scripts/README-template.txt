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

<--MAIN_OPTIONS-->

### BlacklistKeyConfig

<--BLACKLIST_KEY_CONFIG-->

### Benchmark

Comparisons are made against fast-redact as well as different configurations of deep-redact. The benchmark is run on a
2021 iMac with an M1 chip with 16GB memory running Sonoma 14.5.

<--BENCH-->