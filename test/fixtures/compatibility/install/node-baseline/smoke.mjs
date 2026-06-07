import { deepRedact } from '@hackylabs/deep-redact'

const redact = deepRedact({ paths: ['user.password', 'token'] })
const payload = { user: { password: 'secret' }, token: 'abc123', ok: true }
const redactedPayload = redact(payload)

console.log(JSON.stringify(redactedPayload))
