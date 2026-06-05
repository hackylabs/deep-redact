import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from '../../../scripts/generated-files.ts'

describe('standardisation guide', () => {
  it('docs/platform/standardisation-guide.md exists', () => {
    expect(existsSync(generatedFilePaths.standardisationGuideDocPath)).toBe(true)
  })

  it('docs/platform/standardisation-guide.md matches generated guide (lockstep)', () => {
    const expected = buildGeneratedStandardisationGuide()
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

  it('guide contains all 13 required capability example links', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const requiredLinks = [
      '../examples/key-targeting.md',
      '../examples/fuzzy-key-matching.md',
      '../examples/case-insensitive-key-matching.md',
      '../examples/path-targeting.md',
      '../examples/path-segment-ignore.md',
      '../examples/regex-property-matching.md',
      '../examples/substring-targeting.md',
      '../examples/replacement-and-removal.md',
      '../examples/serialised-output.md',
      '../examples/custom-transformer.md',
      '../examples/ignored-value-types.md',
      '../examples/graceful-error-replacement.md',
      '../examples/console-redaction.md',
    ]
    for (const link of requiredLinks) {
      expect(content, `Expected link to "${link}"`).toContain(link)
    }
  })

  it('all local Markdown links resolve from the generated guide location', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const guideDirectory = path.dirname(generatedFilePaths.standardisationGuideDocPath)
    const localMarkdownLinks = [...content.matchAll(/\]\(([^)]+\.md(?:#[^)]+)?)\)/g)]

    expect(localMarkdownLinks.length, 'Expected at least one local Markdown link').toBeGreaterThan(0)

    for (const [, link] of localMarkdownLinks) {
      const [target] = link.split('#')
      const resolvedTarget = path.resolve(guideDirectory, target)
      expect(existsSync(resolvedTarget), `Expected link "${link}" to resolve to ${resolvedTarget}`).toBe(true)
    }
  })

  it('guide links to canonical precedence contract artefacts', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    expect(content).toContain('../architecture/precedence.md')
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

  it('guide divergence list is non-empty', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const sectionStart = content.indexOf('### fast-redact migration')
    const sectionEnd = content.indexOf('\n### ', sectionStart + 1)
    const section = sectionEnd === -1 ? content.slice(sectionStart) : content.slice(sectionStart, sectionEnd)
    expect(section, 'Expected at least one intentional-divergence bullet in fast-redact migration section').toMatch(/^- \*\*/m)
  })
})
