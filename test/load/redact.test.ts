import http from 'http'
import { afterAll, beforeAll, describe, it, expect } from 'vitest'
import { writeFileSync } from 'fs'
import fastRedact from 'fast-redact'
import { obglob } from '@hackylabs/obglob'
import { DeepRedact } from '../../src'
import { dummyUser } from '../setup/dummyUser'
import { blacklistedKeys, complexBlacklistedKeys, fastRedactBlacklistedKeys, ObGlobPatterns, stringPattern } from '../setup/blacklist'
import autocannon, { type Result } from 'autocannon'

let server: http.Server
const PORT = 3456

const handlers = {
  deepRedact: new DeepRedact({ blacklistedKeys }),
  deepRedactComplex: new DeepRedact({ blacklistedKeys: complexBlacklistedKeys }),
  deepRedactRemove: new DeepRedact({ blacklistedKeys: blacklistedKeys, remove: true }),
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
  latency: {
    average: number;
    max: number;
    min: number;
  };
};

type LoadTestResults = {
  timestamp: number
  results: LoadTestResult[]
  summary: {
    fastest: {
      title: string
      latency: number;
    };
    slowest: {
      title: string
      latency: number
    }
  }
}

describe('Redaction Load Tests', () => {
  const results: LoadTestResult[] = [];

  beforeAll(() => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`)
      const testType = url.pathname.slice(1)
      const data = testType.includes('bulk') ? Array(1000).fill(dummyUser) : dummyUser
      
      switch(testType) {
        case 'fastRedact':
        case 'fastRedact-bulk':
          handlers.fastRedact(data)
          break
        case 'obglob':
        case 'obglob-bulk':
          handlers.obglob(data)
          break
        case 'deepRedact':
        case 'deepRedact-bulk':
          handlers.deepRedact.redact(data)
          break
        case 'deepRedactComplex':
          handlers.deepRedactComplex.redact(data)
          break
        case 'deepRedactRemove':
          handlers.deepRedactRemove.redact(data)
          break
        default:
          res.writeHead(404)
          res.end('Not found')
          return
      }
      
      res.end('OK')
    })

    return new Promise<void>((resolve) => {
      server.listen(PORT, () => {
        console.log(`Load test server running on port ${PORT}`)
        resolve()
      })
    })
  })

  afterAll(() => {
    const sortedByLatency = [...results].sort((a, b) => a.latency.average - b.latency.average);
    const output: LoadTestResults = {
      timestamp: Date.now(),
      results: sortedByLatency,
      summary: {
        fastest: {
          title: sortedByLatency[0].title,
          latency: sortedByLatency[0].latency.average
        },
        slowest: {
          title: sortedByLatency[sortedByLatency.length - 1].title,
          latency: sortedByLatency[sortedByLatency.length - 1].latency.average
        }
      }
    }
    
    writeFileSync('load-test-results.json', JSON.stringify(output, null, 2))
    return new Promise<void>((resolve) => server.close(() => resolve()))
  })

  async function runLoadTest(url: string, title: string): Promise<void> {
    const result = await autocannon({
      url: `http://localhost:${PORT}/${url}`,
      connections: 100,
      duration: 10,
      title,
      timeout: 30,
      connectionRate: 100,
      pipelining: 1,
      maxConnectionRequests: 1
    })

    // Store results
    results.push({
      title,
      timeouts: result.timeouts,
      errors: result.errors,
      latency: {
        average: result.latency?.average ?? 0,
        max: result.latency?.max ?? 0,
        min: result.latency?.min ?? 0,
      },
    });
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
