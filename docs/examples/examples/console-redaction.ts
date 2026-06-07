import { deepRedact } from '@hackylabs/deep-redact'
import { createRedactedConsole } from '@hackylabs/deep-redact/adapters/console'

const redactor = deepRedact({ keys: ['password', 'token'] })

export const runExample = (input: unknown): unknown => {
  let captured: unknown
  const fakeConsole = {
    debug: (...args: unknown[]) => { captured = args[0] },
    error: (...args: unknown[]) => { captured = args[0] },
    info: (...args: unknown[]) => { captured = args[0] },
    log: (...args: unknown[]) => { captured = args[0] },
    trace: (...args: unknown[]) => { captured = args[0] },
    warn: (...args: unknown[]) => { captured = args[0] },
  }
  const redactedConsole = createRedactedConsole(redactor, fakeConsole)
  redactedConsole.log(input)
  return captured
}
