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
| Baseline heap used | 8377.3 KiB | 8524.1 KiB |
| Peak heap used | 10452.5 KiB | 12675.1 KiB |
| After-GC heap used | 8378.6 KiB | 8525.7 KiB |
| Heap delta (before GC) | 2075.2 KiB | 4151.0 KiB |
| Heap delta (after GC) | 1.4 KiB | 1.6 KiB |
| Baseline RSS | 85344.0 KiB | 86256.0 KiB |
| Peak RSS | 85408.0 KiB | 90224.0 KiB |

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
| Baseline heap used | 8680.5 KiB | 8688.7 KiB |
| Peak heap used | 12746.3 KiB | 12750.0 KiB |
| After-GC heap used | 8680.5 KiB | 8689.5 KiB |
| Heap delta (before GC) | 4065.8 KiB | 4061.3 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.8 KiB |
| Baseline RSS | 91712.0 KiB | 91728.0 KiB |
| Peak RSS | 91712.0 KiB | 91728.0 KiB |

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
| Baseline heap used | 8922.1 KiB | 8948.5 KiB |
| Peak heap used | 13074.1 KiB | 12509.3 KiB |
| After-GC heap used | 8932.1 KiB | 8948.8 KiB |
| Heap delta (before GC) | 4152.0 KiB | 3560.8 KiB |
| Heap delta (after GC) | 10.0 KiB | 0.3 KiB |
| Baseline RSS | 92384.0 KiB | 92496.0 KiB |
| Peak RSS | 92496.0 KiB | 92496.0 KiB |

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
| Baseline heap used | 8951.7 KiB | 9036.1 KiB |
| Peak heap used | 13106.4 KiB | 13121.5 KiB |
| After-GC heap used | 8990.3 KiB | 9036.0 KiB |
| Heap delta (before GC) | 4154.8 KiB | 4085.4 KiB |
| Heap delta (after GC) | 38.7 KiB | -0.1 KiB |
| Baseline RSS | 93136.0 KiB | 93184.0 KiB |
| Peak RSS | 93152.0 KiB | 93184.0 KiB |

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
| Baseline heap used | 9020.5 KiB | 9066.5 KiB |
| Peak heap used | 13032.9 KiB | 13152.1 KiB |
| After-GC heap used | 9020.5 KiB | 9070.0 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4085.7 KiB |
| Heap delta (after GC) | 0.0 KiB | 3.6 KiB |
| Baseline RSS | 93200.0 KiB | 93264.0 KiB |
| Peak RSS | 93200.0 KiB | 93296.0 KiB |

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
| Baseline heap used | 9018.1 KiB | 9016.5 KiB |
| Peak heap used | 13030.5 KiB | 13077.9 KiB |
| After-GC heap used | 9018.1 KiB | 9016.5 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4061.4 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.0 KiB |
| Baseline RSS | 93328.0 KiB | 93344.0 KiB |
| Peak RSS | 93344.0 KiB | 93344.0 KiB |

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
| Baseline heap used | 9068.3 KiB | 9207.1 KiB |
| Peak heap used | 13190.4 KiB | 13343.5 KiB |
| After-GC heap used | 9091.4 KiB | 9220.8 KiB |
| Heap delta (before GC) | 4122.0 KiB | 4136.5 KiB |
| Heap delta (after GC) | 23.1 KiB | 13.8 KiB |
| Baseline RSS | 93600.0 KiB | 95344.0 KiB |
| Peak RSS | 93600.0 KiB | 95360.0 KiB |

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
| Baseline heap used | 9156.1 KiB | 9244.9 KiB |
| Peak heap used | 13168.6 KiB | 13360.0 KiB |
| After-GC heap used | 9156.1 KiB | 9245.0 KiB |
| Heap delta (before GC) | 4012.4 KiB | 4115.1 KiB |
| Heap delta (after GC) | 0.0 KiB | 0.2 KiB |
| Baseline RSS | 95392.0 KiB | 96992.0 KiB |
| Peak RSS | 95392.0 KiB | 96992.0 KiB |

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
| Baseline heap used | 8458.6 KiB | 8583.3 KiB |
| Peak heap used | 12553.4 KiB | 12684.9 KiB |
| After-GC heap used | 8460.1 KiB | 8578.3 KiB |
| Heap delta (before GC) | 4094.8 KiB | 4101.6 KiB |
| Heap delta (after GC) | 1.5 KiB | -4.9 KiB |
| Baseline RSS | 85504.0 KiB | 89984.0 KiB |
| Peak RSS | 89792.0 KiB | 90000.0 KiB |

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
| Baseline heap used | 8390.2 KiB | 8535.4 KiB |
| Peak heap used | 12501.1 KiB | 73013.7 KiB |
| After-GC heap used | 8391.7 KiB | 8534.9 KiB |
| Heap delta (before GC) | 4110.9 KiB | 64478.3 KiB |
| Heap delta (after GC) | 1.5 KiB | -0.4 KiB |
| Baseline RSS | 85168.0 KiB | 148816.0 KiB |
| Peak RSS | 89440.0 KiB | 215856.0 KiB |

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
| Baseline heap used | 8327.2 KiB | 8356.7 KiB |
| Peak heap used | 12446.3 KiB | 12439.1 KiB |
| After-GC heap used | 8328.7 KiB | 8351.8 KiB |
| Heap delta (before GC) | 4119.1 KiB | 4082.4 KiB |
| Heap delta (after GC) | 1.5 KiB | -4.9 KiB |
| Baseline RSS | 85376.0 KiB | 89760.0 KiB |
| Peak RSS | 89600.0 KiB | 89776.0 KiB |

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
| Baseline heap used | 8253.4 KiB | 8389.3 KiB |
| Peak heap used | 12340.2 KiB | 40979.7 KiB |
| After-GC heap used | 8254.9 KiB | 8384.6 KiB |
| Heap delta (before GC) | 4086.8 KiB | 32590.4 KiB |
| Heap delta (after GC) | 1.5 KiB | -4.7 KiB |
| Baseline RSS | 85152.0 KiB | 150000.0 KiB |
| Peak RSS | 89392.0 KiB | 150032.0 KiB |

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
| Baseline heap used | 8542.7 KiB | 8748.4 KiB |
| Peak heap used | 41197.4 KiB | 73261.9 KiB |
| After-GC heap used | 8545.6 KiB | 8737.3 KiB |
| Heap delta (before GC) | 32654.7 KiB | 64513.5 KiB |
| Heap delta (after GC) | 2.9 KiB | -11.1 KiB |
| Baseline RSS | 148048.0 KiB | 215328.0 KiB |
| Peak RSS | 148128.0 KiB | 215360.0 KiB |

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
| Baseline heap used | 8474.5 KiB | 8624.2 KiB |
| Peak heap used | 41129.1 KiB | 73869.0 KiB |
| After-GC heap used | 8477.4 KiB | 8617.4 KiB |
| Heap delta (before GC) | 32654.5 KiB | 65244.8 KiB |
| Heap delta (after GC) | 2.9 KiB | -6.8 KiB |
| Baseline RSS | 148016.0 KiB | 215472.0 KiB |
| Peak RSS | 148112.0 KiB | 215536.0 KiB |

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
| Baseline heap used | 8413.6 KiB | 8454.2 KiB |
| Peak heap used | 41067.5 KiB | 39421.0 KiB |
| After-GC heap used | 8416.3 KiB | 8442.9 KiB |
| Heap delta (before GC) | 32653.9 KiB | 30966.7 KiB |
| Heap delta (after GC) | 2.6 KiB | -11.4 KiB |
| Baseline RSS | 148128.0 KiB | 148448.0 KiB |
| Peak RSS | 148224.0 KiB | 148512.0 KiB |

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
| Baseline heap used | 8261.8 KiB | 8292.3 KiB |
| Peak heap used | 40916.4 KiB | 40616.4 KiB |
| After-GC heap used | 8264.7 KiB | 8280.8 KiB |
| Heap delta (before GC) | 32654.7 KiB | 32324.1 KiB |
| Heap delta (after GC) | 2.9 KiB | -11.4 KiB |
| Baseline RSS | 147584.0 KiB | 147776.0 KiB |
| Peak RSS | 147680.0 KiB | 147792.0 KiB |

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
| Baseline heap used | 8339.5 KiB | 8480.5 KiB |
| Peak heap used | 41128.0 KiB | 73254.1 KiB |
| After-GC heap used | 8342.3 KiB | 8469.3 KiB |
| Heap delta (before GC) | 32788.4 KiB | 64773.6 KiB |
| Heap delta (after GC) | 2.7 KiB | -11.2 KiB |
| Baseline RSS | 147568.0 KiB | 216992.0 KiB |
| Peak RSS | 147648.0 KiB | 217024.0 KiB |
