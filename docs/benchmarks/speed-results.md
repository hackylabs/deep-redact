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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.004056 ms | 0.006710 ms |
| Mean | 0.004067 ms | 0.006726 ms |
| Min | 0.003942 ms | 0.006563 ms |
| Max | 0.004391 ms | 0.007290 ms |

### Threshold

**Overhead:** -39.54%
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

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.003880 ms | 0.000589 ms |
| Mean | 0.003897 ms | 0.000595 ms |
| Min | 0.003804 ms | 0.000582 ms |
| Max | 0.004262 ms | 0.000711 ms |

### Threshold

**Overhead:** 559.36%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.003906 ms | 0.001592 ms |
| Mean | 0.003916 ms | 0.001609 ms |
| Min | 0.003812 ms | 0.001574 ms |
| Max | 0.004194 ms | 0.001719 ms |

### Threshold

**Overhead:** 145.36%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.006366 ms | 0.006912 ms |
| Mean | 0.006372 ms | 0.006913 ms |
| Min | 0.006241 ms | 0.006747 ms |
| Max | 0.006642 ms | 0.007713 ms |

### Threshold

**Overhead:** -7.9%
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

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.006563 ms | 0.000993 ms |
| Mean | 0.006551 ms | 0.000999 ms |
| Min | 0.006361 ms | 0.000972 ms |
| Max | 0.006828 ms | 0.001115 ms |

### Threshold

**Overhead:** 560.63%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.006563 ms | 0.001617 ms |
| Mean | 0.006556 ms | 0.001624 ms |
| Min | 0.006369 ms | 0.001579 ms |
| Max | 0.006984 ms | 0.001897 ms |

### Threshold

**Overhead:** 306.02%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000385 ms | 0.006408 ms |
| Mean | 0.000389 ms | 0.006419 ms |
| Min | 0.000375 ms | 0.006260 ms |
| Max | 0.000525 ms | 0.006743 ms |

### Threshold

**Overhead:** -93.99%
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

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000415 ms | 0.000159 ms |
| Mean | 0.000424 ms | 0.000160 ms |
| Min | 0.000401 ms | 0.000153 ms |
| Max | 0.000645 ms | 0.000263 ms |

### Threshold

**Overhead:** 161.55%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000640 ms | 0.006432 ms |
| Mean | 0.000645 ms | 0.006444 ms |
| Min | 0.000631 ms | 0.006291 ms |
| Max | 0.000731 ms | 0.006863 ms |

### Threshold

**Overhead:** -90.06%
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

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000644 ms | 0.000508 ms |
| Mean | 0.000650 ms | 0.000527 ms |
| Min | 0.000635 ms | 0.000490 ms |
| Max | 0.000739 ms | 0.000673 ms |

### Threshold

**Overhead:** 26.78%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000404 ms | 0.003182 ms |
| Mean | 0.000408 ms | 0.003176 ms |
| Min | 0.000390 ms | 0.003032 ms |
| Max | 0.000526 ms | 0.003435 ms |

### Threshold

**Overhead:** -87.31%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.003947 ms | 0.004065 ms |
| Mean | 0.003960 ms | 0.004068 ms |
| Min | 0.003894 ms | 0.003947 ms |
| Max | 0.004210 ms | 0.004532 ms |

### Threshold

**Overhead:** -2.88%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000638 ms | 0.003599 ms |
| Mean | 0.000643 ms | 0.003600 ms |
| Min | 0.000628 ms | 0.003485 ms |
| Max | 0.000833 ms | 0.004028 ms |

### Threshold

**Overhead:** -82.27%
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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.006373 ms | 0.004035 ms |
| Mean | 0.006370 ms | 0.004032 ms |
| Min | 0.006214 ms | 0.003892 ms |
| Max | 0.006669 ms | 0.004276 ms |

### Threshold

**Overhead:** 57.94%
**Policy:** median within -100% to 1000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-v4baseline-node24

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

**Name:** ./test/bench/competitors/deep-redact-v4-baseline
**Version:** 4.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Median | 0.000444 ms | 0.000416 ms |
| Mean | 0.000449 ms | 0.000438 ms |
| Min | 0.000435 ms | 0.000404 ms |
| Max | 0.000637 ms | 0.000650 ms |

### Threshold

**Overhead:** 6.73%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-v3-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000441 ms | 0.234889 ms |
| Mean | 0.000443 ms | 0.234929 ms |
| Min | 0.000429 ms | 0.233462 ms |
| Max | 0.000513 ms | 0.247367 ms |

### Threshold

**Overhead:** -99.81%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-fast-redact-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.000440 ms | 0.000173 ms |
| Mean | 0.000443 ms | 0.000174 ms |
| Min | 0.000433 ms | 0.000169 ms |
| Max | 0.000516 ms | 0.000231 ms |

### Threshold

**Overhead:** 154.7%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-non-serialised-v2-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.000439 ms | 0.105863 ms |
| Mean | 0.000442 ms | 0.105976 ms |
| Min | 0.000433 ms | 0.105201 ms |
| Max | 0.000478 ms | 0.111471 ms |

### Threshold

**Overhead:** -99.58%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-v4baseline-node24

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

**Name:** ./test/bench/competitors/deep-redact-v4-baseline
**Version:** 4.0.0

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Median | 0.263494 ms | 0.278585 ms |
| Mean | 0.263609 ms | 0.278706 ms |
| Min | 0.262670 ms | 0.277574 ms |
| Max | 0.272581 ms | 0.285556 ms |

### Threshold

**Overhead:** -5.42%
**Policy:** median within -100% to 0%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** protected-branch, release-candidate
**Result:** PASSED

## deep-serialised-v3-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.263743 ms | 0.225163 ms |
| Mean | 0.263785 ms | 0.225366 ms |
| Min | 0.262880 ms | 0.224067 ms |
| Max | 0.264747 ms | 0.232710 ms |

### Threshold

**Overhead:** 17.13%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-fast-redact-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Median | 0.263678 ms | 0.010475 ms |
| Mean | 0.263716 ms | 0.010520 ms |
| Min | 0.262971 ms | 0.010396 ms |
| Max | 0.264657 ms | 0.010925 ms |

### Threshold

**Overhead:** 2417.17%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-json-stringify-regex-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Median | 0.263555 ms | 0.031991 ms |
| Mean | 0.263689 ms | 0.032026 ms |
| Min | 0.262574 ms | 0.031885 ms |
| Max | 0.269026 ms | 0.032499 ms |

### Threshold

**Overhead:** 723.83%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED

## deep-serialised-v2-node24

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

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Median | 0.263554 ms | 0.096887 ms |
| Mean | 0.263650 ms | 0.096981 ms |
| Min | 0.262853 ms | 0.096442 ms |
| Max | 0.265157 ms | 0.100461 ms |

### Threshold

**Overhead:** 172.02%
**Policy:** median within -100% to 100000%
**Lower-bound rationale:** The benchmark-output-equivalence-contract test verifies this row's subject and comparator produce matching redacted fixture output, so work-elision risk is guarded separately from the broad lower floor.
**Gate scope:** informational
**Result:** PASSED
