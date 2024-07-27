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
    .filter(({ name }) => {
      return [
        'JSON.stringify, single object',
        'DeepRedact, default config, single object',
        'fast redact, single object',
      ].includes(name)
    })
  benchmarkData.sort((a, b) => a.hz - b.hz)

  const comparison = benchmarkData.map(({ name, hz }) => ({
    rate: hz / benchmarkData[0].hz,
    name: name
      .replace('JSON.stringify, single object', `JSON.stringify\n(no redaction or replacer)\n(${Intl.NumberFormat().format(hz)})`)
      .replace('DeepRedact, default config, single object', `Deep Redact\n(default config)\n(${Intl.NumberFormat().format(hz)})`)
      .replace('fast redact, single object', `Fast Redact\n(${Intl.NumberFormat().format(hz)})`),
  }))

  new ChartJSImage()
    .cht('bvs')
    .chco('F0F0F0|43B3AE45|F0F0F0')
    .chd(`t:${comparison.map(({ rate }) => rate).join(',')}`)
    .chl(comparison.map(({ name }) => name).join('|'))
    .chlps('align,top|anchor,start|offset,10')
    .chtt('ops / sec')
    .chs('800x999')
    .toDataURI()
    .then(async (dataURI) => {
      const buffer = Buffer.from(dataURI.split(',')[1], 'base64')
      writeFileSync(join(__dirname, '..', 'benchmark.png'), buffer)
    })
}
