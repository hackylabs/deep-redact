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
| Median | 0.000268 ms | 0.007409 ms |
| Mean | 0.000301 ms | 0.011921 ms |
| Min | 0.000260 ms | 0.006761 ms |
| Max | 0.000845 ms | 0.142325 ms |

### Threshold

**Overhead:** -96.39%
**Policy:** median within -100% to 0%
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
| Median | 0.000281 ms | 0.001542 ms |
| Mean | 0.000319 ms | 0.001567 ms |
| Min | 0.000272 ms | 0.001508 ms |
| Max | 0.004586 ms | 0.002124 ms |

### Threshold

**Overhead:** -81.81%
**Policy:** median within -100% to 0%
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
| Median | 0.004528 ms | 0.000555 ms |
| Mean | 0.004757 ms | 0.000568 ms |
| Min | 0.004369 ms | 0.000537 ms |
| Max | 0.007519 ms | 0.000972 ms |

### Threshold

**Overhead:** 716.39%
**Policy:** median within -100% to 1000%
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
| Median | 0.000375 ms | 0.000440 ms |
| Mean | 0.000439 ms | 0.000491 ms |
| Min | 0.000367 ms | 0.000428 ms |
| Max | 0.000870 ms | 0.001520 ms |

### Threshold

**Overhead:** -14.79%
**Policy:** median within -100% to 75%
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
| Median | 0.000373 ms | 0.007029 ms |
| Mean | 0.000433 ms | 0.007075 ms |
| Min | 0.000364 ms | 0.006580 ms |
| Max | 0.000824 ms | 0.010870 ms |

### Threshold

**Overhead:** -94.69%
**Policy:** median within -100% to 0%
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
| Median | 0.000378 ms | 0.001533 ms |
| Mean | 0.000440 ms | 0.001573 ms |
| Min | 0.000368 ms | 0.001512 ms |
| Max | 0.001065 ms | 0.002446 ms |

### Threshold

**Overhead:** -75.34%
**Policy:** median within -100% to 50%
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
