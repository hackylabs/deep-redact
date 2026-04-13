import type { DeepRedactOptions } from './config.js'

export type { DeepRedactOptions, SerialiseOption } from './config.js'
export type { Censor, PathEntry, PathRule } from './paths.js'

export type Redactor = (value: unknown) => unknown
export type RedactorFactory = (options?: DeepRedactOptions) => Redactor
