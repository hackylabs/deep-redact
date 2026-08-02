# Resource Usage Benchmark Results

Generated from canonical resource benchmark artefacts in `test/artefacts/benchmarks/resource/`.

> Heap values are sampled between batches of 500 calls after 50,000 warmup iterations.
> `gcExposed: true` means Node was started with `--expose-gc`, enabling deterministic GC between phases.

## path-based-single-object-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 8388.7 KiB | 8535.4 KiB |
| Peak heap used | 10450.9 KiB | 12676.8 KiB |
| After-GC heap used | 8390.1 KiB | 8537.1 KiB |
| Heap delta (before GC) | 2062.2 KiB | 4141.4 KiB |
| Heap delta (after GC) | 1.4 KiB | 1.7 KiB |
| Baseline RSS | 85168.0 KiB | 86000.0 KiB |
| Peak RSS | 85232.0 KiB | 90128.0 KiB |

## path-based-single-object-json-stringify-regex-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 8687.2 KiB | 8688.4 KiB |
| Peak heap used | 12755.4 KiB | 12749.7 KiB |
| After-GC heap used | 8687.2 KiB | 8689.3 KiB |
| Heap delta (before GC) | 4068.2 KiB | 4061.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.8 KiB |
| Baseline RSS | 91616.0 KiB | 91616.0 KiB |
| Peak RSS | 91616.0 KiB | 91616.0 KiB |

## path-based-single-object-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8939.4 KiB | 8966.7 KiB |
| Peak heap used | 13153.8 KiB | 12401.6 KiB |
| After-GC heap used | 8950.3 KiB | 8967.0 KiB |
| Heap delta (before GC) | 4214.3 KiB | 3434.9 KiB |
| Heap delta (after GC) | 10.9 KiB | 0.3 KiB |
| Baseline RSS | 92432.0 KiB | 92528.0 KiB |
| Peak RSS | 92512.0 KiB | 92528.0 KiB |

## wildcard-single-object-fast-redact-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8969.8 KiB | 9053.8 KiB |
| Peak heap used | 13094.9 KiB | 13139.3 KiB |
| After-GC heap used | 9008.4 KiB | 9053.7 KiB |
| Heap delta (before GC) | 4125.1 KiB | 4085.4 KiB |
| Heap delta (after GC) | 38.6 KiB | -0.1 KiB |
| Baseline RSS | 93248.0 KiB | 93264.0 KiB |
| Peak RSS | 93248.0 KiB | 93264.0 KiB |

## wildcard-single-object-v3-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9038.2 KiB | 9084.2 KiB |
| Peak heap used | 13085.5 KiB | 13179.6 KiB |
| After-GC heap used | 9038.2 KiB | 9087.6 KiB |
| Heap delta (before GC) | 4047.3 KiB | 4095.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.4 KiB |
| Baseline RSS | 93264.0 KiB | 93344.0 KiB |
| Peak RSS | 93264.0 KiB | 93424.0 KiB |

## wildcard-single-object-json-stringify-regex-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9035.4 KiB | 9033.8 KiB |
| Peak heap used | 13082.7 KiB | 13095.2 KiB |
| After-GC heap used | 9035.4 KiB | 9033.8 KiB |
| Heap delta (before GC) | 4047.2 KiB | 4061.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.0 KiB |
| Baseline RSS | 93472.0 KiB | 93472.0 KiB |
| Peak RSS | 93472.0 KiB | 93472.0 KiB |

## path-based-single-object-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9075.0 KiB | 9219.3 KiB |
| Peak heap used | 13169.6 KiB | 13334.9 KiB |
| After-GC heap used | 9098.1 KiB | 9233.1 KiB |
| Heap delta (before GC) | 4094.6 KiB | 4115.6 KiB |
| Heap delta (after GC) | 23.1 KiB | 13.8 KiB |
| Baseline RSS | 93680.0 KiB | 95600.0 KiB |
| Peak RSS | 93680.0 KiB | 95616.0 KiB |

## wildcard-single-object-v2-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9167.1 KiB | 9255.8 KiB |
| Peak heap used | 13214.4 KiB | 17451.3 KiB |
| After-GC heap used | 9167.1 KiB | 9255.9 KiB |
| Heap delta (before GC) | 4047.3 KiB | 8195.6 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.2 KiB |
| Baseline RSS | 95680.0 KiB | 106048.0 KiB |
| Peak RSS | 95680.0 KiB | 106048.0 KiB |

## deep-non-serialised-v4baseline-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Baseline heap used | 9444.8 KiB | 9571.6 KiB |
| Peak heap used | 17668.6 KiB | 17742.2 KiB |
| After-GC heap used | 9467.9 KiB | 9571.6 KiB |
| Heap delta (before GC) | 8223.8 KiB | 8170.7 KiB |
| Heap delta (after GC) | 23.1 KiB | 0.0 KiB |
| Baseline RSS | 106544.0 KiB | 103216.0 KiB |
| Peak RSS | 106560.0 KiB | 103216.0 KiB |

## deep-non-serialised-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9586.6 KiB | 9626.6 KiB |
| Peak heap used | 17705.3 KiB | 74240.4 KiB |
| After-GC heap used | 9586.6 KiB | 9626.9 KiB |
| Heap delta (before GC) | 8118.6 KiB | 64613.8 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.2 KiB |
| Baseline RSS | 103248.0 KiB | 153584.0 KiB |
| Peak RSS | 103248.0 KiB | 220560.0 KiB |

## deep-non-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 9620.4 KiB | 9625.9 KiB |
| Peak heap used | 74643.9 KiB | 75132.8 KiB |
| After-GC heap used | 9620.4 KiB | 9626.0 KiB |
| Heap delta (before GC) | 65023.5 KiB | 65506.9 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.1 KiB |
| Baseline RSS | 220576.0 KiB | 220592.0 KiB |
| Peak RSS | 220576.0 KiB | 220592.0 KiB |

## deep-non-serialised-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9618.2 KiB | 9684.1 KiB |
| Peak heap used | 74641.7 KiB | 74678.4 KiB |
| After-GC heap used | 9618.2 KiB | 9687.1 KiB |
| Heap delta (before GC) | 65023.5 KiB | 64994.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.0 KiB |
| Baseline RSS | 220592.0 KiB | 220832.0 KiB |
| Peak RSS | 220592.0 KiB | 220848.0 KiB |

## deep-serialised-v4baseline-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Baseline heap used | 9663.6 KiB | 9832.7 KiB |
| Peak heap used | 74721.5 KiB | 74324.6 KiB |
| After-GC heap used | 9670.4 KiB | 9832.8 KiB |
| Heap delta (before GC) | 65058.0 KiB | 64491.9 KiB |
| Heap delta (after GC) | 6.9 KiB | 0.1 KiB |
| Baseline RSS | 221040.0 KiB | 221152.0 KiB |
| Peak RSS | 221056.0 KiB | 221184.0 KiB |

## deep-serialised-v3-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9799.2 KiB | 9840.4 KiB |
| Peak heap used | 75103.3 KiB | 75204.1 KiB |
| After-GC heap used | 9799.9 KiB | 9841.7 KiB |
| Heap delta (before GC) | 65304.1 KiB | 65363.7 KiB |
| Heap delta (after GC) | 0.8 KiB | 1.3 KiB |
| Baseline RSS | 221216.0 KiB | 221296.0 KiB |
| Peak RSS | 221232.0 KiB | 221360.0 KiB |

## deep-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 9812.3 KiB | 9819.6 KiB |
| Peak heap used | 75114.1 KiB | 73589.0 KiB |
| After-GC heap used | 9812.3 KiB | 9821.8 KiB |
| Heap delta (before GC) | 65301.8 KiB | 63769.5 KiB |
| Heap delta (after GC) | 0.0 KiB | 2.2 KiB |
| Baseline RSS | 221408.0 KiB | 221504.0 KiB |
| Peak RSS | 221424.0 KiB | 221504.0 KiB |

## deep-serialised-json-stringify-regex-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9807.9 KiB | 9811.3 KiB |
| Peak heap used | 75113.1 KiB | 74683.4 KiB |
| After-GC heap used | 9809.1 KiB | 9811.3 KiB |
| Heap delta (before GC) | 65305.1 KiB | 64872.0 KiB |
| Heap delta (after GC) | 1.1 KiB | 0.0 KiB |
| Baseline RSS | 221520.0 KiB | 221584.0 KiB |
| Peak RSS | 221536.0 KiB | 221584.0 KiB |

## deep-serialised-v2-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50000 |
| Measurement iterations | 50000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.2 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9813.9 KiB | 9886.2 KiB |
| Peak heap used | 75115.7 KiB | 74483.6 KiB |
| After-GC heap used | 9813.9 KiB | 9886.6 KiB |
| Heap delta (before GC) | 65301.8 KiB | 64597.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.4 KiB |
| Baseline RSS | 221600.0 KiB | 221744.0 KiB |
| Peak RSS | 221616.0 KiB | 221760.0 KiB |
