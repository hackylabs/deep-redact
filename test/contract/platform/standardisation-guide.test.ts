import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from '../../../scripts/generated-files.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('standardisation guide', () => {
  it('docs/platform/standardisation-guide.md exists', () => {
    expect(existsSync(generatedFilePaths.standardisationGuideDocPath)).toBe(true)
  })

  it('docs/platform/standardisation-guide.md matches generated guide (lockstep)', () => {
    const expected = buildGeneratedStandardisationGuide(repoRoot)
    const current = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    expect(current).toBe(expected)
  })

  it('guide contains all required section headings exactly once', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const requiredHeadings = [
      '## Supported capabilities',
      '## Targeting semantics',
      '## Migration expectations',
      '## Verification evidence',
      '## Adoption decision scope',
    ]
    for (const heading of requiredHeadings) {
      const occurrences = content.split(heading).length - 1
      expect(occurrences, `Expected heading "${heading}" exactly once`).toBe(1)
    }
  })

  it('guide contains all 10 required capability example links', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const requiredLinks = [
      'docs/examples/key-targeting.md',
      'docs/examples/path-targeting.md',
      'docs/examples/regex-property-matching.md',
      'docs/examples/substring-targeting.md',
      'docs/examples/replacement-and-removal.md',
      'docs/examples/serialised-output.md',
      'docs/examples/custom-transformer.md',
      'docs/examples/ignored-value-types.md',
      'docs/examples/graceful-error-replacement.md',
      'docs/examples/console-redaction.md',
    ]
    for (const link of requiredLinks) {
      expect(content, `Expected link to "${link}"`).toContain(link)
    }
  })

  it('guide links to canonical precedence contract artefacts', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    expect(content).toContain('docs/architecture/precedence.md')
  })

  it('guide uses canonical precedence terms in correct order', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const sectionStart = content.indexOf('## Targeting semantics')
    const sectionEnd = content.indexOf('\n## ', sectionStart + 1)
    const section = sectionEnd === -1 ? content.slice(sectionStart) : content.slice(sectionStart, sectionEnd)
    const terms = ['exact string-path', 'structured path', 'exact key', 'regex property', 'substring']
    let lastIndex = -1
    for (const term of terms) {
      const idx = section.indexOf(term)
      expect(idx, `Expected term "${term}" to appear in Targeting semantics section`).toBeGreaterThan(-1)
      expect(idx, `Expected "${term}" to appear after previous term`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })

  it('guide states one-way-only constraint', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    expect(content).toContain('one-way')
    expect(content).toContain('no `restore`')
    expect(content).toContain('unredact')
  })
})
