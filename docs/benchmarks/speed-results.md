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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.004477 ms | 0.006841 ms |
| Mean | 0.004484 ms | 0.006895 ms |
| Min | 0.004295 ms | 0.006644 ms |
| Max | 0.005020 ms | 0.007741 ms |

### Threshold

**Overhead:** -34.56%
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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.004391 ms | 0.000601 ms |
| Mean | 0.004413 ms | 0.000607 ms |
| Min | 0.004293 ms | 0.000590 ms |
| Max | 0.004928 ms | 0.000703 ms |

### Threshold

**Overhead:** 630.69%
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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.004380 ms | 0.001641 ms |
| Mean | 0.004402 ms | 0.001655 ms |
| Min | 0.004297 ms | 0.001611 ms |
| Max | 0.004727 ms | 0.001817 ms |

### Threshold

**Overhead:** 167%
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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.006900 ms | 0.007031 ms |
| Mean | 0.006984 ms | 0.007092 ms |
| Min | 0.006709 ms | 0.006802 ms |
| Max | 0.009496 ms | 0.008986 ms |

### Threshold

**Overhead:** -1.87%
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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.006910 ms | 0.000992 ms |
| Mean | 0.006964 ms | 0.001004 ms |
| Min | 0.006682 ms | 0.000970 ms |
| Max | 0.008475 ms | 0.001156 ms |

### Threshold

**Overhead:** 596.29%
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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.006816 ms | 0.001645 ms |
| Mean | 0.006841 ms | 0.001664 ms |
| Min | 0.006649 ms | 0.001621 ms |
| Max | 0.007221 ms | 0.001872 ms |

### Threshold

**Overhead:** 314.24%
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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000382 ms | 0.006515 ms |
| Mean | 0.000396 ms | 0.006535 ms |
| Min | 0.000372 ms | 0.006341 ms |
| Max | 0.000566 ms | 0.006898 ms |

### Threshold

**Overhead:** -94.13%
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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000427 ms | 0.000167 ms |
| Mean | 0.000441 ms | 0.000171 ms |
| Min | 0.000416 ms | 0.000161 ms |
| Max | 0.000634 ms | 0.000334 ms |

### Threshold

**Overhead:** 155.57%
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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000641 ms | 0.006458 ms |
| Mean | 0.000657 ms | 0.006470 ms |
| Min | 0.000629 ms | 0.006274 ms |
| Max | 0.000793 ms | 0.006894 ms |

### Threshold

**Overhead:** -90.07%
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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000650 ms | 0.000519 ms |
| Mean | 0.000673 ms | 0.000542 ms |
| Min | 0.000629 ms | 0.000502 ms |
| Max | 0.000987 ms | 0.000681 ms |

### Threshold

**Overhead:** 25.23%
**Policy:** median within -100% to 75%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
