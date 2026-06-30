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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 8392.5 KiB | 8539.3 KiB |
| Peak heap used | 10467.6 KiB | 12628.3 KiB |
| After-GC heap used | 8393.8 KiB | 8544.0 KiB |
| Heap delta (before GC) | 2075.2 KiB | 4089.1 KiB |
| Heap delta (after GC) | 1.4 KiB | 4.8 KiB |
| Baseline RSS | 85168.0 KiB | 85968.0 KiB |
| Peak RSS | 85232.0 KiB | 90096.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 8695.5 KiB | 8703.7 KiB |
| Peak heap used | 12761.3 KiB | 12765.0 KiB |
| After-GC heap used | 8695.5 KiB | 8704.6 KiB |
| Heap delta (before GC) | 4065.8 KiB | 4061.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.8 KiB |
| Baseline RSS | 91552.0 KiB | 91568.0 KiB |
| Peak RSS | 91568.0 KiB | 91568.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8938.5 KiB | 8964.7 KiB |
| Peak heap used | 13118.0 KiB | 12399.7 KiB |
| After-GC heap used | 8948.3 KiB | 8965.0 KiB |
| Heap delta (before GC) | 4179.5 KiB | 3434.9 KiB |
| Heap delta (after GC) | 9.8 KiB | 0.3 KiB |
| Baseline RSS | 92400.0 KiB | 92448.0 KiB |
| Peak RSS | 92448.0 KiB | 92448.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8965.3 KiB | 9049.5 KiB |
| Peak heap used | 13106.2 KiB | 13134.9 KiB |
| After-GC heap used | 9004.0 KiB | 9049.4 KiB |
| Heap delta (before GC) | 4140.8 KiB | 4085.4 KiB |
| Heap delta (after GC) | 38.7 KiB | -0.1 KiB |
| Baseline RSS | 93184.0 KiB | 93248.0 KiB |
| Peak RSS | 93200.0 KiB | 93248.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9033.8 KiB | 9079.7 KiB |
| Peak heap used | 13046.3 KiB | 13207.8 KiB |
| After-GC heap used | 9033.8 KiB | 9080.0 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4128.1 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.3 KiB |
| Baseline RSS | 93248.0 KiB | 93344.0 KiB |
| Peak RSS | 93248.0 KiB | 93376.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9031.5 KiB | 9029.9 KiB |
| Peak heap used | 13043.9 KiB | 13091.4 KiB |
| After-GC heap used | 9031.5 KiB | 9029.9 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4061.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.0 KiB |
| Baseline RSS | 93392.0 KiB | 93408.0 KiB |
| Peak RSS | 93392.0 KiB | 93408.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9077.6 KiB | 9216.5 KiB |
| Peak heap used | 13174.5 KiB | 13365.7 KiB |
| After-GC heap used | 9100.7 KiB | 9229.9 KiB |
| Heap delta (before GC) | 4097.0 KiB | 4149.2 KiB |
| Heap delta (after GC) | 23.1 KiB | 13.5 KiB |
| Baseline RSS | 93664.0 KiB | 95632.0 KiB |
| Peak RSS | 93664.0 KiB | 95648.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9165.7 KiB | 9254.4 KiB |
| Peak heap used | 13178.2 KiB | 13377.4 KiB |
| After-GC heap used | 9165.7 KiB | 9254.6 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4122.9 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.2 KiB |
| Baseline RSS | 95728.0 KiB | 97360.0 KiB |
| Peak RSS | 95744.0 KiB | 97376.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Baseline heap used | 9440.7 KiB | 9566.6 KiB |
| Peak heap used | 17577.3 KiB | 17737.2 KiB |
| After-GC heap used | 9463.6 KiB | 9566.6 KiB |
| Heap delta (before GC) | 8136.6 KiB | 8170.7 KiB |
| Heap delta (after GC) | 23.0 KiB | 0.0 KiB |
| Baseline RSS | 106192.0 KiB | 106224.0 KiB |
| Peak RSS | 106224.0 KiB | 106240.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9582.2 KiB | 9625.5 KiB |
| Peak heap used | 17753.0 KiB | 73657.9 KiB |
| After-GC heap used | 9582.2 KiB | 9625.8 KiB |
| Heap delta (before GC) | 8170.7 KiB | 64032.5 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.3 KiB |
| Baseline RSS | 106256.0 KiB | 156592.0 KiB |
| Peak RSS | 106256.0 KiB | 223552.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 9615.9 KiB | 9621.5 KiB |
| Peak heap used | 75126.4 KiB | 75128.3 KiB |
| After-GC heap used | 9615.9 KiB | 9621.6 KiB |
| Heap delta (before GC) | 65510.5 KiB | 65506.9 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.1 KiB |
| Baseline RSS | 223584.0 KiB | 223584.0 KiB |
| Peak RSS | 223584.0 KiB | 223584.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9613.7 KiB | 9684.8 KiB |
| Peak heap used | 75124.2 KiB | 74679.0 KiB |
| After-GC heap used | 9613.7 KiB | 9687.8 KiB |
| Heap delta (before GC) | 65510.6 KiB | 64994.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.0 KiB |
| Baseline RSS | 223600.0 KiB | 224128.0 KiB |
| Peak RSS | 223600.0 KiB | 224144.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Baseline heap used | 9657.4 KiB | 9825.4 KiB |
| Peak heap used | 74717.4 KiB | 74317.3 KiB |
| After-GC heap used | 9664.0 KiB | 9825.5 KiB |
| Heap delta (before GC) | 65060.0 KiB | 64491.9 KiB |
| Heap delta (after GC) | 6.6 KiB | 0.1 KiB |
| Baseline RSS | 224272.0 KiB | 224448.0 KiB |
| Peak RSS | 224288.0 KiB | 224448.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9792.6 KiB | 9831.9 KiB |
| Peak heap used | 75096.6 KiB | 75208.3 KiB |
| After-GC heap used | 9793.3 KiB | 9833.3 KiB |
| Heap delta (before GC) | 65304.0 KiB | 65376.3 KiB |
| Heap delta (after GC) | 0.8 KiB | 1.3 KiB |
| Baseline RSS | 218000.0 KiB | 218080.0 KiB |
| Peak RSS | 218032.0 KiB | 218160.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 9805.7 KiB | 9813.0 KiB |
| Peak heap used | 75107.4 KiB | 73582.4 KiB |
| After-GC heap used | 9805.7 KiB | 9815.2 KiB |
| Heap delta (before GC) | 65301.8 KiB | 63769.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 2.2 KiB |
| Baseline RSS | 218192.0 KiB | 218208.0 KiB |
| Peak RSS | 218192.0 KiB | 218208.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9801.3 KiB | 9804.8 KiB |
| Peak heap used | 75106.4 KiB | 74676.8 KiB |
| After-GC heap used | 9802.4 KiB | 9804.8 KiB |
| Heap delta (before GC) | 65305.1 KiB | 64872.0 KiB |
| Heap delta (after GC) | 1.1 KiB | 0.0 KiB |
| Baseline RSS | 218224.0 KiB | 218272.0 KiB |
| Peak RSS | 218256.0 KiB | 218272.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.1 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9807.3 KiB | 9875.9 KiB |
| Peak heap used | 75109.1 KiB | 75439.3 KiB |
| After-GC heap used | 9807.3 KiB | 9876.3 KiB |
| Heap delta (before GC) | 65301.8 KiB | 65563.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.4 KiB |
| Baseline RSS | 218384.0 KiB | 218560.0 KiB |
| Peak RSS | 218400.0 KiB | 218592.0 KiB |
