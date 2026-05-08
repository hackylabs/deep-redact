import type { IgnoredValueTypesOption } from '../../types/ignored-value-types.js'

export interface CompiledIgnoredValueTypesPlan {
  readonly bigint: boolean;
  readonly Date: boolean;
  readonly Error: boolean;
  readonly Map: boolean;
  readonly RegExp: boolean;
  readonly Set: boolean;
  readonly URL: boolean;
}

export const compileIgnoredValueTypes = (
  configured: IgnoredValueTypesOption | undefined,
): CompiledIgnoredValueTypesPlan => {
  return Object.freeze({
    bigint: configured?.bigint === true,
    Date: configured?.Date === true,
    Error: configured?.Error === true,
    Map: configured?.Map === true,
    RegExp: configured?.RegExp === true,
    Set: configured?.Set === true,
    URL: configured?.URL === true,
  })
}
