import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as vega from 'vega'
import * as vegaLite from 'vega-lite'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const speedArtefactsDir = path.join(repoRoot, 'test', 'artefacts', 'benchmarks', 'speed')
const chartsOutputDir = path.join(repoRoot, 'docs', 'benchmarks', 'charts')

interface SpeedArtefact {
  id: string;
  measurements: {
    subject: { median: number };
    comparator: { median: number };
  };
}

const opsPerSec = (medianMs: number): number => Math.round(1 / (medianMs / 1000))

const formatOps = (ops: number): string => {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M`
  if (ops >= 1000) return `${Math.round(ops / 1000)}K`
  return `${ops}`
}

const COLOURS: Record<string, string> = {
  'deep-redact v4': '#2563eb',
  'deep-redact v3': '#64748b',
  'fast-redact †': '#f59e0b',
  'json-stringify-regex †': '#94a3b8',
}

const FONT = 'system-ui, -apple-system, sans-serif'

async function toSvg(spec: vegaLite.TopLevelSpec): Promise<string> {
  const vegaSpec = vegaLite.compile(spec).spec
  const view = new vega.View(vega.parse(vegaSpec), { renderer: 'none' })
  return view.toSVG()
}

function loadArtefact(id: string): SpeedArtefact {
  return JSON.parse(readFileSync(path.join(speedArtefactsDir, `${id}.json`), 'utf8')) as SpeedArtefact
}

interface ChartRow {
  yLabel: string;
  library: string;
  ops: number;
  colour: string;
  opsLabel: string;
}

function row(label: string, library: string, ops: number): ChartRow {
  return { yLabel: `${library}  [${label}]`, library, ops, colour: COLOURS[library], opsLabel: formatOps(ops) }
}

function buildSerialisedRows(): ChartRow[] {
  return (['Path-based', 'Wildcard'] as const).flatMap((label) => {
    const prefix = label === 'Path-based' ? 'path-based' : 'wildcard'
    const v3Art = loadArtefact(`${prefix}-serialised-v3-node24`)
    const frArt = loadArtefact(`${prefix}-serialised-fast-redact-node24`)
    const jsrArt = loadArtefact(`${prefix}-serialised-json-stringify-regex-node24`)
    return [
      row(label, 'deep-redact v4', opsPerSec(v3Art.measurements.subject.median)),
      row(label, 'fast-redact †', opsPerSec(frArt.measurements.comparator.median)),
      row(label, 'json-stringify-regex †', opsPerSec(jsrArt.measurements.comparator.median)),
      row(label, 'deep-redact v3', opsPerSec(v3Art.measurements.comparator.median)),
    ]
  })
}

function buildNonSerialisedRows(): ChartRow[] {
  return (['Path-based', 'Wildcard'] as const).flatMap((label) => {
    const prefix = label === 'Path-based' ? 'path-based' : 'wildcard'
    const v3Art = loadArtefact(`${prefix}-non-serialised-v3-node24`)
    const frArt = loadArtefact(`${prefix}-non-serialised-fast-redact-node24`)
    return [
      row(label, 'deep-redact v4', opsPerSec(v3Art.measurements.subject.median)),
      row(label, 'fast-redact †', opsPerSec(frArt.measurements.comparator.median)),
      row(label, 'deep-redact v3', opsPerSec(v3Art.measurements.comparator.median)),
    ]
  })
}

function buildSpec(rows: ChartRow[], title: string, subtitle: string): vegaLite.TopLevelSpec {
  const maxOps = Math.max(...rows.map(r => r.ops))
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    background: 'white',
    width: 540,
    height: rows.length * 24 + 30,
    title: {
      text: title,
      subtitle,
      font: FONT,
      subtitleFont: FONT,
      fontSize: 14,
      subtitleFontSize: 10,
      color: '#1e293b',
      subtitleColor: '#64748b',
      anchor: 'start',
      dy: -4,
    },
    data: { values: rows },
    layer: [
      {
        mark: { type: 'bar', cornerRadiusTopRight: 3, cornerRadiusBottomRight: 3 },
        encoding: {
          x: {
            field: 'ops',
            type: 'quantitative',
            title: 'Operations per second',
            axis: {
              labelFont: FONT,
              titleFont: FONT,
              labelFontSize: 10,
              titleFontSize: 11,
              labelExpr: "datum.value >= 1000000 ? (datum.value/1000000) + 'M' : datum.value >= 1000 ? (datum.value/1000) + 'K' : datum.value",
              grid: true,
              gridColor: '#e2e8f0',
              tickCount: 5,
            },
            scale: { domain: [0, maxOps * 1.18] },
          },
          y: {
            field: 'yLabel',
            type: 'nominal',
            title: null,
            sort: null,
            axis: { labelFont: FONT, labelFontSize: 11, labelLimit: 0 },
          },
          color: {
            field: 'colour',
            type: 'nominal',
            scale: null,
            legend: null,
          },
        },
      },
      {
        mark: { type: 'text', align: 'left', dx: 4, fontSize: 10, font: FONT, color: '#475569' },
        encoding: {
          x: { field: 'ops', type: 'quantitative' },
          y: { field: 'yLabel', type: 'nominal', sort: null },
          text: { field: 'opsLabel', type: 'nominal' },
        },
      },
    ],
    config: {
      view: { stroke: null },
      axis: { domainColor: '#cbd5e1', tickColor: '#cbd5e1' },
    },
  }
}

async function main(): Promise<void> {
  mkdirSync(chartsOutputDir, { recursive: true })

  const nonSerialisedRows = buildNonSerialisedRows()
  const nonSerialisedSvg = await toSvg(buildSpec(
    nonSerialisedRows,
    'Operations per second — structured output',
    'All libraries return a plain JavaScript object. Higher is better. Node.js 24, Apple M-series.',
  ))
  writeFileSync(path.join(chartsOutputDir, 'speed-comparison-non-serialised.svg'), nonSerialisedSvg)

  const serialisedRows = buildSerialisedRows()
  const serialisedSvg = await toSvg(buildSpec(
    serialisedRows,
    'Operations per second — serialised output',
    'All solutions return a JSON string. Higher is better. Node.js 24, Apple M-series.',
  ))
  writeFileSync(path.join(chartsOutputDir, 'speed-comparison-serialised.svg'), serialisedSvg)

  console.log('Charts written to', chartsOutputDir)
}

await main()
