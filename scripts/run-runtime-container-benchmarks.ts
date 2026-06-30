import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deepRedact, type DeepRedactOptions } from '@hackylabs/deep-redact'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')

const speedSampleCount = 100
const speedBatchSize = 500
const speedWarmupIterations = 10_000
const resourceWarmupIterations = 20_000
const resourceSampleCount = 50
const resourceBatchSize = 250

interface MeasurementStats {
  max: number;
  mean: number;
  median: number;
  min: number;
  unit: 'ms';
}

interface ResourceStats {
  afterGcHeapUsedBytes: number;
  baselineHeapUsedBytes: number;
  baselineRssBytes: number;
  gcExposed: boolean;
  heapDeltaAfterGcBytes: number;
  heapDeltaBeforeGcBytes: number;
  peakHeapUsedBytes: number;
  peakRssBytes: number;
}

interface RuntimeContainerWorkload {
  readonly description: string;
  readonly id: string;
  readonly makePayload: () => unknown;
  readonly options: DeepRedactOptions;
  readonly validate: (result: unknown) => void;
}

interface RuntimeContainerBenchmarkResult {
  readonly description: string;
  readonly id: string;
  readonly resources: ResourceStats;
  readonly speed: MeasurementStats;
}

interface RuntimeContainerBenchmarkArtefact {
  readonly conditions: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly arch: string;
    readonly speedIterations: number;
    readonly speedWarmupIterations: number;
    readonly resourceIterations: number;
    readonly resourceWarmupIterations: number;
  };
  readonly generatedAt: string;
  readonly results: RuntimeContainerBenchmarkResult[];
  readonly schemaVersion: 1;
  readonly subject: {
    readonly name: string;
    readonly version: string;
  };
}

class AccountRecord {
  profile: {
    label: string;
    token: string;
  }

  token: string

  constructor(token: string) {
    this.token = token
    this.profile = {
      label: 'retained',
      token: `${token}-profile`,
    }
  }
}

const tokenKey = (): { toString: () => string } => ({
  toString: () => 'token',
})

const forceGc = (): void => {
  const maybeGc = (globalThis as { gc?: () => void }).gc

  if (typeof maybeGc === 'function') {
    maybeGc()
    maybeGc()
  }
}

const collectSpeedSamples = (
  redact: (payload: unknown) => unknown,
  makePayload: () => unknown,
): MeasurementStats => {
  for (let i = 0; i < speedWarmupIterations; i += 1) {
    redact(makePayload())
  }

  const samples: number[] = []

  for (let sample = 0; sample < speedSampleCount; sample += 1) {
    const startedAt = performance.now()
    let factoryElapsed = 0

    for (let i = 0; i < speedBatchSize; i += 1) {
      const factoryStartedAt = performance.now()
      const payload = makePayload()
      factoryElapsed += performance.now() - factoryStartedAt
      redact(payload)
    }

    const elapsed = performance.now() - startedAt - factoryElapsed

    if (elapsed <= 0) {
      throw new Error('Runtime container benchmark sample produced non-positive redaction time after factory subtraction.')
    }

    samples.push(elapsed / speedBatchSize)
  }

  samples.sort((a, b) => a - b)

  return {
    max: samples.at(-1) as number,
    mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    median: samples[Math.floor(samples.length / 2)] as number,
    min: samples[0] as number,
    unit: 'ms',
  }
}

const collectResourceSamples = (
  redact: (payload: unknown) => unknown,
  makePayload: () => unknown,
): ResourceStats => {
  for (let i = 0; i < resourceWarmupIterations; i += 1) {
    redact(makePayload())
  }

  forceGc()
  forceGc()

  const baseline = process.memoryUsage()
  let peakHeapUsedBytes = baseline.heapUsed
  let peakRssBytes = baseline.rss

  for (let sample = 0; sample < resourceSampleCount; sample += 1) {
    for (let i = 0; i < resourceBatchSize; i += 1) {
      redact(makePayload())
    }

    const memory = process.memoryUsage()
    if (memory.heapUsed > peakHeapUsedBytes) peakHeapUsedBytes = memory.heapUsed
    if (memory.rss > peakRssBytes) peakRssBytes = memory.rss
  }

  forceGc()
  forceGc()

  const afterGcHeapUsedBytes = process.memoryUsage().heapUsed

  return {
    afterGcHeapUsedBytes,
    baselineHeapUsedBytes: baseline.heapUsed,
    baselineRssBytes: baseline.rss,
    gcExposed: typeof (globalThis as { gc?: () => void }).gc === 'function',
    heapDeltaAfterGcBytes: afterGcHeapUsedBytes - baseline.heapUsed,
    heapDeltaBeforeGcBytes: peakHeapUsedBytes - baseline.heapUsed,
    peakHeapUsedBytes,
    peakRssBytes,
  }
}

const readSubjectPackage = (): { name: string; version: string } => {
  const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  }

  return {
    name: packageJson.name,
    version: packageJson.version,
  }
}

const workloads: RuntimeContainerWorkload[] = [
  {
    description: 'Key traversal through root and nested class instances.',
    id: 'class-instances-keys',
    makePayload: () => ({
      account: new AccountRecord('nested-class-token'),
      root: new AccountRecord('root-class-token'),
    }),
    options: {
      keys: ['token'],
    },
    validate: (result: unknown) => {
      const value = result as {
        account: { profile: { token: string }; token: string };
        root: { profile: { token: string }; token: string };
      }

      assert.equal(value.account.token, '[REDACTED]')
      assert.equal(value.account.profile.token, '[REDACTED]')
      assert.equal(value.root.token, '[REDACTED]')
      assert.equal(value.root.profile.token, '[REDACTED]')
    },
  },
  {
    description: 'Key traversal through Map entry names, Map values, and nested Maps.',
    id: 'maps-keys',
    makePayload: () => new Map<unknown, unknown>([
      [tokenKey(), 'map-entry-token'],
      ['profile', { token: 'map-value-token' }],
      ['nested', new Map<unknown, unknown>([
        ['token', 'nested-map-token'],
      ])],
    ]),
    options: {
      keys: ['token'],
    },
    validate: (result: unknown) => {
      const value = result as Map<unknown, unknown>
      const renderedKeyValue = [...value.entries()]
        .find(([key]) => String(key) === 'token')?.[1]
      const nested = value.get('nested') as Map<unknown, unknown>
      const profile = value.get('profile') as { token: string }

      assert.equal(renderedKeyValue, '[REDACTED]')
      assert.equal(nested.get('token'), '[REDACTED]')
      assert.equal(profile.token, '[REDACTED]')
    },
  },
  {
    description: 'Key traversal through Set member objects without synthetic key matches.',
    id: 'sets-keys',
    makePayload: () => new Set<unknown>([
      { token: 'set-member-token' },
      new Map<unknown, unknown>([
        ['member', { token: 'set-map-token' }],
      ]),
    ]),
    options: {
      keys: ['token'],
    },
    validate: (result: unknown) => {
      const [first, second] = [...result as Set<unknown>] as [
        { token: string },
        Map<unknown, unknown>,
      ]

      assert.equal(first.token, '[REDACTED]')
      assert.equal((second.get('member') as { token: string }).token, '[REDACTED]')
    },
  },
  {
    description: 'Exact and numeric path traversal through class, Map, and Set containers.',
    id: 'runtime-container-paths',
    makePayload: () => ({
      account: new AccountRecord('class-path-token'),
      cache: new Map<unknown, unknown>([
        ['secretKey', { token: 'map-path-token' }],
      ]),
      items: new Set<unknown>([
        { token: 'set-path-token' },
        { token: 'keep' },
      ]),
    }),
    options: {
      paths: [
        'account.profile.token',
        'cache.secretKey.token',
        'items.0.token',
      ],
    },
    validate: (result: unknown) => {
      const value = result as {
        account: { profile: { token: string } };
        cache: Map<unknown, unknown>;
        items: Set<unknown>;
      }
      const [first, second] = [...value.items] as [
        { token: string },
        { token: string },
      ]

      assert.equal(value.account.profile.token, '[REDACTED]')
      assert.equal((value.cache.get('secretKey') as { token: string }).token, '[REDACTED]')
      assert.equal(first.token, '[REDACTED]')
      assert.equal(second.token, 'keep')
    },
  },
]

const outputFlagIndex = process.argv.indexOf('--output')
const outputPath = outputFlagIndex === -1
  ? undefined
  : process.argv[outputFlagIndex + 1]

if (outputFlagIndex !== -1 && (outputPath === undefined || outputPath.startsWith('--'))) {
  throw new Error('--output requires a path')
}

const results = workloads.map((workload): RuntimeContainerBenchmarkResult => {
  const redact = deepRedact(workload.options)
  workload.validate(redact(workload.makePayload()))

  return {
    description: workload.description,
    id: workload.id,
    resources: collectResourceSamples(redact, workload.makePayload),
    speed: collectSpeedSamples(redact, workload.makePayload),
  }
})

const artefact: RuntimeContainerBenchmarkArtefact = {
  conditions: {
    arch: process.arch,
    nodeVersion: process.version,
    platform: process.platform,
    resourceIterations: resourceSampleCount * resourceBatchSize,
    resourceWarmupIterations,
    speedIterations: speedSampleCount * speedBatchSize,
    speedWarmupIterations,
  },
  generatedAt: new Date().toISOString(),
  results,
  schemaVersion: 1,
  subject: readSubjectPackage(),
}

const serialisedArtefact = `${JSON.stringify(artefact, null, 2)}\n`

if (outputPath === undefined) {
  process.stdout.write(serialisedArtefact)
} else {
  const resolvedOutputPath = path.resolve(repositoryRoot, outputPath)
  mkdirSync(path.dirname(resolvedOutputPath), { recursive: true })
  writeFileSync(resolvedOutputPath, serialisedArtefact)
  console.log(`Wrote artefact: ${resolvedOutputPath}`)
}
