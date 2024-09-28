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
        'JSON.stringify, large object',
        'DeepRedact, default config, large object',
        'ObGlob, large object',
        'Regex replace, large object',
        'fast redact, large object',
      ].includes(name)
    })
  benchmarkData.sort((a, b) => b.hz - a.hz)

  const comparison = benchmarkData.map(({ name, hz }) => ({
    rate: hz / benchmarkData[0].hz,
    name: name
      .replace('JSON.stringify, large object', `JSON.stringify\n(no redaction)\n(${Intl.NumberFormat().format(hz)})`)
      .replace('DeepRedact, default config, large object', `Deep Redact\n(default config)\n(${Intl.NumberFormat().format(hz)})`)
      .replace('ObGlob, large object', `ObGlob\n(${Intl.NumberFormat().format(hz)})`)
      .replace('Regex replace, large object', `Regex.replace\n(${Intl.NumberFormat().format(hz)})`)
      .replace('fast redact, large object', `Fast Redact\n(default config)\n(${Intl.NumberFormat().format(hz)})`),
  }))

  new ChartJSImage()
    .cht('bhs')
    .chco(comparison.map(({ name }) => (name.includes('Deep Redact') ? '43B3AE45' : 'F0F0F0')).join('|'))
    .chd(`t:${comparison.map(({ rate }) => rate).join(',')}`)
    .chl(comparison.map(({ name }) => name).join('|'))
    .chlps('align,right|anchor,start|offset,10|textAlign,left')
    .chtt('ops / sec')
    .chs('800x500')
    .toDataURI()
    .then(async (dataURI) => {
      const buffer = Buffer.from(dataURI.split(',')[1], 'base64')
      writeFileSync(join(__dirname, '..', 'benchmark.png'), buffer)
    })
}
