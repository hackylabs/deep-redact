# Story 8.11: Harden Serialise Output Transformer Edge Cases

Status: ready-for-dev

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

## Story

As a backend engineer using serialised output,
I want `serialise: true` transformer edge cases to be explicit and safe,
so that getter side effects, root non-JSON values, and custom-constructor transformer expectations do not create hidden contract gaps.

## Context

Story 8.3 moved transformation and circular neutralisation into [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts). The deferred-work audit records remaining edge cases:

- Plain-object getters can be read twice under `serialise: true`: once during redaction and again during safe-graph construction.
- Root `undefined` still returns `undefined`, preserving native `JSON.stringify` behaviour but weakening the "serialise output is a string" expectation.
- Arbitrary `transformers.byConstructor` buckets are rejected during validation, but first-class custom-constructor dispatch is still not supported.

Root Set/Map/array self-cycle marker path semantics are cosmetic and should only be addressed if naturally covered without disturbing the main contract.

The selected release contract is: getter evaluation happens at most once, root non-JSON values under `serialise: true` return a deterministic JSON string containing the documented `[UNSUPPORTED]` representation, and registered custom constructors receive first-class deterministic dispatch.

## Source Audit Items Covered

- **Major:** plain-object getters are read twice under `serialise: true`.
- **Major:** arbitrary custom-constructor transformer dispatch remains unsupported despite earlier product expectations around custom transformer configuration.
- **Major contract wrinkle:** root `undefined` under `serialise: true` is not a string.

## Acceptance Criteria

1. **Given** a payload with a side-effecting plain-object getter
   **When** the redactor runs with `serialise: true`
   **Then** the getter is evaluated at most once
   **And** if getter evaluation throws, only that value degrades to `[UNSUPPORTED]`
   **And** no source value leaks through diagnostics or output.

2. **Given** root `undefined`, function, symbol, and other non-JSON values are serialised
   **When** `serialise: true` is used
   **Then** the return value is a deterministic JSON string containing the documented `[UNSUPPORTED]` representation
   **And** the contract is tested and documented for each named root value type.

3. **Given** a caller configures arbitrary class constructor transformers
   **When** validation and serialise output are reviewed
   **Then** first-class constructor dispatch is implemented for registered constructors
   **And** dispatch order is deterministic
   **And** invalid constructor registrations are rejected with public documentation and tests.

4. **Given** transformer fallback handlers are used for class instances
   **When** they return a supported transformed value
   **Then** `serialise: true` emits the safe transformed representation without throwing.

5. **Given** circular marker path semantics are touched
   **When** root array, Set, and Map self-cycles are serialised
   **Then** their cosmetic `path` inconsistency remains explicitly documented as out of scope unless the implementation naturally removes it without disturbing the main contract.

## Tasks / Subtasks

- [ ] Add focused regression tests for getter evaluation count under `serialise: true`.
- [ ] Pin root non-JSON serialise semantics to a deterministic JSON string containing the documented `[UNSUPPORTED]` representation.
- [ ] Audit `transformers.byConstructor` validation and `resolveTransformedValue` dispatch against the public custom transformer contract.
- [ ] Implement first-class custom-constructor dispatch for registered constructors and deterministic rejection for invalid registrations.
- [ ] Add fallback-transformer tests for arbitrary class instances.
- [ ] Update serialise-output documentation and deferred-work audit statuses.

## Dev Notes

Likely files:

- [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts)
- [src/transformers/resolve-transformer.ts](src/transformers/resolve-transformer.ts)
- [src/core/compiler/compile-transformers.ts](src/core/compiler/compile-transformers.ts)
- [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts)
- [docs/architecture/serialise-output.md](docs/architecture/serialise-output.md)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)
- [test/unit/standardTransformers.test.ts](test/unit/standardTransformers.test.ts)

Avoid changing output marker shapes unless tests and docs are updated in the same change.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts test/unit/standardTransformers.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm lint`
