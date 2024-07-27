import benchmarkJson from '../benchmark.json'
import { renderTable, type TableData } from './_renderTable'

interface BenchmarkInput {
  name: string,
  hz: number,
  sampleCount: number,
  moe: number,
  period: number,
}

const benchmarkData: BenchmarkInput[] = benchmarkJson.files[0].groups[0].benchmarks
benchmarkData.sort((a, b) => b.hz - a.hz)

const tableData: TableData = benchmarkData.map(({
  name,
  hz,
  sampleCount,
  moe,
  period,
}) => ({
  scenario: name,
  'ops / sec': Number(hz.toFixed(2)),
  'op duration (ms)': Number(period.toFixed(10)),
  'margin of error': Number(moe.toFixed(5)),
  'sample count': sampleCount,
}))

export const benchmarks = renderTable(tableData)
