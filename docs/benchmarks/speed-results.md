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
| Median | 0.004522 ms | 0.006844 ms |
| Mean | 0.004532 ms | 0.006901 ms |
| Min | 0.004297 ms | 0.006596 ms |
| Max | 0.005140 ms | 0.008011 ms |

### Threshold

**Overhead:** -33.92%
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
| Median | 0.004465 ms | 0.000603 ms |
| Mean | 0.004477 ms | 0.000608 ms |
| Min | 0.004308 ms | 0.000583 ms |
| Max | 0.005296 ms | 0.000719 ms |

### Threshold

**Overhead:** 640.33%
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
| Median | 0.004432 ms | 0.001647 ms |
| Mean | 0.004450 ms | 0.001658 ms |
| Min | 0.004310 ms | 0.001600 ms |
| Max | 0.005022 ms | 0.001779 ms |

### Threshold

**Overhead:** 169.07%
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
| Median | 0.006899 ms | 0.007002 ms |
| Mean | 0.006908 ms | 0.007021 ms |
| Min | 0.006717 ms | 0.006769 ms |
| Max | 0.007319 ms | 0.008122 ms |

### Threshold

**Overhead:** -1.46%
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
| Median | 0.006909 ms | 0.000984 ms |
| Mean | 0.006959 ms | 0.000991 ms |
| Min | 0.006692 ms | 0.000956 ms |
| Max | 0.008453 ms | 0.001265 ms |

### Threshold

**Overhead:** 602.35%
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
| Median | 0.006903 ms | 0.001634 ms |
| Mean | 0.006908 ms | 0.001647 ms |
| Min | 0.006650 ms | 0.001592 ms |
| Max | 0.007642 ms | 0.001809 ms |

### Threshold

**Overhead:** 322.41%
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
| Median | 0.000383 ms | 0.006537 ms |
| Mean | 0.000393 ms | 0.006724 ms |
| Min | 0.000366 ms | 0.006323 ms |
| Max | 0.000586 ms | 0.015291 ms |

### Threshold

**Overhead:** -94.14%
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
| Median | 0.000416 ms | 0.000161 ms |
| Mean | 0.000442 ms | 0.000163 ms |
| Min | 0.000399 ms | 0.000156 ms |
| Max | 0.000988 ms | 0.000274 ms |

### Threshold

**Overhead:** 159.01%
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
| Median | 0.000650 ms | 0.006586 ms |
| Mean | 0.000678 ms | 0.006708 ms |
| Min | 0.000624 ms | 0.006336 ms |
| Max | 0.000998 ms | 0.010638 ms |

### Threshold

**Overhead:** -90.14%
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
| Median | 0.000665 ms | 0.000505 ms |
| Mean | 0.000697 ms | 0.000531 ms |
| Min | 0.000626 ms | 0.000486 ms |
| Max | 0.001077 ms | 0.000798 ms |

### Threshold

**Overhead:** 31.7%
**Policy:** median within -100% to 75%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## path-based-non-serialised-v2-node24

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

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000405 ms | 0.003247 ms |
| Mean | 0.000420 ms | 0.003271 ms |
| Min | 0.000389 ms | 0.003048 ms |
| Max | 0.000767 ms | 0.003807 ms |

### Threshold

**Overhead:** -87.54%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## path-based-serialised-v2-node24

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

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.004484 ms | 0.003982 ms |
| Mean | 0.004518 ms | 0.004058 ms |
| Min | 0.004329 ms | 0.003788 ms |
| Max | 0.005251 ms | 0.009099 ms |

### Threshold

**Overhead:** 12.6%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## wildcard-non-serialised-v2-node24

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

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000646 ms | 0.003455 ms |
| Mean | 0.000668 ms | 0.003464 ms |
| Min | 0.000625 ms | 0.003304 ms |
| Max | 0.000948 ms | 0.003897 ms |

### Threshold

**Overhead:** -81.3%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## wildcard-serialised-v2-node24

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

**Name:** ./test/bench/competitors/deep-redact-v2
**Version:** 2.2.1

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.007060 ms | 0.003923 ms |
| Mean | 0.007093 ms | 0.003944 ms |
| Min | 0.006831 ms | 0.003773 ms |
| Max | 0.007758 ms | 0.004254 ms |

### Threshold

**Overhead:** 79.95%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED
