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
| Warmup iterations | 50,000 |
| Measurement iterations | 50,000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 8375.6 KiB | 8522.0 KiB |
| Peak heap used | 10450.8 KiB | 12653.1 KiB |
| After-GC heap used | 8377.0 KiB | 8523.6 KiB |
| Heap delta (before GC) | 2075.2 KiB | 4131.1 KiB |
| Heap delta (after GC) | 1.4 KiB | 1.6 KiB |
| Baseline RSS | 85504.0 KiB | 86320.0 KiB |
| Peak RSS | 85552.0 KiB | 90528.0 KiB |

## path-based-single-object-json-stringify-regex-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50,000 |
| Measurement iterations | 50,000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 8679.0 KiB | 8687.1 KiB |
| Peak heap used | 12744.7 KiB | 12748.4 KiB |
| After-GC heap used | 8679.0 KiB | 8688.0 KiB |
| Heap delta (before GC) | 4065.8 KiB | 4061.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.8 KiB |
| Baseline RSS | 91984.0 KiB | 91984.0 KiB |
| Peak RSS | 91984.0 KiB | 91984.0 KiB |

## path-based-single-object-serialised-fast-redact-node24

**Workload class:** path-based
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50,000 |
| Measurement iterations | 50,000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8918.4 KiB | 8947.1 KiB |
| Peak heap used | 13108.2 KiB | 12382.1 KiB |
| After-GC heap used | 8930.7 KiB | 8947.5 KiB |
| Heap delta (before GC) | 4189.8 KiB | 3434.9 KiB |
| Heap delta (after GC) | 12.3 KiB | 0.3 KiB |
| Baseline RSS | 92832.0 KiB | 92896.0 KiB |
| Peak RSS | 92896.0 KiB | 92896.0 KiB |

## wildcard-single-object-fast-redact-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50,000 |
| Measurement iterations | 50,000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | fast-redact 3.5.0 |
|--------|------------------------------|-------------------|
| Baseline heap used | 8950.3 KiB | 9034.7 KiB |
| Peak heap used | 13045.8 KiB | 13120.2 KiB |
| After-GC heap used | 8989.0 KiB | 9034.6 KiB |
| Heap delta (before GC) | 4095.5 KiB | 4085.4 KiB |
| Heap delta (after GC) | 38.7 KiB | -0.1 KiB |
| Baseline RSS | 93616.0 KiB | 93632.0 KiB |
| Peak RSS | 93616.0 KiB | 93632.0 KiB |

## wildcard-single-object-v3-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50,000 |
| Measurement iterations | 50,000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/deep-redact-v3 3.0.5 |
|--------|------------------------------|-----------------------------------------------|
| Baseline heap used | 9012.2 KiB | 9057.8 KiB |
| Peak heap used | 13024.7 KiB | 13183.3 KiB |
| After-GC heap used | 9012.2 KiB | 9061.4 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4125.5 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.6 KiB |
| Baseline RSS | 93632.0 KiB | 93664.0 KiB |
| Peak RSS | 93632.0 KiB | 93696.0 KiB |

## wildcard-single-object-json-stringify-regex-node24

**Workload class:** wildcard
**Runtime:** node24

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | v24.14.1 |
| Platform | darwin |
| Architecture | arm64 |
| Warmup iterations | 50,000 |
| Measurement iterations | 50,000 |
| GC exposed | true |

### Measurements

| Metric | @hackylabs/deep-redact 4.0.0 | ./test/bench/competitors/json-stringify-regex 1.0.0 |
|--------|------------------------------|-----------------------------------------------------|
| Baseline heap used | 9016.8 KiB | 9015.2 KiB |
| Peak heap used | 13029.2 KiB | 13076.6 KiB |
| After-GC heap used | 9016.8 KiB | 9015.2 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4061.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.0 KiB |
| Baseline RSS | 93760.0 KiB | 93760.0 KiB |
| Peak RSS | 93760.0 KiB | 93760.0 KiB |
