import type { PathSelector } from '../../types/paths.js'
import { isDynamicPathSegment, parsePathSelector, type PathSegment } from '../matching/path-parser.js'
import { normaliseParsedPath, renderSelectorSignature } from '../matching/path-normaliser.js'
import { getUnsupportedRegexMessage } from './regex-safety.js'
import type { ValidationIssue } from './validation-report.js'

export interface PathSelectorCandidate {
  readonly configPath: string;
  readonly selector: PathSelector;
}

const pushIssue = (issues: ValidationIssue[], path: string, message: string): void => {
  issues.push({ path, message })
}

const validateRegexPathSegments = (
  segments: readonly PathSegment[],
  path: string,
  issues: ValidationIssue[],
): boolean => {
  let valid = true

  for (const segment of segments) {
    if (segment.kind !== 'regex' && segment.kind !== 'ignore-regex') {
      continue
    }

    const unsupportedRegexMessage = getUnsupportedRegexMessage(segment.matcher, 'Regex path segment')

    if (unsupportedRegexMessage !== undefined) {
      pushIssue(issues, path, unsupportedRegexMessage)
      valid = false
    }
  }

  return valid
}

export const validatePathSelectors = (
  selectorCandidates: readonly PathSelectorCandidate[],
  issues: ValidationIssue[],
): void => {
  const seenCanonicalPaths = new Map<string, string>()
  const seenDynamicSelectors = new Map<string, string>()

  for (const selectorCandidate of selectorCandidates) {
    try {
      const parsedPath = parsePathSelector(selectorCandidate.selector)

      if (!validateRegexPathSegments(parsedPath.segments, selectorCandidate.configPath, issues)) {
        continue
      }

      if (parsedPath.segments.some((segment) => isDynamicPathSegment(segment))) {
        const signature = renderSelectorSignature(parsedPath.segments)
        const previousDefinitionPath = seenDynamicSelectors.get(signature)

        if (previousDefinitionPath !== undefined) {
          pushIssue(
            issues,
            selectorCandidate.configPath,
            `Duplicate dynamic selector "${signature}" already defined at ${previousDefinitionPath}.`,
          )
          continue
        }

        seenDynamicSelectors.set(signature, selectorCandidate.configPath)
        continue
      }

      const normalisedPath = normaliseParsedPath(parsedPath)
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
        error instanceof Error ? error.message : 'Invalid path selector.',
      )
    }
  }
}
