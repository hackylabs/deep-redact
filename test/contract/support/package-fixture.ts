import { execFile } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const supportDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(supportDirectory, '../../..')
const fixturesRoot = path.join(repositoryRoot, 'test', 'fixtures', 'consumers')
const scopedPackageDirectory = path.join('node_modules', '@hackylabs')

export const createConsumerFixture = (fixtureName: string) => {
  const fixtureTemplateDirectory = path.join(fixturesRoot, fixtureName)
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), `deep-redact-${fixtureName}-`))

  cpSync(fixtureTemplateDirectory, temporaryDirectory, { recursive: true })
  mkdirSync(path.join(temporaryDirectory, scopedPackageDirectory), { recursive: true })
  symlinkSync(
    repositoryRoot,
    path.join(temporaryDirectory, scopedPackageDirectory, 'deep-redact'),
    'dir',
  )

  return {
    temporaryDirectory,
    cleanup: () => {
      rmSync(temporaryDirectory, { force: true, recursive: true })
    },
  }
}

export const runNodeFixture = async (temporaryDirectory: string, entryFile: string) => {
  return execFileAsync(process.execPath, [path.join(temporaryDirectory, entryFile)], {
    cwd: temporaryDirectory,
  })
}

export const runTypesFixture = async (temporaryDirectory: string) => {
  return execFileAsync(
    process.execPath,
    [
      path.join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--project',
      path.join(temporaryDirectory, 'tsconfig.json'),
      '--noEmit',
    ],
    {
      cwd: repositoryRoot,
    },
  )
}
