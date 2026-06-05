# Deep Redact

Deep Redact v4 is a function-first redaction library with a rule-driven runtime, generated documentation workflow, contributor tooling, and dual-format build output.

## Contributor Baseline

- Node `24.14.1`
- `pnpm@10.33.0`
- `tsdown`
- `Vitest`
- `xo`

## Installation

```sh
npm install @hackylabs/deep-redact
pnpm add @hackylabs/deep-redact
yarn add @hackylabs/deep-redact
bun add @hackylabs/deep-redact
```

### Deno Baseline

```json
{
  "imports": {
    "@hackylabs/deep-redact": "npm:@hackylabs/deep-redact@4.0.0"
  }
}
```

```sh
deno install --entrypoint smoke.ts
deno run smoke.ts
```

```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redact = deepRedact({ paths: ['user.password', 'token'] })
const payload = { user: { password: 'secret' }, token: 'abc123', ok: true }
const redactedPayload = redact(payload)

console.log(JSON.stringify(redactedPayload))
```

## Public API

```ts
import { createRedactor, deepRedact } from '@hackylabs/deep-redact'

const redact = deepRedact()
const sameFactory = createRedactor()

redact({ secret: 'value' }) // { secret: 'value' }
sameFactory({ secret: 'value' }) // { secret: 'value' }
```

## Current Status

- `deepRedact(options)` is the primary public factory.
- `createRedactor(options)` is the named alias.
- The published package surface includes the root entrypoint, the optional console adapter subpath, and `package.json`.
- The runtime applies the current v4 redaction contracts for configured paths, keys, substring rules, and serialised output.
- Additional focused unit suites run outside the default contract gate through `pnpm run test:red-phase`.

## Scripts

- `pnpm run build`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run generate-exports`
- `pnpm run generate-readme`
- `pnpm run verify-generated-files`
- `pnpm run test:red-phase`
- `pnpm run bench`

## Provenance

The scratch-template transplant decisions for the initial v4 foundation are documented in `_bmad-output/planning-artifacts/0001-scratch-v4-foundation-transplant.md`.
