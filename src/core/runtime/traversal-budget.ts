export const DEFAULT_MAX_DEPTH = 500
export const DEFAULT_MAX_NODES = 50_000

// Written in place of the node that breaches a budget under `onBudgetExceeded: 'truncate'`.
// Everything beyond that point is dropped rather than emitted, so the marker is the only trace of
// un-inspected input in the output.
export const TRUNCATION_MARKER = '[TRUNCATED]'

export interface TraversalBudget {
  depth: number;
  nodesVisited: number;
  // Latched once a breach has been truncated (only under `onBudgetExceeded: 'truncate'`). Container
  // loops read it to stop enumerating siblings, so nothing past the breach is read or emitted.
  truncated: boolean;
}

export const createTraversalBudget = (): TraversalBudget => {
  return { depth: 0, nodesVisited: 0, truncated: false }
}

export const isDepthExceeded = (budget: TraversalBudget, maxDepth: number): boolean => {
  return budget.depth > maxDepth
}

export const isNodeBudgetExceeded = (budget: TraversalBudget, maxNodes: number): boolean => {
  return budget.nodesVisited > maxNodes
}

// Internal sentinel — NOT exported from src/index.ts or src/types/public.ts.
class BudgetExceededError extends Error {
  readonly code = 'BUDGET_EXCEEDED' as const

  constructor(message: string) {
    super(message)
    this.name = 'BudgetExceededError'
  }
}

export const createBudgetExceededError = (kind: 'depth' | 'nodes', limit: number): BudgetExceededError => {
  return new BudgetExceededError(
    kind === 'depth'
      ? `Traversal depth limit (${limit}) exceeded.`
      : `Traversal node budget (${limit}) exceeded.`,
  )
}

export const isBudgetExceededError = (error: unknown): error is BudgetExceededError => {
  return error instanceof BudgetExceededError
}
