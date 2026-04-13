import { parsePathSelector } from '../matching/path-parser.js'
import { normaliseParsedPath } from '../matching/path-normaliser.js'
import type { ValidationIssue } from './validation-report.js'

export interface ExactPathSelectorCandidate {
  readonly configPath: string
  readonly selector: string
}

const pushIssue = (issues: ValidationIssue[], path: string, message: string): void => {
  issues.push({ path, message })
}

export const validateExactPathSelectors = (
  selectorCandidates: readonly ExactPathSelectorCandidate[],
  issues: ValidationIssue[],
): void => {
  const seenCanonicalPaths = new Map<string, string>()

  for (const selectorCandidate of selectorCandidates) {
    try {
      const normalisedPath = normaliseParsedPath(parsePathSelector(selectorCandidate.selector))
      const previousDefinitionPath = seenCanonicalPaths.get(normalisedPath.canonicalPath)

      if (previousDefinitionPath !== undefined) {
        pushIssue(
          issues,
          selectorCandidate.configPath,
          `Duplicate canonical selector "${normalisedPath.canonicalPath}" already defined at ${previousDefinitionPath}.`,
        )
        continue
      }

      seenCanonicalPaths.set(normalisedPath.canonicalPath, selectorCandidate.configPath)
    } catch (error) {
      pushIssue(
        issues,
        selectorCandidate.configPath,
        error instanceof Error ? error.message : 'Invalid exact path selector.',
      )
    }
  }
}
