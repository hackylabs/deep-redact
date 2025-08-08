import http from 'http'
import autocannon from 'autocannon'
import fastRedact from 'fast-redact'
import { writeFileSync } from 'fs'
import { obglob } from '@hackylabs/obglob'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { deepRedactPaths, deepRedactComplexPaths, fastRedactBlacklistedKeys, ObGlobPatterns, stringPattern } from '../setup/blacklist'
import { dummyUser } from '../setup/dummyUser'
import { DeepRedact } from '../../src'

let server: http.Server
const PORT = 3456

const handlers = {
  deepRedact: new DeepRedact({ paths: deepRedactPaths }),
  deepRedactComplex: new DeepRedact({ paths: deepRedactComplexPaths }),
  deepRedactRemove: new DeepRedact({ paths: deepRedactPaths, remove: true }),
  regexReplace: (data: any) => JSON.stringify(data).replace(stringPattern, '"$1":"[REDACTED]"'),
  jsonStringify: (data: any) => JSON.stringify(data),
  fastRedact: fastRedact({ paths: fastRedactBlacklistedKeys }),
  obglob: (data: any) => obglob(data, {
    patterns: ObGlobPatterns,
    includeUnmatched: true,
    callback: () => '[REDACTED]'
  }),
}

type LoadTestResult = {
  title: string;
  timeouts: number;
  errors: number;
  throughput: number;
  latency: {
    average: number;
    max: number;
    min: number;
    p50: number;
    p95: number;
  };
};

type LoadTestResults = {
  timestamp: number;
  results: LoadTestResult[];
  summary: {
    fastest: {
      title: string;
      latency: number;
    };
    slowest: {
      title: string;
      latency: number;
    };
  };
};

describe('Redaction Load Tests', () => {
  const results: LoadTestResult[] = [];

  beforeAll(() => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`)
      const testType = url.pathname.slice(1)
      const data = testType.includes('bulk') ? Array(1000).fill(dummyUser) : dummyUser

      let result: any

      try {
        switch(testType) {
          case 'fastRedact':
          case 'fastRedact-bulk':
            result = handlers.fastRedact(data)
            break
          case 'obglob':
          case 'obglob-bulk':
            result = handlers.obglob({ data })
            break
          case 'deepRedact':
          case 'deepRedact-bulk':
            result = handlers.deepRedact.redact({ data })
            break
          case 'deepRedactComplex':
            result = handlers.deepRedactComplex.redact({ data })
            break
          case 'deepRedactRemove':
          case 'deepRedactRemove-bulk':
            result = handlers.deepRedactRemove.redact({ data })
            break
          case 'regexReplace':
          case 'regexReplace-bulk':
            result = handlers.regexReplace({ data })
            break
          case 'jsonStringify':
          case 'jsonStringify-bulk':
            result = handlers.jsonStringify({ data })
            break
          default:
            res.writeHead(404)
            res.end('Not found')
            return
        }

        const serializedResult = typeof result === 'string' ? result : JSON.stringify(result)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(serializedResult)

      } catch (error) {
        res.writeHead(500)
        res.end('Internal Server Error')
      }
    })

    return new Promise<void>((resolve) => {
      server.listen(PORT, () => {
        console.log(`Load test server running on port ${PORT}`)
        resolve()
      })
    })
  })

  afterAll(() => {
    const sortedByP50 = [...results].sort((a, b) => a.latency.p50 - b.latency.p50);

    const output: LoadTestResults = {
      timestamp: Date.now(),
      results: sortedByP50.map(r => ({
        title: r.title,
        timeouts: r.timeouts,
        errors: r.errors,
        throughput: r.throughput,
        latency: {
          average: r.latency.average,
          max: r.latency.max,
          min: r.latency.min,
          p50: r.latency.p50,
          p95: r.latency.p95
        },
      })),
      summary: {
        fastest: {
          title: sortedByP50[0]?.title ?? 'Unknown',
          latency: sortedByP50[0]?.latency.p50 ?? 0
        },
        slowest: {
          title: sortedByP50[sortedByP50.length - 1]?.title ?? 'Unknown',
          latency: sortedByP50[sortedByP50.length - 1]?.latency.p50 ?? 0
        }
      }
    };

    writeFileSync('load-test-results.json', JSON.stringify(output, null, 2));
    return new Promise<void>((resolve) => server.close(() => resolve()));
  })

  async function runLoadTest(url: string, title: string): Promise<void> {
    const result = await autocannon({
      url: `http://localhost:${PORT}/${url}`,
      connections: 1,
      duration: 10,
      title,
      timeout: 30,
      connectionRate: 1,
      pipelining: 1,
      maxConnectionRequests: 1000
    });

    results.push({
      title,
      timeouts: result.timeouts ?? 0,
      errors: result.errors ?? 0,
      throughput: result.requests?.average ?? 0,
      latency: {
        average: result.latency?.average ?? 0,
        max: result.latency?.max ?? 0,
        min: result.latency?.min ?? 0,
        p50: result.latency?.p50 ?? 0,
        p95: result.latency?.p97_5 ?? 0,
      },
    });

    console.log('--------------------------------')
    console.log({
      title,
      timeouts: result.timeouts,
      errors: result.errors,
      totalCount: result.statusCodeStats?.[200]?.count ?? 0,
      latency: {
        average: result.latency?.average ?? 0,
        max: result.latency?.max ?? 0,
        min: result.latency?.min ?? 0,
      },
    })
    console.log('--------------------------------')
  }

  it('should handle fast-redact single object load', async () => {
    await runLoadTest('fastRedact', 'FastRedact Single Object')
  })

  it('should handle fast-redact bulk objects load', async () => {
    await runLoadTest('fastRedact-bulk', 'FastRedact 1000 Objects')
  })

  it('should handle obglob single object load', async () => {
    await runLoadTest('obglob', 'ObGlob Single Object')
  })

  it('should handle obglob bulk objects load', async () => {
    await runLoadTest('obglob-bulk', 'ObGlob 1000 Objects')
  })

  it('should handle deep-redact remove single object load', async () => {
    await runLoadTest('deepRedactRemove', 'DeepRedact Remove Single Object')
  })

  it('should handle deep-redact remove bulk objects load', async () => {
    await runLoadTest('deepRedactRemove-bulk', 'DeepRedact Remove 1000 Objects')
  })

  it('should handle deep-redact single object load', async () => {
    await runLoadTest('deepRedact', 'DeepRedact Single Object')
  })

  it('should handle deep-redact bulk objects load', async () => {
    await runLoadTest('deepRedact-bulk', 'DeepRedact 1000 Objects')
  })

  it('should handle deep-redact complex config load', async () => {
    await runLoadTest('deepRedactComplex', 'DeepRedact Complex Config')
  })

  it('should handle regexReplace single object load', async () => {
    await runLoadTest('regexReplace', 'RegexReplace Single Object')
  })

  it('should handle regexReplace bulk objects load', async () => {
    await runLoadTest('regexReplace-bulk', 'RegexReplace 1000 Objects')
  })

  it('should handle jsonStringify single object load', async () => {
    await runLoadTest('jsonStringify', 'JsonStringify Single Object')
  })

  it('should handle jsonStringify bulk objects load', async () => {
    await runLoadTest('jsonStringify-bulk', 'JsonStringify 1000 Objects')
  })
})
