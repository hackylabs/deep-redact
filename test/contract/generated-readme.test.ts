import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildGeneratedReadme, readPackageJson } from '../../scripts/generated-files.ts'
import { resolveDenoPackageSpecifier } from '../../scripts/verify-install-matrix.ts'

interface InstallMatrixRow {
  id: string;
  packageManager: string;
  runtime: string;
  runtimeVersion: string;
  installCommand: string[];
  runCommand: string[];
}

interface InstallMatrix {
  rows: InstallMatrixRow[];
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

const publicInstallCommand = (row: InstallMatrixRow, packageName: string): string => {
  const [command, subcommand] = row.installCommand

  return [command, subcommand, packageName].filter(Boolean).join(' ')
}

describe('generated README installation documentation', () => {
  it('renders package-manager installation commands from the canonical matrix rows', () => {
    const packageJson = readPackageJson()
    const packageName = String(packageJson.name)
    const matrix = readJson<InstallMatrix>('test/compatibility/install/matrix.json')
    const readme = buildGeneratedReadme()

    for (const packageManager of ['npm', 'pnpm', 'yarn', 'bun']) {
      const row = matrix.rows.find((candidate) =>
        candidate.runtime === 'node'
        && candidate.runtimeVersion === 'node@24.14.1'
        && candidate.packageManager === packageManager)

      expect(row, `missing ${packageManager} install row`).toBeDefined()
      expect(readme).toContain(publicInstallCommand(row as InstallMatrixRow, packageName))
    }
  })

  it('renders the Deno import map from the Deno fixture', () => {
    const packageJson = readPackageJson()
    const denoPackageSpecifier = resolveDenoPackageSpecifier(packageJson)
    const denoJson = readJson<{ imports: Record<string, string> }>(
      'test/fixtures/compatibility/install/deno-baseline/deno.json',
    )
    const readme = buildGeneratedReadme()

    denoJson.imports['@hackylabs/deep-redact'] = denoPackageSpecifier

    expect(readme).toContain(JSON.stringify(denoJson, null, 2))
    expect(readme).not.toContain('{denoPackageSpecifier}')
    expect(readme).not.toContain('latest')
  })

  it('keeps the committed README locked to the generated output', () => {
    expect(readFileSync('README.md', 'utf8')).toBe(buildGeneratedReadme())
  })
})
