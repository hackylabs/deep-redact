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
