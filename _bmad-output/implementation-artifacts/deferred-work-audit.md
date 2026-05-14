## Deferred from: code review of 4-3-prove-exact-path-fast-lane-and-generic-traversal-are-behaviourally-equivalent (2026-05-14)

- `signature` field on converted dynamic rule uses `canonicalPath` string rather than a `renderSelectorSignature`-produced value — semantically imprecise but no runtime impact for current corpus (`test/fixtures/exact-path-equivalence/index.ts`)
- No corpus entry for bracket-quoted or special-character property keys — equivalence proof incomplete for paths whose canonical representation differs from dot-notation
- `retainStructure` alias-replay caching behaviour not exercised across lanes — `createPayload` creates fresh objects so no shared-identity alias is ever replayed
- No corpus entry for non-string primitive leaf values (number, boolean, null) under an exact path
- No corpus entry for a path that is absent from the payload — silent no-op divergence between lanes would go undetected
- No corpus entry for `replaceStringByLength: true` policy
- Converted-rule ordering in `createGenericisedPlan` appends after pre-existing `dynamicPathRules`; relies on the `dynamicPathRules.length === 0` invariant enforced by the control assertion (`test/fixtures/exact-path-equivalence/index.ts`)
