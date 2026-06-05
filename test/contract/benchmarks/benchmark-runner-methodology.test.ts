import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectSamples } from '../../../scripts/benchmark-runner.ts'

describe('benchmark runner methodology', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not keep a full timed batch of cloned payloads live at once', () => {
    let liveClones = 0
    let maxLiveClones = 0

    vi.spyOn(globalThis, 'structuredClone').mockImplementation((value: unknown) => {
      liveClones += 1
      maxLiveClones = Math.max(maxLiveClones, liveClones)
      return { value }
    })

    collectSamples(fresh => {
      expect(fresh).toBeDefined()
      liveClones -= 1
    }, { secret: 'value' })

    expect(liveClones).toBe(0)
    expect(maxLiveClones).toBe(1)
  })

  it('rejects samples where clone subtraction removes all measured redaction time', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)

    expect(() => collectSamples(fresh => {
      expect(fresh).toBeDefined()
    }, { secret: 'value' })).toThrow(
      'Benchmark sample produced non-positive redaction time',
    )
  })
})
