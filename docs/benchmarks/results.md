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
| Median | 0.007083 ms | 0.000125 ms |
| Mean | 0.007367 ms | 0.000147 ms |
| Min | 0.006708 ms | 0.000083 ms |
| Max | 0.126042 ms | 0.038167 ms |

### Threshold

**Overhead:** 5566.4%
**Policy:** median within 0% to 50%
**Gate scope:** protected-branch, release-candidate
**Result:** FAILED
