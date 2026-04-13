import {
  createRedactor,
  deepRedact,
  type DeepRedactOptions,
  type Redactor,
} from '@hackylabs/deep-redact'

const options: DeepRedactOptions = {
  paths: ['user.password'],
  remove: false,
  serialise: false,
}

const redact: Redactor = deepRedact(options)
const alias: Redactor = createRedactor(options)

void redact
void alias
