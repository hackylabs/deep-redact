import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  packageManager?: string;
  volta?: {
    node?: string;
    pnpm?: string;
  };
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const readRepositoryFile = (filePath: string): string => {
  return readFileSync(path.join(repositoryRoot, filePath), 'utf8')
}

const packageJson = JSON.parse(readRepositoryFile('package.json')) as PackageJson
const contributorNodeVersion = readRepositoryFile('.nvmrc').trim()
const packageManager = String(packageJson.packageManager)
const [, expectedPnpmVersion] = packageManager.split('@')

describe('agent environment initialisation', () => {
  it('pins common Node version resolvers to the contributor baseline', () => {
    expect(contributorNodeVersion).toBe('24.14.1')
    expect(readRepositoryFile('.node-version').trim()).toBe(contributorNodeVersion)
    expect(readRepositoryFile('.tool-versions').trim()).toBe(`nodejs ${contributorNodeVersion}`)
    expect(packageJson.volta).toStrictEqual({
      node: contributorNodeVersion,
      pnpm: expectedPnpmVersion,
    })
  })

  it('documents the bootstrap command agents must run before toolchain work', () => {
    const agentInstructions = readRepositoryFile('AGENTS.md')

    expect(agentInstructions).toContain('source .agents/initialise-env.sh')
    expect(agentInstructions).toContain(`Node \`${contributorNodeVersion}\``)
    expect(agentInstructions).toContain(`\`${packageManager}\``)
  })

  it('provides a sourceable bootstrap script that activates the pinned toolchain', () => {
    const result = spawnSync(
      'bash',
      [
        '-lc',
        String.raw`source .agents/initialise-env.sh >/dev/null && printf "%s\n%s\n%s" "$AGENT_NODE_VERSION" "$(node --version)" "$(pnpm --version)"`,
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
      },
    )

    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
    expect(result.stdout.trim().split('\n')).toStrictEqual([
      contributorNodeVersion,
      `v${contributorNodeVersion}`,
      expectedPnpmVersion,
    ])
  })
})
