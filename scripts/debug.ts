import { DeepRedact } from '../src/index'
import { complexBlacklistedKeys } from '../test/setup/blacklist'
import { extendedDummyUser, dummyUser } from '../test/setup/dummyUser'

const redactor = new DeepRedact({
    enableLogging: true,
    retainStructure: true,
    blacklistedKeys: complexBlacklistedKeys,
    types: ['string', 'number'],
    partialStringTests: [
        {
        pattern: /([a-z\d\.]+)@([a-z\d\.]+)/i,
        replacer: (value: string, pattern: RegExp) => {
            const matches = value.match(pattern)
            if (!matches) return value
            const [_, ...groups] = matches
            return `${'*'.repeat(groups[0].length)}@${groups[1]}`
        },
        },
    ],
})

const result = redactor.redact(dummyUser)
console.log('=== Result ===')
console.dir(result, { depth: null })
