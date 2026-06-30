# Benchmark Results

Generated from canonical benchmark artefacts in `test/artefacts/benchmarks/speed/`.

## path-based-serialised-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v3
**Version:** 3.0.5

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.003151 ms | 0.004842 ms |
| Mean | 0.003148 ms | 0.004833 ms |
| Min | 0.002919 ms | 0.004416 ms |
| Max | 0.003549 ms | 0.005464 ms |

### Threshold

**Overhead:** -34.92%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** fast-redact
**Version:** 3.5.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.003140 ms | 0.000525 ms |
| Mean | 0.003116 ms | 0.000522 ms |
| Min | 0.002918 ms | 0.000482 ms |
| Max | 0.003515 ms | 0.000598 ms |

### Threshold

**Overhead:** 497.73%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-serialised-json-stringify-regex-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/json-stringify-regex
**Version:** 1.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.003151 ms | 0.001372 ms |
| Mean | 0.003136 ms | 0.001376 ms |
| Min | 0.002916 ms | 0.001343 ms |
| Max | 0.003297 ms | 0.001446 ms |

### Threshold

**Overhead:** 129.67%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-serialised-v3-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v3
**Version:** 3.0.5

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.006368 ms | 0.006717 ms |
| Mean | 0.006391 ms | 0.006786 ms |
| Min | 0.006296 ms | 0.006576 ms |
| Max | 0.006942 ms | 0.007737 ms |

### Threshold

**Overhead:** -5.2%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-serialised-fast-redact-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** fast-redact
**Version:** 3.5.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.005111 ms | 0.000803 ms |
| Mean | 0.005101 ms | 0.000807 ms |
| Min | 0.004710 ms | 0.000793 ms |
| Max | 0.005574 ms | 0.000871 ms |

### Threshold

**Overhead:** 536.48%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-serialised-json-stringify-regex-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/json-stringify-regex
**Version:** 1.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.005112 ms | 0.001366 ms |
| Mean | 0.005103 ms | 0.001375 ms |
| Min | 0.004803 ms | 0.001252 ms |
| Max | 0.005239 ms | 0.002167 ms |

### Threshold

**Overhead:** 274.21%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-non-serialised-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v3
**Version:** 3.0.5

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000297 ms | 0.004472 ms |
| Mean | 0.000301 ms | 0.004468 ms |
| Min | 0.000272 ms | 0.004171 ms |
| Max | 0.000446 ms | 0.004939 ms |

### Threshold

**Overhead:** -93.37%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-non-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** fast-redact
**Version:** 3.5.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000332 ms | 0.000148 ms |
| Mean | 0.000338 ms | 0.000146 ms |
| Min | 0.000306 ms | 0.000125 ms |
| Max | 0.000458 ms | 0.000156 ms |

### Threshold

**Overhead:** 123.85%
**Policy:** median within -100% to 300%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-non-serialised-v3-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v3
**Version:** 3.0.5

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000510 ms | 0.004460 ms |
| Mean | 0.000516 ms | 0.004467 ms |
| Min | 0.000475 ms | 0.004181 ms |
| Max | 0.000591 ms | 0.004637 ms |

### Threshold

**Overhead:** -88.56%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-non-serialised-fast-redact-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** fast-redact
**Version:** 3.5.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000518 ms | 0.000391 ms |
| Mean | 0.000539 ms | 0.000402 ms |
| Min | 0.000474 ms | 0.000384 ms |
| Max | 0.001472 ms | 0.000467 ms |

### Threshold

**Overhead:** 32.45%
**Policy:** median within -100% to 75%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-non-serialised-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000319 ms | 0.002410 ms |
| Mean | 0.000321 ms | 0.002409 ms |
| Min | 0.000295 ms | 0.002309 ms |
| Max | 0.000428 ms | 0.002529 ms |

### Threshold

**Overhead:** -86.74%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## path-based-serialised-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.003176 ms | 0.003214 ms |
| Mean | 0.003198 ms | 0.003229 ms |
| Min | 0.002976 ms | 0.003133 ms |
| Max | 0.004255 ms | 0.003839 ms |

### Threshold

**Overhead:** -1.19%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## wildcard-non-serialised-v2-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000513 ms | 0.002829 ms |
| Mean | 0.000521 ms | 0.002842 ms |
| Min | 0.000473 ms | 0.002756 ms |
| Max | 0.000635 ms | 0.003475 ms |

### Threshold

**Overhead:** -81.88%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## wildcard-serialised-v2-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.005139 ms | 0.003204 ms |
| Mean | 0.005128 ms | 0.003203 ms |
| Min | 0.004847 ms | 0.003002 ms |
| Max | 0.005414 ms | 0.003301 ms |

### Threshold

**Overhead:** 60.39%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-v4baseline-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v4-baseline
**Version:** 4.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Median | 0.000353 ms | 0.000348 ms |
| Mean | 0.000363 ms | 0.000359 ms |
| Min | 0.000345 ms | 0.000328 ms |
| Max | 0.000447 ms | 0.000504 ms |

### Threshold

**Overhead:** 1.47%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v3
**Version:** 3.0.5

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000361 ms | 0.177027 ms |
| Mean | 0.000374 ms | 0.178127 ms |
| Min | 0.000347 ms | 0.174965 ms |
| Max | 0.001127 ms | 0.218585 ms |

### Threshold

**Overhead:** -99.8%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** fast-redact
**Version:** 3.5.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000353 ms | 0.000166 ms |
| Mean | 0.000361 ms | 0.000168 ms |
| Min | 0.000342 ms | 0.000160 ms |
| Max | 0.000600 ms | 0.000184 ms |

### Threshold

**Overhead:** 112.38%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000356 ms | 0.079534 ms |
| Mean | 0.000366 ms | 0.079588 ms |
| Min | 0.000349 ms | 0.079101 ms |
| Max | 0.000627 ms | 0.081088 ms |

### Threshold

**Overhead:** -99.55%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-v4baseline-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v4-baseline
**Version:** 4.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Median | 0.214502 ms | 0.224091 ms |
| Mean | 0.214483 ms | 0.224031 ms |
| Min | 0.212620 ms | 0.221889 ms |
| Max | 0.215490 ms | 0.227652 ms |

### Threshold

**Overhead:** -4.28%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## deep-serialised-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v3
**Version:** 3.0.5

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.214055 ms | 0.169032 ms |
| Mean | 0.214178 ms | 0.169079 ms |
| Min | 0.211007 ms | 0.168278 ms |
| Max | 0.218316 ms | 0.171561 ms |

### Threshold

**Overhead:** 26.64%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** fast-redact
**Version:** 3.5.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.214308 ms | 0.008907 ms |
| Mean | 0.214282 ms | 0.008954 ms |
| Min | 0.212972 ms | 0.008841 ms |
| Max | 0.216289 ms | 0.009392 ms |

### Threshold

**Overhead:** 2305.95%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-json-stringify-regex-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/json-stringify-regex
**Version:** 1.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.213589 ms | 0.025702 ms |
| Mean | 0.213692 ms | 0.025732 ms |
| Min | 0.212550 ms | 0.025623 ms |
| Max | 0.216595 ms | 0.026069 ms |

### Threshold

**Overhead:** 731.03%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Iterations | 100000 |
| Warmup iterations | 10000 |

### Comparator

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.214453 ms | 0.073997 ms |
| Mean | 0.214599 ms | 0.074004 ms |
| Min | 0.213201 ms | 0.073646 ms |
| Max | 0.241487 ms | 0.074737 ms |

### Threshold

**Overhead:** 189.82%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED
