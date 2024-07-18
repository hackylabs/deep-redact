import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import ChartJSImage from 'image-charts'
import benchmarkJson from '../benchmark.json'

interface BenchmarkInput {
  name: string,
  hz: number,
}

export const updateBenchChart = () => {
  const benchmarkData: BenchmarkInput[] = benchmarkJson
    .files[0]
    .groups[0]
    .benchmarks
    .filter(({ name }) => ['JSON.stringify, single object', 'default config, single object', 'fast redact, single object'].includes(name))
  benchmarkData.sort((a, b) => b.hz - a.hz)

  const comparison = benchmarkData.map(({ name, hz }) => ({
    rate: hz / benchmarkData[0].hz,
    name: name
      .replace('JSON.stringify, single object', `JSON.stringify\n(${Intl.NumberFormat().format(hz)})`)
      .replace('default config, single object', `Deep Redact\n(${Intl.NumberFormat().format(hz)})`)
      .replace('fast redact, single object', `Fast Redact\n(${Intl.NumberFormat().format(hz)})`),
  }))

  new ChartJSImage()
    .cht('bvs')
    .chco('43B3AE45|c0c0c0')
    .chd(`t:${comparison.map(({ rate }) => rate).join(',')}`)
    .chl(comparison.map(({ name }) => name).join('|'))
    .chtt('ops / sec')
    .chs('800x999')
    .toDataURI()
    .then(async (dataURI) => {
      const buffer = Buffer.from(dataURI.split(',')[1], 'base64')
      writeFileSync(join(__dirname, '..', 'benchmark.png'), buffer)
    })
}
