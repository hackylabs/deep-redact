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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 8385.4 KiB | 8532.2 KiB |
| Peak heap used | 10460.7 KiB | 12653.7 KiB |
| After-GC heap used | 8386.8 KiB | 8533.8 KiB |
| Heap delta (before GC) | 2075.3 KiB | 4121.4 KiB |
| Heap delta (after GC) | 1.4 KiB | 1.6 KiB |
| Baseline RSS | 85632.0 KiB | 86464.0 KiB |
| Peak RSS | 85680.0 KiB | 90688.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 8688.6 KiB | 8696.8 KiB |
| Peak heap used | 12754.4 KiB | 12758.1 KiB |
| After-GC heap used | 8688.6 KiB | 8697.6 KiB |
| Heap delta (before GC) | 4065.8 KiB | 4061.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.8 KiB |
| Baseline RSS | 92112.0 KiB | 92128.0 KiB |
| Peak RSS | 92128.0 KiB | 92128.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8927.7 KiB | 8954.2 KiB |
| Peak heap used | 13112.4 KiB | 12389.1 KiB |
| After-GC heap used | 8937.8 KiB | 8954.5 KiB |
| Heap delta (before GC) | 4184.7 KiB | 3434.9 KiB |
| Heap delta (after GC) | 10.1 KiB | 0.3 KiB |
| Baseline RSS | 92768.0 KiB | 92848.0 KiB |
| Peak RSS | 92880.0 KiB | 92848.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8957.4 KiB | 9041.6 KiB |
| Peak heap used | 13056.4 KiB | 13127.0 KiB |
| After-GC heap used | 8996.0 KiB | 9041.4 KiB |
| Heap delta (before GC) | 4099.0 KiB | 4085.4 KiB |
| Heap delta (after GC) | 38.7 KiB | -0.1 KiB |
| Baseline RSS | 93664.0 KiB | 93680.0 KiB |
| Peak RSS | 93664.0 KiB | 93680.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9025.9 KiB | 9068.6 KiB |
| Peak heap used | 13038.4 KiB | 13193.6 KiB |
| After-GC heap used | 9025.9 KiB | 9072.0 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4125.0 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.4 KiB |
| Baseline RSS | 93680.0 KiB | 93712.0 KiB |
| Peak RSS | 93680.0 KiB | 93744.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9023.4 KiB | 9021.8 KiB |
| Peak heap used | 13035.8 KiB | 13083.2 KiB |
| After-GC heap used | 9023.4 KiB | 9021.8 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4061.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.0 KiB |
| Baseline RSS | 93792.0 KiB | 93808.0 KiB |
| Peak RSS | 93808.0 KiB | 93808.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9073.6 KiB | 9212.5 KiB |
| Peak heap used | 13195.7 KiB | 13328.1 KiB |
| After-GC heap used | 9096.7 KiB | 9226.3 KiB |
| Heap delta (before GC) | 4122.0 KiB | 4115.6 KiB |
| Heap delta (after GC) | 23.1 KiB | 13.8 KiB |
| Baseline RSS | 93888.0 KiB | 96048.0 KiB |
| Peak RSS | 93888.0 KiB | 96080.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9162.2 KiB | 9250.9 KiB |
| Peak heap used | 13174.6 KiB | 13355.0 KiB |
| After-GC heap used | 9162.2 KiB | 9251.1 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4104.1 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.2 KiB |
| Baseline RSS | 96144.0 KiB | 97760.0 KiB |
| Peak RSS | 96160.0 KiB | 97760.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Baseline heap used | 9432.1 KiB | 9557.5 KiB |
| Peak heap used | 17554.1 KiB | 17728.2 KiB |
| After-GC heap used | 9455.1 KiB | 9557.5 KiB |
| Heap delta (before GC) | 8122.0 KiB | 8170.7 KiB |
| Heap delta (after GC) | 23.0 KiB | 0.0 KiB |
| Baseline RSS | 106640.0 KiB | 106672.0 KiB |
| Peak RSS | 106640.0 KiB | 106672.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9597.9 KiB | 9640.6 KiB |
| Peak heap used | 17768.7 KiB | 73673.0 KiB |
| After-GC heap used | 9597.9 KiB | 9640.9 KiB |
| Heap delta (before GC) | 8170.7 KiB | 64032.5 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.3 KiB |
| Baseline RSS | 106736.0 KiB | 157120.0 KiB |
| Peak RSS | 106736.0 KiB | 224112.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 9631.0 KiB | 9636.5 KiB |
| Peak heap used | 75141.5 KiB | 75143.4 KiB |
| After-GC heap used | 9631.0 KiB | 9636.7 KiB |
| Heap delta (before GC) | 65510.5 KiB | 65506.9 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.1 KiB |
| Baseline RSS | 224128.0 KiB | 224144.0 KiB |
| Peak RSS | 224144.0 KiB | 224144.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9628.8 KiB | 9694.7 KiB |
| Peak heap used | 75139.3 KiB | 74669.3 KiB |
| After-GC heap used | 9628.8 KiB | 9697.7 KiB |
| Heap delta (before GC) | 65510.6 KiB | 64974.5 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.0 KiB |
| Baseline RSS | 224144.0 KiB | 224480.0 KiB |
| Peak RSS | 224144.0 KiB | 224512.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v4-baseline 4.0.0 |
|--------|------------------------------|--------------------------------------------------------|
| Baseline heap used | 9670.1 KiB | 9836.7 KiB |
| Peak heap used | 74217.2 KiB | 74328.6 KiB |
| After-GC heap used | 9676.3 KiB | 9836.8 KiB |
| Heap delta (before GC) | 64547.0 KiB | 64491.9 KiB |
| Heap delta (after GC) | 6.2 KiB | 0.1 KiB |
| Baseline RSS | 224624.0 KiB | 218288.0 KiB |
| Peak RSS | 224640.0 KiB | 218304.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9840.7 KiB | 9880.1 KiB |
| Peak heap used | 75144.8 KiB | 74885.3 KiB |
| After-GC heap used | 9841.5 KiB | 9881.9 KiB |
| Heap delta (before GC) | 65304.0 KiB | 65005.2 KiB |
| Heap delta (after GC) | 0.8 KiB | 1.8 KiB |
| Baseline RSS | 218320.0 KiB | 218448.0 KiB |
| Peak RSS | 218336.0 KiB | 218496.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 9854.4 KiB | 9861.9 KiB |
| Peak heap used | 75156.2 KiB | 73588.8 KiB |
| After-GC heap used | 9854.4 KiB | 9864.2 KiB |
| Heap delta (before GC) | 65301.8 KiB | 63726.8 KiB |
| Heap delta (after GC) | 0.0 KiB | 2.2 KiB |
| Baseline RSS | 218512.0 KiB | 218544.0 KiB |
| Peak RSS | 218528.0 KiB | 218544.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9850.4 KiB | 9853.9 KiB |
| Peak heap used | 75155.6 KiB | 74725.9 KiB |
| After-GC heap used | 9851.6 KiB | 9853.9 KiB |
| Heap delta (before GC) | 65305.1 KiB | 64872.0 KiB |
| Heap delta (after GC) | 1.1 KiB | 0.0 KiB |
| Baseline RSS | 218576.0 KiB | 218608.0 KiB |
| Peak RSS | 218576.0 KiB | 218608.0 KiB |

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

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v2 2.2.1 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9856.4 KiB | 9928.3 KiB |
| Peak heap used | 75158.2 KiB | 74370.1 KiB |
| After-GC heap used | 9856.4 KiB | 9928.7 KiB |
| Heap delta (before GC) | 65301.8 KiB | 64441.9 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.4 KiB |
| Baseline RSS | 218608.0 KiB | 218816.0 KiB |
| Peak RSS | 218624.0 KiB | 218832.0 KiB |
