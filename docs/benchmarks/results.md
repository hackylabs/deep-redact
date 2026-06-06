# Benchmark Results

Generated from canonical benchmark artefacts in `test/artefacts/benchmarks/`.

## path-based-single-object-v3-node24

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
| Median | 0.000410 ms | 0.007208 ms |
| Mean | 0.000415 ms | 0.007254 ms |
| Min | 0.000364 ms | 0.006947 ms |
| Max | 0.000657 ms | 0.008065 ms |

### Threshold

**Overhead:** -94.31%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-single-object-json-stringify-regex-node24

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
| Median | 0.000387 ms | 0.001634 ms |
| Mean | 0.000392 ms | 0.001654 ms |
| Min | 0.000374 ms | 0.001586 ms |
| Max | 0.000536 ms | 0.002048 ms |

### Threshold

**Overhead:** -76.34%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-single-object-serialised-fast-redact-node24

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
| Median | 0.004507 ms | 0.000606 ms |
| Mean | 0.004535 ms | 0.000687 ms |
| Min | 0.004301 ms | 0.000582 ms |
| Max | 0.005696 ms | 0.005436 ms |

### Threshold

**Overhead:** 643.55%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-single-object-fast-redact-node24

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
| Median | 0.000714 ms | 0.000550 ms |
| Mean | 0.000744 ms | 0.000584 ms |
| Min | 0.000668 ms | 0.000500 ms |
| Max | 0.001009 ms | 0.001158 ms |

### Threshold

**Overhead:** 29.86%
**Policy:** median within -100% to 75%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-single-object-v3-node24

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
| Median | 0.000742 ms | 0.007017 ms |
| Mean | 0.000797 ms | 0.007405 ms |
| Min | 0.000637 ms | 0.006422 ms |
| Max | 0.001936 ms | 0.012765 ms |

### Threshold

**Overhead:** -89.43%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## wildcard-single-object-json-stringify-regex-node24

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
| Median | 0.000672 ms | 0.001676 ms |
| Mean | 0.000685 ms | 0.001701 ms |
| Min | 0.000625 ms | 0.001617 ms |
| Max | 0.001155 ms | 0.002647 ms |

### Threshold

**Overhead:** -59.89%
**Policy:** median within -100% to 50%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
