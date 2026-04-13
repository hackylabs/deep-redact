export interface ValidationIssue {
  readonly path: string
  readonly message: string
}

export interface ValidationReport {
  readonly valid: boolean
  readonly issues: readonly ValidationIssue[]
}

const formatValidationIssues = (issues: readonly ValidationIssue[]): string => {
  return issues
    .map((issue, index) => `${index + 1}. ${issue.path}: ${issue.message}`)
    .join('\n')
}

export class DeepRedactValidationError extends TypeError {
  readonly issues: readonly ValidationIssue[]

  constructor(issues: readonly ValidationIssue[]) {
    super(formatValidationIssues(issues))
    this.name = 'DeepRedactValidationError'
    this.issues = Object.freeze([...issues])
  }
}

export const createValidationReport = (issues: readonly ValidationIssue[]): ValidationReport => {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...issues]),
  })
}

export const assertValidConfig = (report: ValidationReport): void => {
  if (!report.valid) {
    throw new DeepRedactValidationError(report.issues)
  }
}
