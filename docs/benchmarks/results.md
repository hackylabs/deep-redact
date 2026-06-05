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
| Median | 0.000306 ms | 0.005100 ms |
| Mean | 0.000313 ms | 0.005128 ms |
| Min | 0.000278 ms | 0.004922 ms |
| Max | 0.000448 ms | 0.005799 ms |

### Threshold

**Overhead:** -93.99%
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
| Median | 0.000289 ms | 0.001378 ms |
| Mean | 0.000295 ms | 0.001405 ms |
| Min | 0.000282 ms | 0.001330 ms |
| Max | 0.000436 ms | 0.001753 ms |

### Threshold

**Overhead:** -79.06%
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
| Median | 0.003686 ms | 0.000525 ms |
| Mean | 0.003705 ms | 0.000534 ms |
| Min | 0.003607 ms | 0.000515 ms |
| Max | 0.004210 ms | 0.000654 ms |

### Threshold

**Overhead:** 601.78%
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
| Median | 0.000484 ms | 0.000397 ms |
| Mean | 0.000509 ms | 0.000418 ms |
| Min | 0.000466 ms | 0.000382 ms |
| Max | 0.001807 ms | 0.000605 ms |

### Threshold

**Overhead:** 22.07%
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
| Median | 0.000494 ms | 0.004460 ms |
| Mean | 0.000509 ms | 0.004514 ms |
| Min | 0.000463 ms | 0.004345 ms |
| Max | 0.000724 ms | 0.005192 ms |

### Threshold

**Overhead:** -88.93%
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
| Median | 0.000499 ms | 0.001373 ms |
| Mean | 0.000511 ms | 0.001391 ms |
| Min | 0.000465 ms | 0.001341 ms |
| Max | 0.000683 ms | 0.001629 ms |

### Threshold

**Overhead:** -63.66%
**Policy:** median within -100% to 50%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
