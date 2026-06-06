import type { ValueTypeName } from '../../types/config.js'

// An immutable `typeof`-keyed boolean lookup: `plan[typeof value]` is `true` when a value of that
// runtime type is eligible for redaction. The keys are exactly the eight `typeof` categories, so a
// veto check is a single O(1) property read with no runtime array scan (Story 9.1, AC 8).
export interface CompiledValueTypesPlan {
  readonly string: boolean;
  readonly number: boolean;
  readonly bigint: boolean;
  readonly boolean: boolean;
  readonly object: boolean;
  readonly function: boolean;
  readonly symbol: boolean;
  readonly undefined: boolean;
}

// Compiles the value-type allowlist into the lookup. An unset option compiles the string-only
// default (`['string']`) rather than an allow-all plan, matching v3: redaction is limited to string
// values unless `types` widens it. The compiled plan is always present on the redactor plan.
export const compileValueTypes = (
  configured: readonly ValueTypeName[] | undefined,
): CompiledValueTypesPlan => {
  const allows = (name: ValueTypeName): boolean => {
    return configured === undefined ? name === 'string' : configured.includes(name)
  }

  return Object.freeze({
    string: allows('string'),
    number: allows('number'),
    bigint: allows('bigint'),
    boolean: allows('boolean'),
    object: allows('object'),
    function: allows('function'),
    symbol: allows('symbol'),
    undefined: allows('undefined'),
  })
}
