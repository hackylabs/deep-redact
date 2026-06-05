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
| Median | 0.000281 ms | 0.007124 ms |
| Mean | 0.000310 ms | 0.007149 ms |
| Min | 0.000277 ms | 0.006724 ms |
| Max | 0.000839 ms | 0.008485 ms |

### Threshold

**Overhead:** -96.06%
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
| Median | 0.000290 ms | 0.001532 ms |
| Mean | 0.000301 ms | 0.001552 ms |
| Min | 0.000287 ms | 0.001520 ms |
| Max | 0.000737 ms | 0.001946 ms |

### Threshold

**Overhead:** -81.08%
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
| Median | 0.004382 ms | 0.000548 ms |
| Mean | 0.004463 ms | 0.000553 ms |
| Min | 0.004343 ms | 0.000537 ms |
| Max | 0.004913 ms | 0.000961 ms |

### Threshold

**Overhead:** 699.07%
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
| Median | 0.000433 ms | 0.000457 ms |
| Mean | 0.000452 ms | 0.000480 ms |
| Min | 0.000429 ms | 0.000445 ms |
| Max | 0.000881 ms | 0.000881 ms |

### Threshold

**Overhead:** -5.21%
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
| Median | 0.000434 ms | 0.006298 ms |
| Mean | 0.000452 ms | 0.006445 ms |
| Min | 0.000429 ms | 0.006166 ms |
| Max | 0.000873 ms | 0.009096 ms |

### Threshold

**Overhead:** -93.11%
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
| Median | 0.000433 ms | 0.001534 ms |
| Mean | 0.000452 ms | 0.001549 ms |
| Min | 0.000429 ms | 0.001517 ms |
| Max | 0.001112 ms | 0.002088 ms |

### Threshold

**Overhead:** -71.78%
**Policy:** median within -100% to 50%
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED
