# Benchmark Results

Generated from canonical benchmark artefacts in `test/artefacts/benchmarks/`.

## path-based-single-object-node24

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
| Median | 0.000267 ms | 0.000127 ms |
| Mean | 0.000274 ms | 0.000157 ms |
| Min | 0.000259 ms | 0.000111 ms |
| Max | 0.000600 ms | 0.001241 ms |

### Threshold

**Overhead:** 110.99%
**Policy:** median within 0% to 150%
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

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
| Median | 0.000275 ms | 0.006713 ms |
| Mean | 0.000314 ms | 0.007488 ms |
| Min | 0.000254 ms | 0.006028 ms |
| Max | 0.001207 ms | 0.031667 ms |

### Threshold

**Overhead:** -95.9%
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
| Median | 0.000268 ms | 0.001755 ms |
| Mean | 0.000278 ms | 0.002038 ms |
| Min | 0.000259 ms | 0.001530 ms |
| Max | 0.000569 ms | 0.005132 ms |

### Threshold

**Overhead:** -84.71%
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
| Median | 0.010234 ms | 0.000474 ms |
| Mean | 0.010947 ms | 0.000558 ms |
| Min | 0.009465 ms | 0.000438 ms |
| Max | 0.019144 ms | 0.002501 ms |

### Threshold

**Overhead:** 2057.92%
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
| Median | 0.010073 ms | 0.006593 ms |
| Mean | 0.010769 ms | 0.007255 ms |
| Min | 0.009425 ms | 0.006098 ms |
| Max | 0.021023 ms | 0.013848 ms |

### Threshold

**Overhead:** 52.78%
**Policy:** median within 0% to 200%
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
| Median | 0.010066 ms | 0.001589 ms |
| Mean | 0.011543 ms | 0.001638 ms |
| Min | 0.009340 ms | 0.001526 ms |
| Max | 0.029349 ms | 0.003782 ms |

### Threshold

**Overhead:** 533.5%
**Policy:** median within 0% to 700%
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
