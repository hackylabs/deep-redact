import {
  createRedactor,
  deepRedact,
  type DeepRedactOptions,
  type PathEntry,
  type PathRule,
  type Redactor,
} from '@hackylabs/deep-redact'

const passwordRule: PathRule = {
  path: 'user.password',
  censor: '[REDACTED]',
}

const paths: PathEntry[] = [
  'user.token',
  passwordRule,
  {
    path: 'user.profile.secret',
    remove: true,
  },
]

const options: DeepRedactOptions = {
  keys: ['password'],
  paths,
  serialise: (value) => JSON.stringify(value) ?? 'null',
}

const redact: Redactor = deepRedact(options)
const alias: Redactor = createRedactor({
  keys: ['token'],
  paths,
})

const structuredResult = redact({ ok: true })
const aliasResult = alias({ ok: true })

// @ts-expect-error v4 exposes only the British-English serialise option
const invalidLegacyOption: DeepRedactOptions = { serialize: true }
// @ts-expect-error v4 does not expose the legacy v3 key option
const invalidLegacyKeys: DeepRedactOptions = { blacklistedKeys: ['password'] }
// @ts-expect-error the reusable redactor accepts payload input only after initialisation
redact({ ok: true }, options)

void structuredResult
void aliasResult
void invalidLegacyOption
void invalidLegacyKeys
