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
| Median | 0.000258 ms | 0.007210 ms |
| Mean | 0.000291 ms | 0.007238 ms |
| Min | 0.000251 ms | 0.006738 ms |
| Max | 0.000825 ms | 0.008879 ms |

### Threshold

**Overhead:** -96.42%
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
| Median | 0.000260 ms | 0.001552 ms |
| Mean | 0.000295 ms | 0.001606 ms |
| Min | 0.000251 ms | 0.001512 ms |
| Max | 0.001019 ms | 0.002505 ms |

### Threshold

**Overhead:** -83.22%
**Policy:** median within -100% to 0%
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
| Median | 0.005787 ms | 0.000533 ms |
| Mean | 0.007080 ms | 0.000697 ms |
| Min | 0.005335 ms | 0.000453 ms |
| Max | 0.023982 ms | 0.004574 ms |

### Threshold

**Overhead:** 986.43%
**Policy:** median within 0% to 2500%
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
| Median | 0.006071 ms | 0.006885 ms |
| Mean | 0.007035 ms | 0.008849 ms |
| Min | 0.005349 ms | 0.006120 ms |
| Max | 0.022604 ms | 0.040144 ms |

### Threshold

**Overhead:** -11.82%
**Policy:** median within 0% to 200%
**Gate scope:** protected-branch, release-candidate
**Result:** FAILED

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
| Median | 0.005868 ms | 0.002069 ms |
| Mean | 0.008143 ms | 0.002983 ms |
| Min | 0.005336 ms | 0.001537 ms |
| Max | 0.034418 ms | 0.010779 ms |

### Threshold

**Overhead:** 183.65%
**Policy:** median within 0% to 700%
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
