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
| Median | 0.006875 ms | 0.000125 ms |
| Mean | 0.007175 ms | 0.000146 ms |
| Min | 0.006583 ms | 0.000042 ms |
| Max | 0.133584 ms | 0.012500 ms |

### Threshold

**Overhead:** 5400%
**Policy:** median within 0% to 50%
**Gate scope:** protected-branch, release-candidate
**Result:** FAILED
