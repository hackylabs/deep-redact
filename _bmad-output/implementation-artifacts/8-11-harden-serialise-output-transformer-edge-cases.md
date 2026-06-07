# Story 8.11: Harden Serialise Output Transformer Edge Cases

Status: done

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

## Story

As a backend engineer using serialised output,
I want `serialise: true` transformer edge cases to be explicit and safe,
so that getter side effects, root `undefined`/function/symbol output, and custom-constructor transformer expectations do not create hidden contract gaps.

## Context

Story 8.3 moved transformation and circular neutralisation into [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts). The deferred-work audit records remaining edge cases:

- Plain-object getters can be read twice under `serialise: true`: once during redaction and again during safe-graph construction.
- Root `undefined` still returns `undefined`, preserving native `JSON.stringify` behaviour but weakening the "serialise output is a string" expectation.
- Arbitrary `transformers.byConstructor` buckets are rejected during validation, but first-class custom-constructor dispatch is still not supported.

Root Set/Map/array self-cycle marker path semantics are cosmetic and should only be addressed if naturally covered without disturbing the main contract. If unchanged, keep that deferred-work audit item open and document it as deliberately out of scope.

The selected release contract is: getter evaluation happens at most once, root `undefined` under `serialise: true` returns the deterministic JSON string `"[UNSUPPORTED]"`, existing root function/symbol behaviour is documented and pinned, and registered custom constructors receive first-class deterministic dispatch.

## Source Audit Items Covered

- **Major:** plain-object getters are read twice under `serialise: true`.
- **Major:** arbitrary custom-constructor transformer dispatch remains unsupported despite earlier product expectations around custom transformer configuration.
- **Major contract wrinkle:** root `undefined` under `serialise: true` is not a string.

Root function and symbol values already serialise to the JSON string `"[UNSUPPORTED]"`; they are included here for regression coverage and documentation, not because their runtime handling needs redesign.

## Acceptance Criteria

1. **Given** a payload with a side-effecting plain-object getter
   **When** the redactor runs with `serialise: true`
   **Then** the getter is evaluated at most once
   **And** the serialise adapter must consume the traversal's captured value or an equivalent safe snapshot rather than re-reading that getter
   **And** a getter that succeeds on first read and would throw or change value on a second read still observes exactly one read
   **And** if getter evaluation throws, only that value degrades to `[UNSUPPORTED]`
   **And** the adapter must not re-read a getter that already failed during traversal
   **And** no source value leaks through diagnostics or output.

2. **Given** root `undefined`, function, and symbol values are serialised
   **When** `serialise: true` is used
   **Then** root `undefined` returns exactly the deterministic JSON string `"[UNSUPPORTED]"`
   **And** root function and symbol values continue to return exactly the deterministic JSON string `"[UNSUPPORTED]"`
   **And** built-in runtime values such as `bigint`, `Map`, `Set`, `Date`, `Error`, `RegExp`, and `URL` keep their documented transformer marker shapes rather than being collapsed into `[UNSUPPORTED]`
   **And** the contract is tested and documented for each named root value type.

3. **Given** a caller configures arbitrary class constructor transformers
   **When** validation and serialise output are reviewed
   **Then** first-class constructor dispatch is implemented for registered constructors using this public shape:

   ```ts
   interface CustomConstructorTransformerRegistration {
     readonly constructor: abstract new (...args: never[]) => object;
     readonly transformers: readonly Transformer[];
   }

   interface TransformersByConstructor {
     readonly Date?: readonly Transformer[];
     readonly Error?: readonly Transformer[];
     readonly Map?: readonly Transformer[];
     readonly RegExp?: readonly Transformer[];
     readonly Set?: readonly Transformer[];
     readonly URL?: readonly Transformer[];
     readonly custom?: readonly CustomConstructorTransformerRegistration[];
   }
   ```

   **And** built-in constructor buckets keep their current precedence and marker fallback
   **And** custom constructor registrations are evaluated in declaration order after `byType.object` and built-in constructor buckets, but before `fallback`
   **And** if a value matches multiple custom constructors through inheritance, the first matching custom registration wins
   **And** custom constructors are matched by constructor identity with `instanceof`, not by constructor name
   **And** invalid custom registrations are rejected with public documentation and tests.

   Invalid registrations include: non-array `custom`, non-object registration entries, missing or non-constructable `constructor`, `constructor` values for `Object`, `Array`, or the built-in constructors that already have first-class buckets, duplicate custom constructors, missing transformer arrays, and non-function transformer entries.

4. **Given** transformer fallback handlers are used for class instances
   **When** they return a supported transformed value
   **Then** `serialise: true` emits the safe transformed representation without throwing.

5. **Given** circular marker path semantics are touched
   **When** root array, Set, and Map self-cycles are serialised
   **Then** their cosmetic `path` inconsistency remains explicitly documented as out of scope unless the implementation naturally removes it without disturbing the main contract.

## Tasks / Subtasks

- [x] Add focused regression tests for getter evaluation count under `serialise: true`.
- [x] Add a regression where a getter succeeds once but would throw or change value if read again; assert one read and safe serialised output.
- [x] Add a regression where a getter throws during traversal; assert the serialise adapter does not re-read it and only that property becomes `[UNSUPPORTED]`.
- [x] Pin root `undefined` serialise semantics to the exact deterministic JSON string `"[UNSUPPORTED]"`.
- [x] Add explicit root function and root symbol regression tests proving the existing `"[UNSUPPORTED]"` output remains stable.
- [x] Confirm built-in root runtime values keep their documented transformer marker shapes and are not reclassified as generic non-JSON values.
- [x] Extend the public transformer types with `CustomConstructorTransformerRegistration` and `TransformersByConstructor.custom`.
- [x] Extend validation for `transformers.byConstructor.custom`, including deterministic rejection of invalid registrations.
- [x] Extend `compileTransformers` with a frozen, caller-owned-array-safe custom-constructor plan that preserves declaration order.
- [x] Extend `resolveTransformedValue` dispatch so registered custom constructors are matched by constructor identity with deterministic precedence.
- [x] Add constructor-dispatch tests for two unrelated classes, subclass/parent declaration-order precedence, duplicate constructor rejection, built-in constructor rejection through `custom`, and constructor-name collision safety.
- [x] Add fallback-transformer tests for arbitrary class instances, including a positive `serialise: true` case where fallback returns a safe plain object and a supported runtime value.
- [x] Update serialise-output documentation, transformer public documentation, and deferred-work audit statuses.
- [x] Keep the root array/Set/Map circular-marker path audit item open unless the implementation actually normalises that cosmetic inconsistency.

### Review Findings

- [x] [Review][Patch] Export `CustomConstructorTransformerRegistration` from the package root [src/index.ts:3]
- [x] [Review][Patch] Reject custom constructor registrations whose `transformers` property is present but `undefined` [src/core/validation/validate-config.ts:480]
- [x] [Review][Patch] Reject unsupported option keys inside custom constructor registration objects [src/core/validation/validate-config.ts:453]
- [x] [Review][Patch] Reject custom constructors that validation accepts but dispatch can never reach, such as Array subclasses and `Function` [src/core/validation/validate-config.ts:462]
- [x] [Review][Patch] Preserve byType and built-in precedence before evaluating custom `instanceof` checks [src/transformers/resolve-transformer.ts:110]

## Dev Notes

Likely files:

- [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts)
- [src/transformers/resolve-transformer.ts](src/transformers/resolve-transformer.ts)
- [src/core/compiler/compile-transformers.ts](src/core/compiler/compile-transformers.ts)
- [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts)
- [src/types/transformers.ts](src/types/transformers.ts)
- [src/types/public.ts](src/types/public.ts)
- [docs/architecture/serialise-output.md](docs/architecture/serialise-output.md)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) transformer edge-case sections

Avoid changing output marker shapes unless tests and docs are updated in the same change.

Do not implement arbitrary constructor support as loose string-name buckets. Constructor names are not unique and are unstable under minification; dispatch must use constructor identity. Do not route `Object` or `Array` through custom constructor registration because plain objects and arrays are traversable containers with existing redaction semantics.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm lint`

## Dev Agent Record

### Debug Log

- Added focused failing coverage for serialised getter re-reads, root `undefined`/function/symbol output, custom constructor registration validation, constructor identity dispatch, and fallback transformer handling for arbitrary class instances.
- Implemented traversal snapshot reuse for serialised plain objects and arrays, then corrected serialised circular alias handling so active cycles still emit the deterministic circular marker.
- Added first-class custom constructor transformer registration compilation, validation, and dispatch after built-in constructor buckets and before fallback handlers.
- Regenerated example documentation and rebuilt the tracked package output after changing the custom transformer example to use the new public constructor registration shape.
- Applied code review patches for the package-root custom registration type export, stricter custom registration validation, unreachable custom constructor rejection, and custom-constructor dispatch precedence.
- Validation passed:
  - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` - 1 file passed, 525 tests passed.
  - `source .agents/initialise-env.sh && pnpm run test` - 20 files passed, 689 tests passed.
  - `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` - passed.
  - `source .agents/initialise-env.sh && pnpm lint` - passed.

### Completion Notes

- `serialise: true` now consumes traversal-captured snapshots for plain-object and array output so getters are evaluated at most once, including success-once and traversal-failure cases.
- Root `undefined`, function, and symbol values now all serialise to the exact JSON string `"[UNSUPPORTED]"`, while documented built-in runtime markers remain intact.
- `transformers.byConstructor.custom` now supports explicit constructor registrations matched by `instanceof` constructor identity in declaration order, with invalid registration shapes rejected during configuration validation.
- The root array/Set/Map circular-marker path inconsistency remains open as a cosmetic audit item and is documented as out of scope for this story.

### File List

- `_bmad-output/implementation-artifacts/deferred-work-audit.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `dist/index.js`
- `docs/architecture/serialise-output.md`
- `docs/examples/custom-transformer.md`
- `docs/examples/examples/custom-transformer.ts`
- `docs/examples/fixtures/custom-transformer/expected.json`
- `docs/examples/fixtures/custom-transformer/expected.txt`
- `docs/examples/fixtures/custom-transformer/input.json`
- `docs/examples/manifest.json`
- `src/core/compiler/compile-transformers.ts`
- `src/core/replacement/serialise-output.ts`
- `src/core/runtime/redact-value.ts`
- `src/core/validation/validate-config.ts`
- `src/index.ts`
- `src/transformers/resolve-transformer.ts`
- `src/types/public.ts`
- `src/types/transformers.ts`
- `test/contract/api/create-redactor.test.ts`

### Change Log

- 2026-06-05: Hardened serialised output getter handling, root unsupported-value output, custom constructor transformer dispatch, fallback transformer coverage, generated examples, and audit documentation.
