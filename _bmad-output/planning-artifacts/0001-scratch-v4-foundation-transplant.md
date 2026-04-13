# ADR 0001: Scratch v4 Foundation Transplant

## Status

Accepted on `2026-04-13`.

## Scratch Reference

The initial v4 foundation work generated a scratch reference scaffold with:

```bash
pnpm create tsdown@latest /tmp/deep-redact-v4 --template minimal
```

The scratch output contained:

- `package.json`
- `src/index.ts`
- `tsdown.config.ts`
- a `pnpm-lock.yaml` pinned by `pnpm v10.33.0`

The scratch template selected:

- `type: module`
- `tsdown@0.21.7`
- `typescript@6.0.2`
- a single-root `src/index.ts` entrypoint
- a minimal `build` script backed by `tsdown`

## Adopted Unchanged

- ESM package metadata via `"type": "module"`
- `tsdown` as the build tool
- a single root entrypoint at `src/index.ts`
- `dist/` as the only published artefact directory

## Adapted For Deep Redact

- The scratch `tsdown` baseline was extended to dual-format output (`esm` and `cjs`) with declaration generation.
- The package metadata is generated through `scripts/generate-exports.ts` so the root surface stays deterministic and reviewable.
- README generation now runs through `scripts/generate-readme.ts` and `scripts/verify-generated-files.ts`.
- The contributor baseline was lifted to Node `24.14.1`, `pnpm@10.33.0`, `Vitest`, and `xo`.
- `xo` remains the linting baseline, but the current foundation scaffold scopes it to the JS toolchain config while `tsc --noEmit` enforces the TypeScript surface, because the latest `xo` TypeScript path crashes under this exact stack instead of reporting normal lint output.
- The root package surface was narrowed to the v4 factory facade only: `deepRedact` and `createRedactor`.
- Contract tests for clean `import`, `require`, and type-resolution consumers were added under `test/contract/`.

## Intentionally Rejected

- The scratch sample implementation (`fn()`) was rejected in favour of a compile-safe placeholder redactor.
- The scratch package name, version, and `private` defaults were rejected in favour of Deep Redact package metadata.
- The scratch scaffold's lack of README/export verification was rejected because the initial v4 foundation requires generated artefacts to stay explicit and reviewable.

## Retained Brownfield Files

These files remain deliberately outside the scratch template because they are part of the retained red-phase safety harness or later migration work:

- `test/unit/**`
- `test/load/**`
- `test/bench/**`
- `test/setup/**`
- `src/types.ts`
- `src/utils/**`
- `benchmark.json`
- `load-test-results.json`

They are retained as compatibility pressure and reference material during the rewrite, not as the authoritative v4 public surface.
